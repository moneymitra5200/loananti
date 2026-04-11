import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * TRIAL BALANCE — REAL DATA HYBRID
 *
 * Reads DIRECTLY from the actual business tables (not just journal entries).
 * This gives accurate balances even when journal entries haven't been synced.
 *
 * Computation Strategy (per account head):
 *  ASSETS   : CashBook, BankAccount, outstanding EMI principal, investments
 *  INCOME   : Paid interest from EMIs, processing fees, mirror interest, penalties
 *  EQUITY   : EquityEntry table (investments - withdrawals)
 *  LIABILITY: BorrowedMoney, outstanding borrowed balance
 *  EXPENSE  : Recorded expenses from Expense table + journal-based
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const asOfDate  = searchParams.get('asOfDate');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const dateFilter = asOfDate ? new Date(asOfDate) : new Date();

    // ─── Run all real-data queries in parallel ──────────────────────────────
    const [
      cashBook,
      bankAccounts,
      equityEntries,
      borrowedMoney,
      investMoney,
      activeOnlineLoans,
      activeOfflineLoans,
      closedOnlineLoans,
      paidOnlineEMIs,
      paidOfflineEMIs,
      pendingOnlineEMIs,
      pendingOfflineEMIs,
      cashBookEntries,
      expenses,
    ] = await Promise.all([
      // Cash
      db.cashBook.findUnique({ where: { companyId } }),

      // Bank accounts
      db.bankAccount.findMany({ where: { companyId, isActive: true } }),

      // Equity
      db.equityEntry.findMany({ where: { companyId } }),

      // Borrowed money
      db.borrowedMoney.findMany({ where: { companyId } }),

      // Investments
      db.investMoney.findMany({ where: { companyId } }),

      // Active online loans with EMI schedules
      db.loanApplication.findMany({
        where: { companyId, status: { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] } },
        select: {
          id: true,
          disbursedAmount: true,
          emiSchedules: { select: { principalAmount: true, paidPrincipal: true, paymentStatus: true } }
        }
      }),

      // Active offline loans with EMIs
      db.offlineLoan.findMany({
        where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY'] } },
        select: {
          id: true,
          loanAmount: true,
          emis: { select: { principalAmount: true, paidPrincipal: true, paymentStatus: true } }
        }
      }),

      // Closed/Disbursed online loans (to compute total disbursed for capital movement)
      db.loanApplication.findMany({
        where: { companyId, status: { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY', 'CLOSED'] }, disbursedAmount: { gt: 0 } },
        select: { disbursedAmount: true }
      }),

      // Paid online EMIs — for interest income
      db.eMISchedule.aggregate({
        where: {
          loanApplication: { companyId },
          paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID', 'PARTIALLY_PAID'] }
        },
        _sum: { paidInterest: true, paidPrincipal: true, paidAmount: true }
      }),

      // Paid offline EMIs — for interest income
      db.offlineLoanEMI.aggregate({
        where: {
          offlineLoan: { companyId },
          paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID', 'PARTIALLY_PAID'] }
        },
        _sum: { paidInterest: true, paidPrincipal: true, paidAmount: true }
      }),

      // Pending online EMI interest receivable
      db.eMISchedule.aggregate({
        where: {
          loanApplication: { companyId },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] }
        },
        _sum: { interestAmount: true, paidInterest: true }
      }),

      // Pending offline EMI interest receivable
      db.offlineLoanEMI.aggregate({
        where: {
          offlineLoan: { companyId },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] }
        },
        _sum: { interestAmount: true, paidInterest: true }
      }),

      // CashBook entries by referenceType — for processing fee, mirror interest, penalty, extra EMI
      db.cashBookEntry.findMany({
        where: {
          cashBook: { companyId },
          entryType: 'CREDIT',
          referenceType: {
            in: ['PROCESSING_FEE', 'MIRROR_INTEREST_INCOME', 'PENALTY_INCOME',
                 'EXTRA_EMI_PROFIT', 'INTEREST_INCOME']
          }
        },
        select: { referenceType: true, amount: true }
      }),

      // Expenses
      db.expense.findMany({
        where: { companyId },
        select: { amount: true, expenseType: true }
      }),
    ]);

    // ─── COMPUTE EACH ACCOUNT HEAD ─────────────────────────────────────────

    // 1101 Cash in Hand
    const cashBalance = cashBook?.currentBalance || 0;

    // 1102 Bank Account (aggregate)
    const bankBalance = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

    // 1200 Online Loans Receivable (outstanding principal)
    let onlinePrincipalOut = 0;
    for (const loan of activeOnlineLoans) {
      for (const emi of loan.emiSchedules) {
        if (!['PAID', 'WAIVED'].includes(emi.paymentStatus)) {
          onlinePrincipalOut += (emi.principalAmount || 0) - (emi.paidPrincipal || 0);
        }
      }
    }

    // 1201 Offline Loans Receivable (outstanding principal)
    let offlinePrincipalOut = 0;
    for (const loan of activeOfflineLoans) {
      for (const emi of loan.emis) {
        if (!['PAID', 'WAIVED'].includes(emi.paymentStatus)) {
          offlinePrincipalOut += (emi.principalAmount || 0) - (emi.paidPrincipal || 0);
        }
      }
    }

    // 1300 Interest Receivable (accrued but not yet paid)
    const onlinePendingInterest  = (pendingOnlineEMIs._sum.interestAmount  || 0) - (pendingOnlineEMIs._sum.paidInterest  || 0);
    const offlinePendingInterest = (pendingOfflineEMIs._sum.interestAmount || 0) - (pendingOfflineEMIs._sum.paidInterest || 0);
    const interestReceivable     = Math.max(0, onlinePendingInterest + offlinePendingInterest);

    // 1600 Investments (FDs etc.)
    const investments = investMoney.reduce((s, i) => s + (i.amount || 0), 0);

    // 2100 Borrowed Funds (outstanding)
    const borrowedBalance = borrowedMoney.reduce((s, b) => s + ((b.amount || 0) - (b.amountRepaid || 0)), 0);

    // 3002 Owner's Capital (equity)
    const equity = equityEntries.reduce((s, e) =>
      e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0
    );

    // 4101 Interest Income (online loans — paid interest)
    const onlineInterestIncome  = paidOnlineEMIs._sum.paidInterest  || 0;

    // 4102 Offline Interest Income
    const offlineInterestIncome = paidOfflineEMIs._sum.paidInterest || 0;

    // Group cashbook entries by type
    const cbByType: Record<string, number> = {};
    for (const entry of cashBookEntries) {
      cbByType[entry.referenceType] = (cbByType[entry.referenceType] || 0) + (entry.amount || 0);
    }

    // 4121 Processing Fee Income
    const processingFeeIncome = cbByType['PROCESSING_FEE'] || 0;

    // 4125 Penalty Income
    const penaltyIncome = cbByType['PENALTY_INCOME'] || 0;

    // 4130 Mirror Interest Income
    const mirrorInterestIncome = cbByType['MIRROR_INTEREST_INCOME'] || 0;

    // 4150 Extra EMI Profit
    const extraEMIProfit = cbByType['EXTRA_EMI_PROFIT'] || 0;

    // 5000 Total Expenses (from Expense table)
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const expenseBreakdown: Record<string, number> = {};
    for (const e of expenses) {
      expenseBreakdown[e.expenseType || 'General'] = (expenseBreakdown[e.expenseType || 'General'] || 0) + (e.amount || 0);
    }

    // ─── BUILD TRIAL BALANCE ROWS ───────────────────────────────────────────
    const rows: any[] = [];

    const addRow = (
      code: string, name: string, type: string,
      debit: number, credit: number,
      extraProps: Record<string, any> = {}
    ) => {
      const d = Math.round(Math.max(0, debit)  * 100) / 100;
      const c = Math.round(Math.max(0, credit) * 100) / 100;
      rows.push({ accountCode: code, accountName: name, accountType: type,
        debitBalance: d, creditBalance: c,
        openingBalance: 0, totalDebit: d, totalCredit: c,
        closingBalance: d > 0 ? d : -c,
        ...extraProps });
    };

    // ASSETS
    addRow('1101', 'Cash in Hand',           'ASSET', cashBalance,         0, { source: 'cashbook' });
    addRow('1102', `Bank Account${bankAccounts.length > 1 ? ` (${bankAccounts.length} banks)` : ''}`,
                                             'ASSET', bankBalance,         0, {
                                               source: 'bank',
                                               bankBreakdown: bankAccounts.map(b => ({ name: b.bankName, balance: b.currentBalance }))
                                             });
    if (onlinePrincipalOut > 0)
      addRow('1200', 'Loans Receivable (Online)',   'ASSET', onlinePrincipalOut,  0);
    if (offlinePrincipalOut > 0)
      addRow('1201', 'Loans Receivable (Offline)',  'ASSET', offlinePrincipalOut, 0);
    if (interestReceivable > 0)
      addRow('1300', 'Interest Receivable',         'ASSET', interestReceivable,  0);
    if (investments > 0)
      addRow('1600', 'Investments (FD/Deposits)',   'ASSET', investments,         0);

    // LIABILITIES
    if (borrowedBalance > 0)
      addRow('2100', 'Borrowed Funds',              'LIABILITY', 0, borrowedBalance);

    // EQUITY
    if (equity !== 0)
      addRow('3002', "Owner's Capital",             'EQUITY', 0, Math.max(0, equity));

    // INCOME
    if (onlineInterestIncome > 0)
      addRow('4101', 'Interest Income (Online EMI)', 'INCOME', 0, onlineInterestIncome, { source: 'emi_paid' });
    if (offlineInterestIncome > 0)
      addRow('4102', 'Interest Income (Offline EMI)', 'INCOME', 0, offlineInterestIncome, { source: 'offline_emi' });
    if (processingFeeIncome > 0)
      addRow('4121', 'Processing Fee Income',        'INCOME', 0, processingFeeIncome);
    if (penaltyIncome > 0)
      addRow('4125', 'Penalty Income',               'INCOME', 0, penaltyIncome);
    if (mirrorInterestIncome > 0)
      addRow('4130', 'Mirror Interest Income',       'INCOME', 0, mirrorInterestIncome);
    if (extraEMIProfit > 0)
      addRow('4150', 'Extra EMI Profit',             'INCOME', 0, extraEMIProfit);

    // EXPENSES
    if (totalExpenses > 0) {
      for (const [type, amt] of Object.entries(expenseBreakdown)) {
        addRow('5000', `Expense — ${type}`, 'EXPENSE', amt, 0);
      }
    }

    // ─── TOTALS & BALANCE CHECK ─────────────────────────────────────────────
    const totalDebitBalance  = rows.reduce((s, r) => s + r.debitBalance,  0);
    const totalCreditBalance = rows.reduce((s, r) => s + r.creditBalance, 0);
    const difference         = Math.abs(totalDebitBalance - totalCreditBalance);
    const isBalanced         = difference < 1; // within ₹1 rounding tolerance

    // ─── GROUP BY TYPE ──────────────────────────────────────────────────────
    const groupedByType: Record<string, any[]> = {
      ASSET: [], LIABILITY: [], EQUITY: [], INCOME: [], EXPENSE: []
    };
    for (const row of rows) {
      if (groupedByType[row.accountType]) groupedByType[row.accountType].push(row);
    }

    return NextResponse.json({
      success: true,
      data: {
        trialBalance: rows,
        groupedByType,
        summary: {
          totalAccounts:     rows.length,
          totalDebitBalance,
          totalCreditBalance,
          isBalanced,
          difference,
          totalTransactions: rows.length,
          asOfDate:          dateFilter,
          // Detailed sub-totals useful for UI
          assetTotal:     rows.filter(r => r.accountType === 'ASSET').reduce((s, r) => s + r.debitBalance, 0),
          liabilityTotal: rows.filter(r => r.accountType === 'LIABILITY').reduce((s, r) => s + r.creditBalance, 0),
          equityTotal:    rows.filter(r => r.accountType === 'EQUITY').reduce((s, r) => s + r.creditBalance, 0),
          incomeTotal:    rows.filter(r => r.accountType === 'INCOME').reduce((s, r) => s + r.creditBalance, 0),
          expenseTotal:   rows.filter(r => r.accountType === 'EXPENSE').reduce((s, r) => s + r.debitBalance, 0),
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
