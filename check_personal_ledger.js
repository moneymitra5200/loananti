require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk'; // C1
  
  // Let's call our own functions by simulating the API structure or importing.
  // Wait, let's fetch the customer list from the DB first.
  const allOffline = await db.offlineLoan.findMany({
    where: { companyId },
    select: { customerName: true, customerPhone: true, customerId: true, id: true }
  });
  console.log("Offline loans customer info:", allOffline);

  // Let's query Personal Ledger for customer "mitra group test"
  // Let's write a script to check what getPersonalLedger returns for each customer in C1
  // We can just query what listCustomersForCompany returns!
  // Let's fetch that.
}

main().catch(console.error).finally(() => db.$disconnect());
