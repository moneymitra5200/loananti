import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Cash flow statement for a company
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
      select: { id: true, currentBalance: true, openingBalance: true }
    });
    const bankAccountIds = bankAccounts.map(b => b.id);

    // Calculate opening balance (sum of all opening balances)
    const openingBalance = bankAccounts.reduce((sum, b) => sum + (b.openingBalance || 0), 0);
    const closingBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get transactions in period
    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccountIds },
        ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
      },
      select: {
        transactionType: true,
        amount: true,
        referenceType: true,
        description: true
      }
    });

    // Group inflows
    const inflows: Record<string, number> = {};
    transactions.filter(t => t.transactionType === 'CREDIT').forEach(t => {
      const source = getFlowCategory(t.referenceType, 'inflow');
      inflows[source] = (inflows[source] || 0) + t.amount;
    });

    // Group outflows
    const outflows: Record<string, number> = {};
    transactions.filter(t => t.transactionType === 'DEBIT').forEach(t => {
      const purpose = getFlowCategory(t.referenceType, 'outflow');
      outflows[purpose] = (outflows[purpose] || 0) + t.amount;
    });

    const totalInflows = Object.values(inflows).reduce((sum, v) => sum + v, 0);
    const totalOutflows = Object.values(outflows).reduce((sum, v) => sum + v, 0);

    // Format for output
    const cashInflows = Object.entries(inflows).map(([source, amount]) => ({ source, amount }));
    const cashOutflows = Object.entries(outflows).map(([source, amount]) => ({ source, amount }));

    return NextResponse.json({
      openingBalance,
      inflows: cashInflows,
      outflows: cashOutflows,
      totalInflows,
      totalOutflows,
      netCashFlow: totalInflows - totalOutflows,
      closingBalance
    });

  } catch (error) {
    console.error('Cash flow error:', error);
    return NextResponse.json({ 
      error: 'Failed to get cash flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getFlowCategory(referenceType: string, direction: 'inflow' | 'outflow'): string {
  if (direction === 'inflow') {
    const categories: Record<string, string> = {
      'EMI_PAYMENT': 'EMI Collections',
      'LOAN_REPAYMENT': 'Loan Repayments',
      'PROCESSING_FEE': 'Processing Fees',
      'PENALTY': 'Penalties & Late Fees',
      'LATE_FEE': 'Penalties & Late Fees',
      'INTEREST_PAYMENT': 'Interest Income',
      'MANUAL_ENTRY': 'Other Receipts'
    };
    return categories[referenceType] || 'Other Inflows';
  } else {
    const categories: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'Loan Disbursements',
      'EXPENSE': 'Operating Expenses',
      'MANUAL_ENTRY': 'Other Payments'
    };
    return categories[referenceType] || 'Other Outflows';
  }
}
