const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const c1 = 'cmq0sdvhy0001owes4zr8gemk';
  const c3 = 'cmq0sdura0000oweseq4j4xkj';

  const bankAccounts = await db.bankAccount.findMany({ where: { companyId: { in: [c1, c3] } } });
  for (const b of bankAccounts) {
    const txCredits = await db.bankTransaction.aggregate({
      where: { bankAccountId: b.id, transactionType: 'CREDIT' },
      _sum: { amount: true }
    });
    const txDebits = await db.bankTransaction.aggregate({
      where: { bankAccountId: b.id, transactionType: 'DEBIT' },
      _sum: { amount: true }
    });
    const calculated = b.openingBalance + (txCredits._sum.amount || 0) - (txDebits._sum.amount || 0);
    console.log(`Bank: ${b.bankName} - ${b.accountName}`, {
      currentBalance: b.currentBalance,
      calculatedBalance: calculated
    });
  }
}

main().catch(console.error).finally(() => db.$disconnect());
