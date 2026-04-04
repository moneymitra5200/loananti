import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE API
 * 
 * Shows all accounts with their debit/credit balances
 * Verifies: Total Debits = Total Credits
 * 
 * GnuCash-Style: All accounts grouped by type with running totals
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
    }> = [];

    let totalDebitBalance = 0;
    let totalCreditBalance = 0;
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;

    for (const account of accounts) {
      const balances = accountBalances[account.id];
      const isDebitAccount = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';

      // Calculate closing balance based on account type
      let closingBalance = balances.openingBalance;
      if (isDebitAccount) {
        // Debit accounts: Debit increases, Credit decreases
        closingBalance += balances.totalDebit - balances.totalCredit;
      } else {
        // Credit accounts: Credit increases, Debit decreases
        closingBalance += balances.totalCredit - balances.totalDebit;
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

      // Opening balance summary
      if (balances.openingBalance > 0) {
        if (isDebitAccount) {
          totalOpeningDebit += balances.openingBalance;
        } else {
          totalOpeningCredit += balances.openingBalance;
        }
      }

      trialBalance.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        openingBalance: balances.openingBalance,
        totalDebit: balances.totalDebit,
        totalCredit: balances.totalCredit,
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
