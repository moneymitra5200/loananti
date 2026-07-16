/**
 * DEEP DIAGNOSTIC — PR#PRMRN86LUM
 * Shows exactly what DB records exist after approval
 */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  console.log('\n══════════════ DEEP DIAGNOSTIC ══════════════\n');

  // 1. Find the PR
  const pr = await db.paymentRequest.findFirst({
    where: { requestNumber: 'PRMRN86LUM' },
    include: {
      emiSchedule: true,
      loanApplication: {
        include: { sessionForm: true, customer: { select: { id: true, name: true } } }
      }
    }
  });

  if (!pr) { console.log('PR not found'); await db.$disconnect(); return; }

  const loan = pr.loanApplication;
  const emi  = pr.emiSchedule;
  const companyId = loan?.companyId;

  console.log('PR:', pr.requestNumber, '| status:', pr.status, '| paymentType:', pr.paymentType);
  console.log('Amount:', pr.requestedAmount, '| PayMethod:', pr.paymentMethod);
  console.log('Loan ID:', loan?.id, '| CompanyId:', companyId);
  console.log('EMI ID:', emi?.id, '| EMI#:', emi?.installmentNumber, '| Status:', emi?.paymentStatus);

  // 2. Payment record
  const payment = await db.payment.findFirst({
    where: { emiScheduleId: emi?.id, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' }
  });
  console.log('\n── Payment Record ──');
  console.log(payment
    ? `  ID: ${payment.id}  Amt: ₹${payment.amount}  P: ₹${payment.principalComponent}  I: ₹${payment.interestComponent}`
    : '  ❌ NOT FOUND');
  const paymentId = payment?.id || `PR-${pr.id}`;

  // 3. Mirror mapping
  const mirrorMapping = await db.mirrorLoanMapping.findFirst({ where: { originalLoanId: loan?.id } });
  console.log('\n── Mirror Mapping ──');
  if (mirrorMapping) {
    console.log('  mirrorLoanId:', mirrorMapping.mirrorLoanId);
    console.log('  mirrorCompanyId:', mirrorMapping.mirrorCompanyId);
    console.log('  mirrorTenure:', mirrorMapping.mirrorTenure);
    console.log('  mirrorEMIsPaid:', mirrorMapping.mirrorEMIsPaid);
    console.log('  processingFeeRecorded:', mirrorMapping.processingFeeRecorded);
  } else {
    console.log('  None');
  }

  // 4. Original company bank/cashbook
  const origBank = await db.bankAccount.findFirst({ where: { companyId: companyId, isActive: true } });
  console.log('\n── Original Company Bank ──');
  if (origBank) {
    console.log('  bankId:', origBank.id, '| balance:', origBank.currentBalance);
    const bt = await db.bankTransaction.findFirst({ where: { bankAccountId: origBank.id, referenceId: paymentId } });
    console.log('  BankTx for payment:', bt ? `₹${bt.amount} ${bt.transactionType}` : '❌ NOT FOUND');
  } else {
    console.log('  No bank account configured for original company');
  }

  const origCashBook = await db.cashBook.findUnique({ where: { companyId: companyId } });
  if (origCashBook) {
    const ce = await db.cashBookEntry.findFirst({ where: { cashBookId: origCashBook.id, referenceId: paymentId } });
    console.log('  CashBookEntry for payment:', ce ? `₹${ce.amount} ${ce.entryType}` : '❌ NOT FOUND');
  }

  // 5. Mirror company bank/cashbook
  if (mirrorMapping?.mirrorCompanyId) {
    const mCompId = mirrorMapping.mirrorCompanyId;
    console.log('\n── Mirror Company Bank/Cash ──');

    const mirrorBank = await db.bankAccount.findFirst({ where: { companyId: mCompId, isActive: true } });
    console.log('  Mirror bank:', mirrorBank ? `${mirrorBank.id} balance=${mirrorBank.currentBalance}` : 'NOT CONFIGURED');

    const mirrorCash = await db.cashBook.findUnique({ where: { companyId: mCompId } });
    console.log('  Mirror cashbook:', mirrorCash ? `${mirrorCash.id} balance=${mirrorCash.currentBalance}` : 'NOT CONFIGURED');

    const refIds = [`${paymentId}-MIRROR`, paymentId];
    console.log('\n  Searching for mirror ledger entries with refIds:', refIds);

    if (mirrorBank) {
      const mirrorBankTxs = await db.bankTransaction.findMany({
        where: { bankAccountId: mirrorBank.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      console.log('  Last 5 mirror bank txs:', mirrorBankTxs.map(t => `${t.referenceId}=₹${t.amount}`).join(', ') || 'NONE');
    }
    if (mirrorCash) {
      const mirrorCashEntries = await db.cashBookEntry.findMany({
        where: { cashBookId: mirrorCash.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      console.log('  Last 5 mirror cashbook entries:', mirrorCashEntries.map(e => `${e.referenceId}=₹${e.amount}`).join(', ') || 'NONE');
    }

    // Mirror JE
    const mirrorJEs = await db.journalEntry.findMany({
      where: { companyId: mCompId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, entryNumber: true, referenceType: true, referenceId: true, createdAt: true }
    });
    console.log('\n  Last 5 mirror JournalEntries:');
    mirrorJEs.forEach(j => console.log(`    ${j.entryNumber} | ${j.referenceType} | ref=${j.referenceId}`));
  }

  // 6. Check original company JE
  console.log('\n── Original Company JournalEntries (last 5) ──');
  const origJEs = await db.journalEntry.findMany({
    where: { companyId: companyId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, entryNumber: true, referenceType: true, referenceId: true }
  });
  origJEs.forEach(j => console.log(`  ${j.entryNumber} | ${j.referenceType} | ref=${j.referenceId}`));
  if (origJEs.length === 0) console.log('  None found');

  // 7. All bank transactions referencing this paymentId across ALL banks
  console.log('\n── All BankTransactions with this paymentId (any bank) ──');
  const allBankTxs = await db.bankTransaction.findMany({
    where: { referenceId: { contains: paymentId.slice(0, 10) } },
    take: 10,
    select: { bankAccountId: true, transactionType: true, amount: true, referenceId: true, referenceType: true }
  });
  allBankTxs.forEach(t => console.log(`  bankId=${t.bankAccountId.slice(-6)} ${t.transactionType} ₹${t.amount} ref=${t.referenceId}`));
  if (allBankTxs.length === 0) console.log('  NONE — no bank transactions found for this payment!');

  // 8. All cashbook entries referencing this paymentId across ALL cashbooks
  console.log('\n── All CashBookEntries with this paymentId ──');
  const allCBEs = await db.cashBookEntry.findMany({
    where: { referenceId: { contains: paymentId.slice(0, 10) } },
    take: 10,
    select: { cashBookId: true, entryType: true, amount: true, referenceId: true, referenceType: true }
  });
  allCBEs.forEach(e => console.log(`  cbId=${e.cashBookId.slice(-6)} ${e.entryType} ₹${e.amount} ref=${e.referenceId}`));
  if (allCBEs.length === 0) console.log('  NONE — no cashbook entries found for this payment!');

  console.log('\n══════════════ END DIAGNOSTIC ══════════════\n');
  await db.$disconnect();
}

main().catch(e => { console.error(e); db.$disconnect(); process.exit(1); });
