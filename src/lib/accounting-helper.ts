// ============================================
// COMPREHENSIVE ACCOUNTING HELPER
// Wires ALL transactions to Daybook
// ============================================

import { db } from './db';

// ============================================
// ACCOUNT HEAD CODES
// ============================================
export const ACCOUNT_CODES = {
  // ASSETS
  LOAN_RECEIVABLE: 'ASSET-LOAN-001',
  BANK_ACCOUNT: 'ASSET-BANK-001',
  CASH_IN_HAND: 'ASSET-CASH-001',
  INVEST_RECEIVABLE: 'ASSET-INV-001',
  
  // INCOME
  INTEREST_INCOME: 'INC-INT-001',
  PROCESSING_FEE: 'INC-PROC-001',
  PENALTY_INCOME: 'INC-PEN-001',
  OTHER_INCOME: 'INC-OTH-001',
  
  // EXPENSE
  GENERAL_EXPENSE: 'EXP-GEN-001',
  STAFF_EXPENSE: 'EXP-STAFF-001',
  BANK_CHARGES: 'EXP-BANK-001',
  
  // LIABILITY
  BORROWED_MONEY: 'LIAB-BORR-001',
  
  // EQUITY
  OWNER_CAPITAL: 'EQUITY-001',
  INVEST_MONEY: 'EQUITY-INV-001',
};

// ============================================
// ENSURE ACCOUNT HEAD EXISTS
// ============================================
export async function ensureAccountHead(
  companyId: string,
  code: string,
  name: string,
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY'
) {
  let accountHead = await db.accountHead.findFirst({
    where: { companyId, headCode: code }
  });
  
  if (!accountHead) {
    accountHead = await db.accountHead.create({
      data: {
        companyId,
        headCode: code,
        headName: name,
        headType: type,
        isSystemHead: true,
        isActive: true
      }
    });
  }
  
  return accountHead;
}

// ============================================
// CREATE DAYBOOK ENTRY
// ============================================
export async function createDaybookEntry(params: {
  companyId: string;
  entryDate: Date;
  accountHeadId: string;
  accountHeadName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  particular: string;
  referenceType: string;
  referenceId?: string;
  debit: number;
  credit: number;
  sourceType: string;
  sourceId?: string;
  loanNo?: string;
  customerName?: string;
  paymentMode?: string;
  createdById: string;
}) {
  // Generate entry number
  const lastEntry = await db.daybookEntry.findFirst({
    where: { companyId: params.companyId },
    orderBy: { createdAt: 'desc' }
  });
  
  const entryNumber = lastEntry 
    ? `DB-${String(parseInt(lastEntry.entryNumber.split('-')[1] || '0') + 1).padStart(6, '0')}`
    : 'DB-000001';
  
  const entry = await db.daybookEntry.create({
    data: {
      companyId: params.companyId,
      entryNumber,
      entryDate: params.entryDate,
      accountHeadId: params.accountHeadId,
      accountHeadName: params.accountHeadName,
      accountType: params.accountType,
      particular: params.particular,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      debit: params.debit,
      credit: params.credit,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    }
  });
  
  // Update account head balance
  await db.accountHead.update({
    where: { id: params.accountHeadId },
    data: {
      currentBalance: {
        increment: params.debit - params.credit
      }
    }
  });
  
  return entry;
}

// ============================================
// RECORD LOAN DISBURSEMENT (Online)
// ============================================
export async function recordLoanDisbursement(params: {
  companyId: string;
  loanId: string;
  loanNo: string;
  customerName: string;
  amount: number;
  processingFee: number;
  paymentMode: string;
  bankAccountId?: string;
  createdById: string;
}) {
  const date = new Date();
  
  // 1. Ensure account heads exist
  const loanReceivableHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.LOAN_RECEIVABLE,
    'Loan Receivable',
    'ASSET'
  );
  
  const bankHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.BANK_ACCOUNT,
    'Bank Account',
    'ASSET'
  );
  
  const processingFeeHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.PROCESSING_FEE,
    'Processing Fee Income',
    'INCOME'
  );
  
  // 2. Create Daybook Entry for Loan Disbursement
  // DEBIT: Loan Receivable (Asset increases)
  // CREDIT: Bank (Asset decreases)
  
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: loanReceivableHead.id,
    accountHeadName: loanReceivableHead.headName,
    accountType: 'ASSET',
    particular: `Loan Disbursement - ${params.loanNo} - ${params.customerName}`,
    referenceType: 'LOAN_DISBURSEMENT',
    referenceId: params.loanId,
    debit: params.amount,
    credit: 0,
    sourceType: 'ONLINE_LOAN',
    sourceId: params.loanId,
    loanNo: params.loanNo,
    customerName: params.customerName,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  // 3. Create Daybook Entry for Bank Outflow
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: bankHead.id,
    accountHeadName: bankHead.headName,
    accountType: 'ASSET',
    particular: `Loan Disbursement - ${params.loanNo} - ${params.customerName}`,
    referenceType: 'LOAN_DISBURSEMENT',
    referenceId: params.loanId,
    debit: 0,
    credit: params.amount,
    sourceType: 'ONLINE_LOAN',
    sourceId: params.loanId,
    loanNo: params.loanNo,
    customerName: params.customerName,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  // 4. Record Processing Fee if applicable
  if (params.processingFee > 0) {
    // DEBIT: Bank (Asset increases)
    // CREDIT: Processing Fee Income (Income increases)
    
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: bankHead.id,
      accountHeadName: bankHead.headName,
      accountType: 'ASSET',
      particular: `Processing Fee - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'PROCESSING_FEE',
      referenceId: params.loanId,
      debit: params.processingFee,
      credit: 0,
      sourceType: 'ONLINE_LOAN',
      sourceId: params.loanId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
    
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: processingFeeHead.id,
      accountHeadName: processingFeeHead.headName,
      accountType: 'INCOME',
      particular: `Processing Fee - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'PROCESSING_FEE',
      referenceId: params.loanId,
      debit: 0,
      credit: params.processingFee,
      sourceType: 'ONLINE_LOAN',
      sourceId: params.loanId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  console.log(`[Accounting] Loan Disbursement recorded: ${params.loanNo} - ₹${params.amount}`);
}

// ============================================
// RECORD EMI PAYMENT (Online)
// ============================================
export async function recordEMIPayment(params: {
  companyId: string;
  loanId: string;
  emiId: string;
  loanNo: string;
  customerName: string;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount?: number;
  paymentMode: string;
  createdById: string;
}) {
  const date = new Date();
  
  // 1. Ensure account heads exist
  const loanReceivableHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.LOAN_RECEIVABLE,
    'Loan Receivable',
    'ASSET'
  );
  
  const bankHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.BANK_ACCOUNT,
    'Bank Account',
    'ASSET'
  );
  
  const interestHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.INTEREST_INCOME,
    'Interest Income',
    'INCOME'
  );
  
  const penaltyHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.PENALTY_INCOME,
    'Penalty Income',
    'INCOME'
  );
  
  const totalAmount = params.principalAmount + params.interestAmount + (params.penaltyAmount || 0);
  
  // 2. Create Daybook Entry for Bank Inflow
  // DEBIT: Bank (Asset increases)
  
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: bankHead.id,
    accountHeadName: bankHead.headName,
    accountType: 'ASSET',
    particular: `EMI Payment - ${params.loanNo} - ${params.customerName}`,
    referenceType: 'EMI_PAYMENT',
    referenceId: params.emiId,
    debit: totalAmount,
    credit: 0,
    sourceType: 'ONLINE_LOAN',
    sourceId: params.emiId,
    loanNo: params.loanNo,
    customerName: params.customerName,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  // 3. Reduce Loan Receivable (Principal)
  // CREDIT: Loan Receivable (Asset decreases)
  if (params.principalAmount > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: loanReceivableHead.id,
      accountHeadName: loanReceivableHead.headName,
      accountType: 'ASSET',
      particular: `Principal Repayment - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.emiId,
      debit: 0,
      credit: params.principalAmount,
      sourceType: 'ONLINE_LOAN',
      sourceId: params.emiId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  // 4. Record Interest Income
  // CREDIT: Interest Income (Income increases)
  if (params.interestAmount > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: interestHead.id,
      accountHeadName: interestHead.headName,
      accountType: 'INCOME',
      particular: `Interest Income - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.emiId,
      debit: 0,
      credit: params.interestAmount,
      sourceType: 'ONLINE_LOAN',
      sourceId: params.emiId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  // 5. Record Penalty Income if applicable
  if (params.penaltyAmount && params.penaltyAmount > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: penaltyHead.id,
      accountHeadName: penaltyHead.headName,
      accountType: 'INCOME',
      particular: `Penalty Income - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'PENALTY',
      referenceId: params.emiId,
      debit: 0,
      credit: params.penaltyAmount,
      sourceType: 'ONLINE_LOAN',
      sourceId: params.emiId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  console.log(`[Accounting] EMI Payment recorded: ${params.loanNo} - Principal: ₹${params.principalAmount}, Interest: ₹${params.interestAmount}`);
}

// ============================================
// RECORD OFFLINE LOAN DISBURSEMENT
// ============================================
export async function recordOfflineLoanDisbursement(params: {
  companyId: string;
  loanId: string;
  loanNo: string;
  customerName: string;
  amount: number;
  processingFee: number;
  paymentMode: string; // CASH, BANK_TRANSFER, BANK, UPI, ONLINE
  createdById: string;
  isMirrorLoan?: boolean; // Flag for mirror loans
}) {
  const date = new Date();
  
  // Determine if payment is via bank or cash
  const isBankPayment = params.paymentMode === 'BANK_TRANSFER' || 
                        params.paymentMode === 'BANK' || 
                        params.paymentMode === 'ONLINE' || 
                        params.paymentMode === 'UPI';
  
  // 1. Ensure account heads exist
  const loanReceivableHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.LOAN_RECEIVABLE,
    'Loan Receivable',
    'ASSET'
  );
  
  // Use BANK_ACCOUNT for bank payments, CASH_IN_HAND for cash payments
  const paymentAccountCode = isBankPayment ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;
  const paymentAccountName = isBankPayment ? 'Bank Account' : 'Cash in Hand';
  
  const paymentHead = await ensureAccountHead(
    params.companyId,
    paymentAccountCode,
    paymentAccountName,
    'ASSET'
  );
  
  const processingFeeHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.PROCESSING_FEE,
    'Processing Fee Income',
    'INCOME'
  );
  
  // 2. Create Daybook Entry for Loan Disbursement (DEBIT - Asset increases)
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: loanReceivableHead.id,
    accountHeadName: loanReceivableHead.headName,
    accountType: 'ASSET',
    particular: `${params.isMirrorLoan ? 'Mirror ' : ''}Loan Disbursement - ${params.loanNo} - ${params.customerName}`,
    referenceType: params.isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
    referenceId: params.loanId,
    debit: params.amount,
    credit: 0,
    sourceType: params.isMirrorLoan ? 'MIRROR_LOAN' : 'OFFLINE_LOAN',
    sourceId: params.loanId,
    loanNo: params.loanNo,
    customerName: params.customerName,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  // 3. Create Daybook Entry for Payment Outflow (CREDIT - Asset decreases)
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: paymentHead.id,
    accountHeadName: paymentHead.headName,
    accountType: 'ASSET',
    particular: `${params.isMirrorLoan ? 'Mirror ' : ''}Loan Disbursement - ${params.loanNo} - ${params.customerName} (${isBankPayment ? 'Bank' : 'Cash'})`,
    referenceType: params.isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
    referenceId: params.loanId,
    debit: 0,
    credit: params.amount,
    sourceType: params.isMirrorLoan ? 'MIRROR_LOAN' : 'OFFLINE_LOAN',
    sourceId: params.loanId,
    loanNo: params.loanNo,
    customerName: params.customerName,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  // 4. Record Processing Fee if applicable
  if (params.processingFee > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: paymentHead.id,
      accountHeadName: paymentHead.headName,
      accountType: 'ASSET',
      particular: `Processing Fee (${params.isMirrorLoan ? 'Mirror ' : 'Offline'}) - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'PROCESSING_FEE',
      referenceId: params.loanId,
      debit: params.processingFee,
      credit: 0,
      sourceType: params.isMirrorLoan ? 'MIRROR_LOAN' : 'OFFLINE_LOAN',
      sourceId: params.loanId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
    
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: processingFeeHead.id,
      accountHeadName: processingFeeHead.headName,
      accountType: 'INCOME',
      particular: `Processing Fee (${params.isMirrorLoan ? 'Mirror ' : 'Offline'}) - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'PROCESSING_FEE',
      referenceId: params.loanId,
      debit: 0,
      credit: params.processingFee,
      sourceType: params.isMirrorLoan ? 'MIRROR_LOAN' : 'OFFLINE_LOAN',
      sourceId: params.loanId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  console.log(`[Accounting] ${params.isMirrorLoan ? 'Mirror ' : ''}Loan Disbursement recorded: ${params.loanNo} - ₹${params.amount} via ${isBankPayment ? 'Bank' : 'Cash'}`);
}

// ============================================
// RECORD OFFLINE EMI PAYMENT
// ============================================
export async function recordOfflineEMIPayment(params: {
  companyId: string;
  loanId: string;
  emiId: string;
  loanNo: string;
  customerName: string;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount?: number;
  paymentMode: string;
  createdById: string;
}) {
  const date = new Date();
  
  // 1. Ensure account heads exist
  const loanReceivableHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.LOAN_RECEIVABLE,
    'Loan Receivable',
    'ASSET'
  );
  
  const cashHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.CASH_IN_HAND,
    'Cash in Hand',
    'ASSET'
  );
  
  const interestHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.INTEREST_INCOME,
    'Interest Income',
    'INCOME'
  );
  
  const penaltyHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.PENALTY_INCOME,
    'Penalty Income',
    'INCOME'
  );
  
  const totalAmount = params.principalAmount + params.interestAmount + (params.penaltyAmount || 0);
  
  // 2. Create Daybook Entry for Cash Inflow
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: cashHead.id,
    accountHeadName: cashHead.headName,
    accountType: 'ASSET',
    particular: `Offline EMI Payment - ${params.loanNo} - ${params.customerName}`,
    referenceType: 'EMI_PAYMENT',
    referenceId: params.emiId,
    debit: totalAmount,
    credit: 0,
    sourceType: 'OFFLINE_LOAN',
    sourceId: params.emiId,
    loanNo: params.loanNo,
    customerName: params.customerName,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  // 3. Reduce Loan Receivable (Principal)
  if (params.principalAmount > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: loanReceivableHead.id,
      accountHeadName: loanReceivableHead.headName,
      accountType: 'ASSET',
      particular: `Principal Repayment (Offline) - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.emiId,
      debit: 0,
      credit: params.principalAmount,
      sourceType: 'OFFLINE_LOAN',
      sourceId: params.emiId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  // 4. Record Interest Income
  if (params.interestAmount > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: interestHead.id,
      accountHeadName: interestHead.headName,
      accountType: 'INCOME',
      particular: `Interest Income (Offline) - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.emiId,
      debit: 0,
      credit: params.interestAmount,
      sourceType: 'OFFLINE_LOAN',
      sourceId: params.emiId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  // 5. Record Penalty Income if applicable
  if (params.penaltyAmount && params.penaltyAmount > 0) {
    await createDaybookEntry({
      companyId: params.companyId,
      entryDate: date,
      accountHeadId: penaltyHead.id,
      accountHeadName: penaltyHead.headName,
      accountType: 'INCOME',
      particular: `Penalty Income (Offline) - ${params.loanNo} - ${params.customerName}`,
      referenceType: 'PENALTY',
      referenceId: params.emiId,
      debit: 0,
      credit: params.penaltyAmount,
      sourceType: 'OFFLINE_LOAN',
      sourceId: params.emiId,
      loanNo: params.loanNo,
      customerName: params.customerName,
      paymentMode: params.paymentMode,
      createdById: params.createdById
    });
  }
  
  console.log(`[Accounting] Offline EMI Payment recorded: ${params.loanNo} - Principal: ₹${params.principalAmount}, Interest: ₹${params.interestAmount}`);
}

// ============================================
// RECORD EXPENSE
// ============================================
export async function recordExpense(params: {
  companyId: string;
  expenseId: string;
  expenseType: string;
  description: string;
  amount: number;
  paymentMode: string;
  createdById: string;
}) {
  const date = new Date();
  
  // 1. Ensure expense account head exists
  const expenseHead = await ensureAccountHead(
    params.companyId,
    `${ACCOUNT_CODES.GENERAL_EXPENSE}-${params.expenseType.toUpperCase().replace(/\s+/g, '-')}`,
    params.expenseType,
    'EXPENSE'
  );
  
  // 2. Ensure bank/cash account head exists
  const bankHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.BANK_ACCOUNT,
    'Bank Account',
    'ASSET'
  );
  
  const cashHead = await ensureAccountHead(
    params.companyId,
    ACCOUNT_CODES.CASH_IN_HAND,
    'Cash in Hand',
    'ASSET'
  );
  
  const paymentAccountHead = params.paymentMode === 'CASH' ? cashHead : bankHead;
  
  // 3. Create Daybook Entry for Expense
  // DEBIT: Expense (Expense increases)
  // CREDIT: Bank/Cash (Asset decreases)
  
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: expenseHead.id,
    accountHeadName: expenseHead.headName,
    accountType: 'EXPENSE',
    particular: `${params.expenseType} - ${params.description}`,
    referenceType: 'EXPENSE',
    referenceId: params.expenseId,
    debit: params.amount,
    credit: 0,
    sourceType: 'MANUAL_EXPENSE',
    sourceId: params.expenseId,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  await createDaybookEntry({
    companyId: params.companyId,
    entryDate: date,
    accountHeadId: paymentAccountHead.id,
    accountHeadName: paymentAccountHead.headName,
    accountType: 'ASSET',
    particular: `${params.expenseType} - ${params.description}`,
    referenceType: 'EXPENSE',
    referenceId: params.expenseId,
    debit: 0,
    credit: params.amount,
    sourceType: 'MANUAL_EXPENSE',
    sourceId: params.expenseId,
    paymentMode: params.paymentMode,
    createdById: params.createdById
  });
  
  console.log(`[Accounting] Expense recorded: ${params.expenseType} - ₹${params.amount}`);
}

// ============================================
// SYNC EXISTING TRANSACTIONS
// ============================================
export async function syncExistingTransactions(companyId: string) {
  console.log(`[Accounting Sync] Starting sync for company: ${companyId}`);
  
  let syncedCount = 0;
  
  // 1. Sync Online Loan Disbursements
  const onlineLoans = await db.loanApplication.findMany({
    where: { 
      companyId,
      status: 'DISBURSED' 
    },
    include: {
      sessionForm: true,
      emiSchedules: true
    }
  });
  
  for (const loan of onlineLoans) {
    // Check if already synced
    const existingEntry = await db.daybookEntry.findFirst({
      where: { 
        referenceId: loan.id, 
        referenceType: 'LOAN_DISBURSEMENT',
        sourceType: 'ONLINE_LOAN'
      }
    });
    
    if (!existingEntry && loan.sessionForm) {
      await recordLoanDisbursement({
        companyId,
        loanId: loan.id,
        loanNo: loan.applicationNo,
        customerName: `${loan.firstName || ''} ${loan.lastName || ''}`.trim(),
        amount: loan.sessionForm.approvedAmount || loan.requestedAmount,
        processingFee: loan.sessionForm.processingFee || 0,
        paymentMode: 'BANK_TRANSFER',
        createdById: loan.disbursedById || 'system'
      });
      syncedCount++;
    }
  }
  
  // 2. Sync Online EMI Payments
  const onlinePayments = await db.payment.findMany({
    where: {
      loanApplication: { companyId },
      status: 'COMPLETED'
    },
    include: {
      loanApplication: {
        include: { sessionForm: true }
      },
      emiSchedule: true
    }
  });
  
  for (const payment of onlinePayments) {
    // Check if already synced
    const existingEntry = await db.daybookEntry.findFirst({
      where: { 
        referenceId: payment.id, 
        referenceType: 'EMI_PAYMENT',
        sourceType: 'ONLINE_LOAN'
      }
    });
    
    if (!existingEntry && payment.loanApplication) {
      await recordEMIPayment({
        companyId,
        loanId: payment.loanApplicationId,
        emiId: payment.emiScheduleId || '',
        loanNo: payment.loanApplication.applicationNo,
        customerName: `${payment.loanApplication.firstName || ''} ${payment.loanApplication.lastName || ''}`.trim(),
        principalAmount: payment.principalComponent || 0,
        interestAmount: payment.interestComponent || 0,
        penaltyAmount: payment.penaltyComponent || 0,
        paymentMode: payment.paymentMode || 'CASH',
        createdById: payment.paidById || 'system'
      });
      syncedCount++;
    }
  }
  
  // 3. Sync Offline Loans
  // ============================================
  // IMPORTANT: Skip mirror loans - their accounting goes to MIRROR company
  // - Skip loans where isMirrorLoan = true (these are mirror loans)
  // - Skip loans that have a mirror mapping as original loan (accounting in mirror company)
  // ============================================
  const offlineLoans = await db.offlineLoan.findMany({
    where: { companyId }
  });
  
  for (const loan of offlineLoans) {
    // SKIP: This is a mirror loan - accounting should be in mirror company
    if (loan.isMirrorLoan) {
      console.log(`[Accounting Sync] Skipping mirror loan ${loan.loanNumber} - accounting in mirror company`);
      continue;
    }
    
    // SKIP: This is an original loan with a mirror mapping - accounting in mirror company
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { 
        originalLoanId: loan.id,
        isOfflineLoan: true 
      }
    });
    
    if (mirrorMapping) {
      console.log(`[Accounting Sync] Skipping original loan ${loan.loanNumber} with mirror mapping - accounting in mirror company ${mirrorMapping.mirrorCompanyId}`);
      continue;
    }
    
    // Check if already synced
    const existingEntry = await db.daybookEntry.findFirst({
      where: { 
        referenceId: loan.id, 
        referenceType: 'LOAN_DISBURSEMENT',
        sourceType: 'OFFLINE_LOAN'
      }
    });
    
    if (!existingEntry) {
      await recordOfflineLoanDisbursement({
        companyId,
        loanId: loan.id,
        loanNo: loan.loanNumber,
        customerName: loan.customerName,
        amount: loan.loanAmount,
        processingFee: 0,
        paymentMode: 'CASH',
        createdById: loan.createdById || 'system'
      });
      syncedCount++;
    }
  }
  
  // 4. Sync Offline EMI Payments
  // ============================================
  // IMPORTANT: Skip EMI payments for mirror loans - accounting goes to MIRROR company
  // ============================================
  const offlineEMIs = await db.offlineLoanEMI.findMany({
    where: {
      offlineLoan: { companyId },
      paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] }
    },
    include: {
      offlineLoan: true
    }
  });
  
  for (const emi of offlineEMIs) {
    // SKIP: This EMI belongs to a mirror loan - accounting in mirror company
    if (emi.offlineLoan?.isMirrorLoan) {
      console.log(`[Accounting Sync] Skipping EMI #${emi.installmentNumber} for mirror loan ${emi.offlineLoan.loanNumber} - accounting in mirror company`);
      continue;
    }
    
    // SKIP: This EMI belongs to an original loan with mirror mapping - accounting in mirror company
    if (emi.offlineLoan) {
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { 
          originalLoanId: emi.offlineLoanId,
          isOfflineLoan: true 
        }
      });
      
      if (mirrorMapping) {
        console.log(`[Accounting Sync] Skipping EMI #${emi.installmentNumber} for original loan ${emi.offlineLoan.loanNumber} with mirror mapping - accounting in mirror company`);
        continue;
      }
    }
    
    // Check if already synced
    const existingEntry = await db.daybookEntry.findFirst({
      where: { 
        referenceId: emi.id, 
        referenceType: 'EMI_PAYMENT',
        sourceType: 'OFFLINE_LOAN'
      }
    });
    
    if (!existingEntry && emi.offlineLoan) {
      await recordOfflineEMIPayment({
        companyId,
        loanId: emi.offlineLoanId,
        emiId: emi.id,
        loanNo: emi.offlineLoan.loanNumber,
        customerName: emi.offlineLoan.customerName,
        principalAmount: emi.paidPrincipal || 0,
        interestAmount: emi.paidInterest || 0,
        penaltyAmount: emi.penaltyPaid || 0,
        paymentMode: emi.paymentMode || 'CASH',
        createdById: emi.collectedById || 'system'
      });
      syncedCount++;
    }
  }
  
  // 5. Sync Expenses
  const expenses = await db.expense.findMany({
    where: { companyId }
  });
  
  for (const expense of expenses) {
    // Check if already synced
    const existingEntry = await db.daybookEntry.findFirst({
      where: { 
        referenceId: expense.id, 
        referenceType: 'EXPENSE'
      }
    });
    
    if (!existingEntry) {
      await recordExpense({
        companyId,
        expenseId: expense.id,
        expenseType: expense.expenseType,
        description: expense.description || '',
        amount: expense.amount,
        paymentMode: expense.paymentMode || 'CASH',
        createdById: expense.createdById || 'system'
      });
      syncedCount++;
    }
  }
  
  // 6. Sync Journal Entries to Daybook
  const journalEntries = await db.journalEntry.findMany({
    where: { companyId },
    include: {
      lines: {
        include: {
          account: {
            select: { accountName: true, accountType: true }
          }
        }
      }
    }
  });
  
  for (const je of journalEntries) {
    // Check if already synced
    const existingEntry = await db.daybookEntry.findFirst({
      where: { 
        referenceId: je.id, 
        referenceType: 'JOURNAL_ENTRY'
      }
    });
    
    if (!existingEntry) {
      // Create daybook entries for each journal entry line
      for (const line of je.lines) {
        await createDaybookEntry({
          companyId,
          entryDate: je.entryDate,
          accountHeadId: line.accountId,
          accountHeadName: line.account?.accountName || 'Unknown',
          accountType: (line.account?.accountType as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY') || 'ASSET',
          particular: je.narration || `Journal Entry ${je.entryNumber}`,
          referenceType: 'JOURNAL_ENTRY',
          referenceId: je.id,
          debit: line.debitAmount,
          credit: line.creditAmount,
          sourceType: je.referenceType || 'MANUAL_ENTRY',
          sourceId: line.loanId || undefined,
          loanNo: undefined,
          customerName: undefined,
          paymentMode: je.paymentMode || undefined,
          createdById: je.createdById
        });
      }
      syncedCount++;
    }
  }
  
  console.log(`[Accounting Sync] Completed. Synced ${syncedCount} transactions`);
  
  return { syncedCount };
}
