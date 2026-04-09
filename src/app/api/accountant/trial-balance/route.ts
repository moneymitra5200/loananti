import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE API for Accountant Dashboard
 * 
 * Shows all accounts with their debit/credit balances
 * Verifies: Total Debits = Total Credits
 * 
 * GnuCash-Style: All accounts grouped by type with running totals
 * 
 * IMPORTANT: For Bank Account (1102) and Cash in Hand (1101),
 * we use the ACTUAL balances from BankAccount and CashBook tables
 * as the source of truth, NOT journal entries.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const asOfDate = searchParams.get('asOfDate');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const dateFilter = asOfDate ? new Date(asOfDate) : new Date();

    // Get all active accounts for this company
    const accounts = await db.chartOfAccount.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: [
        { accountType: 'asc' },
        { accountCode: 'asc' },
      ],
    });

    // Get ACTUAL bank balance from BankAccount table (source of truth for 1102)
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { currentBalance: true, openingBalance: true }
    });
    const actualBankBalance = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    const bankOpeningBalance = bankAccounts.reduce((sum, b) => sum + (b.openingBalance || 0), 0);
    
    // Get ACTUAL cash balance from CashBook table (source of truth for 1101)
    const cashBook = await db.cashBook.findUnique({
      where: { companyId },
      select: { currentBalance: true, openingBalance: true }
    });
    const actualCashBalance = cashBook?.currentBalance || 0;
    const cashOpeningBalance = cashBook?.openingBalance || 0;

    console.log(`[Trial Balance] Bank Balance: ${actualBankBalance}, Cash Balance: ${actualCashBalance}`);

    // Get all journal entries up to the as-of date
    const journalEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        entryDate: { lte: dateFilter },
        isApproved: true,
        isReversed: false,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    // Calculate balances from journal entries
    const accountBalances: Record<string, {
      totalDebit: number;
      totalCredit: number;
      openingBalance: number;
    }> = {};

    for (const account of accounts) {
      accountBalances[account.id] = {
        totalDebit: 0,
        totalCredit: 0,
        openingBalance: account.openingBalance || 0,
      };
    }

    // Sum up all journal entry lines
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        if (accountBalances[line.accountId]) {
          accountBalances[line.accountId].totalDebit += line.debitAmount;
          accountBalances[line.accountId].totalCredit += line.creditAmount;
        }
      }
    }

    // Build trial balance
    const trialBalance: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      openingBalance: number;
      totalDebit: number;
      totalCredit: number;
      closingBalance: number;
      debitBalance: number;
      creditBalance: number;
      isActualBalance?: boolean; // Flag to indicate this is from actual balance
    }> = [];

    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    for (const account of accounts) {
      const balances = accountBalances[account.id];
      const isDebitAccount = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';
      
      // SPECIAL HANDLING for Bank Account (1102) and Cash in Hand (1101)
      // Use ACTUAL balance from BankAccount/CashBook tables as source of truth
      let closingBalance: number;
      let openingBalance: number;
      let isActualBalance = false;
      
      if (account.accountCode === '1102') {
        // Bank Account - use actual balance from BankAccount table
        closingBalance = actualBankBalance;
        openingBalance = bankOpeningBalance;
        isActualBalance = true;
        console.log(`[Trial Balance] Account 1102 (Bank) - Using actual balance: ${actualBankBalance}`);
      } else if (account.accountCode === '1101') {
        // Cash in Hand - use actual balance from CashBook table
        closingBalance = actualCashBalance;
        openingBalance = cashOpeningBalance;
        isActualBalance = true;
        console.log(`[Trial Balance] Account 1101 (Cash) - Using actual balance: ${actualCashBalance}`);
      } else {
        // Other accounts - calculate from journal entries
        openingBalance = balances.openingBalance;
        closingBalance = balances.openingBalance;
        if (isDebitAccount) {
          // Debit accounts: Debit increases, Credit decreases
          closingBalance += balances.totalDebit - balances.totalCredit;
        } else {
          // Credit accounts: Credit increases, Debit decreases
          closingBalance += balances.totalCredit - balances.totalDebit;
        }
      }

      // Determine debit/credit balance for trial balance
      let debitBalance = 0;
      let creditBalance = 0;

      if (isDebitAccount) {
        if (closingBalance >= 0) {
          debitBalance = closingBalance;
          totalDebitBalance += closingBalance;
        } else {
          creditBalance = Math.abs(closingBalance);
          totalCreditBalance += Math.abs(closingBalance);
        }
      } else {
        if (closingBalance >= 0) {
          creditBalance = closingBalance;
          totalCreditBalance += closingBalance;
        } else {
          debitBalance = Math.abs(closingBalance);
          totalDebitBalance += Math.abs(closingBalance);
        }
      }

      trialBalance.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        openingBalance,
        totalDebit: balances.totalDebit,
        totalCredit: balances.totalCredit,
        closingBalance,
        debitBalance,
        creditBalance,
        isActualBalance,
      });
    }

    const isBalanced = Math.abs(totalDebitBalance - totalCreditBalance) < 0.01;

    return NextResponse.json({
      success: true,
      trialBalance,
      totalDebits: totalDebitBalance,
      totalCredits: totalCreditBalance,
      isBalanced,
      difference: Math.abs(totalDebitBalance - totalCreditBalance),
      accountCount: accounts.length,
      entryCount: journalEntries.length,
      asOfDate: dateFilter,
      // Include actual balances for reference
      actualBalances: {
        bank: actualBankBalance,
        cash: actualCashBalance
      }
    });
  } catch (error) {
    console.error('Trial balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
