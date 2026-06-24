require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function getPersonalLedgerOutstanding(companyId) {
  const LR_CODES = ['1200', '1201', '1210', '1301', '1305', '1302'];
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, accountCode: { in: LR_CODES } }
  });
  const accountIds = accounts.map(a => a.id);

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: { in: accountIds },
      journalEntry: { companyId, isApproved: true, isReversed: false }
    }
  });

  const lrAccountCodes = ['1200', '1201', '1210'];
  const lrAccountIds = accounts.filter(a => lrAccountCodes.includes(a.accountCode)).map(a => a.id);

  let lrDebits = 0;
  let lrCredits = 0;

  for (const line of lines) {
    if (lrAccountIds.includes(line.accountId)) {
      lrDebits += line.debitAmount;
      lrCredits += line.creditAmount;
    }
  }

  return lrDebits - lrCredits;
}

async function main() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`\n=== COMPANY: ${c.name} (${c.code} / ${c.id}) ===`);

    // 1. Personal Ledger outstanding (from JEs)
    const plOutstanding = await getPersonalLedgerOutstanding(c.id);
    console.log(`Personal Ledger Outstanding (from JEs): ${plOutstanding}`);

    // 2. Chart of Account stored balances
    const coas = await db.chartOfAccount.findMany({
      where: { companyId: c.id }
    });
    const a1210 = coas.find(a => a.accountCode === '1210');
    const a1201 = coas.find(a => a.accountCode === '1201');
    const a1200 = coas.find(a => a.accountCode === '1200');
    console.log(`CoA Stored Balances:`);
    console.log(`  1210 (Offline): ${a1210?.currentBalance}`);
    console.log(`  1201 (Online):  ${a1201?.currentBalance}`);
    console.log(`  1200 (Total):   ${a1200?.currentBalance}`);

    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      select: { originalLoanId: true }
    });
    const mirroredOriginalIds = new Set(mirrorMappings.map(m => m.originalLoanId));

    // 3. Ground Truth from loan tables (using balance-sheet route logic)
    const onlineLoans = await db.loanApplication.findMany({
      where: { companyId: c.id, status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] } },
      select: {
        id: true,
        disbursedAmount: true,
        emiSchedules: { select: { paidPrincipal: true } }
      }
    });
    const gtOnline = onlineLoans
      .filter(loan => !mirroredOriginalIds.has(loan.id))
      .reduce((sum, loan) => {
        const disbursed = loan.disbursedAmount || 0;
        const paid = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
        return sum + Math.max(0, disbursed - paid);
      }, 0);

    const offlineLoans = await db.offlineLoan.findMany({
      where: { companyId: c.id, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] } },
      select: {
        id: true,
        loanAmount: true,
        emis: { select: { paidPrincipal: true } }
      }
    });
    const gtOffline = offlineLoans
      .filter(loan => !mirroredOriginalIds.has(loan.id))
      .reduce((sum, loan) => {
        const disbursed = loan.loanAmount || 0;
        const paid = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
        return sum + Math.max(0, disbursed - paid);
      }, 0);

    console.log(`Ground Truth from Loan Tables:`);
    console.log(`  Online Loans:  ${gtOnline}`);
    console.log(`  Offline Loans: ${gtOffline}`);
    console.log(`  Total:         ${gtOnline + gtOffline}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
