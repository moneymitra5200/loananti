const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.journalEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  const loans = await prisma.offlineLoan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const accounts = await prisma.account.findMany({
    where: { id: { in: entries.map(e => e.accountId) } }
  });
  const accMap = accounts.reduce((acc, a) => ({ ...acc, [a.id]: a.name }), {});

  const output = {
    journals: entries.map(e => ({
      id: e.id,
      companyId: e.companyId,
      account: accMap[e.accountId] || e.accountId,
      type: e.type,
      amount: e.amount,
      referenceType: e.referenceType,
      description: e.description,
      date: e.createdAt
    })),
    loans: loans.map(l => ({
      id: l.id, loanNumber: l.loanNumber, principalAmount: l.principalAmount, processingFee: l.processingFee
    }))
  };

  fs.writeFileSync('debug_db.json', JSON.stringify(output, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
