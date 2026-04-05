const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_3_ID = 'cmnm2yvlz000011du25wvlq15';
const COMPANY_1_ID = 'cmnm30fh8000a11dub37itsvd';
const SUPER_ADMIN_ID = 'cmnm2uy320000luhg3z4mszp0';

async function main() {
  console.log('========================================');
  console.log('CREATING ONLINE LOAN: C3 -> Mirror to C1');
  console.log('========================================');
  
  // Create a customer first
  const customer = await prisma.user.create({
    data: {
      email: 'customer_online@test.com',
      name: 'TEST CUSTOMER ONLINE',
      password: 'hashed_password',
      role: 'CUSTOMER',
      phone: '8888888888',
      isActive: true,
      firebaseUid: 'test-customer-online-' + Date.now()
    }
  });
  console.log('\\nCreated Customer:', customer.id);
  
  // Loan details
  const loanAmount = 30000;
  const interestRate = 24;
  const tenure = 10;
  const mirrorInterestRate = 15;
  
  const totalInterest = loanAmount * (interestRate / 100) * (tenure / 12);
  const emiAmount = (loanAmount + totalInterest) / tenure;
  
  // Create Original Loan Application
  const loan = await prisma.loanApplication.create({
    data: {
      applicationNo: 'C3PL00001',
      customerId: customer.id,
      companyId: COMPANY_3_ID,
      loanType: 'PERSONAL',
      status: 'ACTIVE',
      requestedAmount: loanAmount,
      requestedTenure: tenure,
      loanAmount: loanAmount,
      interestRate: interestRate,
      tenure: tenure,
      emiAmount: emiAmount,
      processingFee: 0,
      firstName: 'TEST',
      lastName: 'CUSTOMER ONLINE',
      phone: '8888888888',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      submittedAt: new Date(),
      finalApprovedAt: new Date(),
      disbursedAt: new Date(),
      disbursedAmount: loanAmount,
      disbursementMode: 'BANK_TRANSFER',
      disbursedById: SUPER_ADMIN_ID
    }
  });
  
  console.log('\\nCreated Original Loan:', loan.applicationNo);
  
  // Calculate mirror loan schedule
  const mirrorRate = mirrorInterestRate / 100 / 12;
  let outstandingPrincipal = loanAmount;
  const mirrorSchedule = [];
  let installmentNumber = 1;
  
  while (outstandingPrincipal > 0.01 && installmentNumber <= 100) {
    const interest = outstandingPrincipal * mirrorRate;
    let principalPaid = emiAmount - interest;
    let actualEmi = emiAmount;
    
    if (principalPaid >= outstandingPrincipal) {
      principalPaid = outstandingPrincipal;
      actualEmi = principalPaid + interest;
      outstandingPrincipal = 0;
    } else {
      outstandingPrincipal = Math.max(0, outstandingPrincipal - principalPaid);
    }
    
    mirrorSchedule.push({ installmentNumber, principal: principalPaid, interest, totalAmount: actualEmi, outstandingPrincipal });
    installmentNumber++;
  }
  
  const mirrorTenure = mirrorSchedule.length;
  const extraEMICount = tenure - mirrorTenure;
  
  console.log('Mirror Tenure:', mirrorTenure, 'Extra EMIs:', extraEMICount);
  
  // Create Mirror Loan Application
  const mirrorLoan = await prisma.loanApplication.create({
    data: {
      applicationNo: 'C1PL00001',
      customerId: customer.id,
      companyId: COMPANY_1_ID,
      loanType: 'PERSONAL',
      status: 'ACTIVE',
      requestedAmount: loanAmount,
      requestedTenure: mirrorTenure,
      loanAmount: loanAmount,
      interestRate: mirrorInterestRate,
      tenure: mirrorTenure,
      emiAmount: emiAmount,
      firstName: 'TEST',
      lastName: 'CUSTOMER ONLINE',
      phone: '8888888888',
      submittedAt: new Date(),
      finalApprovedAt: new Date(),
      disbursedAt: new Date(),
      disbursedAmount: loanAmount,
      disbursementMode: 'BANK_TRANSFER',
      disbursedById: SUPER_ADMIN_ID
    }
  });
  
  console.log('Created Mirror Loan:', mirrorLoan.applicationNo);
  
  // Create MirrorLoanMapping
  const mapping = await prisma.mirrorLoanMapping.create({
    data: {
      originalLoanId: loan.id,
      mirrorLoanId: mirrorLoan.id,
      originalCompanyId: COMPANY_3_ID,
      mirrorCompanyId: COMPANY_1_ID,
      mirrorType: 'COMPANY_1_15_PERCENT',
      isOfflineLoan: false,
      mirrorLoanNumber: mirrorLoan.applicationNo,
      originalInterestRate: interestRate,
      originalInterestType: 'FLAT',
      mirrorInterestRate: mirrorInterestRate,
      mirrorInterestType: 'REDUCING',
      originalEMIAmount: emiAmount,
      originalTenure: tenure,
      mirrorTenure,
      extraEMICount,
      createdBy: SUPER_ADMIN_ID
    }
  });
  
  console.log('Created Mapping');
  
  // Deduct from C1 Bank
  const c1Bank = await prisma.bankAccount.findFirst({ where: { companyId: COMPANY_1_ID, isDefault: true } });
  if (c1Bank) {
    const prev = c1Bank.currentBalance;
    await prisma.bankAccount.update({ where: { id: c1Bank.id }, data: { currentBalance: prev - loanAmount } });
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: c1Bank.id, transactionType: 'DEBIT', amount: loanAmount, balanceAfter: prev - loanAmount,
        description: 'Mirror Loan Disbursement - ' + mirrorLoan.applicationNo, referenceType: 'MIRROR_LOAN_DISBURSEMENT',
        referenceId: mirrorLoan.id, createdById: SUPER_ADMIN_ID
      }
    });
    console.log('\\nC1 Bank:', prev, '->', prev - loanAmount);
  }
  
  // Create Journal Entry
  const c1Coa = await prisma.chartOfAccount.findMany({ where: { companyId: COMPANY_1_ID } });
  const lr = c1Coa.find(a => a.accountCode === '1200');
  const bank = c1Coa.find(a => a.accountCode === '1000');
  
  if (lr && bank) {
    await prisma.journalEntry.create({
      data: {
        companyId: COMPANY_1_ID, entryNumber: 'JE-OL-' + Date.now(), entryDate: new Date(),
        referenceType: 'MIRROR_LOAN_DISBURSEMENT', referenceId: mirrorLoan.id,
        narration: 'Online Mirror Loan - ' + mirrorLoan.applicationNo,
        totalDebit: loanAmount, totalCredit: loanAmount, isApproved: true, createdById: SUPER_ADMIN_ID,
        lines: {
          create: [
            { accountId: lr.id, debitAmount: loanAmount, creditAmount: 0 },
            { accountId: bank.id, debitAmount: 0, creditAmount: loanAmount }
          ]
        }
      }
    });
    await prisma.chartOfAccount.update({ where: { id: lr.id }, data: { currentBalance: lr.currentBalance + loanAmount } });
    await prisma.chartOfAccount.update({ where: { id: bank.id }, data: { currentBalance: bank.currentBalance - loanAmount } });
    console.log('Journal Entry created');
  }
  
  // Create EMI Schedules
  const origEmis = [];
  const mp = loanAmount / tenure;
  const mi = totalInterest / tenure;
  for (let i = 0; i < tenure; i++) {
    const d = new Date(); d.setMonth(d.getMonth() + i + 1); d.setDate(5);
    origEmis.push({
      loanApplicationId: loan.id, installmentNumber: i + 1, dueDate: d, originalDueDate: d,
      principalAmount: mp, interestAmount: mi, totalAmount: emiAmount,
      outstandingPrincipal: loanAmount - mp * (i + 1), paymentStatus: 'PENDING',
      paidAmount: 0, paidPrincipal: 0, paidInterest: 0, penaltyAmount: 0, penaltyPaid: 0, daysOverdue: 0
    });
  }
  await prisma.eMISchedule.createMany({ data: origEmis });
  
  const mirEmis = mirrorSchedule.map((item, i) => {
    const d = new Date(); d.setMonth(d.getMonth() + i + 1); d.setDate(5);
    return {
      loanApplicationId: mirrorLoan.id, installmentNumber: item.installmentNumber, dueDate: d, originalDueDate: d,
      principalAmount: item.principal, interestAmount: item.interest, totalAmount: item.totalAmount,
      outstandingPrincipal: item.outstandingPrincipal, paymentStatus: 'PENDING',
      paidAmount: 0, paidPrincipal: 0, paidInterest: 0, penaltyAmount: 0, penaltyPaid: 0, daysOverdue: 0
    };
  });
  await prisma.eMISchedule.createMany({ data: mirEmis });
  
  console.log('EMI schedules created');
  
  // Verification
  console.log('\\n========================================');
  console.log('VERIFICATION - C1 Chart of Accounts');
  console.log('========================================');
  const finalCoa = await prisma.chartOfAccount.findMany({ where: { companyId: COMPANY_1_ID }, orderBy: { accountCode: 'asc' } });
  finalCoa.forEach(a => { if (a.currentBalance !== 0) console.log({ code: a.accountCode, name: a.accountName, balance: a.currentBalance }); });
  
  console.log('\\nONLINE LOAN SUMMARY:');
  console.log('Original (C3):', loan.applicationNo, '- 24% FLAT, 10 EMIs');
  console.log('Mirror (C1):', mirrorLoan.applicationNo, '- 15% REDUCING,', mirrorTenure, 'EMIs');
  
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
