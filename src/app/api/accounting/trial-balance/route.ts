import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE API
 * 
 * Shows all accounts with their debit/credit balances
 * Verifies: Total Debits = Total Credits
 * 
 * GnuCash-Style: All accounts grouped by type with running totals
 * 
 * IMPORTANT: Uses currentBalance from ChartOfAccount as primary source of truth
 * This ensures balances reflect all transactions including those without journal entries
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

    // If no accounts exist, return empty trial balance
    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          trialBalance: [],
          groupedByType: {
            ASSET: [],
            LIABILITY: [],
            EQUITY: [],
            INCOME: [],
            EXPENSE: [],
          },
          summary: {
            totalAccounts: 0,
            totalDebitBalance: 0,
            totalCreditBalance: 0,
            isBalanced: true,
            difference: 0,
            totalOpeningDebit: 0,
            totalOpeningCredit: 0,
            totalTransactions: 0,
            asOfDate: dateFilter,
          },
        },
      });
    }

    // Get all journal entries up to the as-of date for transaction counts
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

    // Build trial balance using currentBalance as primary source
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
    }> = [];

    let totalDebitBalance = 0;
    let totalCreditBalance = 0;
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;

    // Calculate transaction totals from journal entries
    const accountTransactions: Record<string, { totalDebit: number; totalCredit: number }> = {};
    for (const account of accounts) {
      accountTransactions[account.id] = { totalDebit: 0, totalCredit: 0 };
    }

    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        if (accountTransactions[line.accountId]) {
          accountTransactions[line.accountId].totalDebit += line.debitAmount;
          accountTransactions[line.accountId].totalCredit += line.creditAmount;
        }
      }
    }

    for (const account of accounts) {
      const isDebitAccount = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';
      
      // Use currentBalance as the closing balance (this is the source of truth)
      const closingBalance = account.currentBalance || 0;
      const openingBalance = account.openingBalance || 0;
      const txnTotals = accountTransactions[account.id] || { totalDebit: 0, totalCredit: 0 };

      // Determine debit/credit balance for trial balance
      let debitBalance = 0;
      let creditBalance = 0;

      if (isDebitAccount) {
        // Debit accounts: positive balance = debit
        if (closingBalance >= 0) {
          debitBalance = closingBalance;
          totalDebitBalance += closingBalance;
        } else {
          creditBalance = Math.abs(closingBalance);
          totalCreditBalance += Math.abs(closingBalance);
        }
      } else {
        // Credit accounts: positive balance = credit
        if (closingBalance >= 0) {
          creditBalance = closingBalance;
          totalCreditBalance += closingBalance;
        } else {
          debitBalance = Math.abs(closingBalance);
          totalDebitBalance += Math.abs(closingBalance);
        }
      }

      // Opening balance summary
      if (openingBalance > 0) {
        if (isDebitAccount) {
          totalOpeningDebit += openingBalance;
        } else {
          totalOpeningCredit += openingBalance;
        }
      }

      trialBalance.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        openingBalance,
        totalDebit: txnTotals.totalDebit,
        totalCredit: txnTotals.totalCredit,
        closingBalance,
        debitBalance,
        creditBalance,
      });
    }

    // Group by account type
    const groupedByType: Record<string, typeof trialBalance> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      INCOME: [],
      EXPENSE: [],
    };

    for (const item of trialBalance) {
      if (groupedByType[item.accountType]) {
        groupedByType[item.accountType].push(item);
      }
    }

    // Summary
    const summary = {
      totalAccounts: accounts.length,
      totalDebitBalance,
      totalCreditBalance,
      isBalanced: Math.abs(totalDebitBalance - totalCreditBalance) < 0.01,
      difference: Math.abs(totalDebitBalance - totalCreditBalance),
      totalOpeningDebit,
      totalOpeningCredit,
      totalTransactions: journalEntries.length,
      asOfDate: dateFilter,
    };

    return NextResponse.json({
      success: true,
      data: {
        trialBalance,
        groupedByType,
        summary,
      },
    });
  } catch (error) {
    console.error('Trial balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
