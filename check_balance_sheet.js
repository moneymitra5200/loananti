require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk'; // C1

  // 1. Get bank account balances
  const bankAccountsData = await db.bankAccount.findMany({
    where: { companyId, isActive: true }
  });
  console.log("Bank Accounts:", bankAccountsData.map(b => `${b.bankName}: ${b.currentBalance}`));

  // 2. Get CashBook balance
  const cashBookData = await db.cashBook.findUnique({
    where: { companyId }
  });
  console.log("CashBook Balance:", cashBookData?.currentBalance);

  // 3. Get online loans
  const onlineLoans = await db.loanApplication.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] }
    },
    select: {
      id: true,
      applicationNo: true,
      disbursedAmount: true,
      status: true,
      emiSchedules: {
        where: { paymentStatus: 'PAID' },
        select: { paidPrincipal: true, paidInterest: true }
      }
    }
  });
  console.log("\nOnline Loans:");
  for (const l of onlineLoans) {
    const paidPrincipal = l.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    console.log(`  ${l.applicationNo}: disbursed=${l.disbursedAmount}, paidPrincipal=${paidPrincipal}, outstanding=${(l.disbursedAmount || 0) - paidPrincipal}`);
  }

  // 4. Get offline loans
  const offlineLoans = await db.offlineLoan.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] }
    },
    select: {
      id: true,
      loanNumber: true,
      loanAmount: true,
      status: true,
      emis: {
        where: { paymentStatus: 'PAID' },
        select: { paidPrincipal: true, paidInterest: true, paymentStatus: true }
      }
    }
  });
  console.log("\nOffline Loans:");
  for (const l of offlineLoans) {
    const paidPrincipal = l.emis.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    console.log(`  ${l.loanNumber}: disbursed=${l.loanAmount}, paidPrincipal=${paidPrincipal}, outstanding=${(l.loanAmount || 0) - paidPrincipal}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
