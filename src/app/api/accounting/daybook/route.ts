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
    const periodEnd = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

    // ── 1. Get CashBook and Bank Accounts ─────────────────────────────────────────────────
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });

    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true, currentBalance: true },
    });
    const bankIds = bankAccounts.map(b => b.id);

    // ── 2. Opening balance calculation ────────────────────────────────────────────────────
    // Strategy: Use the latest balanceAfter from entries before period start
    // OR calculate from current balance minus entries within period
    let openingBalance = 0;

    // Calculate CASH opening balance
    if (cashBook) {
      if (periodStart) {
        // Get the latest cashbook entry before period start
        const latestBeforePeriod = await db.cashBookEntry.findFirst({
          where: { cashBookId: cashBook.id, entryDate: { lt: periodStart } },
          orderBy: { entryDate: 'desc' },
          select: { balanceAfter: true },
        });

        if (latestBeforePeriod) {
          openingBalance += latestBeforePeriod.balanceAfter || 0;
        } else {
          // No entries before period - check if there's a cashbook opening balance
          // Use the cashbook currentBalance minus any entries in the current period
          const entriesInPeriod = await db.cashBookEntry.findMany({
            where: {
              cashBookId: cashBook.id,
              ...(periodStart || periodEnd ? {
                entryDate: {
                  ...(periodStart ? { gte: periodStart } : {}),
                  ...(periodEnd ? { lte: periodEnd } : {}),
                }
              } : {}),
            },
            select: { amount: true, entryType: true },
          });

          // Calculate net change in period
          let netChangeInPeriod = 0;
          for (const e of entriesInPeriod) {
            if (e.entryType === 'CREDIT') netChangeInPeriod += e.amount;
            else netChangeInPeriod -= e.amount;
          }

          // Opening balance = current balance - net change in period
          openingBalance += (cashBook.currentBalance || 0) - netChangeInPeriod;
        }
      } else {
        // No period filter - opening balance is the cashbook's opening balance
        openingBalance += cashBook.openingBalance || 0;
      }
    }

    // Calculate BANK opening balance
    if (bankIds.length > 0) {
      if (periodStart) {
        for (const bankId of bankIds) {
          // Get the latest bank transaction before period start
          const latestBeforePeriod = await db.bankTransaction.findFirst({
            where: { bankAccountId: bankId, transactionDate: { lt: periodStart } },
            orderBy: { transactionDate: 'desc' },
            select: { balanceAfter: true },
          });

          if (latestBeforePeriod) {
            openingBalance += latestBeforePeriod.balanceAfter || 0;
          } else {
            // No transactions before period - use current balance minus entries in period
            const bankAcc = bankAccounts.find(b => b.id === bankId);
            const entriesInPeriod = await db.bankTransaction.findMany({
              where: {
                bankAccountId: bankId,
                transactionDate: {
                  ...(periodStart ? { gte: periodStart } : {}),
                  ...(periodEnd ? { lte: periodEnd } : {}),
                }
              },
              select: { amount: true, transactionType: true },
            });

            let netChangeInPeriod = 0;
            for (const e of entriesInPeriod) {
              if (e.transactionType === 'CREDIT') netChangeInPeriod += e.amount;
              else netChangeInPeriod -= e.amount;
            }

            openingBalance += (bankAcc?.currentBalance || 0) - netChangeInPeriod;
          }
        }
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

    // Also build set of referenceTypes covered by cashbook/bank (for type-level de-dup)
    const coveredRefTypes = new Set<string>();
    cashMapped.forEach(e => { if (e.referenceType) coveredRefTypes.add(e.referenceType); });
    bankMapped.forEach(e => { if (e.referenceType) coveredRefTypes.add(e.referenceType); });

    // These referenceTypes ALWAYS create a real cashbook OR bank entry alongside their journal.
    // Showing their journal separately in DayBook would double-count the amount.
    // Only "pure journal" types (depreciation, accruals, adjustments) should show standalone.
    const ALWAYS_HAS_REAL_ENTRY = new Set([
      'EQUITY_INVESTMENT',
      'CAPITAL_INVESTMENT',
      'EMI_PAYMENT',
      'LOAN_DISBURSEMENT',
      'PROCESSING_FEE',
      'PROCESSING_FEE_COLLECTION',
      'EXPENSE',
      'EXPENSE_PAYMENT',
      'INTEREST_INCOME',
      'PENALTY_PAYMENT',
      'LOAN_CLOSURE',
      'SETTLEMENT',
      'CASH_DEPOSIT',
      'CASH_WITHDRAWAL',
      'BANK_DEPOSIT',
      'INTEREST_ONLY_PAYMENT',
      'PERSONAL_CLEARANCE',
    ]);

    // Only include journal entries that:
    // 1. Are NOT in the "always has real entry" blocklist, AND
    // 2. Their specific referenceId is NOT already covered by cashbook/bank
    const journalMapped = journalEntries
      .filter(je =>
        !ALWAYS_HAS_REAL_ENTRY.has(je.referenceType || '') &&
        (!je.referenceId || !coveredRefs.has(je.referenceId))
      )

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


