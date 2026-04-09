import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Income records for a company
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

    if (bankAccountIds.length === 0) {
      return NextResponse.json({ income: [] });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get all credit transactions (income)
    const creditTransactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccountIds },
        transactionType: 'CREDIT',
        ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
      },
      orderBy: { transactionDate: 'desc' },
      take: 500
    });

    // Transform to income records
    const incomeRecords = creditTransactions.map(txn => ({
      id: txn.id,
      type: getIncomeType(txn.referenceType),
      source: txn.description,
      amount: txn.amount,
      date: txn.transactionDate,
      referenceId: txn.referenceId
    }));

    return NextResponse.json({ income: incomeRecords });

  } catch (error) {
    console.error('Income error:', error);
    return NextResponse.json({ 
      error: 'Failed to get income records',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getIncomeType(referenceType: string): string {
  const types: Record<string, string> = {
    'EMI_PAYMENT': 'INTEREST',
    'LOAN_REPAYMENT': 'PRINCIPAL',
    'PROCESSING_FEE': 'PROCESSING_FEE',
    'PENALTY': 'PENALTY',
    'LATE_FEE': 'LATE_FEE',
    'INTEREST_PAYMENT': 'INTEREST'
  };
  return types[referenceType] || 'OTHER';
}
