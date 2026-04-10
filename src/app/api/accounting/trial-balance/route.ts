import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE API — LIVE COMPUTED
 *
 * Balances are computed LIVE from JournalEntryLines.
 * The generic "Bank Account (1102)" is HIDDEN when the company has real bank accounts.
 * Instead, each actual BankAccount is shown as an ASSET row with its real balance.
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

    // ── 1b. Get real bank accounts ────────────────────────────────────
    const realBankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const hasRealBankAccounts = realBankAccounts.length > 0;

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

    // Journal activity for the generic 1102 account (tracked internally)
    const genericBank1102 = accounts.find(a => a.accountCode === '1102');
    const bank1102Txn = genericBank1102
      ? (txnMap[genericBank1102.id] || { totalDebit: 0, totalCredit: 0 })
      : { totalDebit: 0, totalCredit: 0 };

    // ── 3. Build trial balance ────────────────────────────────────────
    const trialBalance: any[] = [];
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    for (const account of accounts) {
      // HIDE generic Bank Account (1102) if real banks exist
      if (account.accountCode === '1102' && hasRealBankAccounts) continue;

      const isDebitNormal = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';
      const txn = txnMap[account.id] || { totalDebit: 0, totalCredit: 0 };
      const openingBalance = account.openingBalance || 0;

      let closingBalance: number;
      if (isDebitNormal) {
        closingBalance = openingBalance + txn.totalDebit - txn.totalCredit;
      } else {
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

    // ── 3b. Inject real bank accounts into trial balance ──────────────
    if (hasRealBankAccounts) {
      for (const bank of realBankAccounts) {
        const bankBalance = bank.currentBalance || 0;
        const debitBalance = bankBalance >= 0 ? bankBalance : 0;
        const creditBalance = bankBalance < 0 ? Math.abs(bankBalance) : 0;
        totalDebitBalance += debitBalance;
        totalCreditBalance += creditBalance;

        trialBalance.push({
          accountId: `bank-${bank.id}`,
          accountCode: `BANK-${bank.id.slice(-4).toUpperCase()}`,
          accountName: `${bank.bankName} - ${bank.accountName}`,
          accountType: 'ASSET',
          openingBalance: bank.openingBalance || 0,
          totalDebit: bank1102Txn.totalDebit,
          totalCredit: bank1102Txn.totalCredit,
          closingBalance: bankBalance,
          debitBalance,
          creditBalance,
          isRealBank: true,
        });
      }
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
          totalAccounts: trialBalance.length,
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



