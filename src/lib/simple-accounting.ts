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
  // Prevent duplicate entries for the same referenceId.
  // Blocks BOTH debit AND credit duplicates to ensure entries
  // only fire once regardless of retries or manual triggers.
  if (referenceId) {
    const existing = await db.cashBookEntry.findFirst({
      where: {
        cashBookId,
        referenceId,
        referenceType,
        entryType,
      },
    });
    if (existing) {
      console.warn(`[CashBook] DUPLICATE ${entryType} BLOCKED — referenceId: ${referenceId}, type: ${referenceType}. Returning existing balance.`);
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
  // Prevent duplicate bank transactions for the same referenceId.
  // Blocks BOTH debit AND credit duplicates — status-driven accounting only.
  if (referenceId) {
    const existing = await db.bankTransaction.findFirst({
      where: { bankAccountId: targetBankId, referenceId, referenceType, transactionType },
      select: { id: true, balanceAfter: true },
    });
    if (existing) {
      console.warn(`[Bank] DUPLICATE ${transactionType} BLOCKED — referenceId: ${referenceId}, type: ${referenceType}`);
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

  // Split payment support (Cash portion → Cashbook, Online portion → Bank)
  isSplitPayment?: boolean;
  splitCashAmount?: number;   // cash portion (goes to Cashbook)
  splitOnlineAmount?: number; // online portion (goes to Bank)
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
    isMirrorPayment = false,
    isSplitPayment,
    splitCashAmount: splitCash,
    splitOnlineAmount: splitOnline,
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

    // ALWAYS use the actual mirror EMI amounts (mirrorPrincipal + mirrorInterest = session delta).
    // Do NOT cap by `amount` — that is the ORIGINAL loan's payment amount, which differs
    // from the mirror EMI amount when rates differ (e.g. original 24%, mirror 15%).
    //   FULL:    recordAmount = fullMirrorEMITotal (₹1,026.87), not capped to ₹1,000
    //   PARTIAL: recordAmount = what was actually paid on mirror, still from session delta
    let recordAmount    = Math.round(fullMirrorEMITotal * 100) / 100;
    // Interest-first split within the session amount.
    let recordInterest  = Math.round(Math.min(recordAmount, mirrorInterest) * 100) / 100;
    let recordPrincipal = Math.round(Math.max(0, recordAmount - recordInterest) * 100) / 100;
    console.log(`[Accounting] MIRROR EMI ${paymentType} (interest-first): ₹${recordAmount} → I:₹${recordInterest} P:₹${recordPrincipal} (fullMirrorEMITotal: ₹${fullMirrorEMITotal}, originalLoanAmount: ₹${amount})`);

    // ── SPLIT PAYMENT SUPPORT ────────────────────────────────────────────────
    // For split payments, the proportional mirror amounts are:
    //   cashPortion   → Mirror Cashbook
    //   onlinePortion → Mirror Bank Account
    // We split the mirror recordAmount proportionally to the original split ratio.
    const isSplit = !!isSplitPayment;
    const rawSplitCash   = splitCash;
    const rawSplitOnline = splitOnline;

    if (isSplit && rawSplitCash !== undefined && rawSplitOnline !== undefined) {
      const splitTotal  = rawSplitCash + rawSplitOnline || 1;
      const cashRatio   = rawSplitCash   / splitTotal;
      const onlineRatio = rawSplitOnline / splitTotal;
      const mirrorCashPortion   = Math.round(recordAmount * cashRatio   * 100) / 100;
      const mirrorOnlinePortion = Math.round((recordAmount - mirrorCashPortion) * 100) / 100; // remainder avoids rounding drift

      console.log(`[Accounting] MIRROR SPLIT: total ₹${recordAmount} → Cash ₹${mirrorCashPortion} + Online ₹${mirrorOnlinePortion}`);

      // Cash portion → Cashbook
      if (mirrorCashPortion > 0) {
        result.cashBookEntry = await recordCashBookEntry({
          companyId: mirrorCompanyId,
          entryType: 'CREDIT',
          amount: mirrorCashPortion,
          description: `MIRROR EMI RECEIPT (Cash) - ${loanNumber} - EMI #${installmentNumber} [SPLIT: Cash ₹${mirrorCashPortion} + Online ₹${mirrorOnlinePortion}]${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}`,
          referenceType: 'MIRROR_EMI_PAYMENT',
          referenceId: paymentId,
          createdById: userId
        });
      }
      // Online portion → Bank
      if (mirrorOnlinePortion > 0) {
        result.bankTransaction = await recordBankTransaction({
          companyId: mirrorCompanyId,
          transactionType: 'CREDIT',
          amount: mirrorOnlinePortion,
          description: `MIRROR EMI RECEIPT (Online) - ${loanNumber} - EMI #${installmentNumber} [SPLIT: Cash ₹${mirrorCashPortion} + Online ₹${mirrorOnlinePortion}]${paymentType === 'PARTIAL' ? ' [PARTIAL]' : ''}`,
          referenceType: 'MIRROR_EMI_PAYMENT',
          referenceId: `${paymentId}-SPLIT-ONLINE`,
          createdById: userId
        });
      }
      console.log(`[Accounting] MIRROR SPLIT ✅: Cash ₹${mirrorCashPortion} → Cashbook, Online ₹${mirrorOnlinePortion} → Bank`);
    } else {
      // Non-split: route entire amount to bank (ONLINE) or cashbook (CASH)
      console.log(`[Accounting] Payment Mode: ${paymentMode} → ${paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI' ? 'BANK ACCOUNT' : 'CASH BOOK'}`);

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
    }
    
    // Double-entry journal for Mirror Company:
    //   SPLIT:  Dr Cash in Hand ₹cashPortion + Dr Bank Account ₹onlinePortion
    //   Single: Dr Cash or Dr Bank (full recordAmount)
    //   Cr  Interest Income   = proportional mirror interest
    //   Cr  Loans Receivable  = proportional mirror principal

    // For single-mode, determine debit account from paymentMode
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
        // Fetch ALL accounts needed (cash, bank, interest, loans) in one query
        const accountCodes = [ACCOUNT_CODES.CASH_IN_HAND, ACCOUNT_CODES.BANK_ACCOUNT, '4110', '1200'];
        const accounts = await db.chartOfAccount.findMany({
          where: { companyId: mirrorCompanyId, accountCode: { in: accountCodes } },
          select: { id: true, accountCode: true },
        });
        const accMap = new Map(accounts.map(a => [a.accountCode, a.id]));

        const cashAccId     = accMap.get(ACCOUNT_CODES.CASH_IN_HAND);
        const bankAccId     = accMap.get(ACCOUNT_CODES.BANK_ACCOUNT);
        const interestAccId = accMap.get('4110');
        const loanAccId     = accMap.get('1200');

        if (!interestAccId) {
          throw new Error(`Missing chart of accounts for mirror company ${mirrorCompanyId}: interest account 4110 not found`);
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

        const partialSuffix = paymentType === 'PARTIAL' ? ' [PARTIAL]' : '';

        // ── BUILD DEBIT LINES ────────────────────────────────────────────────────
        // SPLIT payments → two debit lines: Dr Cash + Dr Bank
        // Single-mode   → one debit line: Dr Cash or Dr Bank
        const directLines: any[] = [];

        if (isSplit && rawSplitCash !== undefined && rawSplitOnline !== undefined) {
          const splitTotal          = rawSplitCash + rawSplitOnline || 1;
          const mirrorCashPortion   = Math.round(recordAmount * (rawSplitCash   / splitTotal) * 100) / 100;
          const mirrorOnlinePortion = Math.round((recordAmount - mirrorCashPortion) * 100) / 100;

          if (mirrorCashPortion > 0 && cashAccId) {
            directLines.push({
              accountId: cashAccId,
              debitAmount: mirrorCashPortion, creditAmount: 0,
              loanId: loanId || null, customerId: customerId || null,
              narration: `Cash received - Mirror EMI #${installmentNumber} [SPLIT]${partialSuffix}`,
            });
          }
          if (mirrorOnlinePortion > 0 && bankAccId) {
            directLines.push({
              accountId: bankAccId,
              debitAmount: mirrorOnlinePortion, creditAmount: 0,
              loanId: loanId || null, customerId: customerId || null,
              narration: `Bank received - Mirror EMI #${installmentNumber} [SPLIT]${partialSuffix}`,
            });
          }
          console.log(`[Accounting] MIRROR SPLIT Journal debit lines: Dr Cash ₹${mirrorCashPortion} + Dr Bank ₹${mirrorOnlinePortion}`);
        } else {
          // Non-split: single debit line
          const singleDebitAccId = accMap.get(debitAccountCode);
          if (!singleDebitAccId) {
            throw new Error(`Missing chart of accounts for mirror company ${mirrorCompanyId}: debit account (${debitAccountCode}) not found`);
          }
          directLines.push({
            accountId: singleDebitAccId,
            debitAmount: recordAmount, creditAmount: 0,
            loanId: loanId || null, customerId: customerId || null,
            narration: (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI')
              ? `Bank received - Mirror EMI #${installmentNumber}${partialSuffix}`
              : `Cash received - Mirror EMI #${installmentNumber}${partialSuffix}`,
          });
        }

        // ── CREDIT LINES (same for split and single-mode) ────────────────────────
        directLines.push({
          accountId: interestAccId,
          debitAmount: 0, creditAmount: recordInterest,
          loanId: loanId || null, customerId: customerId || null,
          narration: `Mirror interest income - EMI #${installmentNumber}${partialSuffix}`,
        });
        if (recordPrincipal > 0 && loanAccId) {
          directLines.push({
            accountId: loanAccId,
            debitAmount: 0, creditAmount: recordPrincipal,
            loanId: loanId || null, customerId: customerId || null,
            narration: `Mirror principal repayment - EMI #${installmentNumber}${partialSuffix}`,
          });
        }

        const modeLabel = isSplit
          ? `SPLIT: Cash ₹${rawSplitCash} + Online ₹${rawSplitOnline}`
          : paymentMode;

        const je = await db.journalEntry.create({
          data: {
            companyId: mirrorCompanyId,
            entryNumber,
            entryDate: now,
            referenceType: 'MIRROR_EMI_PAYMENT',
            referenceId: paymentId,
            narration: `MIRROR LOAN EMI #${installmentNumber} - ${loanNumber} - ₹${recordAmount} (P:₹${recordPrincipal} + I:₹${recordInterest}) [${modeLabel}]${partialSuffix}`,
            totalDebit:  recordAmount,
            totalCredit: recordInterest + recordPrincipal,
            isAutoEntry: true,
            isApproved: true,
            createdById: userId || 'SYSTEM',
            paymentMode: isSplit ? 'SPLIT' : (paymentMode || 'CASH'),
            lines: { create: directLines },
          },
        });

        result.journalEntryId = je.id;

        // Update Chart of Account balances
        if (isSplit && rawSplitCash !== undefined && rawSplitOnline !== undefined) {
          const splitTotal          = rawSplitCash + rawSplitOnline || 1;
          const mirrorCashPortion   = Math.round(recordAmount * (rawSplitCash   / splitTotal) * 100) / 100;
          const mirrorOnlinePortion = Math.round((recordAmount - mirrorCashPortion) * 100) / 100;
          if (mirrorCashPortion   > 0 && cashAccId)
            await db.chartOfAccount.update({ where: { id: cashAccId },   data: { currentBalance: { increment: mirrorCashPortion   } } });
          if (mirrorOnlinePortion > 0 && bankAccId)
            await db.chartOfAccount.update({ where: { id: bankAccId },   data: { currentBalance: { increment: mirrorOnlinePortion } } });
        } else {
          const singleDebitAccId = accMap.get(debitAccountCode);
          if (singleDebitAccId)
            await db.chartOfAccount.update({ where: { id: singleDebitAccId }, data: { currentBalance: { increment: recordAmount } } });
        }
        await db.chartOfAccount.update({ where: { id: interestAccId }, data: { currentBalance: { increment: recordInterest } } });
        if (recordPrincipal > 0 && loanAccId)
          await db.chartOfAccount.update({ where: { id: loanAccId }, data: { currentBalance: { decrement: recordPrincipal } } });

        console.log(`[Accounting] ✅ MIRROR: Journal ${je.id} (${entryNumber}) [${modeLabel}] — Dr ₹${recordAmount} total | Cr Interest ₹${recordInterest} | Cr Principal ₹${recordPrincipal}${partialSuffix}`);
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
  // COMPANY CREDIT - ONLINE → BANK, CASH → CASHBOOK
  // Note: for SPLIT payments, the calling route already handled:
  //   - amount = splitCashAmount (cash portion only) → routes to Cashbook below
  //   - a separate recordBankTransaction for splitOnlineAmount
  // So here 'amount' is already the cash-only portion for splits.
  // We only need to fix the JOURNAL to show Dr Cash + Dr Bank instead of Dr Cash(full).
  // ============================================
  const isSplitMode = !!(isSplitPayment && splitCash && splitCash > 0 && splitOnline && splitOnline > 0);
  const splitCashAmt   = isSplitMode ? (splitCash   ?? 0) : 0;
  const splitOnlineAmt = isSplitMode ? (splitOnline ?? 0) : 0;

  // Record cashbook/bank (same pattern as offline route — called with cash-only amount)
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
    // CASH or SPLIT (cash portion only — caller routes online portion to bank separately)
    result.cashBookEntry = await recordCashBookEntry({
      companyId: targetCompanyId,
      entryType: 'CREDIT',
      amount,
      description: `${description} [Company Credit - ${paymentMode}${isSplitMode ? ` SPLIT Cash ₹${splitCashAmt}` : ''}]`,
      referenceType: 'EMI_PAYMENT',
      referenceId: paymentId,
      createdById: userId
    });
    console.log(`[Accounting] Company Credit EMI recorded in CASH BOOK: ₹${amount}`);
  }

  // ── JOURNAL ENTRY ────────────────────────────────────────────────────
  // CASH:   Dr Cash ₹amount        | Cr Loans + Cr Interest
  // ONLINE: Dr Bank ₹amount        | Cr Loans + Cr Interest
  // SPLIT:  Dr Cash ₹splitCash + Dr Bank ₹splitOnline | Cr Loans + Cr Interest
  //         (total debits = splitCash + splitOnline = full EMI amount)
  try {
    const accountingService = new AccountingService(targetCompanyId);
    await accountingService.initializeChartOfAccounts();

    // Build credit lines (same for all modes)
    const companyCreditLines: { accountCode: string; debitAmount: number; creditAmount: number; loanId?: string; customerId?: string; narration: string }[] = [];
    const totalForCredit = isSplitMode ? (splitCashAmt + splitOnlineAmt) : amount;
    if (principalComponent > 0) {
      companyCreditLines.push({ accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: principalComponent, loanId, customerId, narration: 'Principal repayment' });
    }
    const companyInterestAdj = Math.max(0, interestComponent + Math.round((totalForCredit - principalComponent - interestComponent) * 100) / 100);
    if (companyInterestAdj > 0) {
      companyCreditLines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: companyInterestAdj, loanId, customerId, narration: 'Interest income' });
    }
    if (companyCreditLines.length === 0) {
      companyCreditLines.push({ accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalForCredit, loanId, customerId, narration: 'EMI repayment' });
    }
    const companyCreditSum = companyCreditLines.reduce((s, l) => s + l.creditAmount, 0);
    const companyDiff = Math.round((totalForCredit - companyCreditSum) * 100) / 100;
    if (Math.abs(companyDiff) > 0.001) companyCreditLines[companyCreditLines.length - 1].creditAmount += companyDiff;

    // Build debit lines based on mode
    let debitLines: { accountCode: string; debitAmount: number; creditAmount: number; loanId?: string; customerId?: string; narration: string }[];
    let modeLabel: string;

    if (isSplitMode) {
      // SPLIT: Dr Cash (cash portion) + Dr Bank (online portion)
      modeLabel = `SPLIT: Cash ₹${splitCashAmt} + Online ₹${splitOnlineAmt}`;
      debitLines = [];
      if (splitCashAmt > 0)
        debitLines.push({ accountCode: ACCOUNT_CODES.CASH_IN_HAND, debitAmount: splitCashAmt, creditAmount: 0, loanId, customerId, narration: `Cash received [SPLIT ₹${splitCashAmt}]` });
      if (splitOnlineAmt > 0)
        debitLines.push({ accountCode: ACCOUNT_CODES.BANK_ACCOUNT, debitAmount: splitOnlineAmt, creditAmount: 0, loanId, customerId, narration: `Bank received [SPLIT ₹${splitOnlineAmt}]` });
    } else {
      const debitAccountCode = (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI')
        ? ACCOUNT_CODES.BANK_ACCOUNT
        : ACCOUNT_CODES.CASH_IN_HAND;
      modeLabel = paymentMode;
      debitLines = [{
        accountCode: debitAccountCode,
        debitAmount: amount, creditAmount: 0, loanId, customerId,
        narration: (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') ? 'Bank received for EMI' : 'Cash received for EMI',
      }];
    }

    result.journalEntryId = await accountingService.createJournalEntry({
      entryDate: new Date(),
      referenceType: 'EMI_PAYMENT',
      referenceId: paymentId,
      narration: `EMI Payment - ${loanNumber} #${installmentNumber} (Company Credit - ${modeLabel})`,
      lines: [...debitLines, ...companyCreditLines],
      createdById: userId,
      paymentMode: isSplitMode ? 'SPLIT' : paymentMode,
    });

    console.log(`[Accounting] ✅ Journal (${modeLabel}): Dr ₹${totalForCredit} | Cr Loans ₹${principalComponent} | Cr Interest ₹${companyInterestAdj}`);
  } catch (journalError) {
    console.error('[Accounting] ❌ Failed to create journal entry for company credit EMI:', journalError);
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

// ============================================
// PRINCIPAL-ONLY JOURNAL (Direct / Cache-Free)
// ============================================

/**
 * recordPrincipalOnlyJournal
 *
 * Creates the double-entry journal for a PRINCIPAL_ONLY EMI payment directly via
 * raw Prisma calls — NO AccountingService cache involved.
 *
 * This avoids the common silent-failure where AccountingService.initializedCompanies
 * was stale and account 5500 (Irrecoverable Debt) was not found in cache.
 *
 * Journal (all entries APPROVED):
 *   Dr  Cash / Bank (1101 / 1102)   = principalAmount     ← money received
 *   Cr  Loans Receivable (1200)     = principalAmount     ← loan balance reduced
 *   Dr  Irrecoverable Debt (5500)  = interestWrittenOff  ← interest lost (if > 0)
 *   Cr  Interest Income (4110)      = interestWrittenOff  ← recognised then written off (if > 0)
 *
 * Works for: offline loans, online loans, single loans, mirror loans.
 */
export async function recordPrincipalOnlyJournal(params: {
  companyId: string;
  company3Id?: string;
  creditType?: 'PERSONAL' | 'COMPANY';
  loanId: string;
  paymentId: string;       // used as referenceId (idempotency key)
  principalAmount: number;
  interestWrittenOff: number;
  paymentDate: Date;
  createdById: string;
  paymentMode: string;     // CASH | BANK_TRANSFER | UPI | CHEQUE …
  loanNumber: string;
  installmentNumber: number | string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  let {
    companyId, company3Id, creditType, loanId, paymentId, principalAmount, interestWrittenOff,
    paymentDate, createdById, paymentMode, loanNumber, installmentNumber,
  } = params;

  if (creditType === 'PERSONAL' && company3Id) {
    companyId = company3Id; // Route to Company 3 for personal credit
  }

  if (principalAmount <= 0) {
    return { success: false, error: 'principalAmount must be > 0' };
  }

  try {
    const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE']
      .includes((paymentMode || '').toUpperCase());

    const cashBankCode = isOnline ? '1102' : '1101';
    const cashBankName = isOnline ? 'Bank Account' : 'Cash in Hand';

    // ── 1. Upsert all required accounts ────────────────────────────────────────
    const accountDefs: Array<{ code: string; name: string; type: 'ASSET' | 'EXPENSE' | 'INCOME' }> = [
      { code: cashBankCode, name: cashBankName,         type: 'ASSET'   },
      { code: '1200',       name: 'Loans Receivable',   type: 'ASSET'   },
      ...(interestWrittenOff > 0 ? [
        { code: '5500', name: 'Irrecoverable Debt', type: 'EXPENSE' as const },
        { code: '4110', name: 'Interest Income',     type: 'INCOME'  as const },
      ] : []),
    ];

    const accountIdMap: Record<string, string> = {};
    for (const acct of accountDefs) {
      const record = await db.chartOfAccount.upsert({
        where: { companyId_accountCode: { companyId, accountCode: acct.code } },
        create: {
          companyId,
          accountCode: acct.code,
          accountName: acct.name,
          accountType: acct.type,
          isSystemAccount: true,
          description: acct.code === '5500'
            ? 'Interest written off when only principal is collected (Principal-Only payment)'
            : undefined,
          openingBalance: 0,
          currentBalance: 0,
        },
        update: {},
        select: { id: true },
      });
      accountIdMap[acct.code] = record.id;
    }

    // ── 2. Idempotency: skip if journal already exists for this paymentId ──────
    const existing = await db.journalEntry.findFirst({
      where: { companyId, referenceType: 'PRINCIPAL_ONLY_PAYMENT', referenceId: paymentId },
      select: { id: true },
    });
    if (existing) {
      console.log(`[PrincipalOnly] Idempotency: journal for ${paymentId} already exists — skipping`);
      return { success: true, journalEntryId: existing.id };
    }

    // ── 3. Unique entry number ─────────────────────────────────────────────────
    const entryCount = await db.journalEntry.count({ where: { companyId } });
    const entryNumber = `JE${String(entryCount + 1).padStart(6, '0')}`;

    // ── 4. Build lines ─────────────────────────────────────────────────────────
    const writeOff = interestWrittenOff > 0 ? interestWrittenOff : 0;
    const lineData: Array<{
      accountId: string; debitAmount: number; creditAmount: number; narration: string; loanId: string;
    }> = [
      { accountId: accountIdMap[cashBankCode], debitAmount: principalAmount, creditAmount: 0,
        narration: `Principal received via ${paymentMode}`, loanId },
      { accountId: accountIdMap['1200'],       debitAmount: 0, creditAmount: principalAmount,
        narration: 'Principal repayment — loan balance reduced', loanId },
      ...(writeOff > 0 ? [
        { accountId: accountIdMap['5500'], debitAmount: writeOff, creditAmount: 0,
          narration: 'Interest written off as irrecoverable debt', loanId },
        { accountId: accountIdMap['4110'], debitAmount: 0, creditAmount: writeOff,
          narration: 'Interest income — waived and written off', loanId },
      ] : []),
    ];

    // ── 5. Create journal entry ────────────────────────────────────────────────
    const journal = await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate:     paymentDate,
        referenceType: 'PRINCIPAL_ONLY_PAYMENT',
        referenceId:   paymentId,
        narration:     `Principal-Only EMI #${installmentNumber} — ${loanNumber} | P:₹${principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} collected, I:₹${writeOff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} written off`,
        totalDebit:    principalAmount + writeOff,
        totalCredit:   principalAmount + writeOff,
        isAutoEntry:   true,
        isApproved:    true,
        createdById,
        paymentMode,
        lines: { create: lineData },
      },
      select: { id: true },
    });

    // ── 6. Update currentBalance on accounts ───────────────────────────────────
    await db.chartOfAccount.update({
      where: { id: accountIdMap[cashBankCode] },
      data: { currentBalance: { increment: principalAmount } },
    });
    await db.chartOfAccount.update({
      where: { id: accountIdMap['1200'] },
      data: { currentBalance: { decrement: principalAmount } },
    });
    if (writeOff > 0) {
      await db.chartOfAccount.update({
        where: { id: accountIdMap['5500'] },
        data: { currentBalance: { increment: writeOff } },
      });
      await db.chartOfAccount.update({
        where: { id: accountIdMap['4110'] },
        data: { currentBalance: { increment: writeOff } },
      });
    }

    // ── 7. Update CashBook or BankAccount tables (actual balance tracking) ───────
    // This ensures the CashBook/BankAccount tables stay in sync with ChartOfAccount
    if (isOnline) {
      // Find the company's active bank account and update its balance
      const bankAcc = await db.bankAccount.findFirst({
        where: { companyId, isActive: true },
        select: { id: true, currentBalance: true },
      });
      if (bankAcc) {
        const newBalance = (bankAcc.currentBalance || 0) + principalAmount;
        await db.bankAccount.update({
          where: { id: bankAcc.id },
          data: { currentBalance: newBalance },
        });
        // Create bank transaction record for audit trail
        await db.bankTransaction.create({
          data: {
            bankAccountId: bankAcc.id,
            transactionType: 'CREDIT',
            amount: principalAmount,
            balanceAfter: newBalance,
            description: `Principal-Only EMI #${installmentNumber} — ${loanNumber} (I:₹${writeOff} written off)`,
            referenceType: 'PRINCIPAL_ONLY_PAYMENT',
            referenceId: paymentId,
            createdById,
          },
        });
        console.log(`[PrincipalOnly] ✅ Bank Account updated: +₹${principalAmount} → Balance: ₹${newBalance}`);
      }
    } else {
      // Find or create the company's cash book and update its balance
      let cashBook = await db.cashBook.findUnique({
        where: { companyId },
        select: { id: true, currentBalance: true },
      });
      if (!cashBook) {
        cashBook = await db.cashBook.create({
          data: { companyId, currentBalance: 0 },
          select: { id: true, currentBalance: true },
        });
      }
      const newCashBalance = (cashBook.currentBalance || 0) + principalAmount;
      await db.cashBook.update({
        where: { id: cashBook.id },
        data: {
          currentBalance: newCashBalance,
          lastUpdatedById: createdById,
          lastUpdatedAt: new Date(),
        },
      });
      // Create cash book entry record for audit trail
      await db.cashBookEntry.create({
        data: {
          cashBookId: cashBook.id,
          entryType: 'CREDIT',
          amount: principalAmount,
          balanceAfter: newCashBalance,
          description: `Principal-Only EMI #${installmentNumber} — ${loanNumber} (I:₹${writeOff} written off)`,
          referenceType: 'PRINCIPAL_ONLY_PAYMENT',
          referenceId: paymentId,
          createdById,
        },
      });
      console.log(`[PrincipalOnly] ✅ Cash Book updated: +₹${principalAmount} → Balance: ₹${newCashBalance}`);
    }

    console.log(`[PrincipalOnly] ✅ Journal ${entryNumber}: P:₹${principalAmount} Dr ${cashBankCode}, Cr 1200; I:₹${writeOff} Dr 5500, Cr 4110 (company: ${companyId})`);
    return { success: true, journalEntryId: journal.id };

  } catch (err: any) {
    console.error('[PrincipalOnly] ❌ Journal creation failed:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}
