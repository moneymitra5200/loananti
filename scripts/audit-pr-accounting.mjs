/**
 * ═══════════════════════════════════════════════════════════════════
 *  PAYMENT REQUEST ACCOUNTING AUDIT SCRIPT
 *  Checks all accounting entries after cashier approves online loans
 *
 *  Scenarios tested:
 *   S1 – FULL_EMI  (regular loan, no mirror)
 *   S2 – FULL_EMI  (mirror-mapped loan — original side)
 *   S3 – PARTIAL_PAYMENT (regular loan)
 *   S4 – INTEREST_ONLY  (regular loan)
 *   S5 – Extra EMI (installment > mirrorTenure)
 *   S6 – Loan is itself a mirror (Case-A mirror)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Usage:  node scripts/audit-pr-accounting.mjs
 *  (Run from project root while the dev DB is running)
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────
const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️  WARN';
const SKIP = '⏭️  SKIP';

let totalPass = 0, totalFail = 0, totalWarn = 0;

function check(label, condition, warnOnly = false) {
  if (condition) {
    console.log(`    ${PASS}  ${label}`);
    totalPass++;
  } else if (warnOnly) {
    console.log(`    ${WARN}  ${label}`);
    totalWarn++;
  } else {
    console.log(`    ${FAIL}  ${label}`);
    totalFail++;
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(64)}`);
}

function sub(title) {
  console.log(`\n  ► ${title}`);
}

// ── Core audit logic per approved PaymentRequest ───────────────────
async function auditPaymentRequest(pr, label) {
  const loan = pr.loanApplication;
  const emi  = pr.emiSchedule;
  const companyId = loan?.companyId;

  sub(`[${label}]  PR#${pr.requestNumber}  type=${pr.paymentType}  amt=₹${pr.requestedAmount}  co=${companyId?.slice(-6)}`);

  if (!companyId) {
    console.log(`    ${SKIP}  No companyId on loan — cannot audit`);
    return;
  }

  // ── 1. Payment record must exist ────────────────────────────────
  const payment = await db.payment.findFirst({
    where: { emiScheduleId: emi?.id, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, amount: true, principalComponent: true, interestComponent: true }
  });
  check('Payment record exists in DB', !!payment);
  const paymentId = payment?.id || `PR-${pr.id}`;

  // ── 2. EMI status must be updated ───────────────────────────────
  const updatedEmi = await db.eMISchedule.findUnique({ where: { id: emi?.id } });
  const expectedStatus = pr.paymentType === 'PARTIAL_PAYMENT' ? 'PARTIALLY_PAID'
    : pr.paymentType === 'INTEREST_ONLY' ? 'INTEREST_ONLY_PAID'
    : 'PAID';
  check(`EMI status is ${expectedStatus}`, updatedEmi?.paymentStatus === expectedStatus);

  // ── 3. CashBook OR BankTransaction must exist ───────────────────
  const isOnlineMode = ['UPI', 'ONLINE', 'BANK_TRANSFER', 'CHEQUE'].includes(pr.paymentMethod || '');

  let cashEntry, bankTx;
  if (isOnlineMode) {
    // Find bank for this company
    const bank = await db.bankAccount.findFirst({ where: { companyId, isActive: true } });
    if (bank) {
      bankTx = await db.bankTransaction.findFirst({
        where: {
          bankAccountId: bank.id,
          referenceId: { in: [paymentId, `PR-${pr.id}`] }
        }
      });
    }
    check(
      `BankTransaction CREDIT exists (online mode: ${pr.paymentMethod})`,
      !!bankTx,
      !bank // only warn if no bank configured
    );
  } else {
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });
    if (cashBook) {
      cashEntry = await db.cashBookEntry.findFirst({
        where: {
          cashBookId: cashBook.id,
          referenceId: { in: [paymentId, `PR-${pr.id}`] }
        }
      });
    }
    check(
      `CashBookEntry CREDIT exists (cash mode: ${pr.paymentMethod})`,
      !!cashEntry,
      !cashBook
    );
  }

  // ── 4. Journal Entry must exist (FULL accounting companies) ─────
  const company = await db.company.findUnique({ where: { id: companyId }, select: { accountingType: true } });
  if (company?.accountingType === 'FULL') {
    const journalEntry = await db.journalEntry.findFirst({
      where: {
        companyId,
        referenceId: paymentId,
        isReversed: false
      }
    });
    check('JournalEntry exists (FULL accounting)', !!journalEntry);

    if (journalEntry) {
      const lines = await db.journalEntryLine.findMany({ where: { journalEntryId: journalEntry.id } });
      const totalDebit  = lines.reduce((s, l) => s + Number(l.debitAmount),  0);
      const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount), 0);
      const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
      check(`Journal is balanced (Dr ₹${totalDebit.toFixed(2)} = Cr ₹${totalCredit.toFixed(2)})`, balanced);
    }
  } else {
    console.log(`    ${SKIP}  Company accountingType=${company?.accountingType} — no journal required`);
  }

  // ── 5. Mirror loan checks ────────────────────────────────────────
  const mirrorMapping = await db.mirrorLoanMapping.findFirst({
    where: { originalLoanId: loan.id }
  });

  if (mirrorMapping?.mirrorLoanId) {
    const isExtraEmi = emi && emi.installmentNumber > mirrorMapping.mirrorTenure;

    if (!isExtraEmi) {
      // Mirror EMI must be synced
      const mirrorEmi = await db.eMISchedule.findFirst({
        where: {
          loanApplicationId: mirrorMapping.mirrorLoanId,
          installmentNumber: emi?.installmentNumber
        }
      });
      check('Mirror EMI exists', !!mirrorEmi);

      if (mirrorEmi) {
        const mirrorPaidOk = mirrorEmi.paymentStatus === 'PAID'
          || mirrorEmi.paymentStatus === 'INTEREST_ONLY_PAID'
          || mirrorEmi.paymentStatus === 'PARTIALLY_PAID';
        check(`Mirror EMI synced (status=${mirrorEmi.paymentStatus})`, mirrorPaidOk);
      }

      // Mirror Bank/Cashbook must have entry
      const mCompanyId = mirrorMapping.mirrorCompanyId;
      if (mCompanyId) {
        const mirrorBank = await db.bankAccount.findFirst({ where: { companyId: mCompanyId, isActive: true } });
        let mirrorBankTx, mirrorCashEntry;
        if (mirrorBank) {
          mirrorBankTx = await db.bankTransaction.findFirst({
            where: { bankAccountId: mirrorBank.id, referenceId: `${paymentId}-MIRROR` }
          });
        }
        const mirrorCashBook = await db.cashBook.findUnique({ where: { companyId: mCompanyId } });
        if (mirrorCashBook) {
          mirrorCashEntry = await db.cashBookEntry.findFirst({
            where: { cashBookId: mirrorCashBook.id, referenceId: `${paymentId}-MIRROR` }
          });
        }
        check(
          `Mirror company ledger entry exists (bank or cash)`,
          !!(mirrorBankTx || mirrorCashEntry)
        );

        // Mirror Journal Entry
        const mirrorJE = await db.journalEntry.findFirst({
          where: { companyId: mCompanyId, referenceId: paymentId, referenceType: 'MIRROR_EMI_PAYMENT', isReversed: false }
        });
        check('Mirror JournalEntry exists', !!mirrorJE, true); // warn only

        // Original company must NOT have mirror amount double-recorded
        if (mirrorBank && mirrorCashBook) {
          const origBank = await db.bankAccount.findFirst({ where: { companyId, isActive: true } });
          if (origBank) {
            const origHasMirrorRef = await db.bankTransaction.findFirst({
              where: { bankAccountId: origBank.id, referenceId: `${paymentId}-MIRROR` }
            });
            check('Original company NOT double-recorded with mirror ref', !origHasMirrorRef);
          }
        }
      }
    } else {
      console.log(`    ${SKIP}  Extra EMI (#${emi?.installmentNumber} > mirrorTenure ${mirrorMapping.mirrorTenure}) — no mirror sync expected`);
    }

    // Processing Fee check (EMI #1 only)
    if (emi?.installmentNumber === 1 && !emi?.isInterestOnly) {
      const pfEntry = await db.cashBookEntry.findFirst({
        where: { referenceType: 'PROCESSING_FEE', referenceId: `${loan.id}-MIR-PF` }
      });
      check('Mirror processing fee cashbook entry recorded (EMI#1)', !!pfEntry, true);
    }
  }

  // ── 6. Case-A: THIS loan is itself a mirror ──────────────────────
  const selfAsMirror = await db.mirrorLoanMapping.findFirst({ where: { mirrorLoanId: loan.id } });
  if (selfAsMirror && !mirrorMapping) {
    // Bank entry for Case-A processing fee (EMI#1)
    if (emi?.installmentNumber === 1) {
      const pfBank = await db.bankTransaction.findFirst({
        where: { referenceType: 'PROCESSING_FEE', referenceId: `${loan.id}-PF-PR` }
      });
      check('Case-A: Processing fee bank entry exists (EMI#1)', !!pfBank, true);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   PAYMENT REQUEST ACCOUNTING AUDIT                          ║');
  console.log('║   Checking: Customer pays → Cashier approves → Accounting  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Run at: ${new Date().toLocaleString('en-IN')}\n`);

  // Fetch the latest 50 APPROVED payment requests (covers all scenarios)
  const approvedPRs = await db.paymentRequest.findMany({
    where: { status: 'APPROVED' },
    orderBy: { reviewedAt: 'desc' },
    take: 50,
    include: {
      emiSchedule: true,
      loanApplication: {
        include: {
          sessionForm: true,
          customer: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (approvedPRs.length === 0) {
    console.log('  ⚠️  No APPROVED PaymentRequests found in DB. Nothing to audit.');
    await db.$disconnect();
    return;
  }

  console.log(`  Found ${approvedPRs.length} approved payment requests. Auditing...\n`);

  // ── Scenario buckets ──────────────────────────────────────────────
  const fullEmiRegular    = [];
  const fullEmiMirror     = [];
  const partialPayment    = [];
  const interestOnly      = [];
  const extraEmi          = [];
  const selfMirror        = [];

  for (const pr of approvedPRs) {
    const loanId = pr.loanApplicationId;
    const emiNo  = pr.emiSchedule?.installmentNumber ?? 0;

    const mirrorMapping = await db.mirrorLoanMapping.findFirst({ where: { originalLoanId: loanId } });
    const selfAsMirror  = await db.mirrorLoanMapping.findFirst({ where: { mirrorLoanId: loanId } });

    const isExtraEmi = mirrorMapping && emiNo > mirrorMapping.mirrorTenure;

    if (pr.paymentType === 'FULL_EMI') {
      if (isExtraEmi)        extraEmi.push(pr);
      else if (mirrorMapping) fullEmiMirror.push(pr);
      else if (selfAsMirror)  selfMirror.push(pr);
      else                    fullEmiRegular.push(pr);
    } else if (pr.paymentType === 'PARTIAL_PAYMENT') {
      partialPayment.push(pr);
    } else if (pr.paymentType === 'INTEREST_ONLY') {
      interestOnly.push(pr);
    }
  }

  // ── S1: FULL EMI – Regular Loan ──────────────────────────────────
  section('S1 — FULL_EMI  (regular loan, no mirror)');
  if (fullEmiRegular.length === 0) {
    console.log(`  ${SKIP}  No regular FULL_EMI PRs found`);
  }
  for (const pr of fullEmiRegular.slice(0, 5)) {
    await auditPaymentRequest(pr, 'S1');
  }

  // ── S2: FULL EMI – Mirror Loan ───────────────────────────────────
  section('S2 — FULL_EMI  (mirror-mapped loan, original side)');
  if (fullEmiMirror.length === 0) {
    console.log(`  ${SKIP}  No mirror FULL_EMI PRs found`);
  }
  for (const pr of fullEmiMirror.slice(0, 5)) {
    await auditPaymentRequest(pr, 'S2');
  }

  // ── S3: PARTIAL PAYMENT ──────────────────────────────────────────
  section('S3 — PARTIAL_PAYMENT');
  if (partialPayment.length === 0) {
    console.log(`  ${SKIP}  No PARTIAL_PAYMENT PRs found`);
  }
  for (const pr of partialPayment.slice(0, 5)) {
    await auditPaymentRequest(pr, 'S3');
  }

  // ── S4: INTEREST ONLY ────────────────────────────────────────────
  section('S4 — INTEREST_ONLY');
  if (interestOnly.length === 0) {
    console.log(`  ${SKIP}  No INTEREST_ONLY PRs found`);
  }
  for (const pr of interestOnly.slice(0, 5)) {
    await auditPaymentRequest(pr, 'S4');

    // Extra check: a new deferred EMI must have been created
    const emi = pr.emiSchedule;
    if (emi) {
      const deferredEmi = await db.eMISchedule.findFirst({
        where: {
          loanApplicationId: pr.loanApplicationId,
          installmentNumber: emi.installmentNumber + 1,
          isInterestOnly: true,
          principalDeferred: true
        }
      });
      check('Deferred EMI created for next month (INTEREST_ONLY)', !!deferredEmi);
    }
  }

  // ── S5: Extra EMI (installment > mirrorTenure) ───────────────────
  section('S5 — Extra EMI  (installmentNumber > mirrorTenure)');
  if (extraEmi.length === 0) {
    console.log(`  ${SKIP}  No extra-EMI PRs found`);
  }
  for (const pr of extraEmi.slice(0, 3)) {
    sub(`[S5]  PR#${pr.requestNumber}  emi#${pr.emiSchedule?.installmentNumber}`);
    // For extra EMI: money goes to original company, NOT mirrored
    const payment = await db.payment.findFirst({
      where: { emiScheduleId: pr.emiSchedule?.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });
    check('Payment record exists', !!payment);
    const paymentId = payment?.id || `PR-${pr.id}`;

    const companyId = pr.loanApplication?.companyId;
    if (companyId) {
      const bank = await db.bankAccount.findFirst({ where: { companyId, isActive: true } });
      if (bank) {
        const bt = await db.bankTransaction.findFirst({
          where: { bankAccountId: bank.id, referenceId: paymentId }
        });
        check('Original company bank entry exists (extra EMI profit)', !!bt, true);
      }
    }
  }

  // ── S6: Self-as-mirror (Case A) ──────────────────────────────────
  section('S6 — Loan is itself a mirror (Case-A)');
  if (selfMirror.length === 0) {
    console.log(`  ${SKIP}  No Case-A mirror PRs found`);
  }
  for (const pr of selfMirror.slice(0, 3)) {
    await auditPaymentRequest(pr, 'S6');
  }

  // ── FINAL SUMMARY ─────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log('  FINAL AUDIT SUMMARY');
  console.log(`${'─'.repeat(64)}`);
  console.log(`  ✅ PASS  : ${totalPass}`);
  console.log(`  ❌ FAIL  : ${totalFail}`);
  console.log(`  ⚠️  WARN  : ${totalWarn}`);
  console.log(`${'═'.repeat(64)}\n`);

  if (totalFail === 0) {
    console.log('  🎉  ALL CHECKS PASSED — Accounting looks correct!\n');
  } else {
    console.log('  🚨  SOME CHECKS FAILED — Review the ❌ lines above.\n');
  }

  await db.$disconnect();
}

main().catch(e => {
  console.error('Audit script error:', e);
  db.$disconnect();
  process.exit(1);
});
