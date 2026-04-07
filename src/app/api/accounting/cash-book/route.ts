import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch Cash Book entries for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const entryType = searchParams.get('type'); // EXTRA_EMI, PROFIT_ENTRY, EXPENSE, OPENING

    console.log(`[Cash Book] Fetching entries for company: ${companyId}`);

    // If 'all', check which companies are cash-book-only
    let companyFilter: any = {};
    if (companyId !== 'all') {
      companyFilter = { companyId };
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
        ...companyFilter,
        ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
        ...(entryType && { referenceType: entryType })
      },
      include: {
        company: {
          select: { id: true, name: true, code: true, isCashBookOnly: true }
        }
      },
      orderBy: [
        { entryDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate totals
    const totalCashIn = entries.reduce((sum, e) => sum + e.cashIn, 0);
    const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
    const currentBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    // Group by type
    const byType = entries.reduce((acc, e) => {
      const type = e.referenceType || 'OTHER';
      if (!acc[type]) acc[type] = { count: 0, totalIn: 0, totalOut: 0 };
      acc[type].count++;
      acc[type].totalIn += e.cashIn;
      acc[type].totalOut += e.cashOut;
      return acc;
    }, {} as Record<string, { count: number; totalIn: number; totalOut: number }>);

    // Group by company
    const byCompany = entries.reduce((acc, e) => {
      const cId = e.companyId;
      if (!acc[cId]) {
        acc[cId] = {
          companyId: cId,
          companyName: e.company?.name || 'Unknown',
          entries: [],
          totalIn: 0,
          totalOut: 0
        };
      }
      acc[cId].entries.push(e);
      acc[cId].totalIn += e.cashIn;
      acc[cId].totalOut += e.cashOut;
      return acc;
    }, {} as Record<string, any>);

    console.log(`[Cash Book] Found ${entries.length} entries`);

    return NextResponse.json({
      success: true,
      entries,
      stats: {
        totalEntries: entries.length,
        totalCashIn,
        totalCashOut,
        currentBalance,
        byType,
        byCompany: Object.values(byCompany)
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
      reference,
      referenceType,
      cashIn,
      cashOut,
      loanId,
      customerId,
      notes,
      createdById
    } = body;

    if (!companyId || !description) {
      return NextResponse.json({
        error: 'Company ID and description are required'
      }, { status: 400 });
    }

    // Check if company is cash-book-only
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { isCashBookOnly: true, name: true }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get the last entry to calculate running balance
    const lastEntry = await db.cashBookEntry.findFirst({
      where: { companyId },
      orderBy: { entryDate: 'desc' },
      select: { balance: true }
    });

    const previousBalance = lastEntry?.balance || 0;
    const inAmount = cashIn || 0;
    const outAmount = cashOut || 0;
    const newBalance = previousBalance + inAmount - outAmount;

    // Generate voucher number
    const today = new Date();
    const prefix = `CB-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const lastVoucher = await db.cashBookEntry.findFirst({
      where: {
        companyId,
        voucherNo: { startsWith: prefix }
      },
      orderBy: { voucherNo: 'desc' },
      select: { voucherNo: true }
    });

    let sequence = 1;
    if (lastVoucher) {
      const lastSeq = parseInt(lastVoucher.voucherNo.split('-')[2] || '0');
      sequence = lastSeq + 1;
    }
    const voucherNo = `${prefix}-${String(sequence).padStart(4, '0')}`;

    // Create entry
    const entry = await db.cashBookEntry.create({
      data: {
        companyId,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        voucherNo,
        description,
        reference,
        referenceType: referenceType || 'MANUAL',
        cashIn: inAmount,
        cashOut: outAmount,
        balance: newBalance,
        loanId,
        customerId,
        notes,
        createdById
      },
      include: {
        company: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    console.log(`[Cash Book] Created entry ${voucherNo} for company ${company.name}`);

    return NextResponse.json({
      success: true,
      entry,
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

    // Remove fields that shouldn't be updated directly
    delete updateData.voucherNo;
    delete updateData.companyId;
    delete updateData.balance;

    const entry = await db.cashBookEntry.update({
      where: { id },
      data: {
        ...updateData,
        entryDate: updateData.entryDate ? new Date(updateData.entryDate) : undefined,
        updatedAt: new Date()
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
