require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const dateFilter = new Date();

  const [cashBook, bankAccountsData, equityEntries, onlineLoans, offlineLoans] = await Promise.all([
    db.cashBook.findUnique({ where: { companyId } }),
    db.bankAccount.findMany({ where: { companyId, isActive: true } }),
    db.equityEntry.findMany({ where: { companyId } }),
    db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] },
        disbursedAt: { lte: dateFilter }
      },
      select: {
        disbursedAmount: true,
        emiSchedules: {
          select: { paidPrincipal: true }
        }
      }
    }),
    db.offlineLoan.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] },
        disbursementDate: { lte: dateFilter }
      },
      select: {
        loanAmount: true,
        emis: {
          select: { paidPrincipal: true }
        }
      }
    })
  ]);

  console.log('--- Ground Truth Values ---');
  console.log('CashBook:', cashBook);
  console.log('BankAccounts:', bankAccountsData);
  console.log('OfflineLoans list count:', offlineLoans.length);
  for (let i = 0; i < offlineLoans.length; i++) {
    console.log(`  Loan ${i}: amount=${offlineLoans[i].loanAmount}, emis count=${offlineLoans[i].emis.length}`);
    for (let e of offlineLoans[i].emis) {
      console.log(`    EMI paidPrincipal=${e.paidPrincipal}`);
    }
  }

  const actualOfflineLoans = offlineLoans.reduce((sum, loan) => {
    const disbursed = loan.loanAmount || 0;
    const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);
  console.log('Computed actualOfflineLoans:', actualOfflineLoans);

  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true }
  });
  console.log('--- Chart of Accounts 1210 balance ---');
  const coa1210 = accounts.find(a => a.accountCode === '1210');
  console.log(coa1210);

  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
        entryDate: { lte: dateFilter }
      }
    }
  });

  const drMap = {};
  const crMap = {};
  for (const line of journalLines) {
    drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
    crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
  }

  const coaId = coa1210.id;
  const dr = drMap[coaId] || 0;
  const cr = crMap[coaId] || 0;
  const op = coa1210.openingBalance || 0;
  console.log(`Ledger for 1210: op=${op}, dr=${dr}, cr=${cr}, balance=${op + dr - cr}`);
}

main().catch(console.error).finally(() => db.$disconnect());
