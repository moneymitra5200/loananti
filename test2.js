const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  try {
    // 1. Get an unpaid EMI
    const emi = await db.offlineLoanEMI.findFirst({
      where: { paymentStatus: 'PENDING' },
      include: { offlineLoan: true }
    });
    if (!emi) return console.log("No pending EMIs found");
    
    console.log("Found EMI:", emi.id, emi.offlineLoan.loanNumber, emi.installmentNumber);

    // 2. Mock payload
    const body = {
      action: 'pay-emi',
      userId: 'test',
      userRole: 'ADMIN',
      paymentMode: 'CASH',
      emiId: emi.id,
      paymentType: 'FULL',
      amount: emi.totalAmount,
      isAdvancePayment: false,
      penaltyAmount: 300,
      penaltyPaymentMode: 'CASH'
    };

    // 3. Make mock request
    const req = new Request('http://localhost:3000/api/offline-loan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const route = require('./src/app/api/offline-loan/route');
    // Using mock next/server context since this is a unit test
    const res = await route.PUT(req);
    const result = await res.json();
    console.log("Result:", result);

    // 4. Verify DB
    const je = await db.journalEntry.findFirst({
      where: { referenceId: `${emi.id}-PENALTY-JE` }
    });
    console.log("Journal Entry:", je ? "Created successfully" : "Missing");

    const cb = await db.cashBookEntry.findFirst({
      where: { referenceId: `${emi.id}-PENALTY` }
    });
    console.log("Cashbook Entry:", cb ? "Created successfully" : "Missing");

  } finally {
    await db.$disconnect();
  }
}
main();
