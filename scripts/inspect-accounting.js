const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- ACCOUNTING INSPECTION START ---");

  // 1. Fetch the LoanApplication C2PL00001
  const loan = await prisma.loanApplication.findFirst({
    where: { applicationNo: 'C2PL00001' },
    include: { sessionForm: true }
  });

  if (!loan) {
    console.error("Loan C2PL00001 not found");
    return;
  }
  console.log(`Loan Application: ${loan.applicationNo} (ID: ${loan.id})`);
  console.log(`- status: ${loan.status}`);
  console.log(`- disbursedAmount: ${loan.disbursedAmount}`);
  console.log(`- requestedAmount: ${loan.requestedAmount}`);
  console.log(`- sessionForm approvedAmount: ${loan.sessionForm?.approvedAmount}`);
  console.log(`- sessionForm emiAmount: ${loan.sessionForm?.emiAmount}`);
  console.log(`- sessionForm totalAmount: ${loan.sessionForm?.totalAmount}`);
  console.log(`- sessionForm totalInterest: ${loan.sessionForm?.totalInterest}`);

  // 2. Fetch EMISchedules for C2PL00001
  const emis = await prisma.eMISchedule.findMany({
    where: { loanApplicationId: loan.id },
    orderBy: { installmentNumber: 'asc' }
  });
  console.log(`\nEMI Schedules (Count: ${emis.length}):`);
  emis.forEach(e => {
    console.log(`- Installment #${e.installmentNumber} | Due: ${e.dueDate?.toISOString().substring(0, 10)} | Status: ${e.paymentStatus} | Total: ${e.totalAmount} | Principal: ${e.principalAmount} | Interest: ${e.interestAmount} | Paid: ${e.paidAmount}`);
  });

  // 3. Fetch JournalEntries for C2PL00001
  const jEntries = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { referenceId: loan.id },
        { lines: { some: { loanId: loan.id } } }
      ]
    },
    include: {
      lines: {
        include: {
          account: { select: { accountName: true, accountCode: true } }
        }
      }
    }
  });

  console.log(`\nJournal Entries (Count: ${jEntries.length}):`);
  jEntries.forEach(je => {
    console.log(`- JE ID: ${je.id} | EntryNum: ${je.entryNumber} | RefType: ${je.referenceType} | RefId: ${je.referenceId} | Narration: ${je.narration} | Date: ${je.entryDate}`);
    je.lines.forEach(l => {
      console.log(`  * Line: Account=${l.account?.accountName} (${l.account?.accountCode}) | Debit=${l.debitAmount} | Credit=${l.creditAmount} | Narration=${l.narration}`);
    });
  });

  // 4. Fetch Bank Transactions for C2PL00001
  const bankTx = await prisma.bankTransaction.findMany({
    where: { referenceId: loan.id }
  });
  console.log(`\nBank Transactions (Count: ${bankTx.length}):`);
  bankTx.forEach(bt => {
    console.log(`- BT ID: ${bt.id} | Type: ${bt.transactionType} | Amount: ${bt.amount} | Desc: ${bt.description}`);
  });

  // 5. Fetch CashBook Entries for C2PL00001
  const cashEntry = await prisma.cashBookEntry.findMany({
    where: { referenceId: loan.id }
  });
  console.log(`\nCashBook Entries (Count: ${cashEntry.length}):`);
  cashEntry.forEach(ce => {
    console.log(`- CE ID: ${ce.id} | Type: ${ce.entryType} | Amount: ${ce.amount} | Desc: ${ce.description}`);
  });

  console.log("\n--- ACCOUNTING INSPECTION END ---");
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
