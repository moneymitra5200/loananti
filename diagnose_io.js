const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const loans = await db.offlineLoan.findMany({
    where: { status: 'INTEREST_ONLY' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });
  for (const loan of loans) {
    console.log('Loan:', loan.loanNumber, '| Created:', loan.createdAt.toISOString());
    for (const emi of loan.emis) {
      console.log('  EMI #' + emi.installmentNumber + ': dueDate=' + emi.dueDate.toISOString() + ' | status=' + emi.paymentStatus);
      const js = await db.journalEntry.findMany({
        where: { referenceId: emi.id },
        orderBy: { createdAt: 'asc' },
        select: { referenceType: true, entryDate: true, createdAt: true }
      });
      js.forEach(function(j) {
        console.log('    [' + j.referenceType + '] entryDate=' + j.entryDate.toISOString() + ' | createdAt=' + j.createdAt.toISOString());
      });
    }
  }
  const now = new Date();
  const eod = new Date();
  eod.setHours(23, 59, 59, 999);
  console.log('');
  console.log('Server now:', now.toISOString());
  console.log('EOD (today):', eod.toISOString());
  console.log('TZ env:', process.env.TZ || '(not set)');
  console.log('Local string:', now.toString());
  await db.$disconnect();
}
main().catch(function(e) { console.error(e); process.exit(1); });
