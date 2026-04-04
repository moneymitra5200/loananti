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

    // Find or create Owner's Capital account (3002)
    let equityAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: ACCOUNT_CODES.OWNERS_CAPITAL
      }
    });

    if (!equityAccount) {
      equityAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: ACCOUNT_CODES.OWNERS_CAPITAL,
          accountName: "Owner's Capital",
          accountType: 'EQUITY',
          description: "Owner's capital investment",
          isSystemAccount: true,
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

    // Find or create Cash in Hand account (1101)
    if (cashAmount > 0) {
      let cashAccount = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
      });

      if (!cashAccount) {
        cashAccount = await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: ACCOUNT_CODES.CASH_IN_HAND,
            accountName: 'Cash in Hand',
            accountType: 'ASSET',
            description: 'Physical cash on hand',
            isSystemAccount: true,
            currentBalance: 0,
            isActive: true
          }
        });
      }

      // Debit: Cash in Hand
      journalLines.push({
        accountId: cashAccount.id,
        debitAmount: cashAmount,
        creditAmount: 0,
        narration: 'Owner investment - Cash'
      });

      // Update cash account balance
      await db.chartOfAccount.update({
        where: { id: cashAccount.id },
        data: { currentBalance: cashAccount.currentBalance + cashAmount }
      });
    }

    // Find or create Bank - Main account (1103)
    if (bankAmount > 0) {
      let bankAccount = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: ACCOUNT_CODES.BANK_MAIN }
      });

      if (!bankAccount) {
        bankAccount = await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: ACCOUNT_CODES.BANK_MAIN,
            accountName: 'Bank - Main Operating',
            accountType: 'ASSET',
            description: 'Primary operating bank account',
            isSystemAccount: true,
            currentBalance: 0,
            isActive: true
          }
        });
      }

      // Debit: Bank - Main
      journalLines.push({
        accountId: bankAccount.id,
        debitAmount: bankAmount,
        creditAmount: 0,
        narration: 'Owner investment - Bank'
      });

      // Update bank account balance
      await db.chartOfAccount.update({
        where: { id: bankAccount.id },
        data: { currentBalance: bankAccount.currentBalance + bankAmount }
      });
    }

    // Credit: Owner's Capital (Equity)
    journalLines.push({
      accountId: equityAccount.id,
      debitAmount: 0,
      creditAmount: totalAmount,
      narration: description || "Owner's capital investment"
    });

    // Update equity account balance
    await db.chartOfAccount.update({
      where: { id: equityAccount.id },
      data: { currentBalance: equityAccount.currentBalance + totalAmount }
    });

    // Generate entry number
    const count = await db.journalEntry.count({ where: { companyId } });
    const entryNumber = `JE${String(count + 1).padStart(6, '0')}`;

    // Create journal entry
    const journalEntry = await db.journalEntry.create({
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

    return NextResponse.json({ 
      success: true, 
      message: 'Equity added successfully',
      entryNumber: journalEntry.entryNumber,
      journalEntry,
      summary: {
        cashAdded: cashAmount,
        bankAdded: bankAmount,
        totalEquity: totalAmount,
        newEquityBalance: equityAccount.currentBalance + totalAmount
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

    return NextResponse.json({ 
      equity: equityAccount?.currentBalance || 0,
      cashInHand: cashAccount?.currentBalance || 0,
      bankBalance: bankAccount?.currentBalance || 0,
      accounts: {
        equity: equityAccount,
        cash: cashAccount,
        bank: bankAccount
      }
    });

  } catch (error) {
    console.error('Error fetching equity:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch equity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
