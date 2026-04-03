import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get or create cashbook for the company
    let cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });

    if (!cashBook) {
      // Create cashbook if it doesn't exist
      cashBook = await db.cashBook.create({
        data: {
          companyId,
          currentBalance: 0
        }
      });
    }

    // Get cashbook entries
    const entries = await db.cashBookEntry.findMany({
      where: { cashBookId: cashBook.id },
      orderBy: { entryDate: 'desc' },
      take: 100
    });

    return NextResponse.json({
      cashBookId: cashBook.id,
      currentBalance: cashBook.currentBalance,
      entries
    });

  } catch (error) {
    console.error('Error fetching cashbook:', error);
    return NextResponse.json({ error: 'Failed to fetch cashbook' }, { status: 500 });
  }
}

// POST - Add cash entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, entryType, amount, description, createdById } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    if (!entryType || !['CREDIT', 'DEBIT'].includes(entryType)) {
      return NextResponse.json({ error: 'Valid entry type (CREDIT or DEBIT) is required' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Get or create cashbook for the company
    let cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });

    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId,
          currentBalance: 0
        }
      });
    }

    // Calculate new balance
    const currentBalance = cashBook.currentBalance || 0;
    const newBalance = entryType === 'CREDIT' 
      ? currentBalance + amount 
      : currentBalance - amount;

    // Create entry and update balance
    const entry = await db.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType,
        amount,
        balanceAfter: newBalance,
        description,
        referenceType: 'MANUAL_ENTRY',
        createdById
      }
    });

    // Update cashbook balance
    await db.cashBook.update({
      where: { id: cashBook.id },
      data: { currentBalance: newBalance }
    });

    return NextResponse.json({
      success: true,
      entry,
      newBalance
    });

  } catch (error) {
    console.error('Error adding cash entry:', error);
    return NextResponse.json({ error: 'Failed to add cash entry' }, { status: 500 });
  }
}
