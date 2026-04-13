import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * ENHANCED DAYBOOK API
 * 
 * Opening Balance = sum of (credit - debit) for ALL entries BEFORE period start.
 * Closing Balance = Opening Balance + period credits - period debits.
 * Next period's Opening Balance = this period's Closing Balance.
 *
 * If equity (capital) is added before the period, it is captured in Opening Balance.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId    = searchParams.get('companyId');
    const startDate    = searchParams.get('startDate');
    const endDate      = searchParams.get('endDate');
    const referenceType = searchParams.get('referenceType');
    const viewMode     = searchParams.get('viewMode') || 'journal'; // 'journal' | 'cashbook' | 'all'

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const periodStart = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
    const periodEnd   = endDate   ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

    const dateFilter: any = {};
    if (periodStart && periodEnd) {
      dateFilter.gte = periodStart;
      dateFilter.lte = periodEnd;
    }

    // ── OPENING BALANCE ──────────────────────────────────────────────────────
    // = sum of (credit − debit) for ALL journal + cashbook entries before periodStart
    // This automatically includes equity/capital added before the period.
    let openingBalance = 0;

    if (periodStart) {
      // Historical journal lines
      const historicalJournals = await db.journalEntry.findMany({
        where: { companyId, entryDate: { lt: periodStart } },
        include: { lines: { select: { debitAmount: true, creditAmount: true } } }
      });
      for (const je of historicalJournals) {
        for (const line of je.lines) {
          openingBalance += (line.creditAmount || 0) - (line.debitAmount || 0);
        }
      }

      // Historical cashbook entries
      if (viewMode === 'cashbook' || viewMode === 'all') {
        const cashBook = await db.cashBook.findUnique({ where: { companyId } });
        if (cashBook) {
          const historicalCash = await db.cashBookEntry.findMany({
            where: { cashBookId: cashBook.id, entryDate: { lt: periodStart } },
            select: { amount: true, entryType: true }
          });
          for (const ce of historicalCash) {
            openingBalance += ce.entryType === 'CREDIT' ? ce.amount : -ce.amount;
          }
        }
      }
    }

    // ── 1. JOURNAL ENTRIES ───────────────────────────────────────────────────
    const journalWhere: any = { companyId };
    if (periodStart && periodEnd) journalWhere.entryDate = dateFilter;
    if (referenceType) journalWhere.referenceType = referenceType;

    const journalEntries = await db.journalEntry.findMany({
      where: journalWhere,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      include: {
        lines: {
          include: {
            account: { select: { accountCode: true, accountName: true, accountType: true } }
          }
        }
      }
    });

    const journalRows: any[] = journalEntries.map(je => {
      const totalDebit  = je.lines.reduce((s, l) => s + (l.debitAmount  || 0), 0);
      const totalCredit = je.lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
      const debitLines  = je.lines.filter(l => (l.debitAmount  || 0) > 0).map(l => l.account?.accountName || '');
      const creditLines = je.lines.filter(l => (l.creditAmount || 0) > 0).map(l => l.account?.accountName || '');

      return {
        id:            je.id,
        source:        'JOURNAL',
        date:          je.entryDate,
        particular:    je.narration,
        referenceType: je.referenceType,
        referenceId:   je.referenceId,
        debit:         totalDebit,
        credit:        totalCredit,
        debitAccounts:  debitLines,
        creditAccounts: creditLines,
        paymentMode:   je.paymentMode,
        entryNumber:   je.entryNumber,
        isAutoEntry:   je.isAutoEntry,
        isApproved:    je.isApproved,
        createdAt:     je.createdAt,
      };
    });

    // ── 2. CASHBOOK ENTRIES ──────────────────────────────────────────────────
    let cashRows: any[] = [];
    if (viewMode === 'cashbook' || viewMode === 'all') {
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const cashWhere: any = { cashBookId: cashBook.id };
        if (periodStart && periodEnd) cashWhere.entryDate = dateFilter;
        if (referenceType) cashWhere.referenceType = referenceType;

        const cashEntries = await db.cashBookEntry.findMany({
          where: cashWhere,
          orderBy: [{ entryDate: 'desc' }],
          take: 300
        });

        cashRows = cashEntries.map(ce => ({
          id:            ce.id,
          source:        'CASHBOOK',
          date:          ce.entryDate,
          particular:    ce.description,
          referenceType: ce.referenceType,
          referenceId:   ce.referenceId,
          debit:         ce.entryType === 'DEBIT'  ? ce.amount : 0,
          credit:        ce.entryType === 'CREDIT' ? ce.amount : 0,
          debitAccounts:  ce.entryType === 'DEBIT'  ? ['Cash Out'] : [],
          creditAccounts: ce.entryType === 'CREDIT' ? ['Cash In']  : [],
          paymentMode:   'CASH',
          entryNumber:   null,
          isAutoEntry:   true,
          isApproved:    true,
          createdAt:     ce.createdAt,
        }));
      }
    }

    // ── 3. Merge + sort ascending ────────────────────────────────────────────
    let allRows = viewMode === 'cashbook'
      ? cashRows
      : viewMode === 'all'
        ? [...journalRows, ...cashRows]
        : journalRows;

    allRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // ── 4. Running balance starting from Opening Balance ─────────────────────
    let runningBalance = openingBalance;
    const rowsWithBalance = allRows.map(row => {
      runningBalance += (row.credit || 0) - (row.debit || 0);
      return { ...row, runningBalance };
    });

    // Reverse for display (newest first)
    rowsWithBalance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── 5. Totals ────────────────────────────────────────────────────────────
    const totalDebit    = allRows.reduce((s, r) => s + (r.debit  || 0), 0);
    const totalCredit   = allRows.reduce((s, r) => s + (r.credit || 0), 0);
    const closingBalance = openingBalance + totalCredit - totalDebit;

    // ── 6. Group by referenceType ────────────────────────────────────────────
    const byReferenceType = allRows.reduce((acc, row) => {
      const k = row.referenceType || 'OTHER';
      if (!acc[k]) acc[k] = { count: 0, totalDebit: 0, totalCredit: 0 };
      acc[k].count++;
      acc[k].totalDebit  += row.debit  || 0;
      acc[k].totalCredit += row.credit || 0;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      entries: rowsWithBalance,
      openingBalance,
      closingBalance,
      summary: {
        totalEntries: allRows.length,
        totalDebit,
        totalCredit,
        netBalance: totalCredit - totalDebit,
        byReferenceType,
        columns: { debitLabel: 'Debit (DR)', creditLabel: 'Credit (CR)' }
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
    const { companyId, accountHeadId, accountHeadName, accountType, particular,
            referenceType, debit, credit, paymentMode, createdById } = body;

    if (!companyId || !accountHeadId || !particular) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lastEntry = await db.daybookEntry.findFirst({
      where: { companyId }, orderBy: { createdAt: 'desc' }
    });
    const entryNumber = lastEntry
      ? `DB-${String(parseInt(lastEntry.entryNumber.split('-')[1] || '0') + 1).padStart(6, '0')}`
      : 'DB-000001';

    const entry = await db.daybookEntry.create({
      data: {
        companyId, entryNumber, entryDate: new Date(),
        accountHeadId, accountHeadName, accountType,
        particular, referenceType: referenceType || 'MANUAL_ENTRY',
        debit: debit || 0, credit: credit || 0,
        sourceType: 'MANUAL', paymentMode, createdById: createdById || 'system'
      }
    });

    await db.accountHead.update({
      where: { id: accountHeadId },
      data: { currentBalance: { increment: (debit || 0) - (credit || 0) } }
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error creating daybook entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
