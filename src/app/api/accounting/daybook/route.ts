import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * DAYBOOK / PASSBOOK API
 *
 * Returns cashbook entries + bank transactions for a company in a date range.
 * Also returns the opening balance (balance before the start of the period).
 *
 * Format:
 * {
 *   openingBalance: number,
 *   entries: [...cashBookEntry, ...bankTransaction],
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

    // ── 5. Merge and sort by date ───────────────────────────────────────────
    const allEntries = [...cashMapped, ...bankMapped].sort(
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
