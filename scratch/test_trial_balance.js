const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function getTrialBalance(companyId) {
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

  const actualCash      = cashBook?.currentBalance || 0;
  const actualBankTotal = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);
  const actualCapital    = equityEntries.reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0);
  
  const onlineLoansActive = onlineLoans.reduce((sum, loan) => {
    const disbursed = loan.disbursedAmount || 0;
    const principal = disbursed > 0 ? disbursed : loan.emiSchedules.reduce((s, e) => s + (e.principalAmount || 0), 0);
    const paid = loan.emiSchedules.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, principal - paid);
  }, 0);
  
  const offlineLoansActive = offlineLoans.reduce((sum, loan) => {
    const disbursed = loan.loanAmount || 0;
    const paid = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paid);
  }, 0);

  const onlinePendingInterest  = (pendingOnlineEMIs._sum.interestAmount  || 0) - (pendingOnlineEMIs._sum.paidInterest  || 0);
  const offlinePendingInterest = (pendingOfflineEMIs._sum.interestAmount || 0) - (pendingOfflineEMIs._sum.paidInterest || 0);
  const interestReceivable     = Math.max(0, onlinePendingInterest + offlinePendingInterest);

  const overdueOnlineInterest  = (overdueOnlineEMIs._sum.interestAmount  || 0) - (overdueOnlineEMIs._sum.paidInterest  || 0);
  const overdueOfflineInterest = (overdueOfflineEMIs._sum.interestAmount || 0) - (overdueOfflineEMIs._sum.paidInterest || 0);
  const overdueInterestReceivable = Math.max(0, overdueOnlineInterest + overdueOfflineInterest);

  const drMap = {};
  const crMap = {};
  for (const line of journalLines) {
    drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
    crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
  }

  const rows = allAccounts.map(acc => {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const opening = acc.openingBalance || 0;

    let closingBalance = 0;
    const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    
    if (isDebitNormal) {
      closingBalance = opening + dr - cr;
    } else {
      closingBalance = opening + cr - dr;
    }

    if (acc.accountCode === '1101') closingBalance = actualCash;
    if (acc.accountCode === '1102') closingBalance = actualBankTotal;
    if (acc.accountCode === '1201') closingBalance = onlineLoansActive;
    if (acc.accountCode === '1210') closingBalance = offlineLoansActive;
    if (acc.accountCode === '1301') closingBalance = interestReceivable;
    if (acc.accountCode === '1305') closingBalance = overdueInterestReceivable;
    if (acc.accountCode === '3002') closingBalance = actualCapital;
    if (acc.accountCode === '1200') closingBalance = onlineLoansActive + offlineLoansActive;

    let debitBalance = 0;
    let creditBalance = 0;

    if (isDebitNormal) {
      if (closingBalance >= 0) debitBalance = closingBalance;
      else creditBalance = Math.abs(closingBalance);
    } else {
      if (closingBalance >= 0) creditBalance = closingBalance;
      else debitBalance = Math.abs(closingBalance);
    }

    return {
      code: acc.accountCode,
      name: acc.accountName,
      debit: debitBalance,
      credit: creditBalance
    };
  }).filter(r => r.debit !== 0 || r.credit !== 0);

  const totDr = rows.reduce((s, r) => s + r.debit, 0);
  const totCr = rows.reduce((s, r) => s + r.credit, 0);
  console.log(`Company ID: ${companyId}`);
  console.log(`Rows:`);
  for (const r of rows) {
    console.log(`- ${r.code} (${r.name}): Dr: ${r.debit.toFixed(2)} | Cr: ${r.credit.toFixed(2)}`);
  }
  console.log(`Trial Balance Totals:`);
  console.log(`- Total Debit: ${totDr.toFixed(2)}`);
  console.log(`- Total Credit: ${totCr.toFixed(2)}`);
  console.log(`- Difference: ${(totDr - totCr).toFixed(2)}`);
}

async function main() {
  await getTrialBalance('cmq0sdvhy0001owes4zr8gemk'); // C1
  console.log('\n----------------------------------------\n');
  await getTrialBalance('cmq0sdura0000oweseq4j4xkj'); // C3
}

main().catch(console.error).finally(() => db.$disconnect());
