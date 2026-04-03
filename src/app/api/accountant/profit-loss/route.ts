import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Get all transactions in period
    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccountIds },
        ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
      },
      select: {
        transactionType: true,
        amount: true,
        referenceType: true
      }
    });

    // Calculate income by type
    const incomeByType: Record<string, number> = {};
    let totalIncome = 0;

    transactions.filter(t => t.transactionType === 'CREDIT').forEach(t => {
      const type = getIncomeCategory(t.referenceType);
      incomeByType[type] = (incomeByType[type] || 0) + t.amount;
      totalIncome += t.amount;
    });

    // Get expenses
    const expenses = await db.expense.findMany({
      where: {
        companyId,
        isApproved: true,
        ...(Object.keys(dateFilter).length > 0 ? { paymentDate: dateFilter } : {})
      },
      select: {
        expenseType: true,
        amount: true
      }
    });

    // Calculate expenses by type
    const expensesByType: Record<string, number> = {};
    let totalExpenses = 0;

    expenses.forEach(e => {
      const type = e.expenseType || 'MISCELLANEOUS';
      expensesByType[type] = (expensesByType[type] || 0) + e.amount;
      totalExpenses += e.amount;
    });

    // Add debit transactions as expenses
    transactions.filter(t => t.transactionType === 'DEBIT').forEach(t => {
      if (t.referenceType === 'LOAN_DISBURSEMENT') {
        // Loan disbursement is not expense, skip
        return;
      }
      const type = 'Bank Debits';
      expensesByType[type] = (expensesByType[type] || 0) + t.amount;
      totalExpenses += t.amount;
    });

    const netProfit = totalIncome - totalExpenses;

    // Format for output
    const incomeList = Object.entries(incomeByType).map(([name, amount], idx) => ({
      accountCode: `INC-${String(idx + 1).padStart(2, '0')}`,
      accountName: formatName(name),
      amount
    }));

    const expenseList = Object.entries(expensesByType).map(([name, amount], idx) => ({
      accountCode: `EXP-${String(idx + 1).padStart(2, '0')}`,
      accountName: formatName(name),
      amount
    }));

    return NextResponse.json({
      income: incomeList,
      expenses: expenseList,
      totalIncome,
      totalExpenses,
      netProfit
    });

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
