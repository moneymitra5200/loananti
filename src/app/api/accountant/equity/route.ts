import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GNUCASH-STYLE EQUITY API
 * 
 * Proper double-entry accounting for adding owner's equity.
 * 
 * Account Codes (GnuCash Style):
 * - 1101: Cash in Hand (Asset)
 * - 1103: Bank - Main (Asset)
 * - 3002: Owner's Capital (Equity)
 * 
 * Example: Owner invests ₹10,000 (₹5,000 Cash + ₹5,000 Bank)
 * 
 * | Account | Debit | Credit |
 * |---------|-------|--------|
 * | Cash in Hand (1101) | ₹5,000 | - |
 * | Bank - Main (1103) | ₹5,000 | - |
 * | Owner's Capital (3002) | - | ₹10,000 |
 */

// Account code constants
const ACCOUNT_CODES = {
  CASH_IN_HAND: '1101',
  BANK_MAIN: '1103',
  OWNERS_CAPITAL: '3002',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      cashAmount = 0,      // Amount in cash
      bankAmount = 0,      // Amount in bank
      description, 
      createdById 
    } = body;

    const totalAmount = cashAmount + bankAmount;

    if (!companyId || totalAmount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid request. Company ID and at least one amount (cash or bank) are required.' 
      }, { status: 400 });
    }

    // Use transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      // Get or create Owner's Capital account (3002)
      let equityAccount = await tx.chartOfAccount.findFirst({
        where: { 
          companyId, 
          accountCode: ACCOUNT_CODES.OWNERS_CAPITAL
        }
      });

      if (!equityAccount) {
        equityAccount = await tx.chartOfAccount.create({
          data: {
            companyId,
            accountCode: ACCOUNT_CODES.OWNERS_CAPITAL,
            accountName: "Owner's Capital",
            accountType: 'EQUITY',
            description: "Owner's capital investment",
            isSystemAccount: true,
            openingBalance: 0,
            currentBalance: 0,
            isActive: true
          }
        });
      }

      // Build journal entry lines
      const journalLines: Array<{
        accountId: string;
        debitAmount: number;
        creditAmount: number;
        narration: string;
      }> = [];

      // Get or create Cash in Hand account (1101)
      let cashAccount = null;
      if (cashAmount > 0) {
        cashAccount = await tx.chartOfAccount.findFirst({
          where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
        });

        if (!cashAccount) {
          cashAccount = await tx.chartOfAccount.create({
            data: {
              companyId,
              accountCode: ACCOUNT_CODES.CASH_IN_HAND,
              accountName: 'Cash in Hand',
              accountType: 'ASSET',
              description: 'Physical cash on hand',
              isSystemAccount: true,
              openingBalance: 0,
              currentBalance: 0,
              isActive: true
            }
          });
        }

        // Debit: Cash in Hand (Asset increases with debit)
        journalLines.push({
          accountId: cashAccount.id,
          debitAmount: cashAmount,
          creditAmount: 0,
          narration: 'Owner investment - Cash'
        });

        // Update cash account balance (Asset: Debit increases balance)
        await tx.chartOfAccount.update({
          where: { id: cashAccount.id },
          data: { currentBalance: cashAccount.currentBalance + cashAmount }
        });
      }

      // Get or create Bank - Main account (1103)
      let bankAccount = null;
      if (bankAmount > 0) {
        bankAccount = await tx.chartOfAccount.findFirst({
          where: { companyId, accountCode: ACCOUNT_CODES.BANK_MAIN }
        });

        if (!bankAccount) {
          bankAccount = await tx.chartOfAccount.create({
            data: {
              companyId,
              accountCode: ACCOUNT_CODES.BANK_MAIN,
              accountName: 'Bank - Main Operating',
              accountType: 'ASSET',
              description: 'Primary operating bank account',
              isSystemAccount: true,
              openingBalance: 0,
              currentBalance: 0,
              isActive: true
            }
          });
        }

        // Debit: Bank - Main (Asset increases with debit)
        journalLines.push({
          accountId: bankAccount.id,
          debitAmount: bankAmount,
          creditAmount: 0,
          narration: 'Owner investment - Bank'
        });

        // Update bank account balance (Asset: Debit increases balance)
        await tx.chartOfAccount.update({
          where: { id: bankAccount.id },
          data: { currentBalance: bankAccount.currentBalance + bankAmount }
        });
      }

      // Credit: Owner's Capital (Equity increases with credit)
      journalLines.push({
        accountId: equityAccount.id,
        debitAmount: 0,
        creditAmount: totalAmount,
        narration: description || "Owner's capital investment"
      });

      // Update equity account balance (Equity: Credit increases balance)
      const updatedEquityAccount = await tx.chartOfAccount.update({
        where: { id: equityAccount.id },
        data: { currentBalance: equityAccount.currentBalance + totalAmount }
      });

      // Generate entry number
      const count = await tx.journalEntry.count({ where: { companyId } });
      const entryNumber = `JE${String(count + 1).padStart(6, '0')}`;

      // Create journal entry with lines
      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber,
          entryDate: new Date(),
          referenceType: 'EQUITY_INVESTMENT',
          narration: description || `Owner's capital investment - Cash: ₹${cashAmount}, Bank: ₹${bankAmount}`,
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          isAutoEntry: false,
          isApproved: true,
          createdById: createdById || 'system',
          lines: {
            create: journalLines
          }
        },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      });

      return {
        journalEntry,
        equityBalance: updatedEquityAccount.currentBalance,
        cashBalance: cashAccount?.currentBalance || 0,
        bankBalance: bankAccount?.currentBalance || 0
      };
    }, { maxWait: 30000, timeout: 60000 });

    return NextResponse.json({ 
      success: true, 
      message: 'Equity added successfully',
      entryNumber: result.journalEntry.entryNumber,
      journalEntry: result.journalEntry,
      summary: {
        cashAdded: cashAmount,
        bankAdded: bankAmount,
        totalEquity: totalAmount,
        newEquityBalance: result.equityBalance,
        cashBalance: result.cashBalance,
        bankBalance: result.bankBalance
      }
    });

  } catch (error) {
    console.error('Error adding equity:', error);
    return NextResponse.json({ 
      error: 'Failed to add equity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get Owner's Capital account
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: ACCOUNT_CODES.OWNERS_CAPITAL
      }
    });

    // Get Cash in Hand account
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: ACCOUNT_CODES.CASH_IN_HAND
      }
    });

    // Get Bank - Main account
    const bankAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: ACCOUNT_CODES.BANK_MAIN
      }
    });

    // Get all equity journal entries
    const equityEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        referenceType: 'EQUITY_INVESTMENT'
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      },
      orderBy: { entryDate: 'desc' }
    });

    return NextResponse.json({ 
      equity: equityAccount?.currentBalance || 0,
      cashInHand: cashAccount?.currentBalance || 0,
      bankBalance: bankAccount?.currentBalance || 0,
      accounts: {
        equity: equityAccount,
        cash: cashAccount,
        bank: bankAccount
      },
      entries: equityEntries
    });

  } catch (error) {
    console.error('Error fetching equity:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch equity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
