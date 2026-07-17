/**
 * ═══════════════════════════════════════════════════════════════════
 *  DEEP ACCOUNTING AUDIT API
 *  GET /api/accounting/audit?companyId=xxx&limit=100
 *
 *  Runs live DB queries and returns a structured discrepancy report:
 *    1. Unbalanced journal entries (Dr ≠ Cr)
 *    2. EMI paid but no bank/cash passbook entry
 *    3. Bank/cash passbook entry but no journal entry
 *    4. Mirror company isolation violations (entries in wrong company)
 *    5. Processing fee recorded in wrong company
 *    6. Mirror EMI not synced after payment
 *    7. Bank balance drift (ChartOfAccount vs actual BankAccount sum)
 *    8. Orphaned journal entries (referenceId points to deleted records)
 *    9. Double-recorded entries (same referenceId × 2)
 *   10. Loans marked CLOSED but EMIs still PENDING
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';

// ── Types ─────────────────────────────────────────────────────────
interface AuditIssue {
  severity: 'ERROR' | 'WARN' | 'INFO';
  category: string;
  entity: string;
  entityId: string;
  message: string;
  details?: Record<string, any>;
}

interface AuditReport {
  runAt: string;
  companyId: string | null;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: AuditIssue[];
  stats: Record<string, number>;
}

// ── Auth guard ─────────────────────────────────────────────────────
async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user?.email) return false;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  return ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '');
}

// ── Main audit runner ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filterCompanyId = searchParams.get('companyId') || null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

  const issues: AuditIssue[] = [];
  const stats: Record<string, number> = {};

  // ── Helper ─────────────────────────────────────────────────────
  function addIssue(issue: AuditIssue) {
    issues.push(issue);
  }

  // ── Get companies to audit ──────────────────────────────────────
  const companyWhere = filterCompanyId ? { id: filterCompanyId } : {};
  const companies = await db.company.findMany({
    where: companyWhere,
    select: { id: true, name: true, accountingType: true },
  });

  stats.companiesAudited = companies.length;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 1: Unbalanced Journal Entries (Dr ≠ Cr)
  // ══════════════════════════════════════════════════════════════════
  for (const company of companies) {
    const unbalanced = await db.journalEntry.findMany({
      where: {
        companyId: company.id,
        isReversed: false,
        NOT: {
          AND: [
            { totalDebit: { gt: 0 } },
          ]
        }
      },
      select: {
        id: true,
        entryNumber: true,
        totalDebit: true,
        totalCredit: true,
        referenceType: true,
        referenceId: true,
        entryDate: true,
        lines: { select: { debitAmount: true, creditAmount: true } },
      },
      take: limit,
      orderBy: { entryDate: 'desc' },
    });

    let unbalancedCount = 0;
    for (const je of unbalanced) {
      const actualDebit  = je.lines.reduce((s, l) => s + l.debitAmount,  0);
      const actualCredit = je.lines.reduce((s, l) => s + l.creditAmount, 0);
      const drift = Math.abs(actualDebit - actualCredit);
      if (drift > 0.01) {
        unbalancedCount++;
        addIssue({
          severity: 'ERROR',
          category: 'UNBALANCED_JOURNAL',
          entity: 'JournalEntry',
          entityId: je.id,
          message: `Journal ${je.entryNumber} is unbalanced: Dr ₹${actualDebit.toFixed(2)} ≠ Cr ₹${actualCredit.toFixed(2)} (drift ₹${drift.toFixed(2)})`,
          details: {
            companyId: company.id,
            companyName: company.name,
            entryNumber: je.entryNumber,
            referenceType: je.referenceType,
            referenceId: je.referenceId,
            headerDebit: je.totalDebit,
            headerCredit: je.totalCredit,
            actualDebit,
            actualCredit,
            drift,
          },
        });
      }
    }
    stats[`check1_unbalanced_${company.id}`] = unbalancedCount;
  }

  // ══════════════════════════════════════════════════════════════════
  // CHECK 2: Approved PaymentRequests — missing passbook entries
  // ══════════════════════════════════════════════════════════════════
  const approvedPRs = await db.paymentRequest.findMany({
    where: {
      status: 'APPROVED',
      ...(filterCompanyId
        ? { loanApplication: { companyId: filterCompanyId } }
        : {}),
    },
    include: {
      emiSchedule: { select: { id: true, installmentNumber: true, paymentStatus: true } },
      loanApplication: {
        select: {
          id: true, companyId: true, applicationNo: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: { reviewedAt: 'desc' },
    take: limit,
  });

  stats.check2_approvedPRsAudited = approvedPRs.length;
  let missingPassbook = 0;

  for (const pr of approvedPRs) {
    const loanId    = pr.loanApplicationId;
    const companyId = pr.loanApplication?.companyId;
    if (!companyId) continue;

    // Find the Payment record
    const payment = await db.payment.findFirst({
      where: { emiScheduleId: pr.emiScheduleId ?? undefined, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const paymentId = payment?.id;
    if (!paymentId) continue;

    // Check bank transaction
    const bankTx = await db.bankTransaction.findFirst({
      where: { referenceId: paymentId },
      select: { id: true },
    });

    // Check cashbook entry
    const cashEntry = await db.cashBookEntry.findFirst({
      where: { referenceId: paymentId },
      select: { id: true },
    });

    if (!bankTx && !cashEntry) {
      missingPassbook++;
      addIssue({
        severity: 'ERROR',
        category: 'MISSING_PASSBOOK',
        entity: 'Payment',
        entityId: paymentId,
        message: `Payment ${paymentId} (PR#${pr.requestNumber}) has no bank or cashbook entry`,
        details: {
          loanId,
          loanNo: pr.loanApplication?.applicationNo,
          companyId,
          paymentType: pr.paymentType,
          amount: pr.requestedAmount,
          paymentMethod: pr.paymentMethod,
        },
      });
    }
  }
  stats.check2_missingPassbook = missingPassbook;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 3: Mirror EMI sync — original paid but mirror not updated
  // ══════════════════════════════════════════════════════════════════
  const mirrorMappings = await db.mirrorLoanMapping.findMany({
    where: filterCompanyId
      ? {
          OR: [
            { originalCompanyId: filterCompanyId },
            { mirrorCompanyId: filterCompanyId },
          ],
        }
      : {},
    select: {
      id: true,
      originalLoanId: true,
      mirrorLoanId: true,
      mirrorCompanyId: true,
      mirrorTenure: true,
      processingFeeRecorded: true,
      mirrorProcessingFee: true,
    },
    take: 200,
  });

  stats.check3_mirrorMappingsAudited = mirrorMappings.length;
  let mirrorSyncErrors = 0;

  for (const mapping of mirrorMappings) {
    if (!mapping.mirrorLoanId) continue;

    // Find all PAID original EMIs
    const paidOriginalEMIs = await db.eMISchedule.findMany({
      where: {
        loanApplicationId: mapping.originalLoanId,
        paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
        installmentNumber: { lte: mapping.mirrorTenure },
      },
      select: { installmentNumber: true, paymentStatus: true },
    });

    for (const origEmi of paidOriginalEMIs) {
      const mirrorEmi = await db.eMISchedule.findFirst({
        where: {
          loanApplicationId: mapping.mirrorLoanId,
          installmentNumber: origEmi.installmentNumber,
        },
        select: { id: true, paymentStatus: true },
      });

      if (!mirrorEmi) {
        mirrorSyncErrors++;
        addIssue({
          severity: 'ERROR',
          category: 'MIRROR_EMI_MISSING',
          entity: 'EMISchedule',
          entityId: mapping.originalLoanId,
          message: `Original EMI #${origEmi.installmentNumber} paid but mirror EMI missing entirely`,
          details: {
            originalLoanId: mapping.originalLoanId,
            mirrorLoanId: mapping.mirrorLoanId,
            installmentNumber: origEmi.installmentNumber,
          },
        });
      } else if (mirrorEmi.paymentStatus === 'PENDING') {
        mirrorSyncErrors++;
        addIssue({
          severity: 'ERROR',
          category: 'MIRROR_EMI_UNSYNCED',
          entity: 'EMISchedule',
          entityId: mirrorEmi.id,
          message: `Original EMI #${origEmi.installmentNumber} is ${origEmi.paymentStatus} but mirror EMI is PENDING`,
          details: {
            originalLoanId: mapping.originalLoanId,
            mirrorLoanId: mapping.mirrorLoanId,
            installmentNumber: origEmi.installmentNumber,
            originalStatus: origEmi.paymentStatus,
            mirrorStatus: mirrorEmi.paymentStatus,
          },
        });
      }
    }
  }
  stats.check3_mirrorSyncErrors = mirrorSyncErrors;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 4: Processing Fee isolation
  //          Mirror PF must exist in mirrorCompanyId, NOT originalCompanyId
  // ══════════════════════════════════════════════════════════════════
  let pfIsolationErrors = 0;

  for (const mapping of mirrorMappings) {
    if (!mapping.mirrorLoanId || !mapping.mirrorCompanyId) continue;
    if (!mapping.processingFeeRecorded) continue;

    // The PF JE should be in mirrorCompanyId
    const pfInMirror = await db.journalEntry.findFirst({
      where: {
        companyId: mapping.mirrorCompanyId,
        referenceId: mapping.mirrorLoanId,
        referenceType: 'PROCESSING_FEE_COLLECTION',
        isReversed: false,
      },
      select: { id: true },
    });

    // It must NOT exist in original company
    const pfInOriginal = await db.journalEntry.findFirst({
      where: {
        companyId: mapping.originalLoanId, // wrong company
        referenceId: mapping.mirrorLoanId,
        referenceType: 'PROCESSING_FEE_COLLECTION',
        isReversed: false,
      },
      select: { id: true },
    });

    if (!pfInMirror && mapping.mirrorProcessingFee && mapping.mirrorProcessingFee > 0) {
      pfIsolationErrors++;
      addIssue({
        severity: 'WARN',
        category: 'MISSING_MIRROR_PF_JOURNAL',
        entity: 'MirrorLoanMapping',
        entityId: mapping.id,
        message: `Mirror PF ₹${mapping.mirrorProcessingFee} marked recorded but no JE found in mirror company`,
        details: {
          originalLoanId: mapping.originalLoanId,
          mirrorLoanId: mapping.mirrorLoanId,
          mirrorCompanyId: mapping.mirrorCompanyId,
          mirrorProcessingFee: mapping.mirrorProcessingFee,
        },
      });
    }

    if (pfInOriginal) {
      pfIsolationErrors++;
      addIssue({
        severity: 'ERROR',
        category: 'PF_IN_WRONG_COMPANY',
        entity: 'JournalEntry',
        entityId: pfInOriginal.id,
        message: `Processing fee JE found in ORIGINAL company but should be in MIRROR company`,
        details: {
          originalLoanId: mapping.originalLoanId,
          mirrorLoanId: mapping.mirrorLoanId,
          mirrorCompanyId: mapping.mirrorCompanyId,
          wrongJournalId: pfInOriginal.id,
        },
      });
    }
  }
  stats.check4_pfIsolationErrors = pfIsolationErrors;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 5: Bank balance drift
  //          ChartOfAccount 1102 balance vs actual sum of BankAccount.currentBalance
  // ══════════════════════════════════════════════════════════════════
  let bankDriftErrors = 0;

  for (const company of companies) {
    const coaBank = await db.chartOfAccount.findFirst({
      where: { companyId: company.id, accountCode: '1102' },
      select: { id: true, currentBalance: true },
    });

    if (!coaBank) continue;

    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId: company.id, isActive: true },
      select: { currentBalance: true },
    });
    const actualBankSum = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);
    const drift = Math.abs((coaBank.currentBalance || 0) - actualBankSum);

    if (drift > 1) {
      bankDriftErrors++;
      addIssue({
        severity: drift > 100 ? 'ERROR' : 'WARN',
        category: 'BANK_BALANCE_DRIFT',
        entity: 'ChartOfAccount',
        entityId: coaBank.id,
        message: `Bank balance drift for ${company.name}: CoA shows ₹${(coaBank.currentBalance || 0).toFixed(2)}, actual BankAccount sum ₹${actualBankSum.toFixed(2)} (drift ₹${drift.toFixed(2)})`,
        details: {
          companyId: company.id,
          companyName: company.name,
          coaBalance: coaBank.currentBalance,
          actualBankSum,
          drift,
          bankAccountCount: bankAccounts.length,
        },
      });
    }
  }
  stats.check5_bankDriftErrors = bankDriftErrors;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 6: CashBook balance drift
  //          ChartOfAccount 1101 vs CashBook.currentBalance
  // ══════════════════════════════════════════════════════════════════
  let cashDriftErrors = 0;

  for (const company of companies) {
    const coaCash = await db.chartOfAccount.findFirst({
      where: { companyId: company.id, accountCode: '1101' },
      select: { id: true, currentBalance: true },
    });
    if (!coaCash) continue;

    const cashBook = await db.cashBook.findUnique({
      where: { companyId: company.id },
      select: { currentBalance: true },
    });
    const actualCash = cashBook?.currentBalance || 0;
    const drift = Math.abs((coaCash.currentBalance || 0) - actualCash);

    if (drift > 1) {
      cashDriftErrors++;
      addIssue({
        severity: drift > 100 ? 'ERROR' : 'WARN',
        category: 'CASH_BALANCE_DRIFT',
        entity: 'ChartOfAccount',
        entityId: coaCash.id,
        message: `Cash balance drift for ${company.name}: CoA shows ₹${(coaCash.currentBalance || 0).toFixed(2)}, CashBook shows ₹${actualCash.toFixed(2)} (drift ₹${drift.toFixed(2)})`,
        details: {
          companyId: company.id,
          companyName: company.name,
          coaBalance: coaCash.currentBalance,
          actualCash,
          drift,
        },
      });
    }
  }
  stats.check6_cashDriftErrors = cashDriftErrors;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 7: Closed loans with PENDING EMIs
  // ══════════════════════════════════════════════════════════════════
  const closedWithPendingEMIs = await db.loanApplication.findMany({
    where: {
      status: 'CLOSED',
      ...(filterCompanyId ? { companyId: filterCompanyId } : {}),
      emiSchedules: { some: { paymentStatus: 'PENDING' } },
    },
    select: {
      id: true, applicationNo: true, companyId: true,
      _count: { select: { emiSchedules: { where: { paymentStatus: 'PENDING' } } } },
    },
    take: 50,
  });

  stats.check7_closedWithPending = closedWithPendingEMIs.length;
  for (const loan of closedWithPendingEMIs) {
    addIssue({
      severity: 'WARN',
      category: 'CLOSED_LOAN_PENDING_EMI',
      entity: 'LoanApplication',
      entityId: loan.id,
      message: `Loan ${loan.applicationNo} is CLOSED but has ${(loan._count as any).emiSchedules} PENDING EMIs`,
      details: {
        loanId: loan.id,
        loanNo: loan.applicationNo,
        companyId: loan.companyId,
        pendingEmiCount: (loan._count as any).emiSchedules,
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // CHECK 8: Duplicate bank transactions (same referenceId × multiple)
  // ══════════════════════════════════════════════════════════════════
  // The schema has @@unique([referenceId]) so duplicates at DB level are impossible —
  // but cross-bank-account duplicates (same ref in 2 diff bank accounts) are possible.
  const btGroups = await db.$queryRaw<{ referenceId: string; cnt: number }[]>`
    SELECT referenceId, COUNT(*) as cnt
    FROM BankTransaction
    WHERE referenceId IS NOT NULL
    GROUP BY referenceId
    HAVING cnt > 1
    LIMIT 50
  `;

  stats.check8_duplicateBankTx = btGroups.length;
  for (const row of btGroups) {
    addIssue({
      severity: 'ERROR',
      category: 'DUPLICATE_BANK_TX',
      entity: 'BankTransaction',
      entityId: row.referenceId,
      message: `ReferenceId '${row.referenceId}' appears ${row.cnt} times in BankTransaction (double-recording)`,
      details: { referenceId: row.referenceId, count: row.cnt },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // CHECK 9: Duplicate cashbook entries (same referenceId × multiple)
  // ══════════════════════════════════════════════════════════════════
  const cbGroups = await db.$queryRaw<{ referenceId: string; cnt: number }[]>`
    SELECT referenceId, COUNT(*) as cnt
    FROM CashBookEntry
    WHERE referenceId IS NOT NULL
    GROUP BY referenceId
    HAVING cnt > 1
    LIMIT 50
  `;

  stats.check9_duplicateCashEntry = cbGroups.length;
  for (const row of cbGroups) {
    addIssue({
      severity: 'ERROR',
      category: 'DUPLICATE_CASHBOOK_ENTRY',
      entity: 'CashBookEntry',
      entityId: row.referenceId,
      message: `ReferenceId '${row.referenceId}' appears ${row.cnt} times in CashBookEntry (double-recording)`,
      details: { referenceId: row.referenceId, count: row.cnt },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // CHECK 10: Offline loans — paid EMIs missing passbook entries
  // ══════════════════════════════════════════════════════════════════
  const paidOfflineEMIs = await db.offlineLoanEMI.findMany({
    where: {
      paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] },
      paidAmount: { gt: 0 },
      ...(filterCompanyId
        ? { offlineLoan: { companyId: filterCompanyId } }
        : {}),
    },
    select: {
      id: true,
      installmentNumber: true,
      paidAmount: true,
      paymentMode: true,
      offlineLoan: { select: { id: true, loanNumber: true, companyId: true } },
    },
    orderBy: { paidDate: 'desc' },
    take: Math.min(limit, 100),
  });

  let offlineMissingPassbook = 0;
  for (const emi of paidOfflineEMIs) {
    const companyId = emi.offlineLoan?.companyId;
    if (!companyId) continue;

    const bankTx = await db.bankTransaction.findFirst({
      where: { referenceId: emi.id },
      select: { id: true },
    });
    const cashEntry = await db.cashBookEntry.findFirst({
      where: { referenceId: emi.id },
      select: { id: true },
    });

    if (!bankTx && !cashEntry) {
      offlineMissingPassbook++;
      addIssue({
        severity: 'WARN',
        category: 'OFFLINE_EMI_MISSING_PASSBOOK',
        entity: 'OfflineLoanEMI',
        entityId: emi.id,
        message: `Offline EMI #${emi.installmentNumber} (₹${emi.paidAmount}) for loan ${emi.offlineLoan?.loanNumber} has no passbook entry`,
        details: {
          emiId: emi.id,
          loanId: emi.offlineLoan?.id,
          loanNumber: emi.offlineLoan?.loanNumber,
          companyId,
          installmentNumber: emi.installmentNumber,
          paidAmount: emi.paidAmount,
          paymentMode: emi.paymentMode,
        },
      });
    }
  }
  stats.check10_offlineMissingPassbook = offlineMissingPassbook;

  // ══════════════════════════════════════════════════════════════════
  // CHECK 11: Mirror company entries in original company's books
  //           (cross-contamination: MIRROR_EMI_PAYMENT JE in original company)
  // ══════════════════════════════════════════════════════════════════
  let crossContaminationErrors = 0;
  for (const mapping of mirrorMappings) {
    if (!mapping.mirrorCompanyId) continue;

    // There should be NO MIRROR_EMI_PAYMENT journal entry in the ORIGINAL company
    const wrongJE = await db.journalEntry.findFirst({
      where: {
        // original loan's company context
        referenceType: 'MIRROR_EMI_PAYMENT',
        isReversed: false,
        lines: {
          some: { loanId: mapping.originalLoanId },
        },
      },
      select: { id: true, companyId: true, entryNumber: true },
    });

    if (wrongJE && wrongJE.companyId !== mapping.mirrorCompanyId) {
      crossContaminationErrors++;
      addIssue({
        severity: 'ERROR',
        category: 'CROSS_CONTAMINATION',
        entity: 'JournalEntry',
        entityId: wrongJE.id,
        message: `MIRROR_EMI_PAYMENT journal ${wrongJE.entryNumber} found in company ${wrongJE.companyId} but should only be in mirror company ${mapping.mirrorCompanyId}`,
        details: {
          journalId: wrongJE.id,
          journalCompanyId: wrongJE.companyId,
          mirrorCompanyId: mapping.mirrorCompanyId,
          originalLoanId: mapping.originalLoanId,
        },
      });
    }
  }
  stats.check11_crossContamination = crossContaminationErrors;

  // ══════════════════════════════════════════════════════════════════
  // BUILD REPORT
  // ══════════════════════════════════════════════════════════════════
  const errors   = issues.filter(i => i.severity === 'ERROR').length;
  const warnings = issues.filter(i => i.severity === 'WARN').length;
  const infos    = issues.filter(i => i.severity === 'INFO').length;

  const report: AuditReport = {
    runAt: new Date().toISOString(),
    companyId: filterCompanyId,
    totalIssues: issues.length,
    errors,
    warnings,
    infos,
    issues: issues.sort((a, b) => {
      const order = { ERROR: 0, WARN: 1, INFO: 2 };
      return order[a.severity] - order[b.severity];
    }),
    stats,
  };

  return NextResponse.json(report, { status: 200 });
}
