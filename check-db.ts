import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('--- START DEEP AUDIT ---');

  // 1. Chart of Accounts
  console.log('\n--- CHART OF ACCOUNTS ---');
  const accounts = await db.chartOfAccount.findMany({
    orderBy: { accountCode: 'asc' },
  });
  for (const acc of accounts) {
    console.log(`[${acc.accountCode}] ${acc.accountName} - Type: ${acc.accountType}, Open: ${acc.openingBalance}, Current: ${acc.currentBalance}`);
  }

  // 2. Cash Book
  console.log('\n--- CASH BOOKS ---');
  const cashBooks = await db.cashBook.findMany();
  for (const cb of cashBooks) {
    console.log(`CashBook ID: ${cb.id}, Company: ${cb.companyId}, Open: ${cb.openingBalance}, Current: ${cb.currentBalance}`);
    const entries = await db.cashBookEntry.findMany({
      where: { cashBookId: cb.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Entries count: ${entries.length}`);
    for (const entry of entries) {
      console.log(`    [${entry.entryType}] Date: ${entry.entryDate.toISOString()}, Amt: ${entry.amount}, BalAfter: ${entry.balanceAfter}, RefType: ${entry.referenceType}, RefId: ${entry.referenceId}, Desc: ${entry.description}`);
    }
  }

  // 3. Bank Accounts & Transactions
  console.log('\n--- BANK ACCOUNTS & TRANSACTIONS ---');
  const bankAccounts = await db.bankAccount.findMany();
  for (const bank of bankAccounts) {
    console.log(`Bank: ${bank.bankName} (${bank.accountNumber}), Open: ${bank.openingBalance}, Current: ${bank.currentBalance}`);
    const txs = await db.bankTransaction.findMany({
      where: { bankAccountId: bank.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Transactions count: ${txs.length}`);
    for (const tx of txs) {
      console.log(`    [${tx.transactionType}] Date: ${tx.transactionDate.toISOString()}, Amt: ${tx.amount}, BalAfter: ${tx.balanceAfter}, RefType: ${tx.referenceType}, RefId: ${tx.referenceId}, Desc: ${tx.description}`);
    }
  }

  // 4. Equity Entries
  console.log('\n--- EQUITY ENTRIES ---');
  const equities = await db.equityEntry.findMany();
  for (const eq of equities) {
    console.log(`Type: ${eq.entryType}, Amount: ${eq.amount}, Date: ${eq.entryDate.toISOString()}, Desc: ${eq.description}`);
  }

  // 5. Loan Applications
  console.log('\n--- ONLINE LOAN APPLICATIONS ---');
  const loans = await db.loanApplication.findMany({
    include: {
      customer: true
    }
  });
  console.log(`Total Online Loans: ${loans.length}`);
  for (const loan of loans) {
    console.log(`ID: ${loan.id}, AppNo: ${loan.applicationNo}, Status: ${loan.status}, Amt: ${loan.amount}, DisbursedAmt: ${loan.disbursedAmount}, Customer: ${loan.customer?.name}`);
  }

  // 6. Offline Loans
  console.log('\n--- OFFLINE LOANS ---');
  const offlineLoans = await db.offlineLoan.findMany();
  console.log(`Total Offline Loans: ${offlineLoans.length}`);
  for (const loan of offlineLoans) {
    console.log(`ID: ${loan.id}, LoanNo: ${loan.loanNumber}, Status: ${loan.status}, Amt: ${loan.loanAmount}, Disbursed: ${loan.disbursementDate?.toISOString()}`);
  }

  // 7. Journal Entries
  console.log('\n--- JOURNAL ENTRIES ---');
  const jes = await db.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      }
    },
    orderBy: { entryDate: 'asc' }
  });
  for (const je of jes) {
    console.log(`JE ${je.entryNumber} - Date: ${je.entryDate.toISOString()}, RefType: ${je.referenceType}, RefId: ${je.referenceId}, Narration: ${je.narration}, DR: ${je.totalDebit}, CR: ${je.totalCredit}, Approved: ${je.isApproved}`);
    for (const line of je.lines) {
      console.log(`  Line: ${line.account.accountCode} - ${line.account.accountName} | DR: ${line.debitAmount} | CR: ${line.creditAmount} | Narration: ${line.narration}`);
    }
  }

  console.log('\n--- END DEEP AUDIT ---');
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
