import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncExistingTransactions } from '@/lib/accounting-helper';

// GET - Fetch all daybook entries with comprehensive data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountHeadId = searchParams.get('accountHeadId');
    const referenceType = searchParams.get('referenceType');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Build where clause
    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.entryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    if (accountHeadId) {
      where.accountHeadId = accountHeadId;
    }
    
    if (referenceType) {
      where.referenceType = referenceType;
    }

    // NOTE: Auto-sync removed — it ran on every page load causing serious performance
    // degradation. Use POST ?action=sync to manually trigger a backfill when needed.
    // await syncExistingTransactions(companyId);

    // Fetch daybook entries
    const daybookEntries = await db.daybookEntry.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: 500
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = daybookEntries
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .map(entry => {
        runningBalance += entry.debit - entry.credit;
        return { ...entry, runningBalance };
      })
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

    // Calculate totals
    const totalDebit = daybookEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = daybookEntries.reduce((sum, e) => sum + e.credit, 0);

    // Group by account head
    const byAccountHead = daybookEntries.reduce((acc, entry) => {
      if (!acc[entry.accountHeadName]) {
        acc[entry.accountHeadName] = {
          accountHeadId: entry.accountHeadId,
          accountType: entry.accountType,
          totalDebit: 0,
          totalCredit: 0,
          count: 0
        };
      }
      acc[entry.accountHeadName].totalDebit += entry.debit;
      acc[entry.accountHeadName].totalCredit += entry.credit;
      acc[entry.accountHeadName].count++;
      return acc;
    }, {} as Record<string, any>);

    // Group by reference type
    const byReferenceType = daybookEntries.reduce((acc, entry) => {
      if (!acc[entry.referenceType]) {
        acc[entry.referenceType] = { count: 0, totalDebit: 0, totalCredit: 0 };
      }
      acc[entry.referenceType].count++;
      acc[entry.referenceType].totalDebit += entry.debit;
      acc[entry.referenceType].totalCredit += entry.credit;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      entries: entriesWithBalance,
      summary: {
        totalEntries: daybookEntries.length,
        totalDebit,
        totalCredit,
        netBalance: totalDebit - totalCredit,
        byAccountHead,
        byReferenceType
      }
    });
  } catch (error) {
    console.error('Error fetching enhanced daybook:', error);
    return NextResponse.json({ error: 'Failed to fetch daybook entries' }, { status: 500 });
  }
}

// POST - Manual daybook entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      accountHeadId,
      accountHeadName,
      accountType,
      particular,
      referenceType,
      debit,
      credit,
      paymentMode,
      createdById
    } = body;

    if (!companyId || !accountHeadId || !particular) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate entry number
    const lastEntry = await db.daybookEntry.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
    
    const entryNumber = lastEntry 
      ? `DB-${String(parseInt(lastEntry.entryNumber.split('-')[1] || '0') + 1).padStart(6, '0')}`
      : 'DB-000001';

    const entry = await db.daybookEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate: new Date(),
        accountHeadId,
        accountHeadName,
        accountType,
        particular,
        referenceType: referenceType || 'MANUAL_ENTRY',
        debit: debit || 0,
        credit: credit || 0,
        sourceType: 'MANUAL',
        paymentMode,
        createdById: createdById || 'system'
      }
    });

    // Update account head balance
    await db.accountHead.update({
      where: { id: accountHeadId },
      data: {
        currentBalance: {
          increment: (debit || 0) - (credit || 0)
        }
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error creating daybook entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
