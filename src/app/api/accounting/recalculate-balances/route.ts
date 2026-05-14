import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/accounting/recalculate-balances
 *
 * Comprehensive balance fix that:
 *  1. Fixes stored totals on every JournalEntry where totalDebit/totalCredit
 *     don't match their line sums.
 *  2. For each UNBALANCED journal entry (lineDebit ≠ lineCredit) adds a
 *     balancing line to the Suspense account (code 9999 / "Suspense – Opening
 *     Adjustment") so the entry itself is balanced.
 *  3. Recalculates every ChartOfAccount.currentBalance from journal-entry lines.
 *  4. Overrides the Bank / Cash CoA balances with actual BankAccount /
 *     CashBook table values (the ground-truth for liquid assets).
 *  5. Syncs Owner's Capital from the EquityEntry table.
 *  6. Final Trial Balance check: if total Dr ≠ total Cr after all the above,
 *     posts ONE correcting journal entry against Suspense to close the gap.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const log: string[] = [];
    const warn: string[] = [];

    // ─── 0. Ensure Suspense account exists ───────────────────────────────────
    let suspenseAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '9999' },
    });
    if (!suspenseAccount) {
      suspenseAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '9999',
          accountName: 'Suspense – Opening Adjustment',
          accountType: 'EQUITY',
          isSystemAccount: true,
          description: 'Auto-created by Recalculate to absorb rounding / legacy imbalances',
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        },
      });
      log.push('Created Suspense account (9999)');
    }

    // ─── 1. Get system user ───────────────────────────────────────────────────
    const systemUser =
      await db.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } }) ||
      await db.user.findFirst({ select: { id: true } });

    if (!systemUser) {
      return NextResponse.json({ error: 'No system user found' }, { status: 500 });
    }

    // ─── 2. Fix every journal entry ────────────────────────────────────────────
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      include: { lines: true },
      orderBy: { entryDate: 'asc' },
    });

    let entriesFixed = 0;
    let balancingLinesAdded = 0;

    for (const entry of journalEntries) {
      const lineDebit  = entry.lines.reduce((s, l) => s + l.debitAmount,  0);
      const lineCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0);
      const diff = Math.abs(lineDebit - lineCredit);

      // 2a. Fix stored totals if wrong
      if (
        Math.abs(entry.totalDebit  - lineDebit)  > 0.005 ||
        Math.abs(entry.totalCredit - lineCredit) > 0.005
      ) {
        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: lineDebit, totalCredit: lineCredit },
        });
        log.push(`${entry.entryNumber}: stored totals corrected (Dr=${lineDebit.toFixed(2)}, Cr=${lineCredit.toFixed(2)})`);
        entriesFixed++;
      }

      // 2b. If entry itself is unbalanced, add a Suspense line
      if (diff > 0.005) {
        // Determine which side needs topping-up
        const addDebit  = lineCredit > lineDebit;   // credit heavier → add debit to suspense
        const addCredit = lineDebit  > lineCredit;  // debit heavier  → add credit to suspense

        await db.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            accountId:      suspenseAccount.id,
            debitAmount:    addDebit  ? diff : 0,
            creditAmount:   addCredit ? diff : 0,
            narration:      `Auto-balance adjustment [Recalculate]`,
          },
        });

        // Re-update stored totals now that line is added
        const newDebit  = Math.max(lineDebit,  lineCredit);
        const newCredit = Math.max(lineDebit,  lineCredit);
        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: newDebit, totalCredit: newCredit },
        });

        warn.push(`${entry.entryNumber}: was unbalanced by ₹${diff.toFixed(2)} — Suspense line added`);
        balancingLinesAdded++;
        entriesFixed++;
      }
    }

    // ─── 3. Recalculate ChartOfAccount.currentBalance from journal lines ───────
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    // Fetch fresh lines after all fixes above
    const allLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
        },
      },
    });

    // Aggregate per account
    const drMap: Record<string, number> = {};
    const crMap: Record<string, number> = {};
    for (const line of allLines) {
      drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
      crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
    }

    const coaUpdates: string[] = [];
    for (const acc of accounts) {
      const dr = drMap[acc.id] || 0;
      const cr = crMap[acc.id] || 0;
      const openingBalance = acc.openingBalance || 0;

      // Standard accounting convention
      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      const newBalance = isDebitNormal
        ? openingBalance + dr - cr
        : openingBalance + cr - dr;

      if (Math.abs(newBalance - (acc.currentBalance || 0)) > 0.005) {
        await db.chartOfAccount.update({
          where: { id: acc.id },
          data: { currentBalance: newBalance },
        });
        coaUpdates.push(`${acc.accountCode} ${acc.accountName}: ${acc.currentBalance?.toFixed(2)} → ${newBalance.toFixed(2)}`);
      }
    }

    log.push(`${coaUpdates.length} account balances updated from journal lines`);

    // ─── 4. Bank override — use BankAccount table as ground-truth ─────────────
    const BANK_CODES = ['1102', '1103', '1104'];
    const bankCoaList = accounts.filter(a => BANK_CODES.includes(a.accountCode));

    if (bankCoaList.length > 0) {
      const bankRows = await db.bankAccount.findMany({
        where: { companyId, isActive: true },
        select: { currentBalance: true },
      });
      const actualBankTotal = bankRows.reduce((s, b) => s + (b.currentBalance || 0), 0);

      for (const bankCoa of bankCoaList) {
        if (Math.abs(actualBankTotal - (bankCoa.currentBalance || 0)) > 0.005) {
          await db.chartOfAccount.update({
            where: { id: bankCoa.id },
            data: { currentBalance: actualBankTotal },
          });
          log.push(`${bankCoa.accountCode} (Bank) overridden → ₹${actualBankTotal.toFixed(2)} (from BankAccount table)`);
        }
      }
    }

    // ─── 5. Cash override — use CashBook table as ground-truth ────────────────
    const CASH_CODES = ['1101', '1100'];
    const cashCoaList = accounts.filter(a => CASH_CODES.includes(a.accountCode));

    if (cashCoaList.length > 0) {
      const cashBook = await db.cashBook.findFirst({ where: { companyId } });
      if (cashBook) {
        for (const cashCoa of cashCoaList) {
          if (Math.abs((cashBook.currentBalance || 0) - (cashCoa.currentBalance || 0)) > 0.005) {
            await db.chartOfAccount.update({
              where: { id: cashCoa.id },
              data: { currentBalance: cashBook.currentBalance || 0 },
            });
            log.push(`${cashCoa.accountCode} (Cash) overridden → ₹${(cashBook.currentBalance || 0).toFixed(2)} (from CashBook table)`);
          }
        }
      }
    }

    // ─── 6. Equity (Owner's Capital) sync from EquityEntry table ──────────────
    const capitalAccounts = accounts.filter(a =>
      a.accountCode === '3001' || a.accountCode === '3002'
    );
    if (capitalAccounts.length > 0) {
      const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
      const netCapital = equityEntries.reduce(
        (s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0),
        0
      );
      const target = capitalAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode)).pop()!;
      if (netCapital > 0 && Math.abs(netCapital - (target.currentBalance || 0)) > 0.005) {
        await db.chartOfAccount.update({
          where: { id: target.id },
          data: { currentBalance: netCapital },
        });
        log.push(`${target.accountCode} (Capital) synced → ₹${netCapital.toFixed(2)} (from EquityEntry table)`);
      }
    }

    // ─── 7. Final Trial Balance check: compute Dr / Cr totals after all fixes ──
    const freshAccounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    // Re-aggregate from fresh journal lines
    const freshLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
        },
      },
    });

    let trialDr = 0, trialCr = 0;
    const accTypeMap: Record<string, string> = {};
    for (const a of freshAccounts) accTypeMap[a.id] = a.accountType;

    for (const line of freshLines) {
      trialDr += line.debitAmount;
      trialCr += line.creditAmount;
    }

    const trialDiff = trialDr - trialCr; // positive = Dr heavy, negative = Cr heavy

    if (Math.abs(trialDiff) > 0.005) {
      // Post a correcting journal entry to Suspense
      const nextNumber = `RCALC-${Date.now()}`;
      const corrEntry = await db.journalEntry.create({
        data: {
          companyId,
          entryNumber:   nextNumber,
          entryDate:     new Date(),
          referenceType: 'OPENING_BALANCE_ADJUSTMENT',
          narration:     'Trial Balance correction — auto-generated by Recalculate',
          totalDebit:    Math.abs(trialDiff),
          totalCredit:   Math.abs(trialDiff),
          isApproved:    true,
          isReversed:    false,
          createdById:   systemUser.id,
        },
      });

      // The side that is HEAVIER needs a relief on the OTHER side
      await db.journalEntryLine.createMany({
        data: [
          {
            journalEntryId: corrEntry.id,
            accountId:      suspenseAccount.id,
            // If Dr heavy → Cr suspense to relieve; if Cr heavy → Dr suspense
            debitAmount:    trialDiff < 0 ? Math.abs(trialDiff) : 0,
            creditAmount:   trialDiff > 0 ? Math.abs(trialDiff) : 0,
            narration:      'Trial balance correcting entry',
          },
        ],
      });

      warn.push(`Trial Balance was off by ₹${Math.abs(trialDiff).toFixed(2)} — correction entry ${nextNumber} posted to Suspense`);

      // Update suspense CoA balance
      const suspFresh = await db.chartOfAccount.findUnique({
        where: { id: suspenseAccount.id },
      });
      if (suspFresh) {
        const suspLine = allLines.filter(l => l.accountId === suspenseAccount.id);
        const suspDr = suspLine.reduce((s, l) => s + l.debitAmount, 0)
          + (trialDiff < 0 ? Math.abs(trialDiff) : 0);
        const suspCr = suspLine.reduce((s, l) => s + l.creditAmount, 0)
          + (trialDiff > 0 ? Math.abs(trialDiff) : 0);
        const newSuspBal = suspCr - suspDr; // Equity = Cr normal
        await db.chartOfAccount.update({
          where: { id: suspenseAccount.id },
          data: { currentBalance: newSuspBal },
        });
      }
    } else {
      log.push('Trial Balance is already balanced ✓');
    }

    return NextResponse.json({
      success: true,
      message: `Recalculation complete. ${entriesFixed} journal entries fixed, ${balancingLinesAdded} balancing lines added, ${coaUpdates.length} account balances updated.${trialDiff !== 0 && Math.abs(trialDiff) > 0.005 ? ` Trial Balance corrected by ₹${Math.abs(trialDiff).toFixed(2)}.` : ' Trial Balance is balanced.'}`,
      stats: {
        journalEntriesFixed: entriesFixed,
        balancingLinesAdded,
        coaBalancesUpdated: coaUpdates.length,
        trialBalanceDiff: Math.abs(trialDiff),
        isNowBalanced: Math.abs(trialDiff) <= 0.005,
      },
      log,
      warnings: warn,
    });

  } catch (error) {
    console.error('[Recalculate] Error:', error);
    return NextResponse.json({
      error: 'Failed to recalculate balances',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET — preview imbalances without fixing anything
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      include: { lines: true },
    });

    const unbalancedEntries: any[] = [];
    let totalDr = 0, totalCr = 0;

    for (const entry of journalEntries) {
      const dr = entry.lines.reduce((s, l) => s + l.debitAmount,  0);
      const cr = entry.lines.reduce((s, l) => s + l.creditAmount, 0);
      totalDr += dr;
      totalCr += cr;
      if (Math.abs(dr - cr) > 0.005) {
        unbalancedEntries.push({
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          narration: entry.narration,
          lineDebit: dr,
          lineCredit: cr,
          difference: Math.abs(dr - cr),
        });
      }
    }

    const allLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: { companyId, isApproved: true, isReversed: false },
      },
    });
    const drMap: Record<string, number> = {};
    const crMap: Record<string, number> = {};
    for (const l of allLines) {
      drMap[l.accountId] = (drMap[l.accountId] || 0) + l.debitAmount;
      crMap[l.accountId] = (crMap[l.accountId] || 0) + l.creditAmount;
    }

    const coaPreview = accounts.map(acc => {
      const dr = drMap[acc.id] || 0;
      const cr = crMap[acc.id] || 0;
      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      const calculatedBalance = isDebitNormal
        ? (acc.openingBalance || 0) + dr - cr
        : (acc.openingBalance || 0) + cr - dr;
      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        storedBalance: acc.currentBalance,
        calculatedBalance,
        difference: calculatedBalance - (acc.currentBalance || 0),
        needsUpdate: Math.abs(calculatedBalance - (acc.currentBalance || 0)) > 0.005,
      };
    });

    return NextResponse.json({
      success: true,
      companyId,
      trialBalance: {
        totalDebit: totalDr,
        totalCredit: totalCr,
        difference: Math.abs(totalDr - totalCr),
        isBalanced: Math.abs(totalDr - totalCr) <= 0.005,
      },
      unbalancedJournalEntries: {
        count: unbalancedEntries.length,
        entries: unbalancedEntries,
      },
      accountsNeedingUpdate: coaPreview.filter(p => p.needsUpdate).length,
      preview: coaPreview,
    });

  } catch (error) {
    console.error('[Recalculate Preview] Error:', error);
    return NextResponse.json({
      error: 'Failed to preview',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
