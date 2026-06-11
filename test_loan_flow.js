/**
 * Script to test creation, payment, and ledger auditing of an Interest-Only Loan.
 */
const { db } = require('./src/lib/db');
const { AccountingService } = require('./src/lib/accounting-service');

async function getMockLedger(customerId, companyId) {
  const { NextRequest } = require('next/server');
  const req = new NextRequest(`http://localhost:3000/api/accounting/personal-ledger?customerId=${customerId}&companyId=${companyId}`);
  const { GET } = require('./src/app/api/accounting/personal-ledger/route.ts');
  const res = await GET(req);
  return await res.json();
}

async function main() {
  console.log('--- STARTING IO LOAN TEST FLOW ---');
  
  // 1. Setup a test company
  const companyCode = 'TCO';
  let company = await db.company.findUnique({ where: { code: companyCode } });
  if (!company) {
    company = await db.company.create({
      data: {
        name: 'Test Company',
        code: companyCode,
        isMirrorCompany: false, // We will test as original company first
        accountingType: 'FULL',
        isActive: true
      }
    });
    console.log(`Created test company: ${company.id}`);
  } else {
    console.log(`Using existing test company: ${company.id}`);
  }

  // Initialize COA
  const accSvc = new AccountingService(company.id);
  await accSvc.initializeChartOfAccounts();
  console.log('Initialized chart of accounts for company');

  // 2. Setup a test customer
  const phone = '9999999999';
  let customer = await db.user.findFirst({ where: { phone } });
  if (!customer) {
    customer = await db.user.create({
      data: {
        name: 'IO Test Customer',
        phone,
        email: 'io_test@example.com',
        role: 'CUSTOMER',
        passwordHash: 'dummy'
      }
    });
    console.log(`Created test customer: ${customer.id}`);
  } else {
    console.log(`Using existing test customer: ${customer.id}`);
  }

  // 3. Setup a test admin/staff who creates/manages the loan
  let admin = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        name: 'Test Admin',
        phone: '1111111111',
        email: 'admin_test@example.com',
        role: 'SUPER_ADMIN',
        passwordHash: 'dummy'
      }
    });
  }

  // 4. Create Interest-Only Loan
  const disbursementDate = new Date(); // today
  const startDate = new Date(); // today
  const _d = new Date(disbursementDate);
  const _year  = _d.getMonth() === 11 ? _d.getFullYear() + 1 : _d.getFullYear();
  const _month = (_d.getMonth() + 1) % 12;
  const _lastDay = new Date(_year, _month + 1, 0).getDate();
  const _day   = Math.min(_d.getDate(), _lastDay);
  const firstEMIDueDate = new Date(_year, _month, _day, 0, 0, 0, 0);

  const loanAmount = 10000;
  const interestRate = 12; // 12% per year = 1% per month = ₹100
  const monthlyInterestAmount = (loanAmount * interestRate / 100) / 12;

  // Clean old test loans for this customer to have a clean slate
  const oldLoans = await db.offlineLoan.findMany({ where: { customerId: customer.id } });
  for (const l of oldLoans) {
    await db.offlineLoanEMI.deleteMany({ where: { offlineLoanId: l.id } });
    await db.journalEntry.deleteMany({
      where: {
        lines: { some: { loanId: l.id } }
      }
    });
    await db.offlineLoan.delete({ where: { id: l.id } });
  }
  console.log('Cleaned up previous test loans for this customer');

  // Generate sequence / number
  const sequence = Date.now().toString().slice(-5);
  const loanNumber = `${companyCode}-PERSONAL-IO-${sequence}`;

  const newLoan = await db.offlineLoan.create({
    data: {
      loanNumber,
      createdById: admin.id,
      createdByRole: 'SUPER_ADMIN',
      companyId: company.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      loanType: 'PERSONAL',
      interestType: 'FLAT',
      loanAmount,
      interestRate,
      tenure: 0,
      emiAmount: monthlyInterestAmount,
      processingFee: 0,
      disbursementDate,
      disbursementMode: 'CASH',
      status: 'INTEREST_ONLY',
      startDate: firstEMIDueDate,
      allowInterestOnly: true,
      isInterestOnlyLoan: true,
      interestOnlyStartDate: disbursementDate,
      interestOnlyMonthlyAmount: monthlyInterestAmount,
      partialPaymentEnabled: false,
      emis: {
        create: {
          installmentNumber: 1,
          dueDate: firstEMIDueDate,
          originalDueDate: firstEMIDueDate,
          principalAmount: 0,
          interestAmount: monthlyInterestAmount,
          totalAmount: monthlyInterestAmount,
          outstandingPrincipal: loanAmount,
          paymentStatus: 'PENDING',
          isInterestOnly: true,
          interestOnlyAmount: monthlyInterestAmount
        }
      }
    },
    include: { emis: true }
  });

  console.log(`Created new IO Loan: ${newLoan.loanNumber} (ID: ${newLoan.id})`);
  console.log(`Disbursement Date: ${disbursementDate.toISOString()}`);
  console.log(`EMI #1 Due Date: ${firstEMIDueDate.toISOString()}`);

  const CODES = {
    LOANS_RECEIVABLE: '1200',
    CASH_IN_HAND: '1101',
    BANK_ACCOUNT: '1102',
    INTEREST_RECEIVABLE: '1301',
    INTEREST_INCOME: '4110'
  };

  await accSvc.createJournalEntry({
    entryDate: disbursementDate,
    referenceType: 'LOAN_DISBURSEMENT',
    referenceId: newLoan.id,
    narration: `Loan Disbursed — ${newLoan.loanNumber}`,
    lines: [
      { accountCode: CODES.LOANS_RECEIVABLE, debitAmount: loanAmount, creditAmount: 0, loanId: newLoan.id },
      { accountCode: CODES.CASH_IN_HAND, debitAmount: 0, creditAmount: loanAmount, loanId: newLoan.id }
    ],
    createdById: admin.id,
    paymentMode: 'CASH',
    isAutoEntry: true
  });
  console.log('Recorded Loan Disbursement journal entry');

  // 5. Test Ledger before Payment
  console.log('\n--- AUDITING LEDGER BEFORE PAYMENT ---');
  let ledgerData = await getMockLedger(customer.id, company.id);
  console.log(`Source: ${ledgerData.source}`);
  console.log(`Total Entries: ${ledgerData.entries.length}`);
  for (const entry of ledgerData.entries) {
    console.log(`  Entry: [${entry.referenceType}] Date=${new Date(entry.date).toISOString()} Description="${entry.description}"`);
  }
  
  const hasFutureAccrual = ledgerData.entries.some(e => e.referenceType === 'INTEREST_ACCRUAL' && new Date(e.date) > new Date());
  if (hasFutureAccrual) {
    console.error('❌ BUG FOUND: Future-dated synthetic accrual exists in the ledger!');
  } else {
    console.log('✅ PASS: No future-dated synthetic accrual before payment.');
  }

  // 6. Pay the EMI
  console.log('\n--- PAYING FIRST EMI ---');
  const currentEMI = newLoan.emis[0];
  const now = new Date();

  // Create interest accrual first
  const accrualDate = currentEMI.dueDate <= now ? currentEMI.dueDate : now;
  await accSvc.recordInterestAccrual({
    loanId: newLoan.id,
    customerId: customer.id,
    customerName: customer.name,
    emiId: currentEMI.id,
    interestAmount: monthlyInterestAmount,
    accrualDate,
    createdById: 'SYSTEM'
  });
  console.log(`Recorded Interest Accrual dated: ${accrualDate.toISOString()}`);

  // Update EMI to PAID
  await db.offlineLoanEMI.update({
    where: { id: currentEMI.id },
    data: {
      paymentStatus: 'PAID',
      paidAmount: monthlyInterestAmount,
      paidInterest: monthlyInterestAmount,
      paidDate: now,
      paymentMode: 'CASH',
      collectedById: admin.id,
      collectedByName: admin.name,
      collectedAt: now,
      interestOnlyPaidAt: now
    }
  });

  // Record payment journal entry
  await accSvc.createJournalEntry({
    entryDate: now,
    referenceType: 'INTEREST_ONLY_PAYMENT',
    referenceId: currentEMI.id,
    narration: `IO EMI #${currentEMI.installmentNumber} - ${newLoan.loanNumber} - ${customer.name}`,
    lines: [
      { accountCode: CODES.CASH_IN_HAND, debitAmount: monthlyInterestAmount, creditAmount: 0, loanId: newLoan.id },
      { accountCode: CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: monthlyInterestAmount, loanId: newLoan.id }
    ],
    createdById: admin.id,
    paymentMode: 'CASH',
    isAutoEntry: true
  });
  console.log('Recorded Interest Payment journal entry');

  // Create next month's interest EMI
  const nextDueDate = new Date(firstEMIDueDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  const nextEMI = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: newLoan.id,
      installmentNumber: 2,
      dueDate: nextDueDate,
      originalDueDate: nextDueDate,
      principalAmount: 0,
      interestAmount: monthlyInterestAmount,
      totalAmount: monthlyInterestAmount,
      outstandingPrincipal: loanAmount,
      paymentStatus: 'PENDING',
      isInterestOnly: true,
      interestOnlyAmount: monthlyInterestAmount
    }
  });
  console.log(`Created next EMI #2, due date: ${nextDueDate.toISOString()}`);

  // 7. Test Ledger after Payment
  console.log('\n--- AUDITING LEDGER AFTER PAYMENT ---');
  ledgerData = await getMockLedger(customer.id, company.id);
  console.log(`Source: ${ledgerData.source}`);
  console.log(`Total Entries: ${ledgerData.entries.length}`);
  
  let emi1Accrual = null;
  let emi1Payment = null;
  let emi2Accrual = null;

  for (const entry of ledgerData.entries) {
    console.log(`  Entry: [${entry.referenceType}] Date=${new Date(entry.date).toISOString()} Description="${entry.description}"`);
    if (entry.referenceType === 'INTEREST_ACCRUAL') {
      if (entry.referenceId === currentEMI.id) emi1Accrual = entry;
      if (entry.referenceId === nextEMI.id) emi2Accrual = entry;
    }
    if (entry.referenceType === 'INTEREST_ONLY_PAYMENT') {
      if (entry.referenceId === currentEMI.id) emi1Payment = entry;
    }
  }

  if (emi1Accrual && emi1Payment) {
    console.log('✅ PASS: Paid EMI #1 Accrual and Payment are correctly shown.');
  } else {
    console.error('❌ BUG: Paid EMI #1 Accrual or Payment is missing!');
  }

  if (emi2Accrual) {
    console.error('❌ BUG FOUND: Future-dated pending EMI #2 Accrual is displayed in the ledger!');
  } else {
    console.log('✅ PASS: Pending future-dated EMI #2 is NOT shown.');
  }

  // Clean up test loan at the end
  await db.offlineLoanEMI.deleteMany({ where: { offlineLoanId: newLoan.id } });
  await db.journalEntry.deleteMany({
    where: {
      lines: { some: { loanId: newLoan.id } }
    }
  });
  await db.offlineLoan.delete({ where: { id: newLoan.id } });
  console.log('\nCleaned up test loan & entries.');

  await db.$disconnect();
  console.log('--- TEST COMPLETED ---');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
