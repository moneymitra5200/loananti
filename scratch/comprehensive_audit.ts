import { NextRequest } from 'next/server';
import { POST as createOfflineLoan, PUT as payOfflineEMI } from '../src/app/api/offline-loan/route';
import { POST as startOfflineLoan } from '../src/app/api/offline-loan/start/route';
import { db } from '../src/lib/db';

// Companies and Banks
const C3_ID = 'cmp4w8dx100021006f6e0c1il'; // PD RANGANI (Cash Only)
const C1_ID = 'cmp4w8dx70005100660bx4vh8'; // MONEY MITRA (SBI)
const C2_ID = 'cmp4w8dxa0008100655jq7ywo'; // KESARDEEP (HDFC)

const C1_SBI_BANK = 'cmqqgx2ub00nm3cm5acc1ap4z';
const C2_HDFC_BANK = 'cmqqgwllz00nk3cm5lhrt1nx3';

// Users
const SUPER_ADMIN_ID = 'cmnol5nie0002yhr1dens3n50';
const CASHIER_ID = 'cmnom4fgs0001dc78jjsrk7x3';
const AGENT_ID = 'cmnom2toj0001x1gu8k83krae';
const STAFF_ID = 'cmp5v4k4e0005iw5uzi2dlfr9';
const ACCOUNTANT_ID = 'cmnom4wa50005dc78kqo9nvgf';

// Tracking arrays for cleanup
const createdLoanIds: string[] = [];
const createdUserIds: string[] = [];

// Audit Results
interface AuditIssue {
  scenario: string;
  type: 'BALANCE_MISMATCH' | 'LEAKAGE' | 'MISSING_ENTRY' | 'PRISMA_CRASH' | 'OTHER';
  description: string;
}
const auditIssues: AuditIssue[] = [];

async function main() {
  console.log('======================================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END AUDIT OF LOAN ACCOUNTING LEDGERS');
  console.log('======================================================================\n');

  let customerId = '';
  
  // 1. Create Test Customer
  try {
    const testCustomer = await db.user.create({
      data: {
        firebaseUid: `audit-customer-${Date.now()}`,
        email: `audit.customer.${Date.now()}@test.com`,
        phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
        name: 'Audit Customer',
        role: 'CUSTOMER',
        isActive: true,
      }
    });
    customerId = testCustomer.id;
    createdUserIds.push(customerId);
    console.log(`✅ Created Test Customer: ${testCustomer.name} (ID: ${customerId})\n`);
  } catch (err: any) {
    console.error('❌ Failed to create test customer:', err);
    return;
  }

  // ======================================================================
  // SCENARIO 1: Offline Personal Loan (Non-Mirror) in Company 3 (Cash Only)
  // ======================================================================
  try {
    console.log('----------------------------------------------------------------------');
    console.log('👉 SCENARIO 1: Offline Personal Loan (Non-Mirror) in Company 3 (CASH)');
    console.log('----------------------------------------------------------------------');
    
    const loanPayload1 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'PERSONAL',
      loanAmount: 10000,
      interestRate: 24,
      interestType: 'FLAT',
      tenure: 3,
      disbursementDate: '2026-06-24',
      disbursementMode: 'CASH',
      startDate: '2026-07-24',
      isMirrorLoan: false,
    };

    const res1 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload1)
    }));
    const data1 = await res1.json();
    if (res1.status !== 200) throw new Error(`Failed to create Loan 1: ${JSON.stringify(data1)}`);
    const loanId1 = data1.loan.id;
    createdLoanIds.push(loanId1);
    console.log(`✅ Loan 1 Created: ${data1.loan.loanNumber} (ID: ${loanId1})`);

    // Audit Disbursement Ledger
    await auditLedger(loanId1, 'Scenario 1 - Disbursement', C3_ID);

    // Pay EMI 1: Full Payment via Cash (by Cashier)
    const emi1 = await db.offlineLoanEMI.findFirst({ where: { offlineLoanId: loanId1, installmentNumber: 1 } });
    if (!emi1) throw new Error('EMI 1 not found for Loan 1');
    
    console.log(`\nPaying EMI 1 (Full Cash, Cashier)...`);
    const payPayload1_1 = {
      action: 'pay-emi',
      emiId: emi1.id,
      userId: CASHIER_ID,
      userRole: 'CASHIER',
      paymentMode: 'CASH',
      paymentType: 'FULL',
      amount: emi1.totalAmount,
    };
    const payRes1_1 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload1_1)
    }));
    const payData1_1 = await payRes1_1.json();
    if (payRes1_1.status !== 200) throw new Error(`Failed to pay EMI 1: ${JSON.stringify(payData1_1)}`);
    console.log(`✅ EMI 1 Paid: Status = ${payData1_1.bankTransaction ? 'Bank Transaction Created' : 'CashBook Entry Created'}`);
    await auditLedger(loanId1, 'Scenario 1 - After EMI 1', C3_ID);

    // Pay EMI 2: Partial Payment via Cash (by Agent)
    const emi2 = await db.offlineLoanEMI.findFirst({ where: { offlineLoanId: loanId1, installmentNumber: 2 } });
    if (!emi2) throw new Error('EMI 2 not found for Loan 1');
    
    console.log(`\nPaying EMI 2 (Partial Cash, Agent)...`);
    const payPayload1_2 = {
      action: 'pay-emi',
      emiId: emi2.id,
      userId: AGENT_ID,
      userRole: 'AGENT',
      paymentMode: 'CASH',
      paymentType: 'PARTIAL',
      amount: 2000,
    };
    const payRes1_2 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload1_2)
    }));
    const payData1_2 = await payRes1_2.json();
    if (payRes1_2.status !== 200) throw new Error(`Failed to pay EMI 2: ${JSON.stringify(payData1_2)}`);
    console.log(`✅ EMI 2 Partial Paid: Remaining = ₹${payData1_2.remainingAmount}`);
    await auditLedger(loanId1, 'Scenario 1 - After EMI 2 Partial', C3_ID);

    // Pay EMI 3: Principal-Only Payment (by Super Admin)
    const emi3 = await db.offlineLoanEMI.findFirst({ where: { offlineLoanId: loanId1, installmentNumber: 3 } });
    if (!emi3) throw new Error('EMI 3 not found for Loan 1');
    
    console.log(`\nPaying EMI 3 (Principal-Only Cash, Super Admin)...`);
    const payPayload1_3 = {
      action: 'pay-emi',
      emiId: emi3.id,
      userId: SUPER_ADMIN_ID,
      userRole: 'SUPER_ADMIN',
      paymentMode: 'CASH',
      paymentType: 'PRINCIPAL_ONLY',
      amount: emi3.principalAmount,
    };
    const payRes1_3 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload1_3)
    }));
    const payData1_3 = await payRes1_3.json();
    if (payRes1_3.status !== 200) throw new Error(`Failed to pay EMI 3: ${JSON.stringify(payData1_3)}`);
    console.log(`✅ EMI 3 Paid Principal-Only`);
    await auditLedger(loanId1, 'Scenario 1 - After EMI 3 Principal-Only', C3_ID);
  } catch (err: any) {
    console.error('❌ Scenario 1 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 1', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // SCENARIO 2: Offline Personal Loan (Mirror to Company 1)
  // ======================================================================
  try {
    console.log('\n----------------------------------------------------------------------');
    console.log('👉 SCENARIO 2: Offline Personal Loan (Mirror to C1 - MONEY MITRA)');
    console.log('----------------------------------------------------------------------');
    
    const loanPayload2 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'PERSONAL',
      loanAmount: 12000,
      interestRate: 24,
      interestType: 'FLAT',
      tenure: 3,
      disbursementDate: '2026-06-24',
      disbursementMode: 'BANK_TRANSFER',
      startDate: '2026-07-24',
      isMirrorLoan: true,
      mirrorCompanyId: C1_ID,
      mirrorInterestRate: 15,
      mirrorInterestType: 'REDUCING',
      bankAccountId: C1_SBI_BANK,
    };

    const res2 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload2)
    }));
    const data2 = await res2.json();
    if (res2.status !== 200) throw new Error(`Failed to create Loan 2: ${JSON.stringify(data2)}`);
    const loanId2 = data2.loan.id;
    createdLoanIds.push(loanId2);
    console.log(`✅ Loan 2 Created: ${data2.loan.loanNumber} (ID: ${loanId2})`);
    
    // Audit Disbursement Ledger
    await auditLedger(loanId2, 'Scenario 2 - Disbursement', C1_ID, true);

    // Pay EMI 1: Full Payment via Bank (by Accountant)
    const emi2_1 = await db.offlineLoanEMI.findFirst({ where: { offlineLoanId: loanId2, installmentNumber: 1 } });
    if (!emi2_1) throw new Error('EMI 1 not found for Loan 2');
    
    console.log(`\nPaying EMI 1 (Full Bank, Accountant)...`);
    const payPayload2_1 = {
      action: 'pay-emi',
      emiId: emi2_1.id,
      userId: ACCOUNTANT_ID,
      userRole: 'ACCOUNTANT',
      paymentMode: 'BANK_TRANSFER',
      paymentType: 'FULL',
      amount: emi2_1.totalAmount,
      bankAccountId: C1_SBI_BANK,
    };
    const payRes2_1 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload2_1)
    }));
    const payData2_1 = await payRes2_1.json();
    if (payRes2_1.status !== 200) throw new Error(`Failed to pay EMI 1: ${JSON.stringify(payData2_1)}`);
    console.log(`✅ EMI 1 Paid Successfully`);
    await auditLedger(loanId2, 'Scenario 2 - After EMI 1', C1_ID, true);

    // Pay EMI 2: Split Payment (by Super Admin)
    const emi2_2 = await db.offlineLoanEMI.findFirst({ where: { offlineLoanId: loanId2, installmentNumber: 2 } });
    if (!emi2_2) throw new Error('EMI 2 not found for Loan 2');
    
    console.log(`\nPaying EMI 2 (Split Payment: Cash + Bank, Super Admin)...`);
    const payPayload2_2 = {
      action: 'pay-emi',
      emiId: emi2_2.id,
      userId: SUPER_ADMIN_ID,
      userRole: 'SUPER_ADMIN',
      paymentMode: 'SPLIT',
      paymentType: 'FULL',
      amount: emi2_2.totalAmount,
      isSplitPayment: true,
      splitCashAmount: 2000,
      splitOnlineAmount: emi2_2.totalAmount - 2000,
      bankAccountId: C1_SBI_BANK,
    };
    
    try {
      const payRes2_2 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
        method: 'PUT',
        body: JSON.stringify(payPayload2_2)
      }));
      const payData2_2 = await payRes2_2.json();
      if (payRes2_2.status !== 200) {
        throw new Error(`Failed to pay EMI 2: ${JSON.stringify(payData2_2)}`);
      }
      console.log(`✅ EMI 2 Split Payment Paid`);
      await auditLedger(loanId2, 'Scenario 2 - After EMI 2 Split', C1_ID, true);
    } catch (splitErr: any) {
      console.error('❌ Split Payment failed (as expected due to validation bug):', splitErr.message);
      auditIssues.push({
        scenario: 'Scenario 2 - Split Payment EMI 2',
        type: 'PRISMA_CRASH',
        description: `Prisma Validation Error during Split Payment: ${splitErr.message}`
      });
    }
  } catch (err: any) {
    console.error('❌ Scenario 2 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 2', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // SCENARIO 3: Offline Gold Loan (Non-Mirror) in Company 3 (Cash Only)
  // ======================================================================
  try {
    console.log('\n----------------------------------------------------------------------');
    console.log('👉 SCENARIO 3: Offline Gold Loan (Non-Mirror) in Company 3 (CASH)');
    console.log('----------------------------------------------------------------------');
    
    const loanPayload3 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'GOLD',
      loanAmount: 15000,
      interestRate: 12,
      interestType: 'FLAT',
      tenure: 3,
      disbursementDate: '2026-06-24',
      disbursementMode: 'CASH',
      startDate: '2026-07-24',
      isMirrorLoan: false,
      goldLoanDetail: {
        grossWeight: 50,
        netWeight: 45,
        goldRate: 6000,
        valuationAmount: 270000,
        loanAmount: 15000,
        ownerName: 'Audit Customer',
      }
    };

    const res3 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload3)
    }));
    const data3 = await res3.json();
    if (res3.status !== 200) throw new Error(`Failed to create Loan 3: ${JSON.stringify(data3)}`);
    const loanId3 = data3.loan.id;
    createdLoanIds.push(loanId3);
    console.log(`✅ Loan 3 Created (Gold): ${data3.loan.loanNumber} (ID: ${loanId3})`);
    
    await auditLedger(loanId3, 'Scenario 3 - Disbursement', C3_ID);
  } catch (err: any) {
    console.error('❌ Scenario 3 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 3', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // SCENARIO 4: Offline Vehicle Loan (Non-Mirror) in Company 3 (Cash Only)
  // ======================================================================
  try {
    console.log('\n----------------------------------------------------------------------');
    console.log('👉 SCENARIO 4: Offline Vehicle Loan (Non-Mirror) in Company 3 (CASH)');
    console.log('----------------------------------------------------------------------');
    
    const loanPayload4 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'VEHICLE',
      loanAmount: 20000,
      interestRate: 18,
      interestType: 'FLAT',
      tenure: 3,
      disbursementDate: '2026-06-24',
      disbursementMode: 'CASH',
      startDate: '2026-07-24',
      isMirrorLoan: false,
      vehicleLoanDetail: {
        vehicleType: 'TWO_WHEELER',
        vehicleNumber: 'MH-12-AB-1234',
        manufacturer: 'Honda',
        valuationAmount: 80000,
        loanAmount: 20000,
        ownerName: 'Audit Customer',
      }
    };

    const res4 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload4)
    }));
    const data4 = await res4.json();
    if (res4.status !== 200) throw new Error(`Failed to create Loan 4: ${JSON.stringify(data4)}`);
    const loanId4 = data4.loan.id;
    createdLoanIds.push(loanId4);
    console.log(`✅ Loan 4 Created (Vehicle): ${data4.loan.loanNumber} (ID: ${loanId4})`);
    
    await auditLedger(loanId4, 'Scenario 4 - Disbursement', C3_ID);
  } catch (err: any) {
    console.error('❌ Scenario 4 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 4', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // SCENARIO 5: Offline Interest-Only Loan (Non-Mirror) in Company 3 (Cash)
  // ======================================================================
  try {
    console.log('\n----------------------------------------------------------------------');
    console.log('👉 SCENARIO 5: Offline Interest-Only Loan (Non-Mirror) in Company 3');
    console.log('----------------------------------------------------------------------');
    
    const loanPayload5 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'PERSONAL',
      loanAmount: 30000,
      interestRate: 24,
      interestType: 'FLAT',
      disbursementDate: '2026-06-24',
      disbursementMode: 'CASH',
      startDate: '2026-07-24',
      isInterestOnly: true,
      isMirrorLoan: false,
    };

    const res5 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload5)
    }));
    const data5 = await res5.json();
    if (res5.status !== 200) throw new Error(`Failed to create Loan 5: ${JSON.stringify(data5)}`);
    const loanId5 = data5.loan.id;
    createdLoanIds.push(loanId5);
    console.log(`✅ Loan 5 Created (Interest-Only): ${data5.loan.loanNumber} (ID: ${loanId5})`);
    
    await auditLedger(loanId5, 'Scenario 5 - Disbursement', C3_ID);

    // Pay First Interest Payment (by Cashier)
    console.log(`\nPaying First Interest-Only Settlement...`);
    const payPayload5 = {
      action: 'pay-interest-only-loan',
      loanId: loanId5,
      userId: CASHIER_ID,
      userRole: 'CASHIER',
      paymentMode: 'CASH',
      paymentType: 'FULL',
      creditType: 'COMPANY',
    };
    const payRes5 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload5)
    }));
    const payData5 = await payRes5.json();
    if (payRes5.status !== 200) throw new Error(`Failed to pay Interest Payment: ${JSON.stringify(payData5)}`);
    console.log(`✅ Interest Payment Paid: Interest Amount = ₹${payData5.interestAmount}`);
    await auditLedger(loanId5, 'Scenario 5 - After Interest Payment', C3_ID);
  } catch (err: any) {
    console.error('❌ Scenario 5 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 5', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // SCENARIO 6: Offline Interest-Only Loan (Mirror to Company 2)
  // ======================================================================
  try {
    console.log('\n----------------------------------------------------------------------');
    console.log('👉 SCENARIO 6: Offline Interest-Only Loan (Mirror to C2 - KESARDEEP)');
    console.log('----------------------------------------------------------------------');
    
    const loanPayload6 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'PERSONAL',
      loanAmount: 40000,
      interestRate: 24,
      interestType: 'FLAT',
      disbursementDate: '2026-06-24',
      disbursementMode: 'BANK_TRANSFER',
      startDate: '2026-07-24',
      isInterestOnly: true,
      isMirrorLoan: true,
      mirrorCompanyId: C2_ID,
      mirrorInterestRate: 24,
      mirrorInterestType: 'REDUCING',
      bankAccountId: C2_HDFC_BANK,
    };

    const res6 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload6)
    }));
    const data6 = await res6.json();
    if (res6.status !== 200) throw new Error(`Failed to create Loan 6: ${JSON.stringify(data6)}`);
    const loanId6 = data6.loan.id;
    createdLoanIds.push(loanId6);
    console.log(`✅ Loan 6 Created (Interest-Only Mirror): ${data6.loan.loanNumber} (ID: ${loanId6})`);
    
    await auditLedger(loanId6, 'Scenario 6 - Disbursement', C2_ID, true);

    // Pay First Interest Payment (by Staff)
    console.log(`\nPaying First Interest-Only Mirror Settlement...`);
    const payPayload6 = {
      action: 'pay-interest-only-loan',
      loanId: loanId6,
      userId: STAFF_ID,
      userRole: 'STAFF',
      paymentMode: 'BANK_TRANSFER',
      paymentType: 'FULL',
      creditType: 'COMPANY',
      bankAccountId: C2_HDFC_BANK,
    };
    const payRes6 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload6)
    }));
    const payData6 = await payRes6.json();
    if (payRes6.status !== 200) throw new Error(`Failed to pay Interest Payment: ${JSON.stringify(payData6)}`);
    console.log(`✅ Interest Payment Paid: Interest Amount = ₹${payData6.interestAmount}`);
    await auditLedger(loanId6, 'Scenario 6 - After Interest Payment', C2_ID, true);
  } catch (err: any) {
    console.error('❌ Scenario 6 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 6', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // SCENARIO 7: Phase 1 to Phase 2 Transition (Interest-Only to Normal EMI)
  // ======================================================================
  try {
    console.log('\n----------------------------------------------------------------------');
    console.log('👉 SCENARIO 7: Phase 1 to Phase 2 Transition (Interest-Only to Normal)');
    console.log('----------------------------------------------------------------------');
    
    // Step 1: Create Interest-Only Loan with Mirror to Company 1
    const loanPayload7 = {
      createdById: SUPER_ADMIN_ID,
      createdByRole: 'SUPER_ADMIN',
      companyId: C3_ID,
      customerId,
      customerName: 'Audit Customer',
      customerPhone: '9876543210',
      loanType: 'PERSONAL',
      loanAmount: 50000,
      interestRate: 24,
      interestType: 'FLAT',
      disbursementDate: '2026-06-24',
      disbursementMode: 'BANK_TRANSFER',
      startDate: '2026-07-24',
      isInterestOnly: true,
      isMirrorLoan: true,
      mirrorCompanyId: C1_ID,
      mirrorInterestRate: 12,
      mirrorInterestType: 'REDUCING',
      bankAccountId: C1_SBI_BANK,
    };

    const res7 = await createOfflineLoan(new NextRequest('http://localhost/api/offline-loan', {
      method: 'POST',
      body: JSON.stringify(loanPayload7)
    }));
    const data7 = await res7.json();
    if (res7.status !== 200) throw new Error(`Failed to create Loan 7: ${JSON.stringify(data7)}`);
    const loanId7 = data7.loan.id;
    createdLoanIds.push(loanId7);
    console.log(`✅ Loan 7 Created (Interest-Only Mirror for Phase 1): ${data7.loan.loanNumber} (ID: ${loanId7})`);

    // Step 2: Pay First Month Interest
    console.log(`\nPaying first month's Interest Settlement...`);
    const payPayload7 = {
      action: 'pay-interest-only-loan',
      loanId: loanId7,
      userId: SUPER_ADMIN_ID,
      userRole: 'SUPER_ADMIN',
      paymentMode: 'BANK_TRANSFER',
      paymentType: 'FULL',
      creditType: 'COMPANY',
      bankAccountId: C1_SBI_BANK,
    };
    const payRes7 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload7)
    }));
    if (payRes7.status !== 200) throw new Error(`Failed to pay Interest Payment for Loan 7`);
    console.log('✅ First Interest Payment Paid');

    // Step 3: Transition to Phase 2 (Amortizing EMI)
    console.log(`\nTransitioning Loan 7 to Phase 2 (Normal EMI)...`);
    const startPayload7 = {
      loanId: loanId7,
      tenure: 6,
      interestRate: 18,
      interestType: 'FLAT',
      startedBy: SUPER_ADMIN_ID,
      processingFee: 1500,
      bankAccountId: C1_SBI_BANK,
    };
    const startRes7 = await startOfflineLoan(new NextRequest('http://localhost/api/offline-loan/start', {
      method: 'POST',
      body: JSON.stringify(startPayload7)
    }));
    const startData7 = await startRes7.json();
    if (startRes7.status !== 200) throw new Error(`Failed to start Loan 7: ${JSON.stringify(startData7)}`);
    console.log(`✅ Loan 7 Started in Phase 2! EMI: ₹${startData7.emiDetails.emiAmount}/mo for ${startData7.emiDetails.tenure} months. Processing Fee = ₹${startData7.emiDetails.processingFee}`);
    
    // Audit Phase 2 Ledger
    await auditLedger(loanId7, 'Scenario 7 - Phase 2 Transition', C1_ID, true);

    // Step 4: Pay first Amortizing EMI
    const emi7_1 = await db.offlineLoanEMI.findFirst({ where: { offlineLoanId: loanId7, installmentNumber: 1 } });
    if (!emi7_1) throw new Error('EMI 1 not found for Loan 7 in Phase 2');

    console.log(`\nPaying first Amortizing EMI in Phase 2...`);
    const payPayload7_2 = {
      action: 'pay-emi',
      emiId: emi7_1.id,
      userId: SUPER_ADMIN_ID,
      userRole: 'SUPER_ADMIN',
      paymentMode: 'BANK_TRANSFER',
      paymentType: 'FULL',
      amount: emi7_1.totalAmount,
      bankAccountId: C1_SBI_BANK,
    };
    const payRes7_2 = await payOfflineEMI(new NextRequest('http://localhost/api/offline-loan', {
      method: 'PUT',
      body: JSON.stringify(payPayload7_2)
    }));
    const payData7_2 = await payRes7_2.json();
    if (payRes7_2.status !== 200) throw new Error(`Failed to pay first Amortizing EMI: ${JSON.stringify(payData7_2)}`);
    console.log(`✅ First Amortizing EMI Paid`);
    
    await auditLedger(loanId7, 'Scenario 7 - After EMI 1 Paid', C1_ID, true);
  } catch (err: any) {
    console.error('❌ Scenario 7 Failed:', err.message);
    auditIssues.push({ scenario: 'Scenario 7', type: 'OTHER', description: err.message });
  }

  // ======================================================================
  // CLEAN-UP AND REPORTING
  // ======================================================================
  console.log('\n======================================================================');
  console.log('🧹 CLEANING UP AUDIT DATABASE ENTRIES');
  console.log('======================================================================');
  
  await cleanup({
    loans: createdLoanIds,
    users: createdUserIds,
  });

  printSummaryReport();
}

async function auditLedger(loanId: string, label: string, targetCompanyId: string, isMirror = false) {
  console.log(`\n🔍 Auditing: ${label}...`);
  
  // Fetch loan
  const loan = await db.offlineLoan.findUnique({
    where: { id: loanId },
    include: { company: true }
  });
  if (!loan) {
    console.log('❌ Loan not found!');
    return;
  }

  // Fetch mirror mapping if exists
  const mirrorMapping = await db.mirrorLoanMapping.findFirst({
    where: { originalLoanId: loanId, isOfflineLoan: true },
    include: { mirrorCompany: true }
  });

  const mirrorLoanId = mirrorMapping?.mirrorLoanId || null;
  const mirrorCompanyId = mirrorMapping?.mirrorCompanyId || null;

  // 1. Audit Journal Entries
  const searchLoanIds = mirrorLoanId ? [loanId, mirrorLoanId] : [loanId];
  
  const journalEntries = await db.journalEntry.findMany({
    where: {
      OR: [
        { referenceId: { in: searchLoanIds } },
        { lines: { some: { loanId: { in: searchLoanIds } } } }
      ],
      isReversed: false
    },
    include: {
      lines: {
        include: {
          account: true
        }
      },
      company: true
    }
  });

  for (const je of journalEntries) {
    const totalDebits = je.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
    const totalCredits = je.lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
    const diff = Math.abs(totalDebits - totalCredits);
    const isBalanced = diff < 0.01;

    console.log(`  - Journal: "${je.narration}" (${je.referenceType}) | Company: ${je.company.code}`);
    console.log(`    Balanced: ${isBalanced ? '✅ YES' : '❌ NO'}`);
    
    if (!isBalanced) {
      auditIssues.push({
        scenario: label,
        type: 'BALANCE_MISMATCH',
        description: `Journal Entry "${je.narration}" is not balanced. Debits: ₹${totalDebits.toFixed(2)}, Credits: ₹${totalCredits.toFixed(2)}. Diff: ₹${diff.toFixed(2)}`
      });
    }

    // Verify company isolation
    if (isMirror) {
      const expectedCompanyId = je.narration.toLowerCase().includes('mirror') || je.referenceType.toLowerCase().includes('mirror')
        ? mirrorCompanyId
        : targetCompanyId;

      // Note: we only flag as leakage if it's truly in the wrong company
      // (e.g. mirror entries in C3, or original entries in C1/C2)
      // Since original loan is in C3, the original disbursement journal should be in C3, and mirror in C1/C2.
      const isMirrorJE = je.narration.toLowerCase().includes('mirror') || je.referenceType.toLowerCase().includes('mirror');
      const correctCompany = isMirrorJE ? mirrorCompanyId : C3_ID;

      if (je.companyId !== correctCompany) {
        auditIssues.push({
          scenario: label,
          type: 'LEAKAGE',
          description: `Journal leakage detected! Entry "${je.narration}" for company ${je.company.code} is recorded under companyId ${je.companyId} instead of expected ${correctCompany}`
        });
        console.log(`    ⚠️ LEAKAGE DETECTED: Recorded under ${je.company.code} but expected ${correctCompany}`);
      }
    }

    for (const line of je.lines) {
      console.log(`      * [${line.account.accountCode}] ${line.account.accountName}: Dr ₹${line.debitAmount.toFixed(2)} | Cr ₹${line.creditAmount.toFixed(2)}`);
    }
  }

  // 2. Audit Cashbook/Bank
  const cbEntries = await db.cashBookEntry.findMany({
    where: { referenceId: { in: searchLoanIds } },
    include: { cashBook: { include: { company: true } } }
  });
  for (const cb of cbEntries) {
    console.log(`  - CashBook: ${cb.entryType} of ₹${cb.amount} | Company: ${cb.cashBook.company.code} | Desc: ${cb.description}`);
    
    // Check if C3 CashBook has mirror entries (C3 is Cash Only, mirror is C1/C2 Bank/Cash)
    const isMirrorEntry = cb.description.toLowerCase().includes('mirror') || cb.referenceType.toLowerCase().includes('mirror');
    if (isMirrorEntry && cb.cashBook.companyId === C3_ID) {
      auditIssues.push({
        scenario: label,
        type: 'LEAKAGE',
        description: `CashBook Leakage! Mirror loan CashBook entry of ₹${cb.amount} recorded in C3 (PD RANGANI) instead of mirror company`
      });
      console.log(`    ⚠️ CASHBOOK LEAKAGE DETECTED: Mirror entry recorded in C3`);
    }
  }

  const bankEntries = await db.bankTransaction.findMany({
    where: { referenceId: { in: searchLoanIds } },
    include: { bankAccount: { include: { company: true } } }
  });
  for (const bt of bankEntries) {
    console.log(`  - Bank: ${bt.transactionType} of ₹${bt.amount} | Company: ${bt.bankAccount.company.code} | Desc: ${bt.description}`);
  }
}

function printSummaryReport() {
  console.log('\n======================================================================');
  console.log('📊 FINAL AUDIT SUMMARY REPORT');
  console.log('======================================================================');
  
  const actualIssues = auditIssues.filter(issue => {
    // Filter out expected audit-script artifact mismatches if any
    return true;
  });

  if (actualIssues.length === 0) {
    console.log('🎉 EXCELLENT! No double-entry accounting issues or company leakage found!');
    console.log('All ledgers (Journal, Cashbook, Bank) balanced perfectly and remained strictly isolated.');
  } else {
    console.log(`⚠️ WARNING: Found ${actualIssues.length} issues during the ledger audit:`);
    for (const [index, issue] of actualIssues.entries()) {
      console.log(`\n${index + 1}. [${issue.type}] in "${issue.scenario}"`);
      console.log(`   Description: ${issue.description}`);
    }
  }
  console.log('======================================================================\n');
}

async function cleanup(createdIds: { loans: string[], users: string[] }) {
  try {
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: {
        OR: [
          { originalLoanId: { in: createdIds.loans } },
          { mirrorLoanId: { in: createdIds.loans } }
        ]
      }
    });
    const mirrorLoanIds = mirrorMappings.map(m => m.mirrorLoanId).filter(Boolean) as string[];
    const allLoanIds = [...new Set([...createdIds.loans, ...mirrorLoanIds])];

    const emis = await db.offlineLoanEMI.findMany({
      where: { offlineLoanId: { in: allLoanIds } }
    });
    const emiIds = emis.map(e => e.id);

    const journalEntries = await db.journalEntry.findMany({
      where: {
        OR: [
          { referenceId: { in: [...allLoanIds, ...emiIds] } },
          { lines: { some: { loanId: { in: allLoanIds } } } }
        ]
      }
    });
    const jeIds = journalEntries.map(j => j.id);

    if (jeIds.length > 0) {
      await db.journalEntryLine.deleteMany({ where: { journalEntryId: { in: jeIds } } });
      await db.journalEntry.deleteMany({ where: { id: { in: jeIds } } });
      console.log(`- Deleted ${jeIds.length} Journal Entries & associated lines.`);
    }

    const cbDelete = await db.cashBookEntry.deleteMany({ where: { referenceId: { in: [...allLoanIds, ...emiIds] } } });
    console.log(`- Deleted ${cbDelete.count} CashBook Entries.`);

    const bankDelete = await db.bankTransaction.deleteMany({ where: { referenceId: { in: [...allLoanIds, ...emiIds] } } });
    console.log(`- Deleted ${bankDelete.count} Bank Transactions.`);

    const creditDelete = await db.creditTransaction.deleteMany({
      where: {
        OR: [
          { loanApplicationId: { in: allLoanIds } },
          { sourceId: { in: allLoanIds } }
        ]
      }
    });
    console.log(`- Deleted ${creditDelete.count} Credit Transactions.`);

    const actionDelete = await db.actionLog.deleteMany({
      where: {
        OR: [
          { recordId: { in: [...allLoanIds, ...emiIds] } },
          { userId: { in: createdIds.users } }
        ]
      }
    });
    console.log(`- Deleted ${actionDelete.count} Action Logs.`);

    await db.goldLoanDetail.deleteMany({ where: { offlineLoanId: { in: allLoanIds } } });
    await db.vehicleLoanDetail.deleteMany({ where: { offlineLoanId: { in: allLoanIds } } });
    console.log('- Deleted associated Gold and Vehicle loan details.');

    if (mirrorMappings.length > 0) {
      await db.mirrorLoanMapping.deleteMany({ where: { id: { in: mirrorMappings.map(m => m.id) } } });
      console.log(`- Deleted ${mirrorMappings.length} Mirror Loan Mappings.`);
    }

    if (emiIds.length > 0) {
      await db.offlineLoanEMI.deleteMany({ where: { id: { in: emiIds } } });
      console.log(`- Deleted ${emiIds.length} Offline Loan EMIs.`);
    }

    if (allLoanIds.length > 0) {
      await db.offlineLoan.deleteMany({ where: { id: { in: allLoanIds } } });
      console.log(`- Deleted ${allLoanIds.length} Offline Loans.`);
    }

    if (createdIds.users.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdIds.users } } });
      console.log(`- Deleted ${createdIds.users.length} temporary Users.`);
    }

    console.log('======================================================================');
    console.log('✅ DATABASE CLEANUP COMPLETED');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
