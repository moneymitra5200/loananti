import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * ENHANCED PROFIT & LOSS API
 *
 * Reads from the modern double-entry system:
 * - Income = CREDITs on INCOME-type ChartOfAccount accounts
 * - Expenses = DEBITs on EXPENSE-type ChartOfAccount accounts
 *
 * This is the CORRECT source of truth since all EMI payments, disbursements,
 * fees etc. flow through JournalEntryLine → ChartOfAccount.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // ---- INCOME ----
    // Get all ChartOfAccount entries of type INCOME for this company
    const incomeAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'INCOME', isActive: true },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              companyId,
              isApproved: true,
              isReversed: false,
              ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
            },
          },
          include: { journalEntry: { select: { entryDate: true, referenceType: true, narration: true } } },
        },
      },
    });

    // ---- EXPENSES ----
    const expenseAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'EXPENSE', isActive: true },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              companyId,
              isApproved: true,
              isReversed: false,
              ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
            },
          },
          include: { journalEntry: { select: { entryDate: true, referenceType: true, narration: true } } },
        },
      },
    });

    // Calculate income per account (credits on INCOME accounts = income)
    const incomeBreakdown = incomeAccounts.map(acc => {
      const totalCredit = acc.journalLines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
      const totalDebit  = acc.journalLines.reduce((sum, l) => sum + (l.debitAmount  || 0), 0);
      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        amount: totalCredit - totalDebit,   // net credit = income
        entryCount: acc.journalLines.length,
      };
    }).filter(a => a.amount !== 0);

    // Calculate expenses per account (debits on EXPENSE accounts = expense)
    const expenseBreakdown = expenseAccounts.map(acc => {
      const totalDebit  = acc.journalLines.reduce((sum, l) => sum + (l.debitAmount  || 0), 0);
      const totalCredit = acc.journalLines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        amount: totalDebit - totalCredit,   // net debit = expense
        entryCount: acc.journalLines.length,
      };
    }).filter(a => a.amount !== 0);

    const totalIncome   = incomeBreakdown.reduce((s, a) => s + a.amount, 0);
    const totalExpenses = expenseBreakdown.reduce((s, a) => s + a.amount, 0);
    const netProfitLoss = totalIncome - totalExpenses;
    const isProfit = netProfitLoss >= 0;

    // Helper: find income by keyword
    const findIncome = (keyword: string) =>
      incomeBreakdown
        .filter(a => a.accountName.toLowerCase().includes(keyword))
        .reduce((s, a) => s + a.amount, 0);

    const interestIncome    = findIncome('interest');
    const processingFeeIncome = findIncome('processing');
    const penaltyIncome     = findIncome('penalty') + findIncome('late fee');
    const mirrorIncome      = findIncome('mirror');
    const otherIncome       = totalIncome - interestIncome - processingFeeIncome - penaltyIncome - mirrorIncome;

    // ---- EQUITY (from ChartOfAccount 3002 + EquityEntry table) ----
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '3002' },
    });

    const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
    const totalEquityFromEntries = equityEntries.reduce((sum, e) => {
      return e.entryType === 'WITHDRAWAL' ? sum - e.amount : sum + e.amount;
    }, 0);
    const totalEquity = equityAccount?.currentBalance ?? totalEquityFromEntries;
    const finalEquity = totalEquity + netProfitLoss;

    // ---- BORROWED MONEY ----
    const borrowedMoney = await db.borrowedMoney.findMany({ where: { companyId } });
    const totalBorrowed = borrowedMoney.reduce((s, b) => s + b.amount, 0);
    const totalRepaid   = borrowedMoney.reduce((s, b) => s + (b.amountRepaid || 0), 0);

    // ---- INVEST MONEY ----
    const investMoney = await db.investMoney.findMany({ where: { companyId } });
    const totalInvested    = investMoney.reduce((s, i) => s + i.amount, 0);
    const totalCurrentValue = investMoney.reduce((s, i) => s + (i.currentValue || i.amount), 0);

    return NextResponse.json({
      income: {
        interest:      interestIncome,
        processingFee: processingFeeIncome,
        penalty:       penaltyIncome,
        mirror:        mirrorIncome,
        other:         otherIncome > 0 ? otherIncome : 0,
        total:         totalIncome,
        breakdown:     incomeBreakdown,
      },
      expenses: {
        total:     totalExpenses,
        breakdown: expenseBreakdown,
      },
      netResult: {
        amount:   Math.abs(netProfitLoss),
        type:     isProfit ? 'PROFIT' : 'LOSS',
        isProfit,
        netProfitLoss,
      },
      equity: {
        total:        totalEquity,
        finalEquity,
        entries:      equityEntries,
      },
      borrowedMoney: {
        total:       totalBorrowed,
        repaid:      totalRepaid,
        outstanding: totalBorrowed - totalRepaid,
        entries:     borrowedMoney,
      },
      investMoney: {
        total:        totalInvested,
        currentValue: totalCurrentValue,
        entries:      investMoney,
      },
    });
  } catch (error) {
    console.error('Error calculating P&L:', error);
    return NextResponse.json({ error: 'Failed to calculate P&L' }, { status: 500 });
  }
}
