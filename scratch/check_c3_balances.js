const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdura0000oweseq4j4xkj'; // C3
  console.log(`Checking data for C3...`);

  const cashBook = await db.cashBook.findUnique({ where: { companyId } });
  console.log('CashBook:', cashBook);

  const cashBookEntries = await db.cashBookEntry.findMany({
    where: { cashBook: { companyId } }
  });
  console.log(`CashBookEntries count: ${cashBookEntries.length}`);
  let cbTotal = cashBook?.openingBalance || 0;
  for (const entry of cashBookEntries) {
    if (entry.entryType === 'CREDIT') cbTotal += entry.amount;
    else cbTotal -= entry.amount;
    console.log(`  - Entry: ${entry.entryType} | RefType: ${entry.referenceType} | Amount: ${entry.amount} | Date: ${entry.entryDate}`);
  }
  console.log(`Calculated CashBook Balance: ${cbTotal}`);

  const bankAccounts = await db.bankAccount.findMany({ where: { companyId } });
  console.log(`BankAccount count: ${bankAccounts.length}`);
  for (const b of bankAccounts) {
    console.log(`  - Bank: ${b.bankName} (${b.accountNumber}) | Current: ${b.currentBalance} | Opening: ${b.openingBalance}`);
    const txs = await db.bankTransaction.findMany({ where: { bankAccountId: b.id } });
    console.log(`    Transactions count: ${txs.length}`);
    for (const t of txs) {
      console.log(`      - Tx: ${t.transactionType} | RefType: ${t.referenceType} | Amount: ${t.amount} | Date: ${t.transactionDate}`);
    }
  }

  const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
  console.log(`Equity Entries count: ${equityEntries.length}`);
  for (const e of equityEntries) {
    console.log(`  - Entry: ${e.entryType} | Amount: ${e.amount} | Date: ${e.entryDate || e.createdAt}`);
  }

  const offlineLoans = await db.offlineLoan.findMany({ where: { companyId } });
  console.log(`Offline Loans count: ${offlineLoans.length}`);
  for (const l of offlineLoans) {
    console.log(`  - Loan ${l.loanNumber}: Amount: ${l.loanAmount} | Status: ${l.status}`);
    const emis = await db.offlineLoanEMI.findMany({ where: { offlineLoanId: l.id } });
    console.log(`    EMIs count: ${emis.length}`);
    for (const emi of emis) {
      console.log(`      - EMI ${emi.installmentNumber}: Status: ${emi.paymentStatus} | Paid Amount: ${emi.paidAmount} | Paid Date: ${emi.paidDate}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
