import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch cash book details for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const action = searchParams.get('action');

    // Get entries for a specific cash book
    if (action === 'entries') {
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
      }

      const entries = await db.cashBookEntry.findMany({
        where: { cashBook: { companyId } },
        orderBy: { entryDate: 'desc' },
        take: 100,
      });

      return NextResponse.json({ success: true, entries });
    }

    // Get or create cash book for a company
    if (!companyId) {
      // List all cash books
      const cashBooks = await db.cashBook.findMany({
        include: { company: { select: { id: true, name: true, code: true } } }
      });
      return NextResponse.json({ success: true, cashBooks });
    }

    // Get or create cash book for specific company
    let cashBook = await db.cashBook.findUnique({
      where: { companyId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        entries: {
          orderBy: { entryDate: 'desc' },
          take: 50
        }
      }
    });

    if (!cashBook) {
      // Create cash book for this company
      cashBook = await db.cashBook.create({
        data: {
          companyId,
          currentBalance: 0
        },
        include: {
          company: { select: { id: true, name: true, code: true } },
          entries: true
        }
      });
    }

    return NextResponse.json({ success: true, cashBook });
  } catch (error) {
    console.error('CashBook GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash book', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Add entry to cash book (manual entry by accountant)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, entryType, amount, description, createdById, referenceType, referenceId } = body;

    if (!companyId || !entryType || amount === undefined || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['CREDIT', 'DEBIT'].includes(entryType)) {
      return NextResponse.json({ error: 'Entry type must be CREDIT or DEBIT' }, { status: 400 });
    }

    // Get or create cash book for the company
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
    const currentBalance = cashBook.currentBalance;
    const newBalance = entryType === 'CREDIT' 
      ? currentBalance + amount 
      : currentBalance - amount;

    // Create entry
    const entry = await db.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType,
        amount,
        balanceAfter: newBalance,
        description: description || `${entryType === 'CREDIT' ? 'Added' : 'Deducted'} by accountant`,
        referenceType: referenceType || 'MANUAL_ENTRY',
        referenceId,
        createdById
      }
    });

    // Update cash book balance
    await db.cashBook.update({
      where: { id: cashBook.id },
      data: {
        currentBalance: newBalance,
        lastUpdatedById: createdById,
        lastUpdatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      entry,
      newBalance
    });
  } catch (error) {
    console.error('CashBook POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add cash book entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update cash book entry (edit by accountant)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, entryType, amount, description, modifiedById } = body;

    if (!entryId || !modifiedById) {
      return NextResponse.json({ error: 'Entry ID and modifier ID are required' }, { status: 400 });
    }

    // Get existing entry
    const existingEntry = await db.cashBookEntry.findUnique({
      where: { id: entryId },
      include: { cashBook: true }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Calculate balance difference
    const oldAmount = existingEntry.entryType === 'CREDIT' 
      ? existingEntry.amount 
      : -existingEntry.amount;
    const newAmount = (entryType || existingEntry.entryType) === 'CREDIT' 
      ? (amount || existingEntry.amount) 
      : -(amount || existingEntry.amount);
    const balanceDiff = newAmount - oldAmount;

    // Update entry
    const updatedEntry = await db.cashBookEntry.update({
      where: { id: entryId },
      data: {
        entryType: entryType || existingEntry.entryType,
        amount: amount || existingEntry.amount,
        description: description || existingEntry.description,
        balanceAfter: existingEntry.cashBook.currentBalance + balanceDiff
      }
    });

    // Update cash book balance
    await db.cashBook.update({
      where: { id: existingEntry.cashBookId },
      data: {
        currentBalance: existingEntry.cashBook.currentBalance + balanceDiff,
        lastUpdatedById: modifiedById,
        lastUpdatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, entry: updatedEntry });
  } catch (error) {
    console.error('CashBook PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update cash book entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Delete cash book entry (by accountant)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const deletedById = searchParams.get('deletedById');

    if (!entryId || !deletedById) {
      return NextResponse.json({ error: 'Entry ID and deleter ID are required' }, { status: 400 });
    }

    // Get existing entry
    const existingEntry = await db.cashBookEntry.findUnique({
      where: { id: entryId },
      include: { cashBook: true }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Calculate balance adjustment
    const balanceAdjustment = existingEntry.entryType === 'CREDIT' 
      ? -existingEntry.amount 
      : existingEntry.amount;

    // Delete entry
    await db.cashBookEntry.delete({
      where: { id: entryId }
    });

    // Update cash book balance
    await db.cashBook.update({
      where: { id: existingEntry.cashBookId },
      data: {
        currentBalance: existingEntry.cashBook.currentBalance + balanceAdjustment,
        lastUpdatedById: deletedById,
        lastUpdatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CashBook DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cash book entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}
