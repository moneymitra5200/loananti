const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_3_ID = 'cmnm2yvlz000011du25wvlq15';
const COMPANY_1_ID = 'cmnm30fh8000a11dub37itsvd';
const SUPER_ADMIN_ID = 'cmnm2uy320000luhg3z4mszp0';

async function main() {
  console.log('========================================');
  console.log('SIMULATING EMI PAYMENT');
  console.log('========================================');
  
  // Get the first EMI of the original loan
  const originalLoan = await prisma.offlineLoan.findFirst({
    where: { loanNumber: 'C3-PERSONAL-TESTCUSTOM' },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });
  
  const mirrorLoan = await prisma.offlineLoan.findFirst({
    where: { loanNumber: 'C1-PERSONAL-00001' },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });
  
  console.log('\\nOriginal Loan (C3):', originalLoan.loanNumber);
  console.log('Mirror Loan (C1):', mirrorLoan.loanNumber);
  
  // Get first EMI
  const firstEmiOriginal = originalLoan.emis[0];
  const firstEmiMirror = mirrorLoan.emis[0];
  
  console.log('\\n=== FIRST EMI DETAILS ===');
  console.log('Original EMI #1:', {
    principal: firstEmiOriginal.principalAmount,
    interest: firstEmiOriginal.interestAmount,
    total: firstEmiOriginal.totalAmount
  });
  console.log('Mirror EMI #1:', {
    principal: firstEmiMirror.principalAmount,
    interest: firstEmiMirror.interestAmount,
    total: firstEmiMirror.totalAmount
  });
  
  // ============================================
  // SIMULATE EMI PAYMENT
  // Customer pays ₹6000 to C1 (mirror company)
  // ============================================
  const paymentAmount = 6000;
  const paymentDate = new Date();
  
  console.log('\\n=== PROCESSING EMI PAYMENT ===');
  console.log('Payment Amount: ₹' + paymentAmount);
  console.log('Payment Date:', paymentDate.toISOString().split('T')[0]);
  
  // 1. Update Original Loan EMI status
  await prisma.offlineLoanEMI.update({
    where: { id: firstEmiOriginal.id },
    data: {
      paymentStatus: 'PAID',
      paidAmount: paymentAmount,
      paidDate: paymentDate,
      paymentMode: 'CASH'
    }
  });
  console.log('\\nUpdated Original EMI #1 to PAID');
  
  // 2. Update Mirror Loan EMI status
  await prisma.offlineLoanEMI.update({
    where: { id: firstEmiMirror.id },
    data: {
      paymentStatus: 'PAID',
      paidAmount: paymentAmount,
      paidDate: paymentDate,
      paymentMode: 'CASH'
    }
  });
  console.log('Updated Mirror EMI #1 to PAID');
  
  // 3. Update C1 Bank Account (money received)
  const c1Bank = await prisma.bankAccount.findFirst({
    where: { companyId: COMPANY_1_ID, isDefault: true }
  });
  
  const previousBankBalance = c1Bank.currentBalance;
  
  await prisma.bankAccount.update({
    where: { id: c1Bank.id },
    data: { currentBalance: previousBankBalance + paymentAmount }
  });
  
  await prisma.bankTransaction.create({
    data: {
      bankAccountId: c1Bank.id,
      transactionType: 'CREDIT',
      amount: paymentAmount,
      balanceAfter: previousBankBalance + paymentAmount,
      description: `EMI Payment #1 - ${mirrorLoan.loanNumber}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: firstEmiMirror.id,
      createdById: SUPER_ADMIN_ID
    }
  });
  
  console.log('\\nC1 Bank updated:');
  console.log('Previous Balance:', previousBankBalance);
  console.log('New Balance:', previousBankBalance + paymentAmount);
  
  // 4. Create Journal Entry for C1
  const c1Coa = await prisma.chartOfAccount.findMany({
    where: { companyId: COMPANY_1_ID }
  });
  
  const loansReceivable = c1Coa.find(a => a.accountCode === '1200');
  const mirrorInterestIncome = c1Coa.find(a => a.accountCode === '3300');
  const bank = c1Coa.find(a => a.accountCode === '1000');
  
  const principalAmount = firstEmiMirror.principalAmount;
  const interestAmount = firstEmiMirror.interestAmount;
  
  const journalEntry = await prisma.journalEntry.create({
    data: {
      companyId: COMPANY_1_ID,
      entryNumber: 'JE-EMI-' + Date.now(),
      entryDate: paymentDate,
      referenceType: 'EMI_PAYMENT',
      referenceId: firstEmiMirror.id,
      narration: `EMI Payment #1 - ${mirrorLoan.loanNumber} - Principal: ₹${principalAmount.toFixed(2)}, Interest: ₹${interestAmount.toFixed(2)}`,
      totalDebit: paymentAmount,
      totalCredit: paymentAmount,
      isApproved: true,
      createdById: SUPER_ADMIN_ID,
      lines: {
        create: [
          {
            accountId: bank.id,
            debitAmount: paymentAmount,
            creditAmount: 0,
            narration: 'EMI received'
          },
          {
            accountId: loansReceivable.id,
            debitAmount: 0,
            creditAmount: principalAmount,
            narration: 'Principal repayment'
          },
          {
            accountId: mirrorInterestIncome.id,
            debitAmount: 0,
            creditAmount: interestAmount,
            narration: 'Mirror interest income'
          }
        ]
      }
    }
  });
  
  console.log('\\nCreated Journal Entry:', journalEntry.entryNumber);
  
  // 5. Update Chart of Accounts balances
  await prisma.chartOfAccount.update({
    where: { id: bank.id },
    data: { currentBalance: bank.currentBalance + paymentAmount }
  });
  
  await prisma.chartOfAccount.update({
    where: { id: loansReceivable.id },
    data: { currentBalance: loansReceivable.currentBalance - principalAmount }
  });
  
  await prisma.chartOfAccount.update({
    where: { id: mirrorInterestIncome.id },
    data: { currentBalance: mirrorInterestIncome.currentBalance + interestAmount }
  });
  
  console.log('\\nUpdated Chart of Accounts:');
  console.log('- Bank: +' + paymentAmount);
  console.log('- Loans Receivable: -' + principalAmount);
  console.log('- Mirror Interest Income: +' + interestAmount);
  
  // ============================================
  // VERIFICATION
  // ============================================
  console.log('\\n========================================');
  console.log('VERIFICATION - After EMI Payment');
  console.log('========================================');
  
  const finalCoa = await prisma.chartOfAccount.findMany({
    where: { companyId: COMPANY_1_ID },
    orderBy: { accountCode: 'asc' }
  });
  
  console.log('\\n=== COMPANY 1 CHART OF ACCOUNTS (non-zero) ===');
  finalCoa.forEach(a => {
    if (a.currentBalance !== 0) {
      console.log({ code: a.accountCode, name: a.accountName, balance: a.currentBalance });
    }
  });
  
  console.log('\\n=== COMPANY 1 BANK ACCOUNT ===');
  const finalBank = await prisma.bankAccount.findFirst({
    where: { companyId: COMPANY_1_ID, isDefault: true }
  });
  console.log('Balance:', finalBank?.currentBalance);
  
  console.log('\\n=== JOURNAL ENTRIES FOR C1 ===');
  const allJE = await prisma.journalEntry.findMany({
    where: { companyId: COMPANY_1_ID },
    include: { lines: { include: { account: true } } },
    orderBy: { createdAt: 'asc' }
  });
  
  allJE.forEach(je => {
    console.log('\\n' + je.entryNumber + ' (' + je.referenceType + ')');
    je.lines.forEach(l => {
      if (l.debitAmount > 0) console.log('  Dr.', l.account.accountName, l.debitAmount);
      if (l.creditAmount > 0) console.log('  Cr.', l.account.accountName, l.creditAmount);
    });
  });
  
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
