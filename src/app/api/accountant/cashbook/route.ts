import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

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
          openingBalance: 0,
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

    const cacheKey = `accountant:cashbook:${companyId}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = {
      cashBookId: cashBook.id,
      openingBalance: cashBook.openingBalance || 0,
      currentBalance: cashBook.currentBalance,
      entries
    };
    cache.set(cacheKey, result, CacheTTL.SHORT); // 30s — balance changes frequently
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching cashbook:', error);
    return NextResponse.json({ error: 'Failed to fetch cashbook' }, { status: 500 });
  }
}

// POST - Add cash entry or set opening balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, entryType, amount, description, createdById, setOpeningBalance } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get or create cashbook for the company
    let cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });

    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId,
          openingBalance: 0,
          currentBalance: 0
        }
      });
    }

    // If setting opening balance
    if (setOpeningBalance) {
      const updated = await db.cashBook.update({
        where: { id: cashBook.id },
        data: { 
          openingBalance: amount,
          currentBalance: amount // Set current balance to opening balance initially
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Opening balance set successfully',
        openingBalance: updated.openingBalance,
        currentBalance: updated.currentBalance
      });
    }

    // Regular cash entry
    if (!entryType || !['CREDIT', 'DEBIT'].includes(entryType)) {
      return NextResponse.json({ error: 'Valid entry type (CREDIT or DEBIT) is required' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
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
