const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting and Fixing Accounting Entry Dates ---');

  // 1. Fetch all EMI Payments to build a map of referenceId -> actual payment date
  const offlinePayments = await prisma.offlineEMIPayment.findMany({
    select: { id: true, paymentDate: true, createdAt: true }
  });
  const onlinePayments = await prisma.eMIPayment.findMany({
    select: { id: true, paymentDate: true, createdAt: true }
  });
  const genericPayments = await prisma.payment.findMany({
    select: { id: true, paidDate: true, createdAt: true }
  });

  const paymentDateMap = new Map();
  for (const p of offlinePayments) {
    const d = p.paymentDate || p.createdAt;
    paymentDateMap.set(p.id, d);
  }
  for (const p of onlinePayments) {
    const d = p.paymentDate || p.createdAt;
    paymentDateMap.set(p.id, d);
  }
  for (const p of genericPayments) {
    const d = p.paidDate || p.createdAt;
    paymentDateMap.set(p.id, d);
  }

  // 2. Fetch EMIs for interest accruals (referenceId -> dueDate)
  const onlineEMIs = await prisma.eMISchedule.findMany({
    select: { id: true, dueDate: true }
  });
  const offlineEMIs = await prisma.offlineLoanEMI.findMany({
    select: { id: true, dueDate: true }
  });

  const emiDueDateMap = new Map();
  for (const e of onlineEMIs) {
    emiDueDateMap.set(e.id, e.dueDate);
  }
  for (const e of offlineEMIs) {
    emiDueDateMap.set(e.id, e.dueDate);
  }

  // 3. Fetch Loans for disbursements (referenceId -> disbursementDate)
  const onlineLoans = await prisma.loanApplication.findMany({
    select: { id: true, disbursedAt: true, createdAt: true }
  });
  const offlineLoans = await prisma.offlineLoan.findMany({
    select: { id: true, disbursementDate: true, createdAt: true }
  });

  const loanDisbDateMap = new Map();
  for (const l of onlineLoans) {
    loanDisbDateMap.set(l.id, l.disbursedAt || l.createdAt);
  }
  for (const l of offlineLoans) {
    loanDisbDateMap.set(l.id, l.disbursementDate || l.createdAt);
  }

  // 4. Update Journal Entries
  const jes = await prisma.journalEntry.findMany({
    where: { isReversed: false },
    select: { id: true, entryNumber: true, referenceType: true, referenceId: true, entryDate: true, createdAt: true }
  });

  let updatedJECount = 0;
  for (const je of jes) {
    let targetDate = null;

    if (!je.referenceId) continue;

    const refId = je.referenceId.replace(/-MIRROR$/, '').replace(/-SPLIT.*$/, '');

    if (['EMI_PAYMENT', 'MIRROR_EMI_PAYMENT', 'INTEREST_ONLY_PAYMENT', 'PARTIAL_EMI_PAYMENT', 'PRINCIPAL_ONLY_PAYMENT'].includes(je.referenceType)) {
      targetDate = paymentDateMap.get(refId) || paymentDateMap.get(je.referenceId);
    } else if (['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'].includes(je.referenceType)) {
      targetDate = emiDueDateMap.get(refId) || emiDueDateMap.get(je.referenceId);
    } else if (['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT', 'PROCESSING_FEE_ACCRUAL', 'PROCESSING_FEE_COLLECTION', 'PROCESSING_FEE'].includes(je.referenceType)) {
      targetDate = loanDisbDateMap.get(refId) || loanDisbDateMap.get(je.referenceId);
    }

    if (targetDate) {
      const current = new Date(je.entryDate).getTime();
      const target = new Date(targetDate).getTime();

      // If difference is more than 1 minute, update
      if (Math.abs(current - target) > 60000) {
        await prisma.journalEntry.update({
          where: { id: je.id },
          data: { entryDate: new Date(targetDate) }
        });
        updatedJECount++;
      }
    }
  }

  console.log(`Updated ${updatedJECount} JournalEntry dates.`);

  // 5. Update CashBookEntries
  const cashEntries = await prisma.cashBookEntry.findMany({
    select: { id: true, referenceType: true, referenceId: true, entryDate: true }
  });
  let updatedCashCount = 0;
  for (const ce of cashEntries) {
    if (!ce.referenceId) continue;
    const refId = ce.referenceId.replace(/-MIRROR$/, '').replace(/-SPLIT.*$/, '');
    let targetDate = paymentDateMap.get(refId) || paymentDateMap.get(ce.referenceId);
    if (!targetDate && ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT', 'PROCESSING_FEE_COLLECTION'].includes(ce.referenceType)) {
      targetDate = loanDisbDateMap.get(refId) || loanDisbDateMap.get(ce.referenceId);
    }
    if (targetDate) {
      const current = new Date(ce.entryDate).getTime();
      const target = new Date(targetDate).getTime();
      if (Math.abs(current - target) > 60000) {
        await prisma.cashBookEntry.update({
          where: { id: ce.id },
          data: { entryDate: new Date(targetDate) }
        });
        updatedCashCount++;
      }
    }
  }
  console.log(`Updated ${updatedCashCount} CashBookEntry dates.`);

  // 6. Update BankTransactions
  const bankTxns = await prisma.bankTransaction.findMany({
    select: { id: true, referenceType: true, referenceId: true, transactionDate: true }
  });
  let updatedBankCount = 0;
  for (const bt of bankTxns) {
    if (!bt.referenceId) continue;
    const refId = bt.referenceId.replace(/-MIRROR$/, '').replace(/-SPLIT.*$/, '');
    let targetDate = paymentDateMap.get(refId) || paymentDateMap.get(bt.referenceId);
    if (!targetDate && ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT', 'PROCESSING_FEE_COLLECTION'].includes(bt.referenceType)) {
      targetDate = loanDisbDateMap.get(refId) || loanDisbDateMap.get(bt.referenceId);
    }
    if (targetDate) {
      const current = new Date(bt.transactionDate).getTime();
      const target = new Date(targetDate).getTime();
      if (Math.abs(current - target) > 60000) {
        await prisma.bankTransaction.update({
          where: { id: bt.id },
          data: { transactionDate: new Date(targetDate) }
        });
        updatedBankCount++;
      }
    }
  }
  console.log(`Updated ${updatedBankCount} BankTransaction dates.`);

  console.log('--- Completed Accounting Entry Date Realignment ---');
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
