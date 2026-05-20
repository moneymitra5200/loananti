import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';
import { withRetry } from '@/lib/db-utils';


/**
 * POST /api/accounting/add-equity
 * 
 * Add owner's equity with double-entry accounting
 * 
 * Example: Adding 5k cash + 5k bank
 * - Debit: Cash in Hand (1101) - 5,000 (increases cash asset)
 * - Debit: Bank Account (14xx) - 5,000 (increases bank asset)
 * - Credit: Owner's Capital (3002) - 10,000 (records equity source)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      cashAmount, 
      bankAmount, 
      bankAccountId,
      date,
      description,
      createdById 
    } = body;

    // Validation
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const cash = parseFloat(cashAmount) || 0;
    const bank = parseFloat(bankAmount) || 0;
    const totalEquity = cash + bank;

    if (totalEquity <= 0) {
      return NextResponse.json({ error: 'At least one amount (cash or bank) must be greater than 0' }, { status: 400 });
    }

    if (bank > 0 && !bankAccountId) {
      return NextResponse.json({ error: 'Bank account ID is required when bank amount is provided' }, { status: 400 });
    }

    // Verify company exists first
    const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: `Company not found: ${companyId}` }, { status: 404 });
    }

    // Initialize accounting service
    console.log('[add-equity] Step 1: Initializing AccountingService for company:', companyId);
    const accountingService = new AccountingService(companyId);
    try {
      await accountingService.initializeChartOfAccounts();
      console.log('[add-equity] Step 1: Chart of accounts initialized OK');
    } catch (initErr) {
      console.error('[add-equity] Step 1 FAILED - initializeChartOfAccounts:', initErr);
      throw initErr;
    }

    const entryDate = date ? new Date(date) : new Date();
    const entryNumber = await accountingService.generateEntryNumber();
    console.log('[add-equity] Step 2: Entry number generated:', entryNumber);

    // Build journal entry lines
    const lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      narration?: string;
    }> = [];

    // Debit: Cash in Hand (if cash amount provided)
    if (cash > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: cash,
        creditAmount: 0,
        narration: 'Cash capital investment'
      });
    }

    // Debit: Bank Account (if bank amount provided)
    // We need to get or create a bank account chart of account
    let bankAccountCode = '1400'; // Default bank account code
    if (bank > 0 && bankAccountId) {
      // Get the bank account to find or create its chart of account
      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });

      if (bankAccount) {
        // Check if a chart of account exists for this bank
        let bankChartAccount = await db.chartOfAccount.findFirst({
          where: { 
            companyId,
            accountCode: { startsWith: '14' },
            accountName: { contains: bankAccount.bankName }
          }
        });

        if (!bankChartAccount) {
          // Create a chart of account for this bank
          const bankCount = await db.chartOfAccount.count({
            where: { companyId, accountCode: { startsWith: '14' } }
          });
          const newCode = `140${bankCount + 1}`;
          
          bankChartAccount = await db.chartOfAccount.create({
            data: {
              companyId,
              accountCode: newCode,
              accountName: `${bankAccount.bankName} - ${bankAccount.accountNumber.slice(-4)}`,
              accountType: 'ASSET',
              description: `Bank account: ${bankAccount.bankName}`,
              openingBalance: 0,
              currentBalance: 0,
              isActive: true
            }
          });
        }

        bankAccountCode = bankChartAccount.accountCode;
      }

      lines.push({
        accountCode: bankAccountCode,
        debitAmount: bank,
        creditAmount: 0,
        narration: 'Bank capital investment'
      });
    }

    // Credit: Owner's Capital (Total equity)
    lines.push({
      accountCode: ACCOUNT_CODES.OWNERS_CAPITAL,
      debitAmount: 0,
      creditAmount: totalEquity,
      narration: description || 'Owner\'s capital investment'
    });

    // ── Re-initialize chart of accounts AFTER creating any new accounts ──
    // This ensures all dynamically-created accounts (like 1401) are in the cache
    console.log('[add-equity] Step 2b: Re-initializing chart of accounts after dynamic account creation');
    await accountingService.initializeChartOfAccounts();

    // Create the journal entry
    console.log('[add-equity] Step 3: Creating journal entry, lines:', JSON.stringify(lines));
    let journalEntryId: string;
    try {
      // Use direct DB write to bypass cache issues with dynamic account codes
      const accountCodes = lines.map(l => l.accountCode);
      const accounts = await db.chartOfAccount.findMany({
        where: { companyId, accountCode: { in: accountCodes } },
        select: { id: true, accountCode: true, accountType: true }
      });
      const accMap = new Map(accounts.map(a => [a.accountCode, a.id]));

      // Validate all accounts exist
      for (const line of lines) {
        if (!accMap.get(line.accountCode)) {
          throw new Error(`Chart of account not found for code: ${line.accountCode}. Please initialize accounts first.`);
        }
      }

      const jeCount = await db.journalEntry.count({ where: { companyId } });
      const entryNum = `JE${String(jeCount + 1).padStart(6, '0')}`;

      const totalDebit  = lines.reduce((s, l) => s + l.debitAmount,  0);
      const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);

      // ACID: Wrap ALL financial writes atomically in one transaction
      // journal + CoA balances + bank account + bank transaction + cashbook entry + cashbook update
      // If any write fails everything rolls back — no orphaned journal entries possible.
      const atomicResult = await withRetry(() => db.$transaction(async (tx) => {
        const je = await tx.journalEntry.create({
          data: {
            companyId,
            entryNumber: entryNum,
            entryDate,
            referenceType: 'EQUITY_INVESTMENT',
            referenceId: `${companyId}-EQ-${Date.now()}`,
            narration: description || `Owner's Equity Investment - Cash: Rs.${cash.toLocaleString()}, Bank: Rs.${bank.toLocaleString()}`,
            totalDebit,
            totalCredit,
            isAutoEntry: true,
            isApproved: true,
            createdById: createdById || 'system',
            paymentMode: bank > 0 ? 'BANK_TRANSFER' : 'CASH',
            lines: {
              create: lines.map(l => ({
                accountId: accMap.get(l.accountCode)!,
                debitAmount:  l.debitAmount,
                creditAmount: l.creditAmount,
                narration: l.narration || ''
              }))
            }
          }
        });

        // Update chart of account balances
        const accountTypeMap = new Map(accounts.map(a => [a.accountCode, a.accountType as string]));
        for (const line of lines) {
          const accId = accMap.get(line.accountCode)!;
          const accType = accountTypeMap.get(line.accountCode) || 'ASSET';
          const isCreditNormal = accType === 'EQUITY' || accType === 'LIABILITY' || accType === 'INCOME';
          const delta = isCreditNormal
            ? line.creditAmount - line.debitAmount
            : line.debitAmount - line.creditAmount;
          await tx.chartOfAccount.update({
            where: { id: accId },
            data: { currentBalance: { increment: delta } }
          });
        }

        // Update bank account + create bank transaction
        if (bank > 0 && bankAccountId) {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { currentBalance: { increment: bank } }
          });
          await tx.bankTransaction.create({
            data: {
              bankAccountId,
              transactionType: 'CREDIT',
              amount: bank,
              description: description || "Owner's Capital Investment",
              referenceType: 'OPENING_BALANCE',
              referenceId: je.id,
              transactionDate: entryDate,
              balanceAfter: bank, // approximate — real balance read outside tx
              createdById: createdById || 'system',
            }
          });
        }

        // Update CashBook + create CashBookEntry
        if (cash > 0) {
          let cashBook = await tx.cashBook.findUnique({ where: { companyId } });
          if (!cashBook) {
            cashBook = await tx.cashBook.create({
              data: { companyId, openingBalance: 0, currentBalance: 0 }
            });
          }
          const newBalance = (cashBook.currentBalance || 0) + cash;
          await tx.cashBookEntry.create({
            data: {
              cashBookId: cashBook.id,
              entryType: 'CREDIT',
              amount: cash,
              balanceAfter: newBalance,
              description: description || "Owner's Capital Investment (Cash)",
              referenceType: 'OPENING_BALANCE',
              referenceId: je.id,
              entryDate,
              createdById: createdById || 'system'
            }
          });
          await tx.cashBook.update({
            where: { id: cashBook.id },
            data: { currentBalance: newBalance }
          });
        }

        return je.id;
      })); // end withRetry + $transaction

      journalEntryId = atomicResult;
      console.log('[add-equity] All writes committed atomically. JE:', journalEntryId);
    } catch (jeErr) {
      console.error('[add-equity] Step 3 FAILED:', jeErr);
      throw jeErr;
    }


    // Get updated account balances
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
    });
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.OWNERS_CAPITAL }
    });

    return NextResponse.json({
      success: true,
      journalEntryId,
      entryNumber,
      summary: {
        cashAdded: cash,
        bankAdded: bank,
        totalEquity,
        cashBalance: cashAccount?.currentBalance || 0,
        equityBalance: equityAccount?.currentBalance || 0
      },
      message: `Successfully added ${totalEquity.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} as Owner's Equity`
    });

  } catch (error) {
    console.error('[add-equity] Error adding equity:', error);
    // Log specific Prisma errors
    if (error instanceof Error) {
      console.error('[add-equity] Error message:', error.message);
      console.error('[add-equity] Error stack:', error.stack);
      // Check for known Prisma error codes
      const prismaError = error as any;
      if (prismaError.code) {
        console.error('[add-equity] Prisma error code:', prismaError.code);
        console.error('[add-equity] Prisma meta:', prismaError.meta);
      }
    }
    return NextResponse.json({
      error: 'Failed to add equity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
