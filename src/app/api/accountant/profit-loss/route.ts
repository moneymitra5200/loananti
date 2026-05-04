import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

// GET - Profit & Loss statement for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const dateKey = `${startDate || 'all'}:${endDate || 'now'}`;
    const cacheKey = `accountant:profit-loss:${companyId}:${dateKey}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Get bank accounts for the company
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true }
    });
    const bankAccountIds = bankAccounts.map(b => b.id);

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Run bank tx + expenses in PARALLEL
    const [transactions, expenses] = await Promise.all([
      db.bankTransaction.findMany({
        where: {
          bankAccountId: { in: bankAccountIds },
          ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
        },
        select: { transactionType: true, amount: true, referenceType: true },
        take: 500, // cap
      }),
      db.expense.findMany({
        where: {
          companyId,
          isApproved: true,
          ...(Object.keys(dateFilter).length > 0 ? { paymentDate: dateFilter } : {})
        },
        select: { expenseType: true, amount: true },
        take: 500, // cap
      }),
    ]);

    // Calculate income
    const incomeByType: Record<string, number> = {};
    let totalIncome = 0;
    transactions.filter(t => t.transactionType === 'CREDIT').forEach(t => {
      const type = getIncomeCategory(t.referenceType);
      incomeByType[type] = (incomeByType[type] || 0) + t.amount;
      totalIncome += t.amount;
    });

    // Calculate expenses by type
    const expensesByType: Record<string, number> = {};
    let totalExpenses = 0;

    expenses.forEach(e => {
      const type = e.expenseType || 'MISCELLANEOUS';
      expensesByType[type] = (expensesByType[type] || 0) + e.amount;
      totalExpenses += e.amount;
    });

    transactions.filter(t => t.transactionType === 'DEBIT').forEach(t => {
      if (t.referenceType === 'LOAN_DISBURSEMENT') return;
      expensesByType['Bank Debits'] = (expensesByType['Bank Debits'] || 0) + t.amount;
      totalExpenses += t.amount;
    });

    const netProfit = totalIncome - totalExpenses;
    const incomeList = Object.entries(incomeByType).map(([name, amount], idx) => ({
      accountCode: `INC-${String(idx + 1).padStart(2, '0')}`,
      accountName: formatName(name), amount
    }));
    const expenseList = Object.entries(expensesByType).map(([name, amount], idx) => ({
      accountCode: `EXP-${String(idx + 1).padStart(2, '0')}`,
      accountName: formatName(name), amount
    }));

    const result = { income: incomeList, expenses: expenseList, totalIncome, totalExpenses, netProfit };
    cache.set(cacheKey, result, CacheTTL.LONG); // 5 min
    return NextResponse.json(result);

  } catch (error) {
    console.error('P&L error:', error);
    return NextResponse.json({ 
      error: 'Failed to get P&L statement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getIncomeCategory(referenceType: string): string {
  const categories: Record<string, string> = {
    'EMI_PAYMENT': 'EMI Collection',
    'LOAN_REPAYMENT': 'Loan Repayment',
    'PROCESSING_FEE': 'Processing Fees',
    'PENALTY': 'Penalties',
    'LATE_FEE': 'Late Fees',
    'INTEREST_PAYMENT': 'Interest Income',
    'MANUAL_ENTRY': 'Manual Entry'
  };
  return categories[referenceType] || 'Other Income';
}

function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}
