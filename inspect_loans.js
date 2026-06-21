const { PrismaClient } = require('@prisma/client');
const url = "mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan";
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function main() {
  console.log("=== LISTING ALL OFFLINE LOANS ===");
  const all = await prisma.offlineLoan.findMany({
    include: { company: true }
  });
  console.log(`Total offline loans in DB: ${all.length}`);
  for (const l of all) {
    console.log(`Loan ID: ${l.id}, Number: ${l.loanNumber}, Status: ${l.status}, Customer: ${l.customerName}, Phone: ${l.customerPhone}, Company: ${l.company?.name} (ID: ${l.company?.id})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
