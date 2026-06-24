require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('=== SEARCHING COMPANIES ===');
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`Company ID: ${c.id}, Name: ${c.name}, Code: ${c.code}`);
  }

  console.log('=== SEARCHING OFFLINE LOAN BY NUMBER ===');
  const offLoans = await db.offlineLoan.findMany();
  for (const l of offLoans) {
    console.log(`Offline Loan ID: ${l.id}, Loan Number: ${l.loanNumber}, Status: ${l.status}, Company: ${l.companyId}`);
  }

  console.log('=== SEARCHING MIRROR MAPPINGS ===');
  const maps = await db.mirrorLoanMapping.findMany();
  for (const m of maps) {
    console.log(m);
  }

  console.log('=== SEARCHING JOURNAL ENTRIES WITH NARRATION ===');
  const jes = await db.journalEntry.findMany({
    where: {
      narration: { contains: 'C2' }
    }
  });
  for (const je of jes) {
    console.log(`JE ID: ${je.id}, EntryNo: ${je.entryNumber}, Narration: ${je.narration}, CompanyId: ${je.companyId}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
