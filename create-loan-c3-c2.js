const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_3_ID = 'cmnm2yvlz000011du25wvlq15';
const COMPANY_2_ID = 'cmnm2zruj000511dust5zilhm';
const SUPER_ADMIN_ID = 'cmnm2uy320000luhg3z4mszp0';

async function main() {
  console.log('========================================');
  console.log('SETUP COMPANY 2 + CREATE LOAN C3 -> C2');
  console.log('========================================');
  
  // Setup Company 2 with equity
  const c2Bank = await prisma.chartOfAccount.findFirst({ where: { companyId: COMPANY_2_ID, accountCode: '1000' } });
  const c2Equity = await prisma.chartOfAccount.findFirst({ where: { companyId: COMPANY_2_ID, accountCode: '5000' } });
  
  if (c2Bank && c2Equity) {
    // Add equity
    const equity = 100000;
    await prisma.journalEntry.create({
      data: {
        companyId: COMPANY_2_ID, entryNumber: 'JE-C2-' + Date.now(), entryDate: new Date(),
        referenceType: 'EQUITY_INJECTION', narration: 'Initial Capital',
        totalDebit: equity, totalCredit: equity, isApproved: true, createdById: SUPER_ADMIN_ID,
        lines: {
          create: [
            { accountId: c2Bank.id, debitAmount: equity, creditAmount: 0 },
            { accountId: c2Equity.id, debitAmount: 0, creditAmount: equity }
          ]
        }
      }
    });
    await prisma.chartOfAccount.update({ where: { id: c2Bank.id }, data: { currentBalance: equity } });
    await prisma.chartOfAccount.update({ where: { id: c2Equity.id }, data: { currentBalance: equity } });
    console.log('Company 2 Equity: ₹' + equity);
  }
  
  // Create bank account for C2
  let bank = await prisma.bankAccount.findFirst({ where: { companyId: COMPANY_2_ID, isDefault: true } });
  if (!bank) {
    bank = await prisma.bankAccount.create({
      data: {
        companyId: COMPANY_2_ID, accountName: 'C2 Main Bank', accountNumber: '9876543210',
        ifscCode: 'HDFC0001234', bankName: 'HDFC Bank', currentBalance: 100000,
        isDefault: true, isActive: true, accountType: 'SAVINGS'
      }
    });
    console.log('Created C2 Bank Account');
  }
  
  // Create offline loan C3 -> Mirror C2
  const loanAmount = 40000;
  const interestRate = 24;  // C3 rate (FLAT)
  const tenure = 12;
  const mirrorInterestRate = 24;  // C2 uses SAME RATE (REDUCING)
  
  const totalInterest = loanAmount * (interestRate / 100) * (tenure / 12);
  const emiAmount = (loanAmount + totalInterest) / tenure;
  
  // Create original loan in C3
  const originalLoan = await prisma.offlineLoan.create({
    data: {
      loanNumber: 'C3-PERSONAL-C2TEST',
      createdById: SUPER_ADMIN_ID, createdByRole: 'SUPER_ADMIN', companyId: COMPANY_3_ID,
      customerName: 'TEST CUSTOMER C2', customerPhone: '7777777777',
      loanType: 'PERSONAL', interestType: 'FLAT', loanAmount, interestRate, tenure,
      emiAmount: parseFloat(emiAmount.toFixed(2)), disbursementDate: new Date(),
      disbursementMode: 'BANK_TRANSFER', status: 'ACTIVE', startDate: new Date(),
      isInterestOnlyLoan: false, partialPaymentEnabled: true
    }
  });
  console.log('\\nCreated Original Loan:', originalLoan.loanNumber);
  
  // Calculate mirror schedule (24% REDUCING for C2)
  const mirrorRate = mirrorInterestRate / 100 / 12;
  let outstanding = loanAmount;
  const mirrorSchedule = [];
  let inst = 1;
  while (outstanding > 0.01 && inst <= 100) {
    const interest = outstanding * mirrorRate;
    let principal = emiAmount - interest;
    let emi = emiAmount;
    if (principal >= outstanding) { principal = outstanding; emi = principal + interest; outstanding = 0; }
    else { outstanding = Math.max(0, outstanding - principal); }
    mirrorSchedule.push({ inst, principal, interest, emi, outstanding });
    inst++;
  }
  
  const mirrorTenure = mirrorSchedule.length;
  const extraEMIs = tenure - mirrorTenure;
  console.log('Mirror Tenure:', mirrorTenure, 'Extra EMIs:', extraEMIs);
  
  // Create mirror loan in C2
  const mirrorLoan = await prisma.offlineLoan.create({
    data: {
      loanNumber: 'C2-PERSONAL-00001', createdById: SUPER_ADMIN_ID, createdByRole: 'SUPER_ADMIN',
      companyId: COMPANY_2_ID, customerName: 'TEST CUSTOMER C2', customerPhone: '7777777777',
      loanType: 'PERSONAL', interestType: 'REDUCING', loanAmount, interestRate: mirrorInterestRate,
      tenure: mirrorTenure, emiAmount: parseFloat(emiAmount.toFixed(2)), disbursementDate: new Date(),
      disbursementMode: 'BANK_TRANSFER', status: 'ACTIVE', startDate: new Date(),
      isMirrorLoan: true, originalLoanId: originalLoan.id, isInterestOnlyLoan: false, partialPaymentEnabled: true
    }
  });
  console.log('Created Mirror Loan:', mirrorLoan.loanNumber);
  
  // Deduct from C2 Bank
  const c2BankAcc = await prisma.bankAccount.findFirst({ where: { companyId: COMPANY_2_ID, isDefault: true } });
  if (c2BankAcc) {
    const prev = c2BankAcc.currentBalance;
    await prisma.bankAccount.update({ where: { id: c2BankAcc.id }, data: { currentBalance: prev - loanAmount } });
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: c2BankAcc.id, transactionType: 'DEBIT', amount: loanAmount, balanceAfter: prev - loanAmount,
        description: 'Mirror Loan Disbursement - ' + mirrorLoan.loanNumber,
        referenceType: 'MIRROR_LOAN_DISBURSEMENT', referenceId: mirrorLoan.id, createdById: SUPER_ADMIN_ID
      }
    });
    console.log('\\nC2 Bank:', prev, '->', prev - loanAmount);
  }
  
  // Journal Entry for C2
  const c2Coa = await prisma.chartOfAccount.findMany({ where: { companyId: COMPANY_2_ID } });
  const lr = c2Coa.find(a => a.accountCode === '1200');
  const c2BankCoa = c2Coa.find(a => a.accountCode === '1000');
  
  if (lr && c2BankCoa) {
    await prisma.journalEntry.create({
      data: {
        companyId: COMPANY_2_ID, entryNumber: 'JE-C2ML-' + Date.now(), entryDate: new Date(),
        referenceType: 'MIRROR_LOAN_DISBURSEMENT', referenceId: mirrorLoan.id,
        narration: 'Mirror Loan - ' + mirrorLoan.loanNumber,
        totalDebit: loanAmount, totalCredit: loanAmount, isApproved: true, createdById: SUPER_ADMIN_ID,
        lines: {
          create: [
            { accountId: lr.id, debitAmount: loanAmount, creditAmount: 0 },
            { accountId: c2BankCoa.id, debitAmount: 0, creditAmount: loanAmount }
          ]
        }
      }
    });
    await prisma.chartOfAccount.update({ where: { id: lr.id }, data: { currentBalance: lr.currentBalance + loanAmount } });
    await prisma.chartOfAccount.update({ where: { id: c2BankCoa.id }, data: { currentBalance: c2BankCoa.currentBalance - loanAmount } });
    console.log('Journal Entry created');
  }
  
  // Verify
  console.log('\\n========================================');
  console.log('VERIFICATION - C2 Chart of Accounts');
  console.log('========================================');
  const finalCoa = await prisma.chartOfAccount.findMany({ where: { companyId: COMPANY_2_ID }, orderBy: { accountCode: 'asc' } });
  finalCoa.forEach(a => { if (a.currentBalance !== 0) console.log({ code: a.accountCode, name: a.accountName, balance: a.currentBalance }); });
  
  console.log('\\nSUMMARY:');
  console.log('Original (C3):', originalLoan.loanNumber, '- 24% FLAT, 12 EMIs');
  console.log('Mirror (C2):', mirrorLoan.loanNumber, '- 24% REDUCING,', mirrorTenure, 'EMIs');
  console.log('Extra EMIs for C3 profit:', extraEMIs);
  
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
