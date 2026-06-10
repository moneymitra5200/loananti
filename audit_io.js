const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // Search by isInterestOnlyLoan field
  const loans = await db.offlineLoan.findMany({
    where: { isInterestOnlyLoan: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, loanNumber: true, status: true, createdAt: true, isInterestOnlyLoan: true, companyId: true }
  });
  
  console.log('IO Loans (isInterestOnlyLoan=true):', JSON.stringify(loans, null, 2));
  
  // Check for ALL loans with INTEREST_ONLY in name
  const byName = await db.offlineLoan.findMany({
    where: { loanNumber: { contains: 'INTEREST' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, loanNumber: true, status: true, createdAt: true, isInterestOnlyLoan: true }
  });
  
  console.log('\nLoans with INTEREST in name:', JSON.stringify(byName, null, 2));

  // Also check by status
  const byStatus = await db.offlineLoan.findMany({
    where: { status: 'INTEREST_ONLY' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, loanNumber: true, status: true, createdAt: true }
  });
  
  console.log('\nLoans with status=INTEREST_ONLY:', JSON.stringify(byStatus, null, 2));

  // Total count
  const total = await db.offlineLoan.count();
  console.log('\nTotal offline loans in DB:', total);

  await db.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
