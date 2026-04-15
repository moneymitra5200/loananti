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
 * IDEMPOTENCY: If a DEBIT entry for the same referenceId already exists, skip to prevent double-deduction
 */
export async function recordCashBookEntry(params: CashbookEntryParams): Promise<{ success: boolean; cashBookId: string; newBalance: number }> {
  const { companyId, entryType, amount, description, referenceType, referenceId, createdById } = params;

  // Get or create cashbook
  const cashBookId = await getOrCreateCashBook(companyId);

  // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────
  // Prevent duplicate DEBIT entries for the same loan/disbursement referenceId
  if (referenceId && entryType === 'DEBIT') {
    const existing = await db.cashBookEntry.findFirst({
      where: {
        cashBookId,
        referenceId,
        referenceType,
        entryType: 'DEBIT',
      },
    });
    if (existing) {
      console.warn(`[CashBook] DUPLICATE DEBIT BLOCKED — referenceId: ${referenceId}, type: ${referenceType}. Returning existing balance.`);
      const cashBook = await db.cashBook.findUnique({ where: { id: cashBookId } });
      return { success: true, cashBookId, newBalance: cashBook?.currentBalance || 0 };
    }
  }

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
  // First try the explicitly marked default bank
  const defaultBank = await db.bankAccount.findFirst({
    where: { companyId, isDefault: true, isActive: true }
  });
  if (defaultBank) return defaultBank.id;

  // Fallback: get ANY active bank account for the company
  // (this handles the case where a bank exists but isDefault was not checked)
  const anyBank = await db.bankAccount.findFirst({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'asc' }
  });
  return anyBank?.id || null;
}

/**
 * Record a bank transaction
 * IDEMPOTENCY: If a DEBIT transaction for the same referenceId already exists, skip it.
 */
export async function recordBankTransaction(params: BankEntryParams): Promise<{ success: boolean; bankAccountId: string; newBalance: number }> {
  const { companyId, bankAccountId, transactionType, amount, description, referenceType, referenceId, createdById } = params;

  // Get bank account
  let targetBankId: string | undefined = bankAccountId;
  if (!targetBankId) {
    targetBankId = await getDefaultBankAccount(companyId) || undefined;
  }

  if (!targetBankId) {
    // No bank account configured – fall back to CashBook so money is not lost
    console.warn(`[Bank] No bank account found for company ${companyId}. Falling back to CashBook.`);
    const cashResult = await recordCashBookEntry({
      companyId,
      entryType: transactionType === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      amount,
      description: `[Bank Fallback] ${description}`,
      referenceType,
      referenceId,
      createdById,
    });
    return { success: true, bankAccountId: 'CASHBOOK', newBalance: cashResult.newBalance };
  }

  // ── IDEMPOTENCY CHECK ─────────────────────────────────────────────
  // Prevent duplicate DEBIT transactions for the same referenceId
  if (referenceId && transactionType === 'DEBIT') {
    const existing = await db.bankTransaction.findFirst({
      where: { bankAccountId: targetBankId, referenceId, referenceType, transactionType: 'DEBIT' },
      select: { id: true, balanceAfter: true },
    });
    if (existing) {
      console.warn(`[Bank] DUPLICATE DEBIT BLOCKED — referenceId: ${referenceId}, type: ${referenceType}`);
      const bank = await db.bankAccount.findUnique({ where: { id: targetBankId }, select: { currentBalance: true } });
      return { success: true, bankAccountId: targetBankId, newBalance: bank?.currentBalance || 0 };
    }
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
    const effectiveMirrorPrincipal = mirrorPrincipal ?? 0;
    const fullMirrorEMITotal = effectiveMirrorPrincipal + mirrorInterest;

    // ALWAYS use the actual amount passed (session delta) as the record amount.
    // This handles both:
    //   - PARTIAL: user pays ₹130 of ₹1,200 EMI → record ₹130
    //   - FULL/remaining: user pays ₹1,070 remaining after ₹130 partial → record ₹1,070 (not ₹1,200)
    // Interest-first split within the session amount.
    let recordAmount    = Math.round(Math.min(amount, fullMirrorEMITotal) * 100) / 100;
    // Apply interest-first to split the session amount into I + P
    let recordInterest  = Math.round(Math.min(recordAmount, mirrorInterest) * 100) / 100;
    let recordPrincipal = Math.round(Math.max(0, recordAmount - recordInterest) * 100) / 100;
    console.log(`[Accounting] MIRROR EMI ${paymentType} (interest-first): ₹${recordAmount} → I:₹${recordInterest} P:₹${recordPrincipal} (Mirror Total: ₹${fullMirrorEMITotal})`);

    console.log(`[Accounting] Payment Mode: ${paymentMode} → ${paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI' ? 'BANK ACCOUNT' : 'CASH BOOK'}`);

    // ONLINE/BANK_TRANSFER/UPI payments go to Bank Account
    if (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') {
      result.bankTransaction = await recordBankTransaction({
        companyId: mirrorCompanyId,
        transactionType: 'CREDIT',
        amount: recordAmount,
        description: `MIRROR EMI RECEIPT (Online) - ${loanNumber} - EMI #${installmentNumber} (P:₹${recordPrincipal} + I:₹${recordInterest})${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}`,
        referenceType: 'MIRROR_EMI_PAYMENT',
        referenceId: paymentId,
        createdById: userId
      });
      console.log(`[Accounting] MIRROR: Recorded ₹${recordAmount} in Mirror Company BANK ACCOUNT`);
    } else {
      // CASH/CHEQUE payments go to Cash Book
      result.cashBookEntry = await recordCashBookEntry({
        companyId: mirrorCompanyId,
        entryType: 'CREDIT',
        amount: recordAmount,
        description: `MIRROR EMI RECEIPT (Cash) - ${loanNumber} - EMI #${installmentNumber} (P:₹${recordPrincipal} + I:₹${recordInterest})${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}`,
        referenceType: 'MIRROR_EMI_PAYMENT',
        referenceId: paymentId,
        createdById: userId
      });
      console.log(`[Accounting] MIRROR: Recorded ₹${recordAmount} in Mirror Company CASH BOOK`);
    }
    
    // Double-entry journal for Mirror Company:
    //   Dr  Cash/Bank                = actual paid amount (recordAmount)
    //   Cr  Interest Income          = proportional mirror interest
    //   Cr  Loans Receivable         = proportional mirror principal

    // Declared outside try so the catch block can log them for diagnostics
    const debitAccountCode = (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') 
      ? ACCOUNT_CODES.BANK_ACCOUNT 
      : ACCOUNT_CODES.CASH_IN_HAND;

    // ── DIRECT DB JOURNAL — bypasses AccountingService entirely to avoid silent failures ──
    try {
      // Ensure chart of accounts exists for mirror company
      const { AccountingService: AccSvcForInit } = await import('@/lib/accounting-service');
      const accSvcInit = new AccSvcForInit(mirrorCompanyId);
      await accSvcInit.initializeChartOfAccounts();

      // Check for duplicate (idempotency)
      const existingJE = await db.journalEntry.findFirst({
        where: { companyId: mirrorCompanyId, referenceId: paymentId, referenceType: 'MIRROR_EMI_PAYMENT', isReversed: false },
        select: { id: true },
      });

      if (existingJE) {
        result.journalEntryId = existingJE.id;
        console.log(`[Accounting] ✅ MIRROR: Journal already exists (${existingJE.id}) — skipping duplicate`);
      } else {
        // Fetch account IDs directly from DB (no cache dependency)
        const accountCodes = [debitAccountCode, '4110', '1200'];
        const accounts = await db.chartOfAccount.findMany({
          where: { companyId: mirrorCompanyId, accountCode: { in: accountCodes } },
          select: { id: true, accountCode: true },
        });
        const accMap = new Map(accounts.map(a => [a.accountCode, a.id]));

        const debitAccId = accMap.get(debitAccountCode);
        const interestAccId = accMap.get('4110');
        const loanAccId = accMap.get('1200');

        if (!debitAccId || !interestAccId) {
          throw new Error(`Missing chart of accounts for mirror company ${mirrorCompanyId}: debit=${debitAccId}, interest=${interestAccId}`);
        }

        // Count existing entries for entry number
        const jeCount = await db.journalEntry.count({ where: { companyId: mirrorCompanyId } });
        const entryNumber = `JE${String(jeCount + 1).padStart(6, '0')}`;

        // Get or create financial year
        const now = new Date();
        const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fyName = `FY ${fyYear}-${fyYear + 1}`;
        let fy = await db.financialYear.findFirst({ where: { companyId: mirrorCompanyId, name: fyName } });
        if (!fy) {
          fy = await db.financialYear.create({
            data: { companyId: mirrorCompanyId, name: fyName, startDate: new Date(fyYear, 3, 1), endDate: new Date(fyYear + 1, 2, 31), isClosed: false },
          });
        }

        // Build journal lines using ACTUAL paid amounts (recordAmount/recordPrincipal/recordInterest)
        const directLines: any[] = [
          { accountId: debitAccId, debitAmount: recordAmount, creditAmount: 0, loanId: loanId || null, customerId: customerId || null,
            narration: (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI')
              ? `Bank received - Mirror EMI #${installmentNumber}${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}`
              : `Cash received - Mirror EMI #${installmentNumber}${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}` },
          { accountId: interestAccId, debitAmount: 0, creditAmount: recordInterest, loanId: loanId || null, customerId: customerId || null,
            narration: `Mirror interest income - EMI #${installmentNumber}${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}` },
        ];
        if (recordPrincipal > 0 && loanAccId) {
          directLines.push({ accountId: loanAccId, debitAmount: 0, creditAmount: recordPrincipal, loanId: loanId || null, customerId: customerId || null,
            narration: `Mirror principal repayment - EMI #${installmentNumber}${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}` });
        }

        const je = await db.journalEntry.create({
          data: {
            companyId: mirrorCompanyId,
            entryNumber,
            entryDate: now,
            referenceType: 'MIRROR_EMI_PAYMENT',
            referenceId: paymentId,
            narration: `Mirror Loan EMI #${installmentNumber} - ${loanNumber} - ₹${recordAmount} (P:₹${recordPrincipal} + I:₹${recordInterest}) [${paymentMode}]${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}`,
            totalDebit: recordAmount,
            totalCredit: recordInterest + recordPrincipal,
            isAutoEntry: true,
            isApproved: true,
            createdById: userId || 'SYSTEM',
            paymentMode: paymentMode || 'CASH',
            lines: { create: directLines },
          },
        });

        result.journalEntryId = je.id;

        // Update account balances with ACTUAL paid amounts
        await db.chartOfAccount.update({ where: { id: debitAccId }, data: { currentBalance: { increment: recordAmount } } });
        await db.chartOfAccount.update({ where: { id: interestAccId }, data: { currentBalance: { increment: recordInterest } } });
        if (recordPrincipal > 0 && loanAccId) {
          await db.chartOfAccount.update({ where: { id: loanAccId }, data: { currentBalance: { decrement: recordPrincipal } } });
        }

        console.log(`[Accounting] ✅ MIRROR: Journal entry ${je.id} created — Dr ${debitAccountCode} ₹${recordAmount}, Cr 4110 ₹${recordInterest}, Cr 1200 ₹${recordPrincipal}${paymentType === 'PARTIAL' ? ' [PARTIAL PAYMENT]' : ''}`);
      }
    } catch (journalError: any) {
      console.error('[Accounting] ❌ MIRROR EMI journal FAILED (direct DB write also failed):', {
        message: journalError?.message,
        code: journalError?.code,
        mirrorCompanyId, paymentId, fullMirrorEMITotal, mirrorInterest, effectiveMirrorPrincipal,
      });
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
    
    // Create journal entry (always balanced)
    try {
      const accountingService = new AccountingService(company3Id);
      await accountingService.initializeChartOfAccounts();

      // Build balanced credit lines
      const personalCreditLines: { accountCode: string; debitAmount: number; creditAmount: number; loanId?: string; customerId?: string; narration: string }[] = [];
      if (principalComponent > 0) {
        personalCreditLines.push({ accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: principalComponent, loanId, customerId, narration: 'Principal repayment' });
      }
      const personalInterestAdj = Math.max(0, interestComponent + Math.round((amount - principalComponent - interestComponent) * 100) / 100);
      if (personalInterestAdj > 0) {
        personalCreditLines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: personalInterestAdj, loanId, customerId, narration: 'Interest income' });
      }
      if (personalCreditLines.length === 0) {
        personalCreditLines.push({ accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: amount, loanId, customerId, narration: 'EMI repayment' });
      }
      // Final balance check
      const personalCreditSum = personalCreditLines.reduce((s, l) => s + l.creditAmount, 0);
      const personalDiff = Math.round((amount - personalCreditSum) * 100) / 100;
      if (Math.abs(personalDiff) > 0.001) personalCreditLines[personalCreditLines.length - 1].creditAmount += personalDiff;
      
      result.journalEntryId = await accountingService.createJournalEntry({
        entryDate: new Date(),
        referenceType: 'EMI_PAYMENT',
        referenceId: paymentId,
        narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Personal Credit)`,
        lines: [
          { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debitAmount: amount, creditAmount: 0, loanId, customerId, narration: 'Cash received for EMI' },
          ...personalCreditLines,
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
  
  // Create journal entry (always balanced)
  try {
    const accountingService = new AccountingService(targetCompanyId);
    await accountingService.initializeChartOfAccounts();
    
    // Use Bank Account code for ONLINE payments, Cash for CASH payments
    const debitAccountCode = (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') 
      ? ACCOUNT_CODES.BANK_ACCOUNT 
      : ACCOUNT_CODES.CASH_IN_HAND;

    // Build balanced credit lines
    const companyCreditLines: { accountCode: string; debitAmount: number; creditAmount: number; loanId?: string; customerId?: string; narration: string }[] = [];
    if (principalComponent > 0) {
      companyCreditLines.push({ accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: principalComponent, loanId, customerId, narration: 'Principal repayment' });
    }
    const companyInterestAdj = Math.max(0, interestComponent + Math.round((amount - principalComponent - interestComponent) * 100) / 100);
    if (companyInterestAdj > 0) {
      companyCreditLines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: companyInterestAdj, loanId, customerId, narration: 'Interest income' });
    }
    if (companyCreditLines.length === 0) {
      companyCreditLines.push({ accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: amount, loanId, customerId, narration: 'EMI repayment' });
    }
    // Final balance check
    const companyCreditSum = companyCreditLines.reduce((s, l) => s + l.creditAmount, 0);
    const companyDiff = Math.round((amount - companyCreditSum) * 100) / 100;
    if (Math.abs(companyDiff) > 0.001) companyCreditLines[companyCreditLines.length - 1].creditAmount += companyDiff;
    
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
        ...companyCreditLines,
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
