import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * ENHANCED DAYBOOK — reads from JournalEntry + JournalEntryLine (double-entry system)
 * and also merges CashBookEntry for cash-only transactions.
 *
 * Each row shows:
 *   date | narration/particular | referenceType | DR amount | CR amount | runningBalance
 *
 * UI requirement: show proper CREDIT / DEBIT columns, NOT "Receive Payment" labels.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const referenceType = searchParams.get('referenceType');
    const viewMode = searchParams.get('viewMode') || 'journal'; // 'journal' | 'cashbook' | 'all'

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate);
      dateFilter.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // ── 1. JOURNAL ENTRIES (double-entry) ───────────────────────────────────
    const journalWhere: any = { companyId };
    if (startDate && endDate) journalWhere.entryDate = dateFilter;
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

    // Convert journal entries to daybook rows
    const journalRows: any[] = journalEntries.map(je => {
      const totalDebit  = je.lines.reduce((s, l) => s + (l.debitAmount  || 0), 0);
      const totalCredit = je.lines.reduce((s, l) => s + (l.creditAmount || 0), 0);

      // Determine the "other side" account for narration
      const debitLines  = je.lines.filter(l => (l.debitAmount  || 0) > 0).map(l => l.account?.accountName || '');
      const creditLines = je.lines.filter(l => (l.creditAmount || 0) > 0).map(l => l.account?.accountName || '');

      return {
        id:           je.id,
        source:       'JOURNAL',
        date:         je.entryDate,
        particular:   je.narration,
        referenceType: je.referenceType,
        referenceId:  je.referenceId,
        debit:        totalDebit,
        credit:       totalCredit,
        debitAccounts:  debitLines,
        creditAccounts: creditLines,
        paymentMode:  je.paymentMode,
        entryNumber:  je.entryNumber,
        isAutoEntry:  je.isAutoEntry,
        isApproved:   je.isApproved,
        createdAt:    je.createdAt,
      };
    });

    // ── 2. CASHBOOK ENTRIES (direct cash entries without full journal) ──────
    let cashRows: any[] = [];
    if (viewMode === 'cashbook' || viewMode === 'all') {
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const cashWhere: any = { cashBookId: cashBook.id };
        if (startDate && endDate) cashWhere.entryDate = dateFilter;
        if (referenceType) cashWhere.referenceType = referenceType;

        const cashEntries = await db.cashBookEntry.findMany({
          where: cashWhere,
          orderBy: [{ entryDate: 'desc' }],
          take: 300
        });

        cashRows = cashEntries.map(ce => ({
          id:           ce.id,
          source:       'CASHBOOK',
          date:         ce.entryDate,
          particular:   ce.description,
          referenceType: ce.referenceType,
          referenceId:  ce.referenceId,
          debit:        ce.entryType === 'DEBIT'  ? ce.amount : 0,
          credit:       ce.entryType === 'CREDIT' ? ce.amount : 0,
          debitAccounts:  ce.entryType === 'DEBIT'  ? ['Cash Out'] : [],
          creditAccounts: ce.entryType === 'CREDIT' ? ['Cash In']  : [],
          paymentMode:  'CASH',
          entryNumber:  null,
          isAutoEntry:  true,
          isApproved:   true,
          createdAt:    ce.createdAt,
        }));
      }
    }

    // ── 3. Merge + sort ─────────────────────────────────────────────────────
    let allRows = viewMode === 'cashbook'
      ? cashRows
      : viewMode === 'all'
        ? [...journalRows, ...cashRows]
        : journalRows;

    allRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // ── 4. Running balance (debit = money out, credit = money in) ──────────
    let runningBalance = 0;
    const rowsWithBalance = allRows.map(row => {
      runningBalance += (row.credit || 0) - (row.debit || 0);
      return { ...row, runningBalance };
    });

    // Reverse for display (newest first)
    rowsWithBalance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── 5. Totals ────────────────────────────────────────────────────────────
    const totalDebit  = allRows.reduce((s, r) => s + (r.debit  || 0), 0);
    const totalCredit = allRows.reduce((s, r) => s + (r.credit || 0), 0);

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
      summary: {
        totalEntries: allRows.length,
        totalDebit,
        totalCredit,
        netBalance: totalCredit - totalDebit,
        byReferenceType,
        // Helpers for UI column display
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
