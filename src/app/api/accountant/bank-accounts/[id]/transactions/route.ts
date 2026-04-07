import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get transactions for a bank account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: id
      },
      orderBy: { transactionDate: 'desc' },
      take: limit
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
