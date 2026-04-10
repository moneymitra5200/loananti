import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE API — LIVE COMPUTED
 *
 * Balances are computed LIVE from JournalEntryLines,
 * not from the stale currentBalance field.
 *
 * ASSET / EXPENSE  → normal balance = DEBIT   → balance = totalDebit - totalCredit
 * LIABILITY / EQUITY / INCOME → normal balance = CREDIT → balance = totalCredit - totalDebit
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

    // ── 1. Get all active accounts for this company ─────────────────
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          trialBalance: [],
          groupedByType: { ASSET: [], LIABILITY: [], EQUITY: [], INCOME: [], EXPENSE: [] },
          summary: { totalAccounts: 0, totalDebitBalance: 0, totalCreditBalance: 0, isBalanced: true, difference: 0, totalTransactions: 0, asOfDate: dateFilter },
        },
      });
    }

    // ── 2. Aggregate journal entry lines per account (LIVE) ──────────
    const lineAgg = await db.journalEntryLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: {
          companyId,
          entryDate: { lte: dateFilter },
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

    // ── 3. Build trial balance ────────────────────────────────────────
    const trialBalance: any[] = [];
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    for (const account of accounts) {
      const isDebitNormal = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';
      const txn = txnMap[account.id] || { totalDebit: 0, totalCredit: 0 };
      const openingBalance = account.openingBalance || 0;

      // Compute closing balance from journal entries + opening balance
      let closingBalance: number;
      if (isDebitNormal) {
        // For assets/expenses: opening is a debit balance
        closingBalance = openingBalance + txn.totalDebit - txn.totalCredit;
      } else {
        // For liabilities/equity/income: opening is a credit balance
        closingBalance = openingBalance + txn.totalCredit - txn.totalDebit;
      }

      let debitBalance = 0;
      let creditBalance = 0;

      if (isDebitNormal) {
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
        totalDebit: txn.totalDebit,
        totalCredit: txn.totalCredit,
        closingBalance,
        debitBalance,
        creditBalance,
      });
    }

    // ── 4. Group by type ─────────────────────────────────────────────
    const groupedByType: Record<string, typeof trialBalance> = {
      ASSET: [], LIABILITY: [], EQUITY: [], INCOME: [], EXPENSE: [],
    };
    for (const item of trialBalance) {
      if (groupedByType[item.accountType]) groupedByType[item.accountType].push(item);
    }

    return NextResponse.json({
      success: true,
      data: {
        trialBalance,
        groupedByType,
        summary: {
          totalAccounts: accounts.length,
          totalDebitBalance,
          totalCreditBalance,
          isBalanced: Math.abs(totalDebitBalance - totalCreditBalance) < 0.01,
          difference: Math.abs(totalDebitBalance - totalCreditBalance),
          totalTransactions: lineAgg.length,
          asOfDate: dateFilter,
        },
      },
    });
  } catch (error) {
    console.error('Trial balance error:', error);
    return NextResponse.json({ error: 'Failed to fetch trial balance', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
