import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch Cash Book entries for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get('companyId') || searchParams.get('companyId');
    const startDate  = searchParams.get('startDate');
    const endDate    = searchParams.get('endDate');
    const entryType  = searchParams.get('type');

    if (!companyIdParam) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Support: single ID, comma-separated IDs, or "all"
    let cashBookWhere: any;
    if (companyIdParam === 'all') {
      cashBookWhere = {};
    } else {
      const ids = companyIdParam.split(',').map((s: string) => s.trim()).filter(Boolean);
      cashBookWhere = ids.length === 1 ? { companyId: ids[0] } : { companyId: { in: ids } };
    }

    const cashBooks = await (db.cashBook as any).findMany({
      where: cashBookWhere,
      include: { company: { select: { id: true, name: true, code: true } } }
    });

    if (cashBooks.length === 0) {
      return NextResponse.json({
        success: true, entries: [],
        stats: { totalEntries: 0, totalCashIn: 0, totalCashOut: 0, currentBalance: 0, byType: {}, byCompany: [] }
      });
    }

    const cashBookIds = cashBooks.map((cb: any) => cb.id);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); dateFilter.lte = e; }

    const rawEntries = await db.cashBookEntry.findMany({
      where: {
        cashBookId: { in: cashBookIds },
        ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
        ...(entryType && entryType !== 'all' && { entryType }),
      },
      include: { cashBook: { include: { company: { select: { id: true, name: true, code: true } } } } },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }]
    });

    // Map DB fields (entryType/amount/balanceAfter) -> frontend fields (cashIn/cashOut/balance/voucherNo)
    const entries = rawEntries.map((e: any, idx: number) => ({
      id: e.id,
      companyId: (e.cashBook as any).companyId,
      entryDate: e.entryDate,
      voucherNo: `CB-${String(rawEntries.length - idx).padStart(4, '0')}`,
      description: e.description || '',
      reference: e.referenceId || null,
      referenceType: e.referenceType || null,
      cashIn:  e.entryType === 'CREDIT' ? Number(e.amount) : 0,
      cashOut: e.entryType === 'DEBIT'  ? Number(e.amount) : 0,
      balance: Number(e.balanceAfter),
      loanId: null, customerId: null, notes: null,
      company: (e.cashBook as any).company,
      createdAt: e.createdAt,
    }));

    const totalCashIn  = entries.reduce((s: number, e: any) => s + e.cashIn,  0);
    const totalCashOut = entries.reduce((s: number, e: any) => s + e.cashOut, 0);
    const currentBalance = cashBooks.reduce((s: number, cb: any) => s + Number(cb.currentBalance), 0);

    const byType = rawEntries.reduce((acc: any, e: any) => {
      const type = e.referenceType || 'OTHER';
      if (!acc[type]) acc[type] = { count: 0, totalIn: 0, totalOut: 0 };
      acc[type].count++;
      if (e.entryType === 'CREDIT') acc[type].totalIn  += Number(e.amount);
      else                          acc[type].totalOut += Number(e.amount);
      return acc;
    }, {});

    const byCompany = cashBooks.map((cb: any) => ({
      companyId: cb.companyId, companyName: cb.company?.name || 'Unknown', currentBalance: Number(cb.currentBalance),
    }));

    console.log(`[Cash Book] ${entries.length} entries across ${cashBooks.length} cashbook(s)`);

    return NextResponse.json({
      success: true, entries,
      cashBook: cashBooks[0],
      stats: { totalEntries: entries.length, totalCashIn, totalCashOut, currentBalance, byType, byCompany }
    });

  } catch (error) {
    console.error('[Cash Book] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cash book entries', details: (error as Error).message }, { status: 500 });
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
