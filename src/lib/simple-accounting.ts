/**
 * Simple Accounting Helper
 * Direct database operations for cashbook transactions
 * Also creates journal entries for double-entry bookkeeping
 * 
 * MIRROR LOAN LOGIC:
 * - Mirror Loan EMI → Only record MIRROR INTEREST as income (no deductions)
 * - Company 3 loans → Separate from main accounting portal
 * 
 * IMPORTANT: ALL payments go to CASH BOOK only (no bank account)
 * Extra EMI and secondary payments are PURE PROFIT for Company 3
 */

import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from './accounting-service';

// ============================================
// TYPES
// ============================================

export interface CashbookEntryParams {
  companyId: string;
  entryType: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceType: string;
  referenceId?: string;
  createdById: string;
}

export interface BankEntryParams {
  companyId: string;
  bankAccountId?: string;
  transactionType: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceType: string;
  referenceId?: string;
  createdById: string;
}

// ============================================
// CASHBOOK OPERATIONS
// ============================================

/**
 * Get or create cashbook for a company
 */
export async function getOrCreateCashBook(companyId: string): Promise<string> {
  let cashBook = await db.cashBook.findUnique({
    where: { companyId }
  });

  if (!cashBook) {
    cashBook = await db.cashBook.create({
      data: {
        companyId,
        currentBalance: 0
      }
    });
  }

  return cashBook.id;
}

/**
 * Record a cashbook entry
 */
export async function recordCashBookEntry(params: CashbookEntryParams): Promise<{ success: boolean; cashBookId: string; newBalance: number }> {
  const { companyId, entryType, amount, description, referenceType, referenceId, createdById } = params;

  // Get or create cashbook
  const cashBookId = await getOrCreateCashBook(companyId);

  // Get current balance
  const cashBook = await db.cashBook.findUnique({
    where: { id: cashBookId }
  });

  if (!cashBook) {
    throw new Error('CashBook not found');
  }

  // Calculate new balance
  const currentBalance = cashBook.currentBalance || 0;
  const newBalance = entryType === 'CREDIT' 
    ? currentBalance + amount 
    : currentBalance - amount;

  // Create entry and update balance in transaction
  await db.$transaction([
    db.cashBookEntry.create({
      data: {
        cashBookId,
        entryType,
        amount,
        balanceAfter: newBalance,
        description,
        referenceType,
        referenceId,
        createdById
      }
    }),
    db.cashBook.update({
      where: { id: cashBookId },
      data: {
        currentBalance: newBalance,
        lastUpdatedById: createdById,
        lastUpdatedAt: new Date()
      }
    })
  ]);

  console.log(`[CashBook] ${entryType} ₹${amount} - ${description} - Company: ${companyId} - New Balance: ₹${newBalance}`);

  return { success: true, cashBookId, newBalance };
}

// ============================================
// BANK OPERATIONS
// ============================================

/**
 * Get company's default bank account
 */
export async function getDefaultBankAccount(companyId: string): Promise<string | null> {
  const bankAccount = await db.bankAccount.findFirst({
    where: { companyId, isDefault: true, isActive: true }
  });

  return bankAccount?.id || null;
}

/**
 * Record a bank transaction
 */
export async function recordBankTransaction(params: BankEntryParams): Promise<{ success: boolean; bankAccountId: string; newBalance: number }> {
  const { companyId, bankAccountId, transactionType, amount, description, referenceType, referenceId, createdById } = params;

  // Get bank account
  let targetBankId: string | undefined = bankAccountId;
  if (!targetBankId) {
    targetBankId = await getDefaultBankAccount(companyId) || undefined;
  }

  if (!targetBankId) {
    // Create default bank account if none exists
    const newBank = await db.bankAccount.create({
      data: {
        companyId,
        bankName: 'Default Bank Account',
        accountNumber: `${companyId.slice(0, 8).toUpperCase()}-001`,
        accountName: 'Operating Account',
        accountType: 'CURRENT',
        openingBalance: 0,
        currentBalance: 0,
        isDefault: true,
        isActive: true
      }
    });
    targetBankId = newBank.id;
  }

  // Get current balance
  const bankAccount = await db.bankAccount.findUnique({
    where: { id: targetBankId }
  });

  if (!bankAccount) {
    throw new Error('Bank account not found');
  }

  // Calculate new balance
  const currentBalance = bankAccount.currentBalance || 0;
  const newBalance = transactionType === 'CREDIT' 
    ? currentBalance + amount 
    : currentBalance - amount;

  // Create transaction and update balance
  await db.$transaction([
    db.bankTransaction.create({
      data: {
        bankAccountId: targetBankId,
        transactionType,
        amount,
        balanceAfter: newBalance,
        description,
        referenceType,
        referenceId,
        createdById
      }
    }),
    db.bankAccount.update({
      where: { id: targetBankId },
      data: { currentBalance: newBalance }
    })
  ]);

  console.log(`[Bank] ${transactionType} ₹${amount} - ${description} - Company: ${companyId} - New Balance: ₹${newBalance}`);

  return { success: true, bankAccountId: targetBankId, newBalance };
}

// ============================================
// EMI PAYMENT ACCOUNTING
// ============================================

export interface EMIPaymentAccountingParams {
  // Payment details
  amount: number;
  principalComponent: number;
  interestComponent: number;
  paymentMode: 'CASH' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  paymentType: 'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'ADVANCE';
  
  // Credit types
  creditType: 'PERSONAL' | 'COMPANY';
  
  // Company and loan info
  loanCompanyId: string; // Company that owns the loan
  company3Id: string; // Company 3 ID for personal credit
  
  // References
  loanId: string;
  emiId: string;
  paymentId: string;
  loanNumber: string;
  installmentNumber: number;
  
  // User
  userId: string;
  
  // Customer
  customerId?: string;
  
  // Mirror loan info (if applicable)
  mirrorLoanId?: string;
  mirrorPrincipal?: number;
  mirrorInterest?: number;  // This is the MIRROR interest - record this as income
  mirrorCompanyId?: string;
  
  // Flag to indicate if this is a mirror loan payment
  isMirrorPayment?: boolean;
}

/**
 * Record EMI payment accounting entries
 * 
 * ============================================
 * MIRROR LOAN RULES (SIMPLIFIED):
 * ============================================
 * 
 * When Mirror Loan EMI is paid:
 * - Record ONLY the MIRROR INTEREST as income in Mirror Company
 * - NO deductions, NO profit calculations
 * - Example: Mirror Interest ₹112 → Record ₹112 as Interest Income
 * 
 * Company 3 loans:
 * - NOT recorded in main accounting portal
 * - Separate system for "fully profitable loans" from case book
 * 
 * ============================================
 */
export async function recordEMIPaymentAccounting(params: EMIPaymentAccountingParams): Promise<{
  cashBookEntry?: { success: boolean; cashBookId: string; newBalance: number };
  bankTransaction?: { success: boolean; bankAccountId: string; newBalance: number };
  journalEntryId?: string;
}> {
  const {
    amount,
    principalComponent,
    interestComponent,
    paymentMode,
    paymentType,
    creditType,
    loanCompanyId,
    company3Id,
    loanId,
    emiId,
    paymentId,
    loanNumber,
    installmentNumber,
    userId,
    customerId,
    mirrorLoanId,
    mirrorPrincipal,
    mirrorInterest,
    mirrorCompanyId,
    isMirrorPayment = false
  } = params;

  const result: {
    cashBookEntry?: { success: boolean; cashBookId: string; newBalance: number };
    bankTransaction?: { success: boolean; bankAccountId: string; newBalance: number };
    journalEntryId?: string;
  } = {};

  const description = `EMI #${installmentNumber} Payment - ${loanNumber} - ${paymentType} (P: ₹${principalComponent}, I: ₹${interestComponent})`;

  // ============================================
  // MIRROR LOAN PAYMENT - SIMPLE LOGIC
  // ============================================
  // For mirror loans, record ONLY the mirror interest as income
  // NO deductions, NO profit calculations
  // ONLINE payments go to Bank Account, CASH payments go to Cash Book
  // ============================================
  
  if (isMirrorPayment && mirrorCompanyId && mirrorInterest !== undefined) {
    console.log(`[Accounting] MIRROR LOAN EMI Payment - Recording ONLY mirror interest: ₹${mirrorInterest}`);
    console.log(`[Accounting] Payment Mode: ${paymentMode} → ${paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' ? 'BANK ACCOUNT' : 'CASH BOOK'}`);
    
    // ONLINE/BANK_TRANSFER payments go to Bank Account
    if (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') {
      result.bankTransaction = await recordBankTransaction({
        companyId: mirrorCompanyId,
        transactionType: 'CREDIT',
        amount: mirrorInterest,  // ONLY mirror interest
        description: `MIRROR INTEREST INCOME (Online) - ${loanNumber} - EMI #${installmentNumber}`,
        referenceType: 'MIRROR_INTEREST_INCOME',
        referenceId: paymentId,
        createdById: userId
      });
      console.log(`[Accounting] MIRROR: Recorded ₹${mirrorInterest} in Mirror Company BANK ACCOUNT`);
    } else {
      // CASH payments go to Cash Book
      result.cashBookEntry = await recordCashBookEntry({
        companyId: mirrorCompanyId,
        entryType: 'CREDIT',
        amount: mirrorInterest,  // ONLY mirror interest
        description: `MIRROR INTEREST INCOME (Cash) - ${loanNumber} - EMI #${installmentNumber}`,
        referenceType: 'MIRROR_INTEREST_INCOME',
        referenceId: paymentId,
        createdById: userId
      });
      console.log(`[Accounting] MIRROR: Recorded ₹${mirrorInterest} in Mirror Company CASH BOOK`);
    }
    
    // Create journal entry for Mirror Company - ONLY mirror interest
    try {
      const accountingService = new AccountingService(mirrorCompanyId);
      await accountingService.initializeChartOfAccounts();
      
      // Use Bank Account code for ONLINE payments, Cash for CASH payments
      const debitAccountCode = (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') 
        ? ACCOUNT_CODES.BANK_ACCOUNT 
        : ACCOUNT_CODES.CASH_IN_HAND;
      
      result.journalEntryId = await accountingService.createJournalEntry({
        entryDate: new Date(),
        referenceType: 'MIRROR_EMI_PAYMENT',
        referenceId: paymentId,
        narration: `Mirror Loan EMI #${installmentNumber} - ${loanNumber} - Interest Income: ₹${mirrorInterest} (${paymentMode})`,
        lines: [
          {
            accountCode: debitAccountCode,
            debitAmount: mirrorInterest,  // ONLY mirror interest
            creditAmount: 0,
            loanId,
            customerId,
            narration: paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI' 
              ? 'Bank received for mirror interest' 
              : 'Cash received for mirror interest'
          },
          {
            accountCode: ACCOUNT_CODES.INTEREST_INCOME,
            debitAmount: 0,
            creditAmount: mirrorInterest,  // ONLY mirror interest as income
            loanId,
            customerId,
            narration: 'Mirror interest income'
          }
        ],
        createdById: userId,
        paymentMode
      });
      
      console.log(`[Accounting] MIRROR: Journal entry created for ₹${mirrorInterest} as Interest Income in Mirror Company ${mirrorCompanyId}`);
    } catch (journalError) {
      console.error('Failed to create journal entry for mirror EMI:', journalError);
    }
    
    return result;
  }

  // ============================================
  // REGULAR (NON-MIRROR) LOAN PAYMENT
  // ============================================
  
  // Determine target company for payment
  const targetCompanyId = loanCompanyId;
  console.log(`[Accounting] REGULAR EMI Payment - Company: ${targetCompanyId}`);

  // ============================================
  // PERSONAL CREDIT - Cash payment
  // ============================================
  if (creditType === 'PERSONAL') {
    result.cashBookEntry = await recordCashBookEntry({
      companyId: company3Id,
      entryType: 'CREDIT',
      amount,
      description: `${description} [Personal Credit]`,
      referenceType: 'EMI_PAYMENT_PERSONAL',
      referenceId: paymentId,
      createdById: userId
    });
    
    // Create journal entry
    try {
      const accountingService = new AccountingService(company3Id);
      await accountingService.initializeChartOfAccounts();
      
      result.journalEntryId = await accountingService.createJournalEntry({
        entryDate: new Date(),
        referenceType: 'EMI_PAYMENT',
        referenceId: paymentId,
        narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Personal Credit)`,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH_IN_HAND,
            debitAmount: amount,
            creditAmount: 0,
            loanId,
            customerId,
            narration: 'Cash received for EMI'
          },
          {
            accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
            debitAmount: 0,
            creditAmount: principalComponent,
            loanId,
            customerId,
            narration: 'Principal repayment'
          },
          {
            accountCode: ACCOUNT_CODES.INTEREST_INCOME,
            debitAmount: 0,
            creditAmount: interestComponent,
            loanId,
            customerId,
            narration: 'Interest income'
          }
        ],
        createdById: userId,
        paymentMode: 'CASH'
      });
    } catch (journalError) {
      console.error('Failed to create journal entry for personal credit EMI:', journalError);
    }
    
    return result;
  }

  // ============================================
  // COMPANY CREDIT - ONLINE goes to BANK, CASH goes to CASH BOOK
  // ============================================
  // ONLINE/BANK_TRANSFER/UPI payments go to Bank Account
  // CASH payments go to Cash Book
  // Extra EMI and secondary payments are PURE PROFIT for Company 3
  // ============================================
  
  // ONLINE/BANK_TRANSFER payments go to Bank Account
  if (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') {
    result.bankTransaction = await recordBankTransaction({
      companyId: targetCompanyId,
      transactionType: 'CREDIT',
      amount,
      description: `${description} [Company Credit - ${paymentMode}]`,
      referenceType: 'EMI_PAYMENT',
      referenceId: paymentId,
      createdById: userId
    });
    console.log(`[Accounting] Company Credit EMI recorded in BANK ACCOUNT: ₹${amount}`);
  } else {
    // CASH payments go to Cash Book
    result.cashBookEntry = await recordCashBookEntry({
      companyId: targetCompanyId,
      entryType: 'CREDIT',
      amount,
      description: `${description} [Company Credit - ${paymentMode}]`,
      referenceType: 'EMI_PAYMENT',
      referenceId: paymentId,
      createdById: userId
    });
    console.log(`[Accounting] Company Credit EMI recorded in CASH BOOK: ₹${amount}`);
  }
  
  // Create journal entry
  try {
    const accountingService = new AccountingService(targetCompanyId);
    await accountingService.initializeChartOfAccounts();
    
    // Use Bank Account code for ONLINE payments, Cash for CASH payments
    const debitAccountCode = (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') 
      ? ACCOUNT_CODES.BANK_ACCOUNT 
      : ACCOUNT_CODES.CASH_IN_HAND;
    
    result.journalEntryId = await accountingService.createJournalEntry({
      entryDate: new Date(),
      referenceType: 'EMI_PAYMENT',
      referenceId: paymentId,
      narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Company Credit - ${paymentMode})`,
      lines: [
        {
          accountCode: debitAccountCode,
          debitAmount: amount,
          creditAmount: 0,
          loanId,
          customerId,
          narration: paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI'
            ? 'Bank received for EMI'
            : 'Cash received for EMI'
        },
        {
          accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
          debitAmount: 0,
          creditAmount: principalComponent,
          loanId,
          customerId,
          narration: 'Principal repayment'
        },
        {
          accountCode: ACCOUNT_CODES.INTEREST_INCOME,
          debitAmount: 0,
          creditAmount: interestComponent,
          loanId,
          customerId,
          narration: 'Interest income'
        }
      ],
      createdById: userId,
      paymentMode
    });
  } catch (journalError) {
    console.error('Failed to create journal entry for company credit EMI:', journalError);
  }

  return result;
}

// ============================================
// GET COMPANY 3 ID
// ============================================

/**
 * Get Company 3 ID (the company with code 'C3' or the third company)
 */
export async function getCompany3Id(): Promise<string | null> {
  // First try to find by code C3
  const companyByCode = await db.company.findFirst({
    where: { code: 'C3' }
  });
  
  if (companyByCode) {
    return companyByCode.id;
  }
  
  // Otherwise get the third company (by creation order)
  const companies = await db.company.findMany({
    orderBy: { createdAt: 'asc' },
    take: 3
  });
  
  if (companies.length >= 3) {
    return companies[2].id;
  }
  
  return null;
}

// ============================================
// MIRROR LOAN INTEREST RECORDING
// ============================================

/**
 * Record Mirror Loan Interest Income
 * 
 * SIMPLE LOGIC:
 * - Record the FULL mirror interest as income in Mirror Company
 * - NO deductions, NO profit calculations
 * 
 * @param params - Mirror interest details
 */
export async function recordMirrorInterestIncome(params: {
  mirrorCompanyId: string;
  loanNumber: string;
  installmentNumber: number;
  mirrorInterest: number;
  paymentId: string;
  loanId: string;
  customerId?: string;
  paymentMode: string;
  userId: string;
}): Promise<{ success: boolean; journalEntryId?: string }> {
  const {
    mirrorCompanyId,
    loanNumber,
    installmentNumber,
    mirrorInterest,
    paymentId,
    loanId,
    customerId,
    paymentMode,
    userId
  } = params;

  console.log(`[Mirror Interest] Recording ₹${mirrorInterest} as Interest Income for ${loanNumber} EMI #${installmentNumber}`);

  try {
    // Create journal entry - ONLY mirror interest as income
    const accountingService = new AccountingService(mirrorCompanyId);
    await accountingService.initializeChartOfAccounts();
    
    const journalEntryId = await accountingService.createJournalEntry({
      entryDate: new Date(),
      referenceType: 'MIRROR_INTEREST_INCOME',
      referenceId: paymentId,
      narration: `Mirror Interest - ${loanNumber} EMI #${installmentNumber} - ₹${mirrorInterest}`,
      lines: [
        {
          accountCode: ACCOUNT_CODES.CASH_IN_HAND,
          debitAmount: mirrorInterest,
          creditAmount: 0,
          loanId,
          customerId,
          narration: 'Cash received'
        },
        {
          accountCode: ACCOUNT_CODES.INTEREST_INCOME,
          debitAmount: 0,
          creditAmount: mirrorInterest,
          loanId,
          customerId,
          narration: 'Mirror interest income'
        }
      ],
      createdById: userId,
      paymentMode
    });

    console.log(`[Mirror Interest] ✓ Recorded ₹${mirrorInterest} as Interest Income`);
    
    return { success: true, journalEntryId };
  } catch (error) {
    console.error('[Mirror Interest] Failed to record:', error);
    return { success: false };
  }
}
