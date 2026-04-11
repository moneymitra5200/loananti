import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * ENHANCED TRIAL BALANCE / BALANCE SHEET
 *
 * Unified source of truth: ChartOfAccount.currentBalance
 * 
 * Left side  (Liabilities + Equity): Equity + BorrowedFunds + Other Liabilities
 * Right side (Assets):               Cash + Bank + LoansReceivable + Investments + FixedAssets
 *
 * IMPORTANT: We no longer rely on DaybookEntry. All balances come from:
 *  - ChartOfAccount.currentBalance  (for journal-based balances)
 *  - BankAccount.currentBalance     (actual bank balances)
 *  - CashBook.currentBalance        (actual cash balance)
 *  - LoanApplication + OfflineLoan  (actual outstanding principal)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // ─── 1. BANK BALANCE ───────────────────────────────────────────────────
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
    });
    // Issue: Bank Account in chart = sum of ALL banks (not individual names)
    const bankBalance = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

    // ─── 2. CASHBOOK BALANCE ──────────────────────────────────────────────
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });
    const cashbookBalance = cashBook?.currentBalance || 0;

    // ─── 3. LOANS RECEIVABLE (Outstanding principal) ──────────────────────
    const onlineLoans = await db.loanApplication.findMany({
      where: { companyId, status: { in: ['DISBURSED', 'ACTIVE', 'ACTIVE_INTEREST_ONLY'] } },
      include: { emiSchedules: true },
    });

    let loanPrincipal = 0;
    const loanDetails: any[] = [];

    for (const loan of onlineLoans) {
      const outstanding = loan.emiSchedules.reduce(
        (s, emi) => s + (emi.principalAmount - (emi.paidPrincipal || 0)),
        0
      );
      loanPrincipal += outstanding;
      if (outstanding > 0) {
        loanDetails.push({
          loanNo: loan.applicationNo,
          customer: `${loan.firstName || ''} ${loan.lastName || ''}`.trim(),
          outstanding,
          type: 'ONLINE',
        });
      }
    }

    const offlineLoans = await db.offlineLoan.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY'] } },
      include: { emis: true },
    });

    for (const loan of offlineLoans) {
      const outstanding = loan.emis.reduce(
        (s, emi) => s + (emi.principalAmount - (emi.paidPrincipal || 0)),
        0
      );
      loanPrincipal += outstanding;
      if (outstanding > 0) {
        loanDetails.push({
          loanNo: loan.loanNumber,
          customer: loan.customerName,
          outstanding,
          type: 'OFFLINE',
        });
      }
    }

    // ─── 4. INTEREST RECEIVABLE (Pending interest on active loans) ────────
    let interestReceivable = 0;
    const interestDetails: any[] = [];

    for (const loan of onlineLoans) {
      const pending = loan.emiSchedules.reduce(
        (s, emi) => s + (emi.interestAmount - (emi.paidInterest || 0)),
        0
      );
      interestReceivable += pending;
      if (pending > 0) {
        interestDetails.push({
          loanNo: loan.applicationNo,
          customer: `${loan.firstName || ''} ${loan.lastName || ''}`.trim(),
          pendingInterest: pending,
        });
      }
    }

    for (const loan of offlineLoans) {
      const pending = loan.emis.reduce(
        (s, emi) => s + (emi.interestAmount - (emi.paidInterest || 0)),
        0
      );
      interestReceivable += pending;
      if (pending > 0) {
        interestDetails.push({
          loanNo: loan.loanNumber,
          customer: loan.customerName,
          pendingInterest: pending,
        });
      }
    }

    // ─── 5. INVEST MONEY (Fixed deposits, FDs, etc.) ─────────────────────
    const investMoney = await db.investMoney.findMany({ where: { companyId } });
    const totalInvested = investMoney.reduce((s, i) => s + i.amount, 0);

    // ─── 6. EQUITY ────────────────────────────────────────────────────────
    // Source of truth: Owner's Capital (3002) in ChartOfAccount
    const ownerCapitalAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '3002' },
    });

    // Fallback: sum equityEntry table if CoA not populated yet
    const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
    const totalEquityFromEntries = equityEntries.reduce((sum, e) => {
      return e.entryType === 'WITHDRAWAL' ? sum - e.amount : sum + e.amount;
    }, 0);

    const totalEquity = ownerCapitalAccount?.currentBalance ?? totalEquityFromEntries;

    // ─── 7. P&L from JournalEntryLine (CORRECT system) ───────────────────
    const incomeAccounts  = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'INCOME', isActive: true },
    });
    const expenseAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'EXPENSE', isActive: true },
    });

    // For income accounts: positive currentBalance = credit = income
    const totalIncome   = incomeAccounts.reduce((s, a)  => s + Math.max(0, a.currentBalance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => s + Math.max(0, a.currentBalance || 0), 0);
    const netProfitLoss = totalIncome - totalExpenses;
    const isProfit = netProfitLoss >= 0;

    // ─── 8. BORROWED MONEY ────────────────────────────────────────────────
    const borrowedMoney = await db.borrowedMoney.findMany({ where: { companyId } });
    const totalBorrowed = borrowedMoney.reduce(
      (s, b) => s + (b.amount - (b.amountRepaid || 0)),
      0
    );

    // ─── 9. Build Balance Sheet sides ─────────────────────────────────────
    const finalEquity = totalEquity + netProfitLoss;

    const totalLiabilities = finalEquity + totalBorrowed;
    const totalAssets =
      cashbookBalance + bankBalance + loanPrincipal + interestReceivable + totalInvested;

    const difference = Math.abs(totalLiabilities - totalAssets);
    const isBalanced = difference < 1;

    return NextResponse.json({
      leftSide: {
        equity: {
          total:   totalEquity,
          entries: equityEntries.map(e => ({
            ...e,
            type:   e.entryType,
            amount: e.entryType === 'WITHDRAWAL' ? -e.amount : e.amount,
          })),
        },
        borrowedMoney: {
          total:   totalBorrowed,
          entries: borrowedMoney,
        },
        finalEquity: {
          initialEquity: totalEquity,
          netProfitLoss,
          finalEquity,
          isProfit,
        },
        totalLiabilities,
      },
      rightSide: {
        investMoney: {
          total:   totalInvested,
          entries: investMoney,
        },
        bankBalance: {
          // Single aggregated total (sum of all bank accounts) — no individual bank names in chart
          total:       bankBalance,
          label:       'Bank Account',
          // Per-account detail available separately (for reconciliation)
          accounts: bankAccounts.map(b => ({
            bankName:      b.bankName,
            accountNumber: b.accountNumber,
            balance:       b.currentBalance,
          })),
        },
        cashbookBalance: {
          total:      cashbookBalance,
          hasCashBook: !!cashBook,
        },
        loanPrincipal: {
          total:           loanPrincipal,
          loans:           loanDetails,
          activeLoanCount: loanDetails.length,
        },
        interestReceivable: {
          total:   interestReceivable,
          details: interestDetails,
        },
        totalAssets,
      },
      summary: {
        totalLiabilities,
        totalAssets,
        difference,
        isBalanced,
        netWorth: totalAssets - totalBorrowed,
      },
      profitLoss: {
        income:     { total: totalIncome },
        expenses:   { total: totalExpenses },
        netProfitLoss,
      },
    });
  } catch (error) {
    console.error('Error calculating balance sheet:', error);
    return NextResponse.json({ error: 'Failed to calculate balance sheet' }, { status: 500 });
  }
}
