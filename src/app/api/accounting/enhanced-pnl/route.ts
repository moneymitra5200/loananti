import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Calculate Profit & Loss from daybook entries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // 1. Get all daybook entries
    const daybookEntries = await db.daybookEntry.findMany({
      where: { companyId }
    });

    // 2. Calculate Income (from INCOME type accounts)
    const incomeEntries = daybookEntries.filter(e => e.accountType === 'INCOME');
    
    const interestIncome = incomeEntries
      .filter(e => e.accountHeadName.toLowerCase().includes('interest'))
      .reduce((sum, e) => sum + e.credit, 0);
    
    const processingFeeIncome = incomeEntries
      .filter(e => e.accountHeadName.toLowerCase().includes('processing'))
      .reduce((sum, e) => sum + e.credit, 0);
    
    const penaltyIncome = incomeEntries
      .filter(e => e.accountHeadName.toLowerCase().includes('penalty'))
      .reduce((sum, e) => sum + e.credit, 0);
    
    const otherIncome = incomeEntries
      .filter(e => 
        !e.accountHeadName.toLowerCase().includes('interest') &&
        !e.accountHeadName.toLowerCase().includes('processing') &&
        !e.accountHeadName.toLowerCase().includes('penalty')
      )
      .reduce((sum, e) => sum + e.credit, 0);
    
    const totalIncome = interestIncome + processingFeeIncome + penaltyIncome + otherIncome;

    // 3. Calculate Expenses (from EXPENSE type accounts)
    const expenseEntries = daybookEntries.filter(e => e.accountType === 'EXPENSE');
    
    // Group expenses by type
    const expensesByType: Record<string, number> = {};
    expenseEntries.forEach(e => {
      if (!expensesByType[e.accountHeadName]) {
        expensesByType[e.accountHeadName] = 0;
      }
      expensesByType[e.accountHeadName] += e.debit;
    });
    
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.debit, 0);
    const expenseBreakdown = Object.entries(expensesByType).map(([type, amount]) => ({
      type,
      amount
    }));

    // 4. Calculate Net Result
    const netProfitLoss = totalIncome - totalExpenses;
    const isProfit = netProfitLoss >= 0;

    // 5. Get Equity entries
    const equityEntries = await db.equityEntry.findMany({
      where: { companyId }
    });
    
    const totalEquity = equityEntries.reduce((sum, e) => {
      if (e.entryType === 'WITHDRAWAL') {
        return sum - e.amount;
      }
      return sum + e.amount;
    }, 0);

    // 6. Get Borrowed Money
    const borrowedMoney = await db.borrowedMoney.findMany({
      where: { companyId }
    });
    
    const totalBorrowed = borrowedMoney.reduce((sum, b) => sum + b.amount, 0);
    const totalRepaid = borrowedMoney.reduce((sum, b) => sum + (b.amountRepaid || 0), 0);

    // 7. Get Invest Money
    const investMoney = await db.investMoney.findMany({
      where: { companyId }
    });
    
    const totalInvested = investMoney.reduce((sum, i) => sum + i.amount, 0);
    const totalCurrentValue = investMoney.reduce((sum, i) => sum + (i.currentValue || i.amount), 0);

    // 8. Calculate Final Equity
    const finalEquity = totalEquity + netProfitLoss;

    return NextResponse.json({
      income: {
        interest: interestIncome,
        processingFee: processingFeeIncome,
        penalty: penaltyIncome,
        other: otherIncome,
        total: totalIncome,
        breakdown: {
          interest: interestIncome,
          processingFee: processingFeeIncome,
          penalty: penaltyIncome,
          other: otherIncome
        }
      },
      expenses: {
        byType: expensesByType,
        total: totalExpenses,
        breakdown: expenseBreakdown
      },
      netResult: {
        amount: Math.abs(netProfitLoss),
        type: isProfit ? 'PROFIT' : 'LOSS',
        isProfit
      },
      equity: {
        total: totalEquity,
        finalEquity,
        entries: equityEntries
      },
      borrowedMoney: {
        total: totalBorrowed,
        repaid: totalRepaid,
        outstanding: totalBorrowed - totalRepaid,
        entries: borrowedMoney
      },
      investMoney: {
        total: totalInvested,
        currentValue: totalCurrentValue,
        entries: investMoney
      }
    });
  } catch (error) {
    console.error('Error calculating P&L:', error);
    return NextResponse.json({ error: 'Failed to calculate P&L' }, { status: 500 });
  }
}
