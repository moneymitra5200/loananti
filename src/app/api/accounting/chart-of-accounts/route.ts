import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, DEFAULT_CHART_OF_ACCOUNTS } from '@/lib/accounting-service';
import { AccountType } from '@prisma/client';

// GET - Fetch chart of accounts with LIVE computed balances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'default';
    const accountType = searchParams.get('accountType');
    const isActive = searchParams.get('isActive');

    const where: any = { companyId };
    if (accountType && accountType !== 'all') where.accountType = accountType;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true';

    let accounts = await db.chartOfAccount.findMany({
      where,
      orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    });

    // Auto-initialize if empty
    if (accounts.length === 0) {
      console.log(`[ChartOfAccounts] No accounts for ${companyId}, auto-initializing...`);
      await initializeDefaultAccounts(companyId);
      accounts = await db.chartOfAccount.findMany({
        where: { companyId },
        orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
      });
      return NextResponse.json({ accounts, initialized: true });
    }

    // ── Real bank accounts from BankAccount table ─────────────────────
    const realBankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const hasRealBankAccounts = realBankAccounts.length > 0;

    // ── Compute LIVE balances from journal entry lines ─────────────────
    const lineAgg = await db.journalEntryLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
        },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const txnMap: Record<string, { totalDebit: number; totalCredit: number }> = {};
    for (const row of lineAgg) {
      txnMap[row.accountId] = {
        totalDebit: row._sum.debitAmount || 0,
        totalCredit: row._sum.creditAmount || 0,
      };
    }

    // Total journal activity on the generic 1102 account (sum used for bank accounts)
    const genericBank1102 = accounts.find(a => a.accountCode === '1102');
    const bank1102Txn = genericBank1102 ? (txnMap[genericBank1102.id] || { totalDebit: 0, totalCredit: 0 }) : { totalDebit: 0, totalCredit: 0 };
    const bank1102Opening = genericBank1102?.openingBalance || 0;
    // Total bank movement recorded in journal entries
    const totalBankJournalBalance = bank1102Opening + bank1102Txn.totalDebit - bank1102Txn.totalCredit;

    // ── Build enriched list ────────────────────────────────────────────
    const enrichedRaw = accounts.map(account => {
      const isDebitNormal = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';
      const txn = txnMap[account.id] || { totalDebit: 0, totalCredit: 0 };
      const opening = account.openingBalance || 0;

      let liveBalance = isDebitNormal
        ? opening + txn.totalDebit - txn.totalCredit
        : opening + txn.totalCredit - txn.totalDebit;

      // ── BANK ACCOUNT LOGIC ──────────────────────────────────────────
      // If this is the generic "Bank Account (1102)" system account AND
      // the company has real bank accounts → HIDE it (will be replaced)
      if (account.accountCode === '1102' && hasRealBankAccounts) {
        return null; // skip generic - replaced by real banks below
      }

      // If this is a user-created bank ChartOfAccount (non-1102, non-system, ASSET type)
      // that maps to an actual BankAccount record → show actual balance
      const matchingRealBank = realBankAccounts.find(rb =>
        rb.accountName?.toLowerCase() === account.accountName?.toLowerCase() ||
        rb.bankName?.toLowerCase().includes(account.accountName?.toLowerCase() || '') ||
        account.accountName?.toLowerCase().includes(rb.bankName?.toLowerCase() || '') ||
        account.accountName?.toLowerCase().includes(rb.accountNumber?.slice(-4) || '')
      );
      if (matchingRealBank) {
        liveBalance = matchingRealBank.currentBalance || 0;
      }

      return {
        ...account,
        currentBalance: liveBalance,
        totalDebit: txn.totalDebit,
        totalCredit: txn.totalCredit,
      };
    }).filter(Boolean);

    // ── If company has real banks, inject them as proper account rows ──
    // Only if the company doesn't ALREADY have them as ChartOfAccount entries
    if (hasRealBankAccounts) {
      for (const bank of realBankAccounts) {
        // Check if this bank already appears in ChartOfAccount
        const alreadyListed = enrichedRaw.some(a =>
          a?.accountName?.toLowerCase() === bank.accountName?.toLowerCase() ||
          a?.accountName?.toLowerCase().includes(bank.bankName?.toLowerCase() || '') ||
          bank.bankName?.toLowerCase().includes(a?.accountName?.toLowerCase() || '')
        );

        if (!alreadyListed) {
          // Inject a virtual row for this bank
          enrichedRaw.push({
            id: `bank-${bank.id}`,
            companyId,
            accountCode: `BANK-${bank.id.slice(-4).toUpperCase()}`,
            accountName: `${bank.bankName} - ${bank.accountName}`,
            accountType: 'ASSET' as any,
            description: `Bank Account: ${bank.accountNumber}`,
            isSystemAccount: false,
            isActive: true,
            openingBalance: bank.openingBalance || 0,
            currentBalance: bank.currentBalance || 0,
            totalDebit: bank1102Txn.totalDebit,   // journal debits tracked via 1102
            totalCredit: bank1102Txn.totalCredit,  // journal credits tracked via 1102
            parentAccountId: null,
            createdAt: bank.createdAt,
            updatedAt: bank.updatedAt,
          } as any);
        }
      }
    }

    return NextResponse.json({ accounts: enrichedRaw });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json({
      error: 'Failed to fetch accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to initialize default accounts
async function initializeDefaultAccounts(companyId: string) {
  const allAccounts = [
    ...DEFAULT_CHART_OF_ACCOUNTS.ASSETS,
    ...DEFAULT_CHART_OF_ACCOUNTS.LIABILITIES,
    ...DEFAULT_CHART_OF_ACCOUNTS.INCOME,
    ...DEFAULT_CHART_OF_ACCOUNTS.EXPENSES,
    ...DEFAULT_CHART_OF_ACCOUNTS.EQUITY,
  ];

  for (const account of allAccounts) {
    try {
      const existing = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: account.code },
      });

      if (!existing) {
        await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type as AccountType,
            isSystemAccount: account.isSystemAccount,
            description: account.description,
            openingBalance: 0,
            currentBalance: 0,
            isActive: true,
          },
        });
      }
    } catch (err) {
      console.error(`Failed to create account ${account.code}:`, err);
    }
  }
  
  console.log(`[ChartOfAccounts] Initialized ${allAccounts.length} accounts for company ${companyId}`);
}

// POST - Create new account(s) - supports both single and bulk creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a bulk initialization request
    if (body.accounts && Array.isArray(body.accounts)) {
      const { companyId, accounts } = body;
      const createdAccounts: any[] = [];
      const errors: Array<{ code: string; error: string }> = [];
      
      for (const acc of accounts) {
        try {
          // Check if account code already exists
          const existing = await db.chartOfAccount.findFirst({
            where: { 
              companyId: companyId || 'default', 
              accountCode: acc.accountCode 
            },
          });

          if (!existing) {
            const account = await db.chartOfAccount.create({
              data: {
                companyId: companyId || 'default',
                accountCode: acc.accountCode,
                accountName: acc.accountName,
                accountType: acc.accountType as AccountType,
                description: acc.description,
                openingBalance: acc.openingBalance || 0,
                currentBalance: acc.openingBalance || 0,
                parentAccountId: acc.parentAccountId,
                isSystemAccount: acc.isSystemAccount || false,
                isActive: true,
              },
            });
            createdAccounts.push(account);
          }
        } catch (err) {
          errors.push({ code: acc.accountCode, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
      
      return NextResponse.json({ 
        message: `Created ${createdAccounts.length} accounts`,
        accounts: createdAccounts,
        errors: errors.length > 0 ? errors : undefined
      });
    }
    
    // Single account creation
    const { 
      companyId, 
      accountCode, 
      accountName, 
      accountType, 
      description, 
      openingBalance,
      parentAccountId,
      isSystemAccount = false 
    } = body;

    // Check if account code already exists
    const existing = await db.chartOfAccount.findFirst({
      where: { 
        companyId: companyId || 'default', 
        accountCode 
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 400 });
    }

    const account = await db.chartOfAccount.create({
      data: {
        companyId: companyId || 'default',
        accountCode,
        accountName,
        accountType: accountType as AccountType,
        description,
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        parentAccountId,
        isSystemAccount,
        isActive: true,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ 
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, accountName, description, isActive, openingBalance } = body;

    // If updating opening balance
    if (openingBalance !== undefined) {
      const account = await db.chartOfAccount.findUnique({ where: { id } });
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      // Update the account with new opening balance
      const updated = await db.chartOfAccount.update({
        where: { id },
        data: {
          openingBalance,
          currentBalance: openingBalance,
        },
      });

      // Create a journal entry for the opening balance
      const today = new Date();
      const entryNumber = `OB-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

      // Get Equity account for this company
      const equityAccount = await db.chartOfAccount.findFirst({
        where: { 
          companyId: account.companyId, 
          accountType: 'EQUITY' 
        }
      });

      if (equityAccount && openingBalance !== 0) {
        // For Asset accounts: Debit the asset, Credit Equity
        // For Liability accounts: Credit the liability, Debit Equity
        const isAsset = account.accountType === 'ASSET';
        
        await db.journalEntry.create({
          data: {
            companyId: account.companyId,
            entryNumber,
            entryDate: today,
            referenceType: 'OPENING_BALANCE',
            narration: `Opening Balance - ${account.accountName}`,
            totalDebit: isAsset ? openingBalance : 0,
            totalCredit: isAsset ? 0 : openingBalance,
            isAutoEntry: true,
            isApproved: true,
            createdById: 'system',
            lines: {
              create: [
                {
                  accountId: account.id,
                  debitAmount: isAsset ? openingBalance : 0,
                  creditAmount: isAsset ? 0 : openingBalance,
                  narration: 'Opening Balance Entry'
                },
                {
                  accountId: equityAccount.id,
                  debitAmount: isAsset ? 0 : openingBalance,
                  creditAmount: isAsset ? openingBalance : 0,
                  narration: 'Owner\'s Capital / Equity'
                }
              ]
            }
          }
        });
      }

      return NextResponse.json({ account: updated, journalEntryCreated: true });
    }

    // Regular update
    const account = await db.chartOfAccount.update({
      where: { id },
      data: {
        accountName,
        description,
        isActive,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ 
      error: 'Failed to update account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Deactivate account (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Check if account is a system account
    const account = await db.chartOfAccount.findUnique({ where: { id } });
    if (account?.isSystemAccount) {
      return NextResponse.json({ error: 'Cannot delete system account' }, { status: 400 });
    }

    // Check if account has transactions
    const lines = await db.journalEntryLine.count({
      where: { accountId: id },
    });

    if (lines > 0) {
      // Soft delete - just deactivate
      await db.chartOfAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Account deactivated (has transactions)' });
    }

    // Hard delete if no transactions
    await db.chartOfAccount.delete({ where: { id } });
    return NextResponse.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
