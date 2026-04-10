import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE API — LIVE COMPUTED
 *
 * Strategy for bank accounts:
 *  - KEEP 1102 "Bank Account" in trial balance (journal-computed) → keeps it balanced.
 *  - RENAME 1102 to the real bank name (e.g. "HDFC Bank - My Account").
 *  - HIDE user-created duplicate ChartOfAccount rows (e.g. 1401) that have no journal entries.
 *
 * ASSET / EXPENSE → normal balance = DEBIT  → opening + totalDebit - totalCredit
 * LIABILITY / EQUITY / INCOME → CREDIT      → opening + totalCredit - totalDebit
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

    // ── 1. ChartOfAccount rows ────────────────────────────────────────
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    });

    // ── 1b. Real BankAccount records for display name ─────────────────
    const realBankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const hasRealBankAccounts = realBankAccounts.length > 0;

    // Display name for 1102 row
    const bankDisplayName = hasRealBankAccounts
      ? realBankAccounts.map(b => `${b.bankName} - ${b.accountName}`).join(' / ')
      : 'Bank Account';

    // Identify user-added ChartOfAccount codes that duplicate actual bank accounts (hide these)
    const userBankDuplicateCodes = new Set<string>();
    if (hasRealBankAccounts) {
      for (const coa of accounts) {
        if (coa.accountCode === '1102') continue;
        const isDuplicate = realBankAccounts.some(rb =>
          rb.accountName?.toLowerCase() === coa.accountName?.toLowerCase() ||
          rb.bankName?.toLowerCase().includes(coa.accountName?.toLowerCase() || '') ||
          coa.accountName?.toLowerCase().includes(rb.bankName?.toLowerCase() || '') ||
          coa.accountName?.toLowerCase().includes(rb.accountNumber?.slice(-4) || '')
        );
        if (isDuplicate) userBankDuplicateCodes.add(coa.accountCode);
      }
    }

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          trialBalance: [],
          groupedByType: { ASSET: [], LIABILITY: [], EQUITY: [], INCOME: [], EXPENSE: [] },
          summary: {
            totalAccounts: 0, totalDebitBalance: 0, totalCreditBalance: 0,
            isBalanced: true, difference: 0, totalTransactions: 0, asOfDate: dateFilter,
          },
        },
      });
    }

    // ── 2. Live journal entry aggregation ────────────────────────────
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

    // ── 3. Build trial balance rows ───────────────────────────────────
    const trialBalance: any[] = [];
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    for (const account of accounts) {
      // Skip user-created bank duplicates (e.g. 1401) — no journal entries → always ₹0
      if (userBankDuplicateCodes.has(account.accountCode)) continue;

      const isDebitNormal = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';
      const txn = txnMap[account.id] || { totalDebit: 0, totalCredit: 0 };
      const openingBalance = account.openingBalance || 0;

      const closingBalance = isDebitNormal
        ? openingBalance + txn.totalDebit - txn.totalCredit
        : openingBalance + txn.totalCredit - txn.totalDebit;

      let debitBalance = 0;
      let creditBalance = 0;

      if (isDebitNormal) {
        if (closingBalance >= 0) { debitBalance = closingBalance; totalDebitBalance += closingBalance; }
        else { creditBalance = Math.abs(closingBalance); totalCreditBalance += Math.abs(closingBalance); }
      } else {
        if (closingBalance >= 0) { creditBalance = closingBalance; totalCreditBalance += closingBalance; }
        else { debitBalance = Math.abs(closingBalance); totalDebitBalance += Math.abs(closingBalance); }
      }

      const isBank1102 = account.accountCode === '1102' && hasRealBankAccounts;

      trialBalance.push({
        accountId: account.id,
        accountCode: isBank1102 ? 'BANK' : account.accountCode,
        accountName: isBank1102 ? bankDisplayName : account.accountName,
        accountType: account.accountType,
        openingBalance,
        totalDebit: txn.totalDebit,
        totalCredit: txn.totalCredit,
        closingBalance,
        debitBalance,
        creditBalance,
        isRealBank: isBank1102,
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
    return NextResponse.json(
      { error: 'Failed to fetch trial balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
