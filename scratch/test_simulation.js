const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function testRecalculateSimulation(companyId) {
  const allAccounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' },
  });

  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
      }
    },
    select: {
      accountId: true,
      debitAmount: true,
      creditAmount: true
    }
  });

  const [cashBook, bankAccounts, equityEntries, onlineLoans, offlineLoans, pendingOnlineEMIs, pendingOfflineEMIs, overdueOnlineEMIs, overdueOfflineEMIs] = await Promise.all([
    db.cashBook.findUnique({ where: { companyId } }),
    db.bankAccount.findMany({ where: { companyId, isActive: true } }),
    db.equityEntry.findMany({ where: { companyId } }),
    db.loanApplication.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] } },
      select: { disbursedAmount: true, emiSchedules: { select: { principalAmount: true, paidPrincipal: true } } }
    }),
    db.offlineLoan.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] } },
      select: { loanAmount: true, emis: { select: { principalAmount: true, paidPrincipal: true } } }
    }),
    db.eMISchedule.aggregate({
      where: { loanApplication: { companyId }, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } },
      _sum: { interestAmount: true, paidInterest: true }
    }),
    db.offlineLoanEMI.aggregate({
      where: { offlineLoan: { companyId }, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } },
      _sum: { interestAmount: true, paidInterest: true }
    }),
    db.eMISchedule.aggregate({
      where: { loanApplication: { companyId }, paymentStatus: 'OVERDUE' },
      _sum: { interestAmount: true, paidInterest: true }
    }),
    db.offlineLoanEMI.aggregate({
      where: { offlineLoan: { companyId }, paymentStatus: 'OVERDUE' },
      _sum: { interestAmount: true, paidInterest: true }
    })
  ]);

  const targetCash      = cashBook?.currentBalance || 0;
  const targetBank      = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);
  const targetCapital   = equityEntries.reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0);
  
  const targetOnlineLoans = onlineLoans.reduce((sum, loan) => {
    const disbursed = loan.disbursedAmount || 0;
    const paid = loan.emiSchedules.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paid);
  }, 0);
  
  const targetOfflineLoans = offlineLoans.reduce((sum, loan) => {
    const disbursed = loan.loanAmount || 0;
    const paid = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paid);
  }, 0);

  const onlinePendingInterest  = (pendingOnlineEMIs._sum.interestAmount  || 0) - (pendingOnlineEMIs._sum.paidInterest  || 0);
  const offlinePendingInterest = (pendingOfflineEMIs._sum.interestAmount || 0) - (pendingOfflineEMIs._sum.paidInterest || 0);
  const targetInterestReceivable = Math.max(0, onlinePendingInterest + offlinePendingInterest);

  const overdueOnlineInterest  = (overdueOnlineEMIs._sum.interestAmount  || 0) - (overdueOnlineEMIs._sum.paidInterest  || 0);
  const overdueOfflineInterest = (overdueOfflineEMIs._sum.interestAmount || 0) - (overdueOfflineEMIs._sum.paidInterest || 0);
  const targetOverdueInterest = Math.max(0, overdueOnlineInterest + overdueOfflineInterest);

  const drMap = {};
  const crMap = {};
  for (const line of journalLines) {
    drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
    crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
  }

  // Calculate correcting adjustments:
  const adjustments = {};
  let netDebitDifference = 0;

  for (const acc of allAccounts) {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    const journalBal = isDebitNormal ? (acc.openingBalance || 0) + dr - cr : (acc.openingBalance || 0) + cr - dr;

    let target = journalBal;
    let hasTarget = false;

    if (acc.accountCode === '1101') { target = targetCash; hasTarget = true; }
    else if (acc.accountCode === '1102') { target = targetBank; hasTarget = true; }
    else if (acc.accountCode === '1201') { target = targetOnlineLoans; hasTarget = true; }
    else if (acc.accountCode === '1210') { target = targetOfflineLoans; hasTarget = true; }
    else if (acc.accountCode === '1200') { target = 0; hasTarget = true; } // Transfer all LR from 1200 to subaccounts 1201/1210
    else if (acc.accountCode === '1301') { target = targetInterestReceivable; hasTarget = true; }
    else if (acc.accountCode === '1305') { target = targetOverdueInterest; hasTarget = true; }
    else if (acc.accountCode === '3002') { target = targetCapital; hasTarget = true; }

    if (hasTarget) {
      const diff = target - journalBal;
      if (Math.abs(diff) > 0.005) {
        adjustments[acc.accountCode] = diff;
        if (isDebitNormal) {
          netDebitDifference += diff;
        } else {
          netDebitDifference -= diff; // credit normal
        }
      }
    }
  }

  console.log(`Company ID: ${companyId}`);
  console.log('Adjustments proposed:');
  for (const code in adjustments) {
    console.log(`- ${code}: ${adjustments[code].toFixed(2)}`);
  }
  console.log(`Net Debit Difference (to be offset by Credit to Suspense 9999): ${netDebitDifference.toFixed(2)}`);

  // Now, calculate the simulated new balances:
  const newBalances = {};
  for (const acc of allAccounts) {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    let balance = isDebitNormal ? (acc.openingBalance || 0) + dr - cr : (acc.openingBalance || 0) + cr - dr;

    // Apply adjustments
    if (adjustments[acc.accountCode] !== undefined) {
      balance += adjustments[acc.accountCode];
    }
    // Suspense adjustment
    if (acc.accountCode === '9999') {
      balance += netDebitDifference; // since suspense is Equity (Credit normal), adding a Credit is adding to balance
    }

    newBalances[acc.accountCode] = balance;
  }

  // Calculate Trial Balance rows
  const rows = [];
  for (const acc of allAccounts) {
    const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    const balance = newBalances[acc.accountCode] || 0;
    if (balance === 0 && acc.accountCode !== '1200') continue;

    let debitBalance = 0;
    let creditBalance = 0;
    if (isDebitNormal) {
      if (balance >= 0) debitBalance = balance;
      else creditBalance = Math.abs(balance);
    } else {
      if (balance >= 0) creditBalance = balance;
      else debitBalance = Math.abs(balance);
    }

    rows.push({
      code: acc.accountCode,
      name: acc.accountName,
      debit: debitBalance,
      credit: creditBalance
    });
  }

  // Calculate TB totals (excluding 1200 from sum? Wait, if 1200 is 0, we don't even need to exclude it because its balance is 0!)
  const totDr = rows.reduce((s, r) => s + r.debit, 0);
  const totCr = rows.reduce((s, r) => s + r.credit, 0);

  console.log('Simulated Trial Balance Rows:');
  for (const r of rows) {
    console.log(`- ${r.code} (${r.name}): Dr: ${r.debit.toFixed(2)} | Cr: ${r.credit.toFixed(2)}`);
  }
  console.log(`Simulated TB Totals:`);
  console.log(`- Total Debit: ${totDr.toFixed(2)}`);
  console.log(`- Total Credit: ${totCr.toFixed(2)}`);
  console.log(`- Difference: ${(totDr - totCr).toFixed(2)}`);
}

async function main() {
  await testRecalculateSimulation('cmq0sdvhy0001owes4zr8gemk'); // C1
  console.log('\n----------------------------------------\n');
  await testRecalculateSimulation('cmq0sdura0000oweseq4j4xkj'); // C3
}

main().catch(console.error).finally(() => db.$disconnect());
