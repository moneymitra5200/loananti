import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * DAYBOOK / PASSBOOK API
 *
 * Returns cashbook entries + bank transactions + journal entries for a company in a date range.
 * Also returns the opening balance (balance before the start of the period).
 *
 * Format:
 * {
 *   openingBalance: number,
 *   entries: [...cashBookEntry, ...bankTransaction, ...journalEntry],
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const periodStart = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
    const periodEnd   = endDate   ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

    // ── 1. Get CashBook ID ─────────────────────────────────────────────────
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });

    // ── 2. Opening balance: balance BEFORE period start ──────────────────────
    let openingBalance = 0;
    if (cashBook && periodStart) {
      const priorEntries = await db.cashBookEntry.findMany({
        where: { cashBookId: cashBook.id, entryDate: { lt: periodStart } },
        select: { amount: true, entryType: true },
      });
      for (const e of priorEntries) {
        if (e.entryType === 'CREDIT') openingBalance += e.amount;
        else openingBalance -= e.amount;
      }
    }

    // Also include bank transactions before period for opening balance
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });
    const bankIds = bankAccounts.map(b => b.id);
    if (bankIds.length > 0 && periodStart) {
      const priorBank = await db.bankTransaction.findMany({
        where: { bankAccountId: { in: bankIds }, transactionDate: { lt: periodStart } },
        select: { amount: true, transactionType: true },
      });
      for (const b of priorBank) {
        if (b.transactionType === 'CREDIT') openingBalance += b.amount;
        else openingBalance -= b.amount;
      }
    }

    // ── 3. Fetch cashbook entries in period ─────────────────────────────────
    const dateFilter: any = {};
    if (periodStart) dateFilter.gte = periodStart;
    if (periodEnd)   dateFilter.lte = periodEnd;

    const cashEntries = cashBook
      ? await db.cashBookEntry.findMany({
          where: {
            cashBookId: cashBook.id,
            ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
          },
          orderBy: { entryDate: 'asc' },
        })
      : [];

    // Map cashbook entries to unified format
    const cashMapped = cashEntries.map(e => ({
      id: e.id,
      source: 'CASHBOOK',
      entryDate: e.entryDate,
      transactionDate: e.entryDate,
      createdAt: e.createdAt,
      description: e.description,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      amount: e.amount,
      entryType: e.entryType,   // CREDIT | DEBIT
      transactionType: null,
      balanceAfter: e.balanceAfter,
    }));

    // ── 4. Fetch bank transactions in period ────────────────────────────────
    const bankEntries = bankIds.length > 0
      ? await db.bankTransaction.findMany({
          where: {
            bankAccountId: { in: bankIds },
            ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {}),
          },
          include: { bankAccount: { select: { bankName: true, accountNumber: true } } },
          orderBy: { transactionDate: 'asc' },
        })
      : [];

    // Map bank entries to unified format
    const bankMapped = bankEntries.map(e => ({
      id: e.id,
      source: 'BANK',
      entryDate: e.transactionDate,
      transactionDate: e.transactionDate,
      createdAt: e.createdAt,
      description: e.description + (e.bankAccount ? ` [${e.bankAccount.bankName}]` : ''),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      amount: e.amount,
      entryType: null,
      transactionType: e.transactionType, // CREDIT | DEBIT
      balanceAfter: e.balanceAfter,
    }));

    // ── 5. FIX-ISSUE-5/10: Fetch JournalEntry lines that have NO cashbook/bank entry ──
    // These are entries created by AccountingService.recordProcessingFee, recordEMIPayment etc.
    // that may not have a corresponding cashbook/bank row (e.g. when journal was created directly)
    const journalEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
        isReversed: false,
      },
      include: {
        lines: {
          select: {
            id: true,
            accountId: true,
            debitAmount: true,
            creditAmount: true,
            narration: true,
            account: { select: { accountCode: true, accountName: true } },
          },
        },
      },
      orderBy: { entryDate: 'asc' },
    });

    // Build set of referenceIds already covered by cashbook/bank entries
    const coveredRefs = new Set<string>();
    cashMapped.forEach(e => { if (e.referenceId) coveredRefs.add(e.referenceId); });
    bankMapped.forEach(e => { if (e.referenceId) coveredRefs.add(e.referenceId); });

    // Only include journal entries whose referenceId is NOT already in cashbook/bank
    const journalMapped = journalEntries
      .filter(je => !je.referenceId || !coveredRefs.has(je.referenceId))
      .map(je => {
        // Sum up debit lines as the "amount" for display
        const totalDebit  = je.lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
        const totalCredit = je.lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
        const amount = Math.max(totalDebit, totalCredit);
        // DR > 0 means money went out (DEBIT), CR > 0 means money came in (CREDIT)
        const entryType = totalCredit >= totalDebit ? 'CREDIT' : 'DEBIT';
        const lineDesc = je.lines.map(l => l.narration || l.account?.accountName || l.account?.accountCode || '').filter(Boolean).join('; ');
        return {
          id: je.id,
          source: 'JOURNAL',
          entryDate: je.entryDate,
          transactionDate: je.entryDate,
          createdAt: je.createdAt,
          description: je.narration + (lineDesc ? ` [${lineDesc}]` : ''),
          referenceType: je.referenceType,
          referenceId: je.referenceId,
          amount,
          entryType,
          transactionType: null,
          balanceAfter: null,
          entryNumber: je.entryNumber,
          lines: je.lines,
        };
      });

    // ── 6. Merge and sort by date ───────────────────────────────────────────
    const allEntries = [...cashMapped, ...bankMapped, ...journalMapped].sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    return NextResponse.json({
      success: true,
      openingBalance,
      entries: allEntries,
      count: allEntries.length,
    });
  } catch (error: any) {
    console.error('[DayBook API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to load daybook', details: error?.message },
      { status: 500 }
    );
  }
}


