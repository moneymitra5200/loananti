import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Transactions for a company
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
      return NextResponse.json({ transactions: [] });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccountIds },
        ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
      },
      orderBy: { transactionDate: 'desc' },
      take: 500,
      select: {
        id: true,
        transactionType: true,
        amount: true,
        balanceAfter: true,
        description: true,
        referenceType: true,
        transactionDate: true,
        createdAt: true
      }
    });

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('Transactions error:', error);
    return NextResponse.json({ 
      error: 'Failed to get transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
