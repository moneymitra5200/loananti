const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== OFFLINE LOANS ===");
  const offlineLoans = await prisma.offlineLoan.findMany({
    include: {
      company: true,
      emis: true
    }
  });
  console.log(`Found ${offlineLoans.length} offline loans:`);
  for (const l of offlineLoans) {
    console.log(`- ID: ${l.id}, LoanNumber: ${l.loanNumber}, Status: ${l.status}, Customer: ${l.customerName}, Phone: ${l.customerPhone}, Company: ${l.company?.name} (ID: ${l.company?.id})`);
    
    // Find journal entries for this loan
    const jes = await prisma.journalEntry.findMany({
      where: {
        lines: {
          some: {
            loanId: l.id
          }
        }
      },
      include: {
        lines: true
      }
    });
    console.log(`  Journal Entries count: ${jes.length}`);
    for (const je of jes) {
      console.log(`    JE ID: ${je.id}, RefType: ${je.referenceType}, CompanyID: ${je.companyId}`);
    }
  }

  console.log("\n=== MIRROR LOAN MAPPINGS ===");
  const mappings = await prisma.mirrorLoanMapping.findMany();
  console.log(`Found ${mappings.length} mirror mappings:`);
  for (const m of mappings) {
    console.log(`- Original: ${m.originalLoanId}, MirrorCompany: ${m.mirrorCompanyId}, MirrorLoanId: ${m.mirrorLoanId}, IsOffline: ${m.isOfflineLoan}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
