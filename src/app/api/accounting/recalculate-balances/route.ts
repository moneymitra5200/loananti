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

    // ─── 4. Target balances for overrides ─────────────────────────────────────
    const BANK_CODES = ['1102', '1103', '1104'];
    const CASH_CODES = ['1101', '1100'];
    const CAPITAL_CODES = ['3001', '3002'];

    const cashAccount = accounts.find(a => CASH_CODES.includes(a.accountCode));
    const bankAccountCoa = accounts.find(a => BANK_CODES.includes(a.accountCode));
    const capitalAccount = accounts.find(a => CAPITAL_CODES.includes(a.accountCode));

    let targetCash = 0;
    let hasCashTarget = false;
    const cashBook = await db.cashBook.findFirst({ where: { companyId } });
    if (cashBook) {
      targetCash = cashBook.currentBalance || 0;
      hasCashTarget = true;
    }

    let targetBank = 0;
    let hasBankTarget = false;
    const bankRows = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { currentBalance: true },
    });
    if (bankRows.length > 0) {
      targetBank = bankRows.reduce((s, b) => s + (b.currentBalance || 0), 0);
      hasBankTarget = true;
    }

    let targetCapital = 0;
    let hasCapitalTarget = false;
    const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
    if (equityEntries.length > 0) {
      targetCapital = equityEntries.reduce(
        (s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0),
        0
      );
      hasCapitalTarget = true;
    }

    // ─── 5. Calculate Trial Balance discrepancy before Suspense adjustment ───
    let trialDr = 0;
    let trialCr = 0;

    for (const acc of accounts) {
      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      const dr = drMap[acc.id] || 0;
      const cr = crMap[acc.id] || 0;
      const journalBal = isDebitNormal
        ? (acc.openingBalance || 0) + dr - cr
        : (acc.openingBalance || 0) + cr - dr;

      let balance = journalBal;
      if (CASH_CODES.includes(acc.accountCode) && hasCashTarget) {
        balance = targetCash;
      } else if (BANK_CODES.includes(acc.accountCode) && hasBankTarget) {
        balance = targetBank;
      } else if (CAPITAL_CODES.includes(acc.accountCode) && hasCapitalTarget) {
        balance = targetCapital;
      }

      if (isDebitNormal) {
        trialDr += balance;
      } else {
        trialCr += balance;
      }
    }

    const trialDiff = trialDr - trialCr; // positive = Dr heavy, negative = Cr heavy

    // ─── 6. Build correcting journal entry lines to align ledger with overrides ───
    const correctingLines: any[] = [];

    if (hasCashTarget && cashAccount) {
      const dr = drMap[cashAccount.id] || 0;
      const cr = crMap[cashAccount.id] || 0;
      const journalCash = (cashAccount.openingBalance || 0) + dr - cr;
      const diffCash = targetCash - journalCash;
      if (Math.abs(diffCash) > 0.005) {
        correctingLines.push({
          accountId: cashAccount.id,
          debitAmount: diffCash > 0 ? diffCash : 0,
          creditAmount: diffCash < 0 ? Math.abs(diffCash) : 0,
          narration: `Adjust cash ledger to CashBook balance`,
        });
      }
    }

    if (hasBankTarget && bankAccountCoa) {
      const dr = drMap[bankAccountCoa.id] || 0;
      const cr = crMap[bankAccountCoa.id] || 0;
      const journalBank = (bankAccountCoa.openingBalance || 0) + dr - cr;
      const diffBank = targetBank - journalBank;
      if (Math.abs(diffBank) > 0.005) {
        correctingLines.push({
          accountId: bankAccountCoa.id,
          debitAmount: diffBank > 0 ? diffBank : 0,
          creditAmount: diffBank < 0 ? Math.abs(diffBank) : 0,
          narration: `Adjust bank ledger to BankAccount balance`,
        });
      }
    }

    if (hasCapitalTarget && capitalAccount) {
      const dr = drMap[capitalAccount.id] || 0;
      const cr = crMap[capitalAccount.id] || 0;
      const journalCapital = (capitalAccount.openingBalance || 0) + cr - dr;
      const diffCapital = targetCapital - journalCapital;
      if (Math.abs(diffCapital) > 0.005) {
        correctingLines.push({
          accountId: capitalAccount.id,
          debitAmount: diffCapital < 0 ? Math.abs(diffCapital) : 0,
          creditAmount: diffCapital > 0 ? diffCapital : 0,
          narration: `Adjust capital ledger to EquityEntry balance`,
        });
      }
    }

    // Adjust Suspense account to absorb any net trial balance difference
    if (Math.abs(trialDiff) > 0.005) {
      correctingLines.push({
        accountId: suspenseAccount.id,
        debitAmount: trialDiff < 0 ? Math.abs(trialDiff) : 0,
        creditAmount: trialDiff > 0 ? trialDiff : 0,
        narration: 'Trial balance correcting entry to resolve discrepancy',
      });
    }

    let trialDiffResult = trialDiff;

    if (correctingLines.length > 0) {
      const totalDebit = correctingLines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = correctingLines.reduce((s, l) => s + l.creditAmount, 0);

      const nextNumber = `RCALC-${Date.now()}`;
      await db.journalEntry.create({
        data: {
          companyId,
          entryNumber:   nextNumber,
          entryDate:     new Date(),
          referenceType: 'OPENING_BALANCE_ADJUSTMENT',
          narration:     'Trial Balance correction — auto-generated by Recalculate',
          totalDebit:    totalDebit,
          totalCredit:   totalCredit,
          isApproved:    true,
          isReversed:    false,
          createdById:   systemUser.id,
          lines: {
            create: correctingLines.map(l => ({
              accountId: l.accountId,
              debitAmount: l.debitAmount,
              creditAmount: l.creditAmount,
              narration: l.narration,
            }))
          }
        },
      });

      warn.push(`Trial Balance adjusted by ₹${Math.abs(trialDiff).toFixed(2)} — correcting entry ${nextNumber} posted (total Dr/Cr: ₹${totalDebit.toFixed(2)})`);
    } else {
      log.push('Trial Balance is already balanced ✓');
    }

    // ─── 7. Recalculate ChartOfAccount.currentBalance from the final journal lines ───────
    const finalAccounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    const finalLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
        },
      },
    });

    const finalDrMap: Record<string, number> = {};
    const finalCrMap: Record<string, number> = {};
    for (const line of finalLines) {
      finalDrMap[line.accountId] = (finalDrMap[line.accountId] || 0) + line.debitAmount;
      finalCrMap[line.accountId] = (finalCrMap[line.accountId] || 0) + line.creditAmount;
    }

    const finalCoaUpdates: string[] = [];
    for (const acc of finalAccounts) {
      const dr = finalDrMap[acc.id] || 0;
      const cr = finalCrMap[acc.id] || 0;
      const openingBalance = acc.openingBalance || 0;

      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      const newBalance = isDebitNormal
        ? openingBalance + dr - cr
        : openingBalance + cr - dr;

      if (Math.abs(newBalance - (acc.currentBalance || 0)) > 0.005) {
        await db.chartOfAccount.update({
          where: { id: acc.id },
          data: { currentBalance: newBalance },
        });
        finalCoaUpdates.push(`${acc.accountCode} ${acc.accountName}: ${acc.currentBalance?.toFixed(2)} → ${newBalance.toFixed(2)}`);
      }
    }

    log.push(`${finalCoaUpdates.length} final account balances updated in ChartOfAccount`);

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
