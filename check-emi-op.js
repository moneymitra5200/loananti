const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const emis = await db.offlineLoanEMI.findMany({
    where: { offlineLoan: { loanNumber: 'C3-PERSONAL-MONEYMITRA-001' } },
    orderBy: { installmentNumber: 'asc' }
  });
  console.log(JSON.stringify(emis.map(e => ({ num: e.installmentNumber, p: e.principalAmount, op: e.outstandingPrincipal, due: e.dueDate })), null, 2));
}
main().finally(() => db.$disconnect());
