const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// IDs from database
const COMPANY_3_ID = 'cmnm2yvlz000011du25wvlq15';  // Original loan company (C3)
const COMPANY_1_ID = 'cmnm30fh8000a11dub37itsvd';  // Mirror company (C1)
const SUPER_ADMIN_ID = 'cmnm2uy320000luhg3z4mszp0';
const C3_USER_ID = 'cmnm2ywcz000211duc8iklonh';    // Company 3 user

async function main() {
  console.log('========================================');
  console.log('CREATING OFFLINE LOAN: C3 -> Mirror to C1');
  console.log('========================================');
  
  // Loan details
  const loanAmount = 50000;       // ₹50,000 loan
  const interestRate = 24;        // 24% FLAT (C3 rate)
  const tenure = 10;              // 10 EMIs
  const mirrorInterestRate = 15;  // 15% REDUCING (C1 rate)
  
  const customerName = 'TEST CUSTOMER OFFLINE';
  const customerPhone = '9876543210';
  const disbursementDate = new Date();
  const startDate = new Date();
  
  // Calculate EMI for FLAT interest (C3 original loan)
  const totalInterest = loanAmount * (interestRate / 100) * (tenure / 12);
  const totalAmount = loanAmount + totalInterest;
  const emiAmount = totalAmount / tenure;
  
  console.log('\\n=== ORIGINAL LOAN (C3) Details ===');
  console.log('Principal:', loanAmount);
  console.log('Interest Rate:', interestRate + '% FLAT');
  console.log('Tenure:', tenure, 'months');
  console.log('Total Interest:', totalInterest);
  console.log('EMI Amount:', emiAmount.toFixed(2));
  
  // ============================================
  // STEP 1: Create ORIGINAL LOAN in Company 3
  // ============================================
  const originalLoan = await prisma.offlineLoan.create({
    data: {
      loanNumber: 'C3-PERSONAL-' + customerName.replace(/\s/g, '').substring(0, 10).toUpperCase(),
      createdById: C3_USER_ID,
      createdByRole: 'COMPANY',
      companyId: COMPANY_3_ID,
      customerName,
      customerPhone,
      loanType: 'PERSONAL',
      interestType: 'FLAT',
      loanAmount,
      interestRate,
      tenure,
      emiAmount: parseFloat(emiAmount.toFixed(2)),
      processingFee: 0,
      disbursementDate,
      disbursementMode: 'CASH',
      status: 'ACTIVE',
      startDate,
      isInterestOnlyLoan: false,
      partialPaymentEnabled: true
    }
  });
  
  console.log('\\nCreated Original Loan:', originalLoan.loanNumber);
  console.log('Original Loan ID:', originalLoan.id);
  
  // Create EMI schedule for original loan
  const emis = [];
  const monthlyPrincipal = loanAmount / tenure;
  const monthlyInterest = totalInterest / tenure;
  
  for (let i = 0; i < tenure; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    dueDate.setDate(5);
    dueDate.setHours(0, 0, 0, 0);
    
    emis.push({
      offlineLoanId: originalLoan.id,
      installmentNumber: i + 1,
      dueDate,
      principalAmount: monthlyPrincipal,
      interestAmount: monthlyInterest,
      totalAmount: emiAmount,
      outstandingPrincipal: loanAmount - (monthlyPrincipal * (i + 1)),
      paymentStatus: 'PENDING'
    });
  }
  
  await prisma.offlineLoanEMI.createMany({ data: emis });
  console.log('Created', emis.length, 'EMIs for original loan');
  
  // ============================================
  // STEP 2: Calculate MIRROR LOAN schedule (C1)
  // ============================================
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
    
    mirrorSchedule.push({
      installmentNumber,
      principal: principalPaid,
      interest,
      totalAmount: actualEmi,
      outstandingPrincipal
    });
    
    installmentNumber++;
  }
  
  const mirrorTenure = mirrorSchedule.length;
  const extraEMICount = tenure - mirrorTenure;
  const totalMirrorInterest = mirrorSchedule.reduce((sum, item) => sum + item.interest, 0);
  
  console.log('\\n=== MIRROR LOAN (C1) Details ===');
  console.log('Principal:', loanAmount);
  console.log('Interest Rate:', mirrorInterestRate + '% REDUCING');
  console.log('Mirror Tenure:', mirrorTenure, 'months');
  console.log('Extra EMIs:', extraEMICount);
  console.log('Total Mirror Interest:', totalMirrorInterest.toFixed(2));
  
  // ============================================
  // STEP 3: Create MIRROR LOAN in Company 1
  // ============================================
  const displayColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const colorIndex = Math.abs(originalLoan.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % displayColors.length;
  const displayColor = displayColors[colorIndex];
  
  const mirrorLoan = await prisma.offlineLoan.create({
    data: {
      loanNumber: 'C1-PERSONAL-00001',
      createdById: C3_USER_ID,
      createdByRole: 'COMPANY',
      companyId: COMPANY_1_ID,
      customerName,
      customerPhone,
      loanType: 'PERSONAL',
      interestType: 'REDUCING',
      loanAmount,
      interestRate: mirrorInterestRate,
      tenure: mirrorTenure,
      emiAmount: parseFloat(emiAmount.toFixed(2)),
      processingFee: 0,
      disbursementDate,
      disbursementMode: 'BANK_TRANSFER',
      status: 'ACTIVE',
      startDate,
      displayColor,
      isMirrorLoan: true,
      originalLoanId: originalLoan.id,
      isInterestOnlyLoan: false,
      partialPaymentEnabled: true
    }
  });
  
  console.log('\\nCreated Mirror Loan:', mirrorLoan.loanNumber);
  console.log('Mirror Loan ID:', mirrorLoan.id);
  
  // Create EMI schedule for mirror loan
  const mirrorEmis = mirrorSchedule.map((item, index) => {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + index + 1);
    dueDate.setDate(5);
    dueDate.setHours(0, 0, 0, 0);
    
    return {
      offlineLoanId: mirrorLoan.id,
      installmentNumber: item.installmentNumber,
      dueDate,
      principalAmount: item.principal,
      interestAmount: item.interest,
      totalAmount: item.totalAmount,
      outstandingPrincipal: item.outstandingPrincipal,
      paymentStatus: 'PENDING'
    };
  });
  
  await prisma.offlineLoanEMI.createMany({ data: mirrorEmis });
  console.log('Created', mirrorEmis.length, 'EMIs for mirror loan');
  
  // Update original loan with display color
  await prisma.offlineLoan.update({
    where: { id: originalLoan.id },
    data: { displayColor }
  });
  
  console.log('\\nNote: MirrorLoanMapping skipped - offline loans use direct originalLoanId link');
  
  // ============================================
  // STEP 5: DEDUCT FROM C1 BANK ACCOUNT
  // ============================================
  const c1Bank = await prisma.bankAccount.findFirst({
    where: { companyId: COMPANY_1_ID, isDefault: true }
  });
  
  if (c1Bank) {
    const currentBalance = c1Bank.currentBalance;
    
    await prisma.bankAccount.update({
      where: { id: c1Bank.id },
      data: { currentBalance: currentBalance - loanAmount }
    });
    
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: c1Bank.id,
        transactionType: 'DEBIT',
        amount: loanAmount,
        balanceAfter: currentBalance - loanAmount,
        description: `Mirror Loan Disbursement - ${mirrorLoan.loanNumber}`,
        referenceType: 'MIRROR_LOAN_DISBURSEMENT',
        referenceId: mirrorLoan.id,
        createdById: C3_USER_ID
      }
    });
    
    console.log('\\nDeducted ₹' + loanAmount + ' from C1 Bank');
    console.log('Previous Balance:', currentBalance);
    console.log('New Balance:', currentBalance - loanAmount);
  }
  
  // ============================================
  // STEP 6: CREATE JOURNAL ENTRY FOR C1 (Accounting)
  // ============================================
  const c1Coa = await prisma.chartOfAccount.findMany({
    where: { companyId: COMPANY_1_ID }
  });
  
  const loansReceivableAccount = c1Coa.find(a => a.accountCode === '1200');
  const bankAccount = c1Coa.find(a => a.accountCode === '1000');
  
  if (loansReceivableAccount && bankAccount) {
    const journalEntry = await prisma.journalEntry.create({
      data: {
        companyId: COMPANY_1_ID,
        entryNumber: 'JE-ML-' + Date.now(),
        entryDate: disbursementDate,
        referenceType: 'MIRROR_LOAN_DISBURSEMENT',
        referenceId: mirrorLoan.id,
        narration: `Mirror Loan Disbursement - ${mirrorLoan.loanNumber} (Mirror of ${originalLoan.loanNumber}) - Principal: ₹${loanAmount.toLocaleString()}`,
        totalDebit: loanAmount,
        totalCredit: loanAmount,
        isApproved: true,
        createdById: SUPER_ADMIN_ID,
        lines: {
          create: [
            {
              accountId: loansReceivableAccount.id,
              debitAmount: loanAmount,
              creditAmount: 0,
              narration: 'Mirror loan principal disbursed'
            },
            {
              accountId: bankAccount.id,
              debitAmount: 0,
              creditAmount: loanAmount,
              narration: 'Bank account deduction for mirror loan'
            }
          ]
        }
      }
    });
    
    console.log('\\nCreated Journal Entry for C1:', journalEntry.entryNumber);
    
    // Update account balances
    await prisma.chartOfAccount.update({
      where: { id: loansReceivableAccount.id },
      data: { currentBalance: loansReceivableAccount.currentBalance + loanAmount }
    });
    
    await prisma.chartOfAccount.update({
      where: { id: bankAccount.id },
      data: { currentBalance: bankAccount.currentBalance - loanAmount }
    });
    
    console.log('Updated Chart of Accounts:');
    console.log('- Loans Receivable: +' + loanAmount);
    console.log('- Bank: -' + loanAmount);
  }
  
  // ============================================
  // STEP 7: CREATE CASHBOOK ENTRY FOR C3
  // Company 3 only has Cashbook/Daybook - no Chart of Accounts
  // ============================================
  // Create or get C3 cash book
  let c3CashBook = await prisma.cashBook.findFirst({
    where: { companyId: COMPANY_3_ID }
  });
  
  if (!c3CashBook) {
    c3CashBook = await prisma.cashBook.create({
      data: {
        companyId: COMPANY_3_ID,
        currentBalance: 0
      }
    });
  }
  
  // Add cash book entry - money received from C1 for disbursement
  await prisma.cashBookEntry.create({
    data: {
      cashBookId: c3CashBook.id,
      entryType: 'CREDIT',
      amount: loanAmount,
      balanceAfter: c3CashBook.currentBalance + loanAmount,
      description: `Loan Disbursement received from C1 - ${originalLoan.loanNumber}`,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: originalLoan.id,
      createdById: C3_USER_ID
    }
  });
  
  // Update cash book balance
  await prisma.cashBook.update({
    where: { id: c3CashBook.id },
    data: { currentBalance: c3CashBook.currentBalance + loanAmount }
  });
  
  // Then debit - money disbursed to customer
  await prisma.cashBookEntry.create({
    data: {
      cashBookId: c3CashBook.id,
      entryType: 'DEBIT',
      amount: loanAmount,
      balanceAfter: c3CashBook.currentBalance,
      description: `Loan Disbursed to Customer - ${originalLoan.loanNumber}`,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: originalLoan.id,
      createdById: C3_USER_ID
    }
  });
  
  console.log('\\nCreated CashBook entries for C3');
  
  // ============================================
  // STEP 8: VERIFY FINAL STATE
  // ============================================
  console.log('\\n========================================');
  console.log('VERIFICATION - Company 1 Chart of Accounts');
  console.log('========================================');
  
  const finalCoa = await prisma.chartOfAccount.findMany({
    where: { companyId: COMPANY_1_ID },
    orderBy: { accountCode: 'asc' }
  });
  
  finalCoa.forEach(a => {
    if (a.currentBalance !== 0) {
      console.log({ code: a.accountCode, name: a.accountName, balance: a.currentBalance });
    }
  });
  
  console.log('\\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log('Original Loan (C3):', originalLoan.loanNumber);
  console.log('Mirror Loan (C1):', mirrorLoan.loanNumber);
  console.log('Loan Amount: ₹' + loanAmount);
  console.log('Original: 24% FLAT, 10 EMIs, EMI=₹' + emiAmount.toFixed(2));
  console.log('Mirror: 15% REDUCING, ' + mirrorTenure + ' EMIs');
  console.log('Extra EMIs for C3 profit:', extraEMICount);
  console.log('C1: Loans Receivable should show ₹' + loanAmount);
  
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
