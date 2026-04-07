import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch Cash Book entries for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const entryType = searchParams.get('type'); // CREDIT or DEBIT

    console.log(`[Cash Book] Fetching entries for company: ${companyId}`);

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get or create cash book for the company
    let cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });

    if (!cashBook) {
      return NextResponse.json({
        success: true,
        entries: [],
        stats: {
          totalEntries: 0,
          totalCashIn: 0,
          totalCashOut: 0,
          currentBalance: 0,
          byType: {},
        }
      });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Fetch entries
    const entries = await db.cashBookEntry.findMany({
      where: {
        cashBookId: cashBook.id,
        ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
        ...(entryType && { entryType })
      },
      orderBy: [
        { entryDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate totals
    const totalCashIn = entries
      .filter(e => e.entryType === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalCashOut = entries
      .filter(e => e.entryType === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);
    const currentBalance = cashBook.currentBalance;

    // Group by type
    const byType = entries.reduce((acc, e) => {
      const type = e.referenceType || 'OTHER';
      if (!acc[type]) acc[type] = { count: 0, totalIn: 0, totalOut: 0 };
      acc[type].count++;
      if (e.entryType === 'CREDIT') {
        acc[type].totalIn += e.amount;
      } else {
        acc[type].totalOut += e.amount;
      }
      return acc;
    }, {} as Record<string, { count: number; totalIn: number; totalOut: number }>);

    console.log(`[Cash Book] Found ${entries.length} entries`);

    return NextResponse.json({
      success: true,
      entries,
      cashBook,
      stats: {
        totalEntries: entries.length,
        totalCashIn,
        totalCashOut,
        currentBalance,
        byType,
      }
    });

  } catch (error) {
    console.error('[Cash Book] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch cash book entries',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// POST - Create a new Cash Book entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      entryDate,
      description,
      referenceType,
      amount,
      entryType, // CREDIT or DEBIT
      referenceId,
      createdById
    } = body;

    if (!companyId || !description || !amount || !entryType || !createdById) {
      return NextResponse.json({
        error: 'Company ID, description, amount, entryType, and createdById are required'
      }, { status: 400 });
    }

    if (!['CREDIT', 'DEBIT'].includes(entryType)) {
      return NextResponse.json({
        error: 'entryType must be CREDIT or DEBIT'
      }, { status: 400 });
    }

    // Get or create cash book for the company
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

    // Calculate new balance
    const newBalance = entryType === 'CREDIT'
      ? cashBook.currentBalance + amount
      : cashBook.currentBalance - amount;

    // Create entry
    const entry = await db.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType,
        amount,
        balanceAfter: newBalance,
        description,
        referenceType: referenceType || 'MANUAL_ENTRY',
        referenceId,
        createdById,
        entryDate: entryDate ? new Date(entryDate) : new Date()
      }
    });

    // Update cash book balance
    await db.cashBook.update({
      where: { id: cashBook.id },
      data: {
        currentBalance: newBalance,
        lastUpdatedAt: new Date()
      }
    });

    console.log(`[Cash Book] Created ${entryType} entry of ${amount} for company ${companyId}`);

    return NextResponse.json({
      success: true,
      entry,
      newBalance,
      message: 'Cash book entry created successfully'
    });

  } catch (error) {
    console.error('[Cash Book] Error creating entry:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create cash book entry',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// PUT - Update a Cash Book entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    // Get the existing entry
    const existingEntry = await db.cashBookEntry.findUnique({
      where: { id },
      include: { cashBook: true }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // If amount is being updated, recalculate balance
    if (updateData.amount !== undefined && updateData.amount !== existingEntry.amount) {
      const amountDiff = updateData.amount - existingEntry.amount;
      const balanceAdjustment = existingEntry.entryType === 'CREDIT' ? amountDiff : -amountDiff;
      const newBalance = existingEntry.cashBook.currentBalance + balanceAdjustment;

      await db.cashBook.update({
        where: { id: existingEntry.cashBookId },
        data: { currentBalance: newBalance }
      });

      updateData.balanceAfter = newBalance;
    }

    const entry = await db.cashBookEntry.update({
      where: { id },
      data: {
        ...updateData,
        entryDate: updateData.entryDate ? new Date(updateData.entryDate) : undefined,
      }
    });

    return NextResponse.json({
      success: true,
      entry,
      message: 'Cash book entry updated successfully'
    });

  } catch (error) {
    console.error('[Cash Book] Error updating entry:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update cash book entry',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// DELETE - Delete a Cash Book entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    // Get the entry first to adjust balance
    const entry = await db.cashBookEntry.findUnique({
      where: { id },
      include: { cashBook: true }
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Reverse the balance effect
    const balanceAdjustment = entry.entryType === 'CREDIT' ? -entry.amount : entry.amount;
    const newBalance = entry.cashBook.currentBalance + balanceAdjustment;

    await db.cashBook.update({
      where: { id: entry.cashBookId },
      data: { currentBalance: newBalance }
    });

    await db.cashBookEntry.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Cash book entry deleted successfully'
    });

  } catch (error) {
    console.error('[Cash Book] Error deleting entry:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete cash book entry',
      details: (error as Error).message
    }, { status: 500 });
  }
}
