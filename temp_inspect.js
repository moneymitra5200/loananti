require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loanNumber = 'C3-PERSONAL-MONEYMITRA-003';
  console.log('Searching for loan:', loanNumber);
  
  const loan = await prisma.offlineLoan.findFirst({
    where: { loanNumber },
    include: {
      emis: true
    }
  });

  if (!loan) {
    console.log('Loan not found!');
    return;
  }

  console.log('Loan details:', {
    id: loan.id,
    loanNumber: loan.loanNumber,
    loanAmount: loan.loanAmount,
    status: loan.status,
    companyId: loan.companyId,
    customerId: loan.customerId
  });

  // Find all journal entries referencing this loan
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      lines: {
        some: {
          loanId: loan.id
        }
      }
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });

  console.log(`Found ${journalEntries.length} journal entries:`);
  for (const je of journalEntries) {
    console.log(`JE: ${je.entryNumber} | Date: ${je.entryDate.toISOString()} | RefType: ${je.referenceType} | Narration: ${je.narration}`);
    for (const line of je.lines) {
      console.log(`  Line: Account ${line.account.accountCode} (${line.account.accountName}) | Debit: ${line.debitAmount} | Credit: ${line.creditAmount} | LoanId: ${line.loanId}`);
    }
  }

  // Also check daybook entries
  const daybookEntries = await prisma.daybookEntry.findMany({
    where: {
      referenceId: loan.id
    }
  });
  console.log(`Found ${daybookEntries.length} daybook entries:`);
  for (const de of daybookEntries) {
    console.log(`  DE: ${de.entryNumber} | Date: ${de.entryDate.toISOString()} | Head: ${de.accountHeadName} | Debit: ${de.debitAmount} | Credit: ${de.creditAmount}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
