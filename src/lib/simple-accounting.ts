/**
 * Simple Accounting Helper
 * Direct database operations for cashbook and bank transactions
 * Also creates journal entries for double-entry bookkeeping
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
  loanCompanyId: string; // Company that owns the loan (for non-mirror loans)
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
  mirrorInterest?: number;
  mirrorCompanyId?: string;
  
  // NEW: Flag to indicate if this is a mirror loan payment
  // When true, payment goes to mirror company's books
  isMirrorPayment?: boolean;
}

/**
 * Record EMI payment accounting entries
 * 
 * Rules:
 * 1. Personal Credit (CASH only) → Company 3 Cashbook + Journal Entry
 * 2. Company Credit ONLINE → Loan Company's Bank Account + Journal Entry
 * 3. Company Credit CASH → Loan Company's Cashbook + Journal Entry
 * 
 * MIRROR LOAN RULES (when hasMirrorLoan=true and mirrorCompanyId is provided):
 * - Payment goes to MIRROR COMPANY's books (not original loan company)
 * - Original loan company (Company 3) only keeps the record for customer viewing
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
  // DETERMINE TARGET COMPANY FOR PAYMENT
  // ============================================
  // If this loan has a mirror, payment goes to MIRROR COMPANY's books
  // NOT the original loan company (Company 3)
  const targetCompanyId = (isMirrorPayment && mirrorCompanyId) ? mirrorCompanyId : loanCompanyId;
  console.log(`[Accounting] Payment Target: ${isMirrorPayment ? 'MIRROR' : 'ORIGINAL'} Company - ${targetCompanyId}`);

  // ============================================
  // PERSONAL CREDIT - Always Company 3 Cashbook
  // ============================================
  if (creditType === 'PERSONAL') {
    // Personal credit always goes to Company 3 cashbook (CASH only)
    // But for mirror loans, Company 3 is the ORIGINAL company (record keeping)
    // Actual money is in Mirror Company's bank/cashbook
    
    // For mirror loans, personal credit payment goes to Mirror Company's cashbook
    const personalCreditCompanyId = (isMirrorPayment && mirrorCompanyId) ? mirrorCompanyId : company3Id;
    
    result.cashBookEntry = await recordCashBookEntry({
      companyId: personalCreditCompanyId,
      entryType: 'CREDIT',
      amount,
      description: `${description} [Personal Credit${isMirrorPayment ? ' - Mirror' : ''}]`,
      referenceType: 'EMI_PAYMENT_PERSONAL',
      referenceId: paymentId,
      createdById: userId
    });
    
    // Create journal entry in target company's books
    try {
      const accountingService = new AccountingService(personalCreditCompanyId);
      await accountingService.initializeChartOfAccounts();
      
      result.journalEntryId = await accountingService.createJournalEntry({
        entryDate: new Date(),
        referenceType: 'EMI_PAYMENT',
        referenceId: paymentId,
        narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Personal Credit${isMirrorPayment ? ' - Mirror' : ''})`,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH_ACCOUNT,
            debitAmount: amount,
            creditAmount: 0,
            loanId,
            customerId,
            narration: 'Cash received for EMI'
          },
          {
            accountCode: ACCOUNT_CODES.LOAN_PRINCIPAL,
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
  // COMPANY CREDIT - Goes to TARGET COMPANY's books
  // ============================================
  
  // ONLINE payment → Bank Account of target company + Journal Entry
  if (paymentMode === 'ONLINE' || paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER') {
    result.bankTransaction = await recordBankTransaction({
      companyId: targetCompanyId,
      transactionType: 'CREDIT',
      amount,
      description: `${description} [Company Credit - ${paymentMode}${isMirrorPayment ? ' - Mirror' : ''}]`,
      referenceType: 'EMI_PAYMENT_ONLINE',
      referenceId: paymentId,
      createdById: userId
    });
    
    // Create journal entry in target company's books
    try {
      const accountingService = new AccountingService(targetCompanyId);
      await accountingService.initializeChartOfAccounts();
      
      const bankAccountId = await getDefaultBankAccount(targetCompanyId);
      
      result.journalEntryId = await accountingService.createJournalEntry({
        entryDate: new Date(),
        referenceType: 'EMI_PAYMENT',
        referenceId: paymentId,
        narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Company Credit - ${paymentMode}${isMirrorPayment ? ' - Mirror' : ''})`,
        lines: [
          {
            accountCode: ACCOUNT_CODES.BANK_ACCOUNT,
            debitAmount: amount,
            creditAmount: 0,
            loanId,
            customerId,
            narration: 'Bank received for EMI'
          },
          {
            accountCode: ACCOUNT_CODES.LOAN_PRINCIPAL,
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
        paymentMode,
        bankAccountId: bankAccountId || undefined
      });
    } catch (journalError) {
      console.error('Failed to create journal entry for company credit EMI:', journalError);
    }
  }
  
  // CASH payment → Cashbook of target company + Journal Entry
  if (paymentMode === 'CASH' || paymentMode === 'CHEQUE') {
    result.cashBookEntry = await recordCashBookEntry({
      companyId: targetCompanyId,
      entryType: 'CREDIT',
      amount,
      description: `${description} [Company Credit - ${paymentMode}${isMirrorPayment ? ' - Mirror' : ''}]`,
      referenceType: 'EMI_PAYMENT_CASH',
      referenceId: paymentId,
      createdById: userId
    });
    
    // Create journal entry in target company's books
    try {
      const accountingService = new AccountingService(targetCompanyId);
      await accountingService.initializeChartOfAccounts();
      
      result.journalEntryId = await accountingService.createJournalEntry({
        entryDate: new Date(),
        referenceType: 'EMI_PAYMENT',
        referenceId: paymentId,
        narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Company Credit - ${paymentMode}${isMirrorPayment ? ' - Mirror' : ''})`,
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH_ACCOUNT,
            debitAmount: amount,
            creditAmount: 0,
            loanId,
            customerId,
            narration: 'Cash received for EMI'
          },
          {
            accountCode: ACCOUNT_CODES.LOAN_PRINCIPAL,
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
  }

  // ============================================
  // MIRROR LOAN SYNC ACCOUNTING
  // Note: This section should NOT create duplicate entries
  // The payment is already recorded in mirror company's books above
  // This section is for additional tracking/adjustments only
  // ============================================
  if (mirrorLoanId && mirrorCompanyId && mirrorPrincipal !== undefined && mirrorInterest !== undefined && !isMirrorPayment) {
    // Only do this for non-mirror payments (original loan paying)
    // This tracks the mirror loan's portion separately
    const mirrorTotal = mirrorPrincipal + mirrorInterest;
    const mirrorDescription = `Mirror EMI #${installmentNumber} Sync - ${loanNumber} - (P: ₹${mirrorPrincipal}, I: ₹${mirrorInterest})`;
    
    console.log(`[Accounting] Mirror sync - NOT recording duplicate entry. Mirror loan EMI already synced in mirror company.`);
    console.log(`[Accounting] Mirror totals for reference: Principal ₹${mirrorPrincipal}, Interest ₹${mirrorInterest}`);
    
    // NOTE: We do NOT create another bank/cash entry here
    // The payment is already recorded in mirror company's books (targetCompanyId)
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
