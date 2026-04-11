import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * JOURNAL ENTRY BACKFILL API
 *
 * Scans all completed EMI payments and creates missing journal entries.
 * Safe to call multiple times — idempotency guard in createJournalEntry
 * (based on referenceId + referenceType) prevents duplicates.
 *
 * POST /api/accounting/sync-journal-entries
 * Body: { companyId: string, dryRun?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, dryRun = false } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const results = {
      emiPayments: { processed: 0, created: 0, skipped: 0, errors: 0 },
      disbursements: { processed: 0, created: 0, skipped: 0, errors: 0 },
      processingFees: { processed: 0, created: 0, skipped: 0, errors: 0 },
      messages: [] as string[],
    };

    // ── Ensure chart of accounts exists ──────────────────────────────────────
    const accountingService = new AccountingService(companyId);
    await accountingService.initializeChartOfAccounts();
    results.messages.push(`Chart of accounts initialized for company ${companyId}`);

    // ══════════════════════════════════════════════════════════════════════════
    // 1. BACKFILL EMI PAYMENT JOURNAL ENTRIES
    // Fetch all completed payments for loans belonging to this company
    // ══════════════════════════════════════════════════════════════════════════
    const payments = await db.payment.findMany({
      where: {
        status: 'COMPLETED',
        loanApplication: { companyId },
      },
      include: {
        loanApplication: {
          select: {
            id: true,
            applicationNo: true,
            companyId: true,
            customerId: true,
          },
        },
        emiSchedule: {
          select: { installmentNumber: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const payment of payments) {
      results.emiPayments.processed++;
      try {
        // Check if journal entry already exists (idempotency key = payment.id + EMI_PAYMENT)
        const existing = await db.journalEntry.findFirst({
          where: {
            companyId,
            referenceId: payment.id,
            referenceType: 'EMI_PAYMENT',
            isReversed: false,
          },
          select: { id: true },
        });

        if (existing) {
          results.emiPayments.skipped++;
          continue;
        }

        if (dryRun) {
          results.emiPayments.created++;
          results.messages.push(`[DRY RUN] Would create EMI journal for payment ${payment.id}`);
          continue;
        }

        // Determine payment mode → cash or bank
        const pm = (payment.paymentMode || 'CASH').toUpperCase();
        const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes(pm);
        const debitAccount = isOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;

        const principal = payment.principalComponent || 0;
        const interest  = payment.interestComponent || 0;
        const penalty   = payment.penaltyComponent || 0;
        const total     = payment.amount || 0;

        // Build balanced credit lines
        const creditLines: { accountCode: string; debitAmount: number; creditAmount: number; loanId?: string; customerId?: string; narration?: string }[] = [];
        if (principal > 0) {
          creditLines.push({
            accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
            debitAmount: 0, creditAmount: principal,
            loanId: payment.loanApplicationId,
            customerId: payment.loanApplication?.customerId || undefined,
            narration: 'Principal repayment (backfill)',
          });
        }

        // Compute adjusted interest to absorb rounding
        const interestAdj = Math.max(0, interest + Math.round((total - principal - interest - penalty) * 100) / 100);
        if (interestAdj > 0) {
          creditLines.push({
            accountCode: ACCOUNT_CODES.INTEREST_INCOME,
            debitAmount: 0, creditAmount: interestAdj,
            loanId: payment.loanApplicationId,
            customerId: payment.loanApplication?.customerId || undefined,
            narration: 'Interest income (backfill)',
          });
        }
        if (penalty > 0) {
          creditLines.push({
            accountCode: ACCOUNT_CODES.PENALTY_INCOME,
            debitAmount: 0, creditAmount: penalty,
            loanId: payment.loanApplicationId,
            customerId: payment.loanApplication?.customerId || undefined,
            narration: 'Penalty income (backfill)',
          });
        }
        if (creditLines.length === 0) {
          creditLines.push({
            accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
            debitAmount: 0, creditAmount: total,
            loanId: payment.loanApplicationId,
            narration: 'EMI repayment (backfill)',
          });
        }

        // Enforce balance
        const creditSum = creditLines.reduce((s, l) => s + l.creditAmount, 0);
        const diff = Math.round((total - creditSum) * 100) / 100;
        if (Math.abs(diff) > 0.001) {
          creditLines[creditLines.length - 1].creditAmount += diff;
        }

        await accountingService.createJournalEntry({
          entryDate: payment.createdAt || new Date(),
          referenceType: 'EMI_PAYMENT',
          referenceId: payment.id,
          narration: `EMI Payment (backfill) - ${payment.loanApplication?.applicationNo} #${payment.emiSchedule?.installmentNumber || 'N/A'}`,
          lines: [
            { accountCode: debitAccount, debitAmount: total, creditAmount: 0, narration: `EMI received via ${payment.paymentMode}` },
            ...creditLines,
          ],
          createdById: payment.paidById || 'SYSTEM',
          paymentMode: payment.paymentMode || 'CASH',
          isAutoEntry: true,
        });

        results.emiPayments.created++;
      } catch (err) {
        results.emiPayments.errors++;
        results.messages.push(`EMI payment ${payment.id} error: ${(err as Error).message}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. BACKFILL LOAN DISBURSEMENT JOURNAL ENTRIES
    // ══════════════════════════════════════════════════════════════════════════
    const disbursedLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] },
        disbursedAt: { not: null },
        disbursedAmount: { not: null },
      },
      select: {
        id: true, applicationNo: true, disbursedAmount: true,
        disbursedAt: true, disbursedById: true, customerId: true,
        disbursementMode: true,
      },
    });

    for (const loan of disbursedLoans) {
      results.disbursements.processed++;
      try {
        const existing = await db.journalEntry.findFirst({
          where: { companyId, referenceId: loan.id, referenceType: 'LOAN_DISBURSEMENT', isReversed: false },
          select: { id: true },
        });
        if (existing) { results.disbursements.skipped++; continue; }

        if (dryRun) {
          results.disbursements.created++;
          results.messages.push(`[DRY RUN] Would create disbursement journal for loan ${loan.applicationNo}`);
          continue;
        }

        await accountingService.recordLoanDisbursement({
          loanId: loan.id,
          customerId: loan.customerId || '',
          amount: loan.disbursedAmount!,
          disbursementDate: loan.disbursedAt || new Date(),
          createdById: loan.disbursedById || 'SYSTEM',
          paymentMode: loan.disbursementMode || 'CASH',
          reference: `Disbursement backfill: ${loan.applicationNo}`,
        });

        results.disbursements.created++;
      } catch (err) {
        results.disbursements.errors++;
        results.messages.push(`Disbursement ${loan.applicationNo} error: ${(err as Error).message}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. SUMMARY
    // ══════════════════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      dryRun,
      companyId,
      results,
      summary: {
        totalCreated: results.emiPayments.created + results.disbursements.created + results.processingFees.created,
        totalSkipped: results.emiPayments.skipped + results.disbursements.skipped + results.processingFees.skipped,
        totalErrors: results.emiPayments.errors + results.disbursements.errors + results.processingFees.errors,
      },
    });
  } catch (error) {
    console.error('Journal entry backfill error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET — return counts of payments that have no journal entry yet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const [totalPayments, journalEntries, totalDisbursements, disbursementJournals] = await Promise.all([
      db.payment.count({ where: { status: 'COMPLETED', loanApplication: { companyId } } }),
      db.journalEntry.count({ where: { companyId, referenceType: 'EMI_PAYMENT', isReversed: false } }),
      db.loanApplication.count({ where: { companyId, status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] }, disbursedAt: { not: null } } }),
      db.journalEntry.count({ where: { companyId, referenceType: 'LOAN_DISBURSEMENT', isReversed: false } }),
    ]);

    return NextResponse.json({
      companyId,
      payments: {
        total: totalPayments,
        withJournalEntry: journalEntries,
        missingJournalEntry: Math.max(0, totalPayments - journalEntries),
      },
      disbursements: {
        total: totalDisbursements,
        withJournalEntry: disbursementJournals,
        missingJournalEntry: Math.max(0, totalDisbursements - disbursementJournals),
      },
      needsSync: (totalPayments - journalEntries) > 0 || (totalDisbursements - disbursementJournals) > 0,
    });
  } catch (error) {
    console.error('Journal check error:', error);
    return NextResponse.json({ error: 'Failed to check journal entries' }, { status: 500 });
  }
}
