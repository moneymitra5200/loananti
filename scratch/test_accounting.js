const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function cleanup() {
  await db.ledgerBalance.deleteMany({}).catch(() => {});
  await db.journalEntryLine.deleteMany({}).catch(() => {});
  await db.journalEntry.deleteMany({}).catch(() => {});
  await db.bankTransaction.deleteMany({}).catch(() => {});
  await db.cashBookEntry.deleteMany({}).catch(() => {});
  await db.mirrorLoanMapping.deleteMany({}).catch(() => {});
  await db.offlineLoanEMI.deleteMany({}).catch(() => {});
  await db.offlineLoan.deleteMany({}).catch(() => {});
  await db.chartOfAccount.deleteMany({}).catch(() => {});
}

async function main() {
  console.log("Cleaning up database...");
  await cleanup();

  console.log("Creating companies...");
  let companyC3 = await db.company.findFirst({ where: { code: 'C3' } });
  if (!companyC3) {
    companyC3 = await db.company.create({
      data: { name: 'KESARDEEP FINANCIAL ADVISOR', code: 'C3', accountingType: 'FULL' }
    });
  }
  let companyC1 = await db.company.findFirst({ where: { code: 'C1' } });
  if (!companyC1) {
    companyC1 = await db.company.create({
      data: { name: 'MONEY MITRA FINANCIAL ADVISOR', code: 'C1', accountingType: 'FULL' }
    });
  }

  console.log("Initializing Chart of Accounts...");
  const { AccountingService } = require('../src/lib/accounting-service');
  const accC3 = new AccountingService(companyC3.id);
  await accC3.initializeChartOfAccounts();
  const accC1 = new AccountingService(companyC1.id);
  await accC1.initializeChartOfAccounts();

  console.log("Creating user...");
  let customer = await db.user.findFirst({ where: { phone: '9999999999' } });
  if (!customer) {
    customer = await db.user.create({
      data: { name: 'AWDAWD', phone: '9999999999', email: 'test@example.com', firebaseUid: 'test-uid' }
    });
  }

  console.log("Creating original loan (C3)...");
  // 10k, 24% flat, 2 months (200 interest per month)
  const origLoan = await db.offlineLoan.create({
    data: {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      companyId: companyC3.id,
      loanNumber: 'C3-PERSONAL-AWDAWD-001',
      loanAmount: 10000,
      interestRate: 24,
      tenure: 2,
      interestType: 'FLAT',
      status: 'ACTIVE',
      disbursementDate: new Date('2026-06-05T05:30:00Z'),
      startDate: new Date('2026-06-05T05:30:00Z'),
      createdByRole: 'ADMIN',
      createdById: customer.id,
      emiAmount: 5200,
    }
  });

  // Create original EMIs
  const emi1 = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: origLoan.id,
      installmentNumber: 1,
      dueDate: new Date('2026-07-05T05:30:00Z'),
      principalAmount: 5000,
      interestAmount: 200,
      totalAmount: 5200,
      paymentStatus: 'PENDING',
      outstandingPrincipal: 10000,
    }
  });
  const emi2 = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: origLoan.id,
      installmentNumber: 2,
      dueDate: new Date('2026-08-05T05:30:00Z'),
      principalAmount: 5000,
      interestAmount: 200,
      totalAmount: 5200,
      paymentStatus: 'PENDING',
      outstandingPrincipal: 5000,
    }
  });

  console.log("Creating mirror loan (C1)...");
  const mirrorLoan = await db.offlineLoan.create({
    data: {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      companyId: companyC1.id,
      loanNumber: 'MR-C3-PERSONAL-AWDAWD-001',
      loanAmount: 10000,
      interestRate: 15, // 15% reducing
      tenure: 2,
      interestType: 'REDUCING',
      status: 'ACTIVE',
      disbursementDate: new Date('2026-06-05T05:30:00Z'),
      startDate: new Date('2026-06-05T05:30:00Z'),
      createdByRole: 'ADMIN',
      createdById: customer.id,
      emiAmount: 5068.76,
    }
  });

  const mEmi1 = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: mirrorLoan.id,
      installmentNumber: 1,
      dueDate: new Date('2026-07-05T05:30:00Z'),
      principalAmount: 4943.76,
      interestAmount: 125,
      totalAmount: 5068.76,
      paymentStatus: 'PENDING',
      outstandingPrincipal: 10000,
    }
  });
  const mEmi2 = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: mirrorLoan.id,
      installmentNumber: 2,
      dueDate: new Date('2026-08-05T05:30:00Z'),
      principalAmount: 5068.76,
      interestAmount: 63.17,
      totalAmount: 5131.93,
      paymentStatus: 'PENDING',
      outstandingPrincipal: 5056.24,
    }
  });

  console.log("Creating mirror loan mapping...");
  await db.mirrorLoanMapping.create({
    data: {
      originalLoanId: origLoan.id,
      mirrorLoanId: mirrorLoan.id,
      originalCompanyId: companyC3.id,
      mirrorCompanyId: companyC1.id,
      mirrorInterestRate: 15,
      originalTenure: 2,
      mirrorTenure: 2,
      isOfflineLoan: true,
      mirrorType: 'COMPANY_1_15_PERCENT',
      originalInterestRate: 24,
      originalEMIAmount: 5200,
      createdBy: 'ADMIN',
    }
  });

  console.log("Importing accounting service and recording payment...");
  const { recordEMIPaymentAccounting } = require('../src/lib/simple-accounting');

  // Simulating payment of EMI 1
  await db.offlineLoanEMI.update({
    where: { id: emi1.id },
    data: {
      paymentStatus: 'PAID',
      paidDate: new Date('2026-06-05T15:52:12Z'),
      paidAmount: 1026.87,
      paidPrincipal: 1014.19,
      paidInterest: 12.68,
    }
  });
  await db.offlineLoanEMI.update({
    where: { id: mEmi1.id },
    data: {
      paymentStatus: 'PAID',
      paidDate: new Date('2026-06-05T15:52:12Z'),
      paidAmount: 1026.87,
      paidPrincipal: 1014.19,
      paidInterest: 12.68,
    }
  });

  console.log("Calling recordEMIPaymentAccounting...");
  const result = await recordEMIPaymentAccounting({
    amount: 1026.87,
    principalComponent: 1014.19,
    interestComponent: 12.68,
    paymentMode: 'CASH',
    paymentType: 'FULL',
    creditType: 'PERSONAL',
    loanCompanyId: companyC3.id,
    company3Id: companyC3.id,
    loanId: origLoan.id,
    emiId: emi1.id,
    paymentId: 'PAYMENT_TEST_001',
    loanNumber: origLoan.loanNumber,
    installmentNumber: 1,
    userId: customer.id,
    customerId: customer.id,
    customerName: customer.name,
    mirrorLoanId: mirrorLoan.id,
    mirrorPrincipal: 1014.19,
    mirrorInterest: 12.68,
    mirrorCompanyId: companyC1.id,
    isMirrorPayment: true,
  });

  console.log("Accounting Result:", result);

  console.log("\n--- JOURNAL ENTRIES IN DATABASE ---");
  const jes = await db.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });
  for (const je of jes) {
    console.log(`JE ID: ${je.id} | Company: ${je.companyId} | RefType: ${je.referenceType}`);
    for (const line of je.lines) {
      console.log(`  Line: ${line.account.accountCode} (${line.account.accountName}) | Dr: ${line.debitAmount} | Cr: ${line.creditAmount} | LoanID: ${line.loanId}`);
    }
  }

  console.log("\n--- SIMULATING PERSONAL LEDGER API (C3) ---");
  const { GET } = require('../src/app/api/accounting/personal-ledger/route');
  const reqC3 = new Request(`http://localhost/api/accounting/personal-ledger?customerId=${customer.id}&companyId=${companyC3.id}`);
  const resC3 = await GET(reqC3);
  const dataC3 = await resC3.json();
  console.log("Ledger Entries for C3:");
  for (const entry of dataC3.entries) {
    console.log(`  Date: ${entry.date} | Desc: ${entry.description || entry.narration} | Dr: ${entry.principalDisbursed} | Cr Principal: ${entry.principalPaid} | Cr Interest: ${entry.interestPaid}`);
  }

  console.log("\n--- SIMULATING PERSONAL LEDGER API (C1) ---");
  const reqC1 = new Request(`http://localhost/api/accounting/personal-ledger?customerId=${customer.id}&companyId=${companyC1.id}`);
  const resC1 = await GET(reqC1);
  const dataC1 = await resC1.json();
  console.log("Ledger Entries for C1:");
  for (const entry of dataC1.entries) {
    console.log(`  Date: ${entry.date} | Desc: ${entry.description || entry.narration} | Dr: ${entry.principalDisbursed} | Cr Principal: ${entry.principalPaid} | Cr Interest: ${entry.interestPaid}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
