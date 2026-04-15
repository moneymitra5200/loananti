/**
 * COMPLETE DOUBLE-ENTRY ACCOUNTING SERVICE
 * Money Mitra Loan Management System
 * 
 * This service handles all automatic journal entries following
 * proper double-entry accounting principles.
 * 
 * IMPORTANT: Principal is NEVER treated as income.
 * Only interest and fees are income.
 */

import { db } from './db';
import { AccountType } from '@prisma/client';

// ============================================
// CHART OF ACCOUNTS DEFAULT STRUCTURE
// ============================================

// GNUCASH-STYLE CHART OF ACCOUNTS
// Standard Indian Accounting Structure
// Account Codes follow GnuCash convention:
// - 1xxx: Assets
// - 2xxx: Liabilities  
// - 3xxx: Equity
// - 4xxx: Income
// - 5xxx: Expenses
export const DEFAULT_CHART_OF_ACCOUNTS = {
  ASSETS: [
    // Current Assets (1100-1199)
    { code: '1101', name: 'Cash in Hand', type: 'ASSET', isSystemAccount: true, description: 'Physical cash on hand' },
    { code: '1102', name: 'Bank Account', type: 'ASSET', isSystemAccount: true, description: 'Bank account for online payments' },
    // Loans Receivable (1200-1299)
    { code: '1200', name: 'Loans Receivable', type: 'ASSET', isSystemAccount: true, description: 'Total loans given to borrowers' },
    { code: '1201', name: 'Online Loans Receivable', type: 'ASSET', isSystemAccount: true, description: 'Loans from online applications' },
    { code: '1210', name: 'Offline Loans Receivable', type: 'ASSET', isSystemAccount: true, description: 'Loans from offline entries' },
    // Other Receivables (1300-1399)
    { code: '1301', name: 'Interest Receivable', type: 'ASSET', isSystemAccount: true, description: 'Interest accrued but not yet received' },
    { code: '1302', name: 'Processing Fee Receivable', type: 'ASSET', isSystemAccount: true, description: 'Processing fees due from customers' },
    { code: '1303', name: 'Penalty Receivable', type: 'ASSET', isSystemAccount: true, description: 'Late payment penalties due' },
    { code: '1304', name: 'Other Receivables', type: 'ASSET', isSystemAccount: false, description: 'Other amounts receivable' },
    // Fixed Assets (1500-1599)
    { code: '1500', name: 'Fixed Assets', type: 'ASSET', isSystemAccount: true, description: 'Long-term assets' },
    { code: '1501', name: 'Furniture & Fixtures', type: 'ASSET', isSystemAccount: false, description: 'Office furniture' },
    { code: '1502', name: 'Office Equipment', type: 'ASSET', isSystemAccount: false, description: 'Computers and equipment' },
  ],
  LIABILITIES: [
    // Current Liabilities (2100-2199)
    { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', isSystemAccount: true, description: 'Amounts payable to vendors/suppliers' },
    { code: '2101', name: 'Bank Loans', type: 'LIABILITY', isSystemAccount: true, description: 'Loans taken from banks' },
    { code: '2110', name: 'Investor Capital', type: 'LIABILITY', isSystemAccount: true, description: 'Capital received from investors' },
    { code: '2120', name: 'Borrowed Funds', type: 'LIABILITY', isSystemAccount: true, description: 'Funds borrowed from other sources' },
    { code: '2130', name: 'Agent Commission Payable', type: 'LIABILITY', isSystemAccount: true, description: 'Commissions due to agents' },
    // Statutory Liabilities (2200-2299)
    { code: '2201', name: 'GST Payable', type: 'LIABILITY', isSystemAccount: true, description: 'GST collected to be paid to government' },
    { code: '2202', name: 'TDS Payable', type: 'LIABILITY', isSystemAccount: true, description: 'TDS collected to be paid to government' },
  ],
  EQUITY: [
    // Equity Accounts (3000-3999)
    { code: '3001', name: 'Opening Balance Equity', type: 'EQUITY', isSystemAccount: true, description: 'Initial capital when company started' },
    { code: '3002', name: "Owner's Capital", type: 'EQUITY', isSystemAccount: true, description: "Owner's capital investment - Use this for adding equity" },
    { code: '3003', name: 'Retained Earnings', type: 'EQUITY', isSystemAccount: true, description: 'Accumulated profits from previous years' },
    { code: '3004', name: 'Current Year Profit/Loss', type: 'EQUITY', isSystemAccount: true, description: 'Profit/loss for current year (auto-calculated)' },
  ],
  INCOME: [
    // Interest Income (4100-4199)
    { code: '4100', name: 'Interest Income', type: 'INCOME', isSystemAccount: true, description: 'Total interest earned on loans' },
    { code: '4110', name: 'Interest on Loans', type: 'INCOME', isSystemAccount: true, description: 'Interest earned on loans - MAIN INCOME' },
    { code: '4111', name: 'Interest Income - Online Loans', type: 'INCOME', isSystemAccount: true, description: 'Interest from online loan applications' },
    { code: '4112', name: 'Interest Income - Offline Loans', type: 'INCOME', isSystemAccount: true, description: 'Interest from offline loans' },
    { code: '4113', name: 'Interest Income - Mirror Loans', type: 'INCOME', isSystemAccount: true, description: 'Interest from mirror loan system' },
    // Fee Income (4200-4299)
    { code: '4120', name: 'Fee Income', type: 'INCOME', isSystemAccount: true, description: 'Total fees collected' },
    { code: '4121', name: 'Processing Fees', type: 'INCOME', isSystemAccount: true, description: 'Processing fees collected' },
    { code: '4122', name: 'Late Fee Income', type: 'INCOME', isSystemAccount: true, description: 'Late payment fees collected' },
    { code: '4123', name: 'Bounce Charges Income', type: 'INCOME', isSystemAccount: true, description: 'Cheque/ECS bounce charges' },
    { code: '4124', name: 'Foreclosure Charges Income', type: 'INCOME', isSystemAccount: true, description: 'Foreclosure/prepayment charges' },
    { code: '4125', name: 'Penalty Income', type: 'INCOME', isSystemAccount: true, description: 'Net penalty collected (after waiver) — records in CashBook or Bank based on collection mode' },
    // Other Income (4300-4399)
    { code: '4300', name: 'Other Income', type: 'INCOME', isSystemAccount: false, description: 'Other miscellaneous income' },
    { code: '4301', name: 'Commission Income', type: 'INCOME', isSystemAccount: false, description: 'Commission received' },
  ],
  EXPENSES: [
    // Operating Expenses (5100-5199)
    { code: '5100', name: 'Operating Expenses', type: 'EXPENSE', isSystemAccount: true, description: 'Day-to-day business expenses' },
    { code: '5101', name: 'Salaries & Wages', type: 'EXPENSE', isSystemAccount: true, description: 'Salaries paid to staff' },
    { code: '5102', name: 'Rent Expense', type: 'EXPENSE', isSystemAccount: true, description: 'Office rent expenses' },
    { code: '5103', name: 'Electricity & Utilities', type: 'EXPENSE', isSystemAccount: true, description: 'Electricity, water, internet bills' },
    { code: '5104', name: 'Office Supplies', type: 'EXPENSE', isSystemAccount: false, description: 'Stationery and supplies' },
    { code: '5105', name: 'Communication Expenses', type: 'EXPENSE', isSystemAccount: false, description: 'Phone and internet' },
    { code: '5106', name: 'Travel & Conveyance', type: 'EXPENSE', isSystemAccount: false, description: 'Travel and conveyance' },
    { code: '5107', name: 'Marketing Expense', type: 'EXPENSE', isSystemAccount: true, description: 'Marketing and advertising costs' },
    // Financial Expenses (5200-5299)
    { code: '5200', name: 'Financial Expenses', type: 'EXPENSE', isSystemAccount: true, description: 'Interest and bank charges' },
    { code: '5201', name: 'Interest Expense', type: 'EXPENSE', isSystemAccount: true, description: 'Interest paid on borrowed funds' },
    { code: '5202', name: 'Commission Paid', type: 'EXPENSE', isSystemAccount: true, description: 'Commissions paid to agents' },
    { code: '5203', name: 'Bank Charges', type: 'EXPENSE', isSystemAccount: true, description: 'Bank transaction charges' },
    // Other Expenses (5300-5399)
    { code: '5300', name: 'Depreciation', type: 'EXPENSE', isSystemAccount: true, description: 'Asset depreciation' },
    { code: '5301', name: 'Depreciation - Furniture', type: 'EXPENSE', isSystemAccount: false, description: 'Furniture depreciation' },
    { code: '5302', name: 'Depreciation - Equipment', type: 'EXPENSE', isSystemAccount: false, description: 'Equipment depreciation' },
    { code: '5400', name: 'Miscellaneous Expense', type: 'EXPENSE', isSystemAccount: false, description: 'Other expenses' },
    // Bad Debt / Write-offs (5500-5599)
    { code: '5500', name: 'Irrecoverable Debts', type: 'EXPENSE', isSystemAccount: true, description: 'Interest written off when only principal is collected (Principal-Only payment)' },
  ],
};

// ============================================
// ACCOUNT CODE CONSTANTS
// ============================================

export const ACCOUNT_CODES = {
  // Assets
  CASH_IN_HAND: '1101',
  BANK_ACCOUNT: '1102',  // Bank Account for online payments
  LOANS_RECEIVABLE: '1200',
  ONLINE_LOANS_RECEIVABLE: '1201',
  OFFLINE_LOANS_RECEIVABLE: '1210',
  INTEREST_RECEIVABLE: '1301',
  PROCESSING_FEE_RECEIVABLE: '1302',
  PENALTY_RECEIVABLE: '1303',
  
  // Liabilities
  ACCOUNTS_PAYABLE: '2100',
  BANK_LOANS: '2101',
  INVESTOR_CAPITAL: '2110',
  BORROWED_FUNDS: '2120',
  AGENT_COMMISSION_PAYABLE: '2130',
  GST_PAYABLE: '2201',
  TDS_PAYABLE: '2202',
  
  // Equity
  OPENING_BALANCE_EQUITY: '3001',
  OWNERS_CAPITAL: '3002',        // Use this for adding owner's equity
  RETAINED_EARNINGS: '3003',
  CURRENT_YEAR_PROFIT: '3004',
  
  // Income
  INTEREST_INCOME: '4110',
  INTEREST_INCOME_ONLINE: '4111',
  INTEREST_INCOME_OFFLINE: '4112',
  INTEREST_INCOME_MIRROR: '4113',
  PROCESSING_FEE_INCOME: '4121',
  LATE_FEE_INCOME: '4122',

  BOUNCE_CHARGES_INCOME: '4123',
  FORECLOSURE_INCOME: '4124',
  PENALTY_INCOME: '4125',          // Net penalty income (after waiver)
  OTHER_INCOME: '4300',
  
  // Expenses
  OPERATING_EXPENSES: '5100',
  STAFF_SALARY: '5101',
  RENT_EXPENSE: '5102',
  COMMISSION_PAID: '5202',
  INTEREST_EXPENSE: '5201',
  BANK_CHARGES: '5203',
  DEPRECIATION: '5300',
  IRRECOVERABLE_DEBTS: '5500',   // Interest written off (Principal-Only payments)
};

// ============================================
// JOURNAL ENTRY TYPES
// ============================================

export type JournalEntryType = 
  | 'LOAN_DISBURSEMENT'
  | 'MIRROR_LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'EMI_PAYMENT'
  | 'MIRROR_EMI_PAYMENT'
  | 'MIRROR_INTEREST_INCOME'
  | 'MIRROR_PRINCIPAL_ENTRY'
  | 'EXTRA_EMI_PAYMENT'
  | 'PROCESSING_FEE_COLLECTION'
  | 'INTEREST_COLLECTION'
  | 'PENALTY_COLLECTION'
  | 'LATE_FEE_COLLECTION'
  | 'FORECLOSURE'
  | 'EXPENSE_ENTRY'
  | 'COMMISSION_PAYMENT'
  | 'MANUAL_ENTRY'
  | 'OPENING_BALANCE'
  | 'YEAR_END_CLOSING'
  | 'BANK_TRANSFER'
  | 'CASH_DEPOSIT'
  | 'CASH_WITHDRAWAL'
  | 'INTEREST_ONLY_PAYMENT'
  | 'PRINCIPAL_ONLY_PAYMENT';

// ============================================
// MAIN ACCOUNTING SERVICE CLASS
// ============================================

export class AccountingService {
  private companyId: string;
  private financialYearId: string | null = null;

  // ── PERFORMANCE: In-memory account ID cache (code→{id,type}) ──
  // Loaded once per instance, reused for ALL journal lines
  private accountCache: Map<string, { id: string; accountType: string; accountCode: string; currentBalance: number }> | null = null;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  // ── PERFORMANCE: Preload ALL account IDs in ONE query ──────────
  // Replaces 15+ per-line getAccountByCode calls with O(1) Map lookups
  private async ensureAccountCache(tx?: any): Promise<void> {
    if (this.accountCache) return; // Already loaded
    const transaction = tx || db;
    const accounts = await transaction.chartOfAccount.findMany({
      where: { companyId: this.companyId },
      select: { id: true, accountCode: true, accountType: true, currentBalance: true },
    });
    this.accountCache = new Map();
    for (const a of accounts) {
      this.accountCache.set(a.accountCode, {
        id: a.id,
        accountType: a.accountType,
        accountCode: a.accountCode,
        currentBalance: a.currentBalance,
      });
    }
  }

  /**
   * Initialize chart of accounts for a company
   */
  // ── Runtime cache: skip re-initialisation within the same server process ─
  private static initializedCompanies = new Set<string>();

  async initializeChartOfAccounts(): Promise<void> {
    // Fast-path: already done this process run — skip 40+ DB queries
    if (AccountingService.initializedCompanies.has(this.companyId)) return;

    const allDefaults = [
      ...DEFAULT_CHART_OF_ACCOUNTS.ASSETS,
      ...DEFAULT_CHART_OF_ACCOUNTS.LIABILITIES,
      ...DEFAULT_CHART_OF_ACCOUNTS.INCOME,
      ...DEFAULT_CHART_OF_ACCOUNTS.EXPENSES,
      ...DEFAULT_CHART_OF_ACCOUNTS.EQUITY,
    ];

    // PERFORMANCE: Fetch ALL existing accounts in ONE query instead of 40+ findFirst calls
    const existing = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId },
      select: { accountCode: true },
    });
    const existingCodes = new Set(existing.map(e => e.accountCode));

    // Only create missing accounts
    const missing = allDefaults.filter(a => !existingCodes.has(a.code));
    if (missing.length > 0) {
      // PERFORMANCE: Use createMany instead of loop
      await db.chartOfAccount.createMany({
        data: missing.map(account => ({
          companyId: this.companyId,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type as AccountType,
          isSystemAccount: account.isSystemAccount,
          description: account.description,
          openingBalance: 0,
          currentBalance: 0,
        })),
        skipDuplicates: true,
      });
    }

    // Mark as done so next call is instant
    AccountingService.initializedCompanies.add(this.companyId);
    // CRITICAL: Always refresh cache after init — new accounts may have been created
    this.accountCache = null;
    await this.ensureAccountCache(); // Pre-load so createJournalEntry works immediately
  }

  /**
   * Get or create current financial year
   * PERFORMANCE: Cached per-instance + static process-wide cache
   */
  private static fyCache = new Map<string, { id: string; expiry: number }>();

  async getCurrentFinancialYear(tx?: any): Promise<string> {
    // Instance cache
    if (this.financialYearId) return this.financialYearId;

    // Process-wide cache (expires every 60 seconds)
    const cacheKey = this.companyId;
    const cached = AccountingService.fyCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.financialYearId = cached.id;
      return cached.id;
    }

    const transaction = tx || db;
    const now = new Date();
    const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const yearName = `FY ${currentYear}-${currentYear + 1}`;
    const startDate = new Date(currentYear, 3, 1);
    const endDate = new Date(currentYear + 1, 2, 31);

    let financialYear = await transaction.financialYear.findFirst({
      where: { companyId: this.companyId, name: yearName },
    });

    if (!financialYear) {
      financialYear = await transaction.financialYear.create({
        data: { companyId: this.companyId, name: yearName, startDate, endDate, isClosed: false },
      });
    }

    this.financialYearId = financialYear.id;
    // Cache for 60s process-wide
    AccountingService.fyCache.set(cacheKey, { id: financialYear.id, expiry: Date.now() + 60000 });
    return financialYear.id;
  }

  /**
   * Get account by code — PERFORMANCE: Uses in-memory cache (O(1) lookup)
   */
  async getAccountByCode(code: string, tx?: any): Promise<string> {
    await this.ensureAccountCache(tx);
    const cached = this.accountCache!.get(code);
    if (cached) return cached.id;
    // Fallback: DB query (shouldn't happen if initializeChartOfAccounts ran)
    const transaction = tx || db;
    const account = await transaction.chartOfAccount.findFirst({
      where: { companyId: this.companyId, accountCode: code },
    });
    if (!account) throw new Error(`Account with code ${code} not found`);
    // Update cache
    this.accountCache!.set(code, { id: account.id, accountType: account.accountType, accountCode: account.accountCode, currentBalance: account.currentBalance });
    return account.id;
  }

  /**
   * Generate next journal entry number
   */
  async generateEntryNumber(tx?: any): Promise<string> {
    const transaction = tx || db;
    const count = await transaction.journalEntry.count({
      where: { companyId: this.companyId },
    });
    return `JE${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Create a journal entry — PERFORMANCE REWRITE
   * Old: ~24 sequential queries per 3-line entry
   * New: ~8 queries total (preload cache + create entry + createMany lines + batch balance updates)
   */
  async createJournalEntry(params: {
    entryDate: Date;
    referenceType: JournalEntryType;
    referenceId?: string;
    narration: string;
    lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      loanId?: string;
      customerId?: string;
      narration?: string;
    }>;
    createdById: string;
    paymentMode?: string;
    bankAccountId?: string;
    chequeNumber?: string;
    bankRefNumber?: string;
    isAutoEntry?: boolean;
  }, tx?: any): Promise<string> {

    // ── IDEMPOTENCY GUARD ─────────────────────────────────────────────
    if (params.referenceId) {
      const existing = await db.journalEntry.findFirst({
        where: {
          companyId: this.companyId,
          referenceId: params.referenceId,
          referenceType: params.referenceType,
          isReversed: false,
        },
        select: { id: true },
      });
      if (existing) {
        console.warn(`[Journal] DUPLICATE BLOCKED — ${params.referenceId}/${params.referenceType}`);
        return existing.id;
      }
    }

    // Validate double-entry
    const totalDebit = params.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = params.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal entry not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    // PERFORMANCE: Preload account cache + financial year in parallel
    const [entryNumber, financialYearId] = await Promise.all([
      this.generateEntryNumber(tx),
      this.getCurrentFinancialYear(tx),
    ]);
    await this.ensureAccountCache(tx);

    // Resolve all account IDs from cache (0 DB queries)
    const resolvedLines = params.lines.map(line => {
      const cached = this.accountCache!.get(line.accountCode);
      if (!cached) throw new Error(`Account ${line.accountCode} not in cache`);
      return { ...line, accountId: cached.id, accountType: cached.accountType, accountCode: cached.accountCode };
    });

    const executeEntry = async (transaction: any) => {
      // 1. Create journal entry header (1 query)
      const entry = await transaction.journalEntry.create({
        data: {
          companyId: this.companyId,
          entryNumber,
          entryDate: params.entryDate,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          narration: params.narration,
          totalDebit,
          totalCredit,
          isAutoEntry: params.isAutoEntry ?? true,
          createdById: params.createdById,
          paymentMode: params.paymentMode,
          bankAccountId: params.bankAccountId,
          chequeNumber: params.chequeNumber,
          bankRefNumber: params.bankRefNumber,
          isApproved: true,
        },
      });

      // 2. PERFORMANCE: Create ALL journal lines in ONE batch (1 query instead of N)
      await transaction.journalEntryLine.createMany({
        data: resolvedLines.map(line => ({
          journalEntryId: entry.id,
          accountId: line.accountId,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          loanId: line.loanId || null,
          customerId: line.customerId || null,
          narration: line.narration || null,
        })),
      });

      // 3. PERFORMANCE: Batch update account balances
      // Group by accountId to avoid duplicate updates
      const balanceUpdates = new Map<string, { debit: number; credit: number; accountType: string; accountCode: string }>();
      for (const line of resolvedLines) {
        const existing = balanceUpdates.get(line.accountId);
        if (existing) {
          existing.debit += line.debitAmount;
          existing.credit += line.creditAmount;
        } else {
          balanceUpdates.set(line.accountId, {
            debit: line.debitAmount,
            credit: line.creditAmount,
            accountType: line.accountType,
            accountCode: line.accountCode,
          });
        }
      }

      // Execute balance updates in parallel where possible
      const updatePromises: Promise<void>[] = [];
      for (const [accountId, upd] of balanceUpdates) {
        updatePromises.push(
          this.updateAccountBalanceFast(transaction, accountId, upd.debit, upd.credit, upd.accountType, upd.accountCode, financialYearId)
        );
      }
      await Promise.all(updatePromises);

      return entry;
    };

    if (tx) {
      const entry = await executeEntry(tx);
      return entry.id;
    } else {
      const journalEntry = await db.$transaction(async (newTx) => {
        return await executeEntry(newTx);
      }, { maxWait: 60000, timeout: 60000 });
      return journalEntry.id;
    }
  }


  /**
   * PERFORMANCE: Fast balance update — no extra findUnique needed
   * Uses pre-resolved account type from cache and upsert for ledger balance
   * Old: 4 queries per line (findUnique + update + findUnique + update/create)
   * New: 2 queries per account (update/sync + upsert)
   */
  private async updateAccountBalanceFast(
    tx: any,
    accountId: string,
    debitAmount: number,
    creditAmount: number,
    accountType: string,
    accountCode: string,
    financialYearId: string
  ): Promise<void> {
    const isBankOrCash = accountCode === ACCOUNT_CODES.BANK_ACCOUNT ||
                         accountCode === ACCOUNT_CODES.CASH_IN_HAND;

    // Balance calculation based on account type
    const balanceChange = (accountType === 'ASSET' || accountType === 'EXPENSE')
      ? debitAmount - creditAmount
      : creditAmount - debitAmount;

    // 1. Update ChartOfAccount balance (skip for bank/cash — synced from BankAccount table)
    if (!isBankOrCash) {
      await tx.chartOfAccount.update({
        where: { id: accountId },
        data: { currentBalance: { increment: balanceChange } },
      });
    } else {
      await this.syncBankCashBalance(tx, accountCode, this.companyId);
    }

    // 2. PERFORMANCE: Upsert ledger balance (1 query instead of findUnique + update/create)
    // MySQL doesn't have native upsert on compound keys, so we use try/catch
    try {
      await tx.ledgerBalance.update({
        where: { accountId_financialYearId: { accountId, financialYearId } },
        data: {
          totalDebits:   { increment: debitAmount },
          totalCredits:  { increment: creditAmount },
          closingBalance: { increment: balanceChange },
        },
      });
    } catch {
      // Record doesn't exist yet — create it
      await tx.ledgerBalance.create({
        data: {
          accountId,
          financialYearId,
          openingBalance: 0,
          totalDebits: debitAmount,
          totalCredits: creditAmount,
          closingBalance: balanceChange,
        },
      });
    }
  }

  // Legacy compatibility wrapper (used by some callers)
  private async updateAccountBalance(
    tx: any,
    accountId: string,
    debitAmount: number,
    creditAmount: number,
    financialYearId: string
  ): Promise<void> {
    const account = await tx.chartOfAccount.findUnique({ where: { id: accountId } });
    if (!account) return;
    await this.updateAccountBalanceFast(tx, accountId, debitAmount, creditAmount, account.accountType, account.accountCode, financialYearId);
  }

  /**
   * Sync Bank/Cash account balance from actual BankAccount table
   * This ensures ChartOfAccount reflects the real bank balance
   *
   * IMPORTANT: Uses `db` directly (not `tx`) to read BankAccount/CashBook
   * because we need the LATEST committed balance, not the snapshot from
   * when the transaction started.
   *
   * @param tx - Database transaction (for updating ChartOfAccount)
   * @param accountCode - Account code (1101 for Cash, 1102 for Bank)
   * @param companyId - Company ID
   */
  private async syncBankCashBalance(
    tx: any,
    accountCode: string,
    companyId: string
  ): Promise<void> {
    try {
      // Get the ChartOfAccount record using tx
      const chartAccount = await tx.chartOfAccount.findFirst({
        where: { companyId, accountCode },
      });

      if (!chartAccount) return;

      if (accountCode === ACCOUNT_CODES.BANK_ACCOUNT) {
        // CRITICAL: Use `db` directly (not `tx`) to get LATEST committed balance
        // `tx` sees snapshot from transaction start, not latest committed data
        const bankAccounts = await db.bankAccount.findMany({
          where: { companyId, isActive: true },
          select: { currentBalance: true, accountName: true },
        });

        const totalBankBalance = bankAccounts.reduce(
          (sum: number, acc: { currentBalance: number; accountName: string }) => sum + (acc.currentBalance || 0),
          0
        );

        // Update ChartOfAccount with actual bank balance using tx
        await tx.chartOfAccount.update({
          where: { id: chartAccount.id },
          data: { currentBalance: totalBankBalance },
        });

        console.log(`[Accounting] Synced Bank Account (1102) balance: ₹${totalBankBalance} (from ${bankAccounts.length} bank accounts: ${bankAccounts.map(b => `${b.accountName}: ₹${b.currentBalance}`).join(', ')})`);
      } else if (accountCode === ACCOUNT_CODES.CASH_IN_HAND) {
        // CRITICAL: Use `db` directly (not `tx`) to get LATEST committed balance
        const cashBook = await db.cashBook.findUnique({
          where: { companyId },
          select: { currentBalance: true },
        });

        const cashBalance = cashBook?.currentBalance || 0;

        // Update ChartOfAccount with actual cash balance using tx
        await tx.chartOfAccount.update({
          where: { id: chartAccount.id },
          data: { currentBalance: cashBalance },
        });

        console.log(`[Accounting] Synced Cash in Hand (1101) balance: ₹${cashBalance}`);
      }
    } catch (error) {
      console.error('[Accounting] Failed to sync bank/cash balance:', error);
    }

  }

  /**
   * Public method to sync all bank/cash balances for a company
   * Call this when you need to ensure ChartOfAccount reflects actual balances
   */
  async syncAllBankCashBalances(): Promise<void> {
    const tx = db; // Use db directly for non-transaction context

    await this.syncBankCashBalance(tx, ACCOUNT_CODES.BANK_ACCOUNT, this.companyId);
    await this.syncBankCashBalance(tx, ACCOUNT_CODES.CASH_IN_HAND, this.companyId);
  }

  // ============================================
  // AUTOMATIC JOURNAL ENTRY METHODS
  // ============================================

  /**
   * LOAN DISBURSEMENT
   * Debit: Loans Receivable (Asset) — loan goes out
   * Credit: Bank Account (1102) for online/bank transfers
   * Credit: Cash in Hand (1101) for cash disbursements
   */
  async recordLoanDisbursement(params: {
    loanId: string;
    customerId: string;
    amount: number;
    disbursementDate: Date;
    createdById: string;
    bankAccountId?: string;
    paymentMode: string;
    reference?: string;
  }, tx?: any): Promise<string> {
    // Determine which account is being emptied to fund the loan
    const isOnlinePayment = ['ONLINE', 'BANK_TRANSFER', 'UPI', 'NEFT', 'RTGS', 'IMPS'].includes(
      (params.paymentMode || '').toUpperCase()
    );
    const creditAccountCode = isOnlinePayment
      ? ACCOUNT_CODES.BANK_ACCOUNT
      : ACCOUNT_CODES.CASH_IN_HAND;

    return this.createJournalEntry({
      entryDate: params.disbursementDate,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: params.loanId,
      narration: `Loan disbursement - Principal: ₹${params.amount.toLocaleString()} (${params.paymentMode})`,
      lines: [
        {
          accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
          debitAmount: params.amount,
          creditAmount: 0,
          loanId: params.loanId,
          customerId: params.customerId,
          narration: 'Loan principal disbursed',
        },
        {
          accountCode: creditAccountCode,
          debitAmount: 0,
          creditAmount: params.amount,
          narration: isOnlinePayment
            ? 'Bank payment for loan disbursement'
            : 'Cash payment for loan disbursement',
        },
      ],
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    });
  }

  /**
   * EMI PAYMENT
   * Splits EMI into Principal and Interest components
   * 
   * Debit: Bank Account (Asset)
   * Credit: Loans Receivable (Asset) - Principal part
   * Credit: Interest Income (Income) - Interest part
   */
  /**
   * EMI PAYMENT
   * Splits EMI into Principal and Interest components
   * 
   * Debit: Bank Account (Asset)
   * Credit: Loans Receivable (Asset) - Principal part
   * Credit: Interest Income (Income) - Interest part
   */
  async recordEMIPayment(params: {
    loanId: string;
    customerId: string;
    paymentId: string;
    totalAmount: number;
    principalComponent: number;
    interestComponent: number;
    penaltyComponent?: number;
    paymentDate: Date;
    createdById: string;
    paymentMode: string;
    bankAccountId?: string;
    reference?: string;
  }, tx?: any): Promise<string> {
    const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes(
      (params.paymentMode || '').toUpperCase()
    );
    const debitAccount = isOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;

    // ── BALANCE ENFORCEMENT ────────────────────────────────────────────────────
    // The debit side is always totalAmount. We need credits to sum exactly to that.
    // Case 1: advance payment → principalComponent = totalAmount, interestComponent = 0
    // Case 2: interest-only  → principalComponent = 0, interestComponent = totalAmount
    // Case 3: rounding diff  → adjust interest line so debit == sum of credits
    const penalty = params.penaltyComponent ?? 0;
    const creditBase = params.principalComponent + params.interestComponent + penalty;
    const rounding = Math.round((params.totalAmount - creditBase) * 100) / 100;

    // Adjusted interest absorbs any rounding diff (never goes below 0)
    const adjustedInterest = Math.max(0, params.interestComponent + rounding);

    // Build credit lines
    const creditLines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      loanId?: string;
      customerId?: string;
      narration?: string;
    }> = [];

    if (params.principalComponent > 0) {
      creditLines.push({
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        debitAmount: 0,
        creditAmount: params.principalComponent,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Principal repayment',
      });
    }
    if (adjustedInterest > 0) {
      creditLines.push({
        accountCode: ACCOUNT_CODES.INTEREST_INCOME,
        debitAmount: 0,
        creditAmount: adjustedInterest,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Interest income earned',
      });
    }
    if (penalty > 0) {
      creditLines.push({
        accountCode: ACCOUNT_CODES.LATE_FEE_INCOME,
        debitAmount: 0,
        creditAmount: penalty,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Late payment penalty',
      });
    }

    // Fallback: if no credit lines built (e.g. all zeros), treat full amount as loan repayment
    if (creditLines.length === 0) {
      creditLines.push({
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        debitAmount: 0,
        creditAmount: params.totalAmount,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'EMI repayment',
      });
    }

    // Verify credit lines sum equals totalAmount — fix final line if still off
    const creditSum = creditLines.reduce((s, l) => s + l.creditAmount, 0);
    const finalDiff = Math.round((params.totalAmount - creditSum) * 100) / 100;
    if (Math.abs(finalDiff) > 0.001 && creditLines.length > 0) {
      creditLines[creditLines.length - 1].creditAmount =
        Math.round((creditLines[creditLines.length - 1].creditAmount + finalDiff) * 100) / 100;
    }

    return this.createJournalEntry({
      entryDate: params.paymentDate,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.paymentId,
      narration: `EMI Payment - Loan: ${params.loanId}`,
      lines: [
        {
          accountCode: debitAccount,
          debitAmount: params.totalAmount,
          creditAmount: 0,
          narration: `EMI payment received via ${params.paymentMode}`,
        },
        ...creditLines,
      ],
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    }, tx);
  }

  /**
   * PRINCIPAL-ONLY PAYMENT
   * Customer pays only principal; interest is written off as irrecoverable debt (loss).
   *
   * Journal Entry (balanced):
   *   Dr  Cash/Bank (1101/1102)        = principalAmount   ← money received
   *   Cr  Loans Receivable (1200)      = principalAmount   ← loan cleared
   *   Dr  Irrecoverable Debts (5500)   = interestAmount    ← interest lost (expense)
   *   Cr  Interest Income (4110)       = interestAmount    ← interest recognised then written off
   *
   * Net effect: Cash up by principal, loan down by principal, net P&L impact = -(interestAmount)
   */
  async recordPrincipalOnlyPayment(params: {
    loanId: string;
    customerId: string;
    paymentId: string;
    principalAmount: number;
    interestWrittenOff: number;
    paymentDate: Date;
    createdById: string;
    paymentMode: string;
    loanNumber?: string;
    installmentNumber?: number;
    bankAccountId?: string;
  }, tx?: any): Promise<string> {
    if (params.principalAmount <= 0) {
      throw new Error('Principal amount must be > 0 for Principal-Only payment');
    }

    const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes(
      (params.paymentMode || '').toUpperCase()
    );
    const debitCashBank = isOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;

    const narration = `Principal-Only EMI #${params.installmentNumber ?? '?'} — ${params.loanNumber ?? params.loanId}` +
      ` | P:₹${params.principalAmount} collected, I:₹${params.interestWrittenOff} written off`;

    const lines: Array<{ accountCode: string; debitAmount: number; creditAmount: number; loanId?: string; customerId?: string; narration?: string }> = [
      // Dr Cash/Bank — money received
      { accountCode: debitCashBank,                       debitAmount: params.principalAmount,       creditAmount: 0,                          narration: `Principal received (${params.paymentMode})` },
      // Cr Loans Receivable — principal portion of loan cleared
      { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,      debitAmount: 0,                            creditAmount: params.principalAmount,      loanId: params.loanId, customerId: params.customerId, narration: 'Principal repayment — loan reduced' },
    ];

    // If interest is being written off, create the write-off entry
    if (params.interestWrittenOff > 0) {
      lines.push(
        // Dr Irrecoverable Debts — interest recognised as a loss
        { accountCode: ACCOUNT_CODES.IRRECOVERABLE_DEBTS, debitAmount: params.interestWrittenOff,    creditAmount: 0,                          loanId: params.loanId, customerId: params.customerId, narration: 'Interest written off as irrecoverable debt' },
        // Cr Interest Income — income entry to balance the write-off
        { accountCode: ACCOUNT_CODES.INTEREST_INCOME,     debitAmount: 0,                            creditAmount: params.interestWrittenOff,   loanId: params.loanId, customerId: params.customerId, narration: 'Interest income (waived — written off)' }
      );
    }

    return this.createJournalEntry({
      entryDate: params.paymentDate,
      referenceType: 'PRINCIPAL_ONLY_PAYMENT',
      referenceId: params.paymentId,
      narration,
      lines,
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      isAutoEntry: true,
    }, tx);
  }

  /**
   * PROCESSING FEE COLLECTION
   * Debit: Bank Account
   * Credit: Processing Fee Income
   */
  async recordProcessingFee(params: {
    loanId: string;
    customerId: string;
    amount: number;
    collectionDate: Date;
    createdById: string;
    paymentMode: string;
    bankAccountId?: string;
    reference?: string;
  }, tx?: any): Promise<string> {
    const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].includes((params.paymentMode || '').toUpperCase());
    const debitAccount = isOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;

    return this.createJournalEntry({
      entryDate: params.collectionDate,
      referenceType: 'PROCESSING_FEE_COLLECTION',
      referenceId: params.loanId,
      narration: `Processing fee collected: ₹${params.amount.toLocaleString()}`,
      lines: [
        {
          accountCode: debitAccount,
          debitAmount: params.amount,
          creditAmount: 0,
          narration: `Processing fee received via ${params.paymentMode}`,
        },
        {
          accountCode: ACCOUNT_CODES.PROCESSING_FEE_INCOME,
          debitAmount: 0,
          creditAmount: params.amount,
          loanId: params.loanId,
          customerId: params.customerId,
          narration: 'Processing fee income',
        },
      ],
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    }, tx);
  }

  /**
   * MIRROR INTEREST INCOME (Profit Margin)
   * Debit: Cash/Bank Account
   * Credit: Mirror Interest Income
   */
  async recordMirrorInterestIncome(params: {
    loanId: string;
    customerId: string;
    amount: number;
    paymentId: string;
    createdById: string;
    paymentMode: string;
    bankAccountId?: string;
  }, tx?: any): Promise<string> {
    const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER'].includes((params.paymentMode || '').toUpperCase());
    const debitAccount = isOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;

    return this.createJournalEntry({
      entryDate: new Date(),
      referenceType: 'MIRROR_INTEREST_INCOME',
      referenceId: params.paymentId,
      narration: `Mirror Interest Margin - Loan: ${params.loanId}`,
      lines: [
        {
          accountCode: debitAccount,
          debitAmount: params.amount,
          creditAmount: 0,
          narration: `Mirror interest profit received via ${params.paymentMode}`,
        },
        {
          accountCode: ACCOUNT_CODES.INTEREST_INCOME_MIRROR,
          debitAmount: 0,
          creditAmount: params.amount,
          loanId: params.loanId,
          customerId: params.customerId,
          narration: 'Mirror interest margin (profit)',
        },
      ],
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      isAutoEntry: true,
    }, tx);
  }

  /**
   * AGENT COMMISSION PAYMENT
   * Debit: Commission Paid (Expense)
   * Credit: Bank Account
   */
  async recordCommissionPayment(params: {
    agentId: string;
    loanId?: string;
    amount: number;
    paymentDate: Date;
    createdById: string;
    paymentMode: string;
    bankAccountId?: string;
    reference?: string;
  }): Promise<string> {
    return this.createJournalEntry({
      entryDate: params.paymentDate,
      referenceType: 'COMMISSION_PAYMENT',
      referenceId: params.loanId,
      narration: `Agent commission paid: ₹${params.amount.toLocaleString()}`,
      lines: [
        {
          accountCode: ACCOUNT_CODES.COMMISSION_PAID,
          debitAmount: params.amount,
          creditAmount: 0,
          loanId: params.loanId,
          narration: 'Commission expense',
        },
        {
          accountCode: ACCOUNT_CODES.CASH_IN_HAND,
          debitAmount: 0,
          creditAmount: params.amount,
          narration: 'Commission payment',
        },
      ],
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    });
  }

  /**
   * EXPENSE ENTRY
   * Debit: Expense Account
   * Credit: Bank Account or Payables
   */
  async recordExpense(params: {
    expenseId: string;
    expenseType: string;
    expenseAccountCode: string;
    amount: number;
    description: string;
    expenseDate: Date;
    createdById: string;
    paymentMode: string;
    bankAccountId?: string;
    reference?: string;
    isPayable?: boolean;
  }): Promise<string> {
    const lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      narration?: string;
    }> = [];

    // Debit Expense Account
    lines.push({
      accountCode: params.expenseAccountCode,
      debitAmount: params.amount,
      creditAmount: 0,
      narration: params.description,
    });

    // Credit Bank or Payables
    if (params.isPayable) {
      lines.push({
        accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
        debitAmount: 0,
        creditAmount: params.amount,
        narration: 'Expense payable',
      });
    } else {
      lines.push({
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: 0,
        creditAmount: params.amount,
        narration: 'Expense paid',
      });
    }

    return this.createJournalEntry({
      entryDate: params.expenseDate,
      referenceType: 'EXPENSE_ENTRY',
      referenceId: params.expenseId,
      narration: `Expense: ${params.description} - ₹${params.amount.toLocaleString()}`,
      lines,
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    });
  }

  /**
   * FORECLOSURE SETTLEMENT
   * Debit: Bank Account (total received)
   * Credit: Loans Receivable (remaining principal)
   * Credit: Interest Income (pending interest)
   * Credit: Foreclosure Charges Income (foreclosure fee)
   */
  async recordForeclosure(params: {
    loanId: string;
    customerId: string;
    foreclosureId: string;
    outstandingPrincipal: number;
    pendingInterest: number;
    foreclosureCharges: number;
    totalSettlement: number;
    settlementDate: Date;
    createdById: string;
    paymentMode: string;
    bankAccountId?: string;
    reference?: string;
  }): Promise<string> {
    const lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      loanId?: string;
      customerId?: string;
      narration?: string;
    }> = [];

    // Debit Bank (total received)
    lines.push({
      accountCode: ACCOUNT_CODES.CASH_IN_HAND,
      debitAmount: params.totalSettlement,
      creditAmount: 0,
      narration: 'Foreclosure settlement received',
    });

    // Credit Loans Receivable (reduces outstanding)
    if (params.outstandingPrincipal > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        debitAmount: 0,
        creditAmount: params.outstandingPrincipal,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Principal settlement',
      });
    }

    // Credit Interest Income
    if (params.pendingInterest > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.INTEREST_INCOME,
        debitAmount: 0,
        creditAmount: params.pendingInterest,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Interest income',
      });
    }

    // Credit Foreclosure Charges Income
    if (params.foreclosureCharges > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.FORECLOSURE_INCOME,
        debitAmount: 0,
        creditAmount: params.foreclosureCharges,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Foreclosure charges',
      });
    }

    return this.createJournalEntry({
      entryDate: params.settlementDate,
      referenceType: 'FORECLOSURE',
      referenceId: params.foreclosureId,
      narration: `Loan Foreclosure - Total: ₹${params.totalSettlement.toLocaleString()}`,
      lines,
      createdById: params.createdById,
      paymentMode: params.paymentMode,
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    });
  }

  /**
   * EXTERNAL BORROWING (Loan from Bank/Outside)
   * When the company borrows money from external sources (bank, financial institution, person)
   * 
   * Debit: Bank Account (Asset increases - money received)
   * Credit: Bank Loans or Borrowed Funds (Liability increases - money owed)
   * 
   * IMPORTANT: This is NOT income! The borrowed amount must be repaid.
   */
  async recordExternalBorrowing(params: {
    amount: number;
    source: string; // e.g., "HDFC Bank", "Personal Loan from XYZ"
    loanType: 'BANK_LOAN' | 'BORROWED_FUNDS' | 'INVESTOR_CAPITAL';
    borrowingDate: Date;
    createdById: string;
    bankAccountId?: string;
    reference?: string;
    interestRate?: number;
    dueDate?: Date;
    description?: string;
  }): Promise<string> {
    // Determine which liability account to use
    const liabilityAccountCode = params.loanType === 'BANK_LOAN' 
      ? ACCOUNT_CODES.BANK_LOANS 
      : params.loanType === 'INVESTOR_CAPITAL'
        ? ACCOUNT_CODES.INVESTOR_CAPITAL
        : ACCOUNT_CODES.BORROWED_FUNDS;

    const narration = params.description || `Loan received from ${params.source} - Principal: ₹${params.amount.toLocaleString()}`;

    return this.createJournalEntry({
      entryDate: params.borrowingDate,
      referenceType: 'MANUAL_ENTRY',
      narration,
      lines: [
        {
          // Debit: Bank Account (Asset increases - money IN)
          accountCode: ACCOUNT_CODES.BANK_ACCOUNT,
          debitAmount: params.amount,
          creditAmount: 0,
          narration: `Loan received from ${params.source}`,
        },
        {
          // Credit: Liability Account (Liability increases - money OWED)
          accountCode: liabilityAccountCode,
          debitAmount: 0,
          creditAmount: params.amount,
          narration: `Loan payable to ${params.source}`,
        },
      ],
      createdById: params.createdById,
      paymentMode: 'BANK_TRANSFER',
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    });
  }

  /**
   * LOAN REPAYMENT (Paying back external borrowing)
   * When the company repays the borrowed money
   * 
   * Debit: Bank Loans or Borrowed Funds (Liability decreases)
   * Debit: Interest Expense (Interest paid)
   * Credit: Bank Account (Asset decreases - money OUT)
   */
  async recordLoanRepayment(params: {
    amount: number;
    principalComponent: number;
    interestComponent: number;
    source: string;
    loanType: 'BANK_LOAN' | 'BORROWED_FUNDS' | 'INVESTOR_CAPITAL';
    repaymentDate: Date;
    createdById: string;
    bankAccountId?: string;
    reference?: string;
    description?: string;
  }): Promise<string> {
    const liabilityAccountCode = params.loanType === 'BANK_LOAN' 
      ? ACCOUNT_CODES.BANK_LOANS 
      : params.loanType === 'INVESTOR_CAPITAL'
        ? ACCOUNT_CODES.INVESTOR_CAPITAL
        : ACCOUNT_CODES.BORROWED_FUNDS;

    const lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      narration?: string;
    }> = [];

    // Debit: Liability Account (reduces what we owe)
    if (params.principalComponent > 0) {
      lines.push({
        accountCode: liabilityAccountCode,
        debitAmount: params.principalComponent,
        creditAmount: 0,
        narration: `Principal repayment to ${params.source}`,
      });
    }

    // Debit: Interest Expense (cost of borrowing)
    if (params.interestComponent > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.INTEREST_EXPENSE,
        debitAmount: params.interestComponent,
        creditAmount: 0,
        narration: `Interest paid to ${params.source}`,
      });
    }

    // Credit: Bank Account (money OUT)
    lines.push({
      accountCode: ACCOUNT_CODES.BANK_ACCOUNT,
      debitAmount: 0,
      creditAmount: params.amount,
      narration: `Payment to ${params.source}`,
    });

    const narration = params.description || `Loan repayment to ${params.source} - Principal: ₹${params.principalComponent.toLocaleString()}, Interest: ₹${params.interestComponent.toLocaleString()}`;

    return this.createJournalEntry({
      entryDate: params.repaymentDate,
      referenceType: 'MANUAL_ENTRY',
      narration,
      lines,
      createdById: params.createdById,
      paymentMode: 'BANK_TRANSFER',
      bankAccountId: params.bankAccountId,
      bankRefNumber: params.reference,
      isAutoEntry: true,
    });
  }

  // ============================================
  // REPORTING METHODS
  // ============================================

  /**
   * Get Trial Balance
   */
  async getTrialBalance(asOfDate?: Date): Promise<Array<{
    accountCode: string;
    accountName: string;
    accountType: string;
    debitBalance: number;
    creditBalance: number;
  }>> {
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    return accounts.map(account => {
      let debitBalance = 0;
      let creditBalance = 0;

      // For Assets and Expenses: positive balance = debit
      // For Liabilities, Income, Equity: positive balance = credit
      if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
        if (account.currentBalance >= 0) {
          debitBalance = account.currentBalance;
        } else {
          creditBalance = Math.abs(account.currentBalance);
        }
      } else {
        if (account.currentBalance >= 0) {
          creditBalance = account.currentBalance;
        } else {
          debitBalance = Math.abs(account.currentBalance);
        }
      }

      return {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        debitBalance,
        creditBalance,
      };
    });
  }

  /**
   * Get Profit & Loss Statement
   */
  async getProfitAndLoss(startDate: Date, endDate: Date): Promise<{
    income: Array<{ accountCode: string; accountName: string; amount: number }>;
    expenses: Array<{ accountCode: string; accountName: string; amount: number }>;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  }> {
    const incomeAccounts = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId, accountType: 'INCOME', isActive: true },
    });

    const expenseAccounts = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId, accountType: 'EXPENSE', isActive: true },
    });

    const income = incomeAccounts.map(account => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: account.currentBalance,
    }));

    const expenses = expenseAccounts.map(account => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: account.currentBalance,
    }));

    const totalIncome = income.reduce((sum, acc) => sum + acc.amount, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0);

    return {
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    };
  }

  /**
   * Get Balance Sheet
   */
  async getBalanceSheet(asOfDate: Date): Promise<{
    assets: Array<{ accountCode: string; accountName: string; amount: number }>;
    liabilities: Array<{ accountCode: string; accountName: string; amount: number }>;
    equity: Array<{ accountCode: string; accountName: string; amount: number }>;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const assetAccounts = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId, accountType: 'ASSET', isActive: true },
    });

    const liabilityAccounts = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId, accountType: 'LIABILITY', isActive: true },
    });

    const equityAccounts = await db.chartOfAccount.findMany({
      where: { companyId: this.companyId, accountType: 'EQUITY', isActive: true },
    });

    const assets = assetAccounts.map(account => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: account.currentBalance,
    }));

    const liabilities = liabilityAccounts.map(account => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: account.currentBalance,
    }));

    const equity = equityAccounts.map(account => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: account.currentBalance,
    }));

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((sum, acc) => sum + acc.amount, 0),
      totalLiabilities: liabilities.reduce((sum, acc) => sum + acc.amount, 0),
      totalEquity: equity.reduce((sum, acc) => sum + acc.amount, 0),
    };
  }

  /**
   * Get Loan Portfolio Report
   */
  async getLoanPortfolioReport(): Promise<{
    totalDisbursed: number;
    totalOutstanding: number;
    totalInterestAccrued: number;
    totalInterestCollected: number;
    npaAmount: number;
    overdueAmount: number;
  }> {
    // Get totals from chart of accounts
    const loansReceivableAccount = await db.chartOfAccount.findFirst({
      where: { companyId: this.companyId, accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE },
    });

    const interestReceivableAccount = await db.chartOfAccount.findFirst({
      where: { companyId: this.companyId, accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE },
    });

    const interestIncomeAccount = await db.chartOfAccount.findFirst({
      where: { companyId: this.companyId, accountCode: ACCOUNT_CODES.INTEREST_INCOME },
    });

    // Calculate from journal entries for more accuracy
    const disbursementEntries = await db.journalEntry.aggregate({
      where: {
        companyId: this.companyId,
        referenceType: 'LOAN_DISBURSEMENT',
      },
      _sum: { totalCredit: true },
    });

    return {
      totalDisbursed: disbursementEntries._sum.totalCredit || 0,
      totalOutstanding: loansReceivableAccount?.currentBalance || 0,
      totalInterestAccrued: interestReceivableAccount?.currentBalance || 0,
      totalInterestCollected: interestIncomeAccount?.currentBalance || 0,
      npaAmount: 0, // Calculate from NPA tracking
      overdueAmount: 0, // Calculate from EMI schedules
    };
  }

  /**
   * Get Journal Entries with filters
   */
  async getJournalEntries(params: {
    startDate?: Date;
    endDate?: Date;
    referenceType?: string;
    accountId?: string;
    loanId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    entries: Array<any>;
    total: number;
  }> {
    const where: any = { companyId: this.companyId, isReversed: false };

    if (params.startDate && params.endDate) {
      where.entryDate = {
        gte: params.startDate,
        lte: params.endDate,
      };
    }

    if (params.referenceType) {
      where.referenceType = params.referenceType;
    }

    if (params.loanId || params.customerId) {
      where.lines = {
        some: {},
      };
      if (params.loanId) where.lines.some.loanId = params.loanId;
      if (params.customerId) where.lines.some.customerId = params.customerId;
    }

    const [entries, total] = await Promise.all([
      db.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
        orderBy: { entryDate: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      db.journalEntry.count({ where }),
    ]);

    return { entries, total };
  }

  /**
   * Get Account Ledger (Account Statement)
   */
  async getAccountLedger(accountId: string, startDate?: Date, endDate?: Date): Promise<Array<{
    date: Date;
    entryNumber: string;
    narration: string;
    debit: number;
    credit: number;
    balance: number;
    referenceType?: string;
    referenceId?: string;
  }>> {
    const where: any = {
      accountId,
      journalEntry: { companyId: this.companyId, isReversed: false },
    };

    if (startDate && endDate) {
      where.journalEntry.entryDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const lines = await db.journalEntryLine.findMany({
      where,
      include: {
        journalEntry: true,
        account: true,
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    let runningBalance = 0;
    const account = lines[0]?.account;

    return lines.map(line => {
      // Calculate running balance based on account type
      if (account?.accountType === 'ASSET' || account?.accountType === 'EXPENSE') {
        runningBalance += line.debitAmount - line.creditAmount;
      } else {
        runningBalance += line.creditAmount - line.debitAmount;
      }

      return {
        date: line.journalEntry.entryDate,
        entryNumber: line.journalEntry.entryNumber,
        narration: line.narration || line.journalEntry.narration || '',
        debit: line.debitAmount,
        credit: line.creditAmount,
        balance: runningBalance,
        referenceType: line.journalEntry.referenceType || undefined,
        referenceId: line.journalEntry.referenceId || undefined,
      };
    });
  }

  /**
   * Get Customer Ledger (All transactions for a customer)
   */
  async getCustomerLedger(customerId: string, startDate?: Date, endDate?: Date): Promise<{
    entries: Array<any>;
    summary: {
      totalDisbursed: number;
      totalRepaid: number;
      outstandingPrincipal: number;
      totalInterestCharged: number;
      totalInterestPaid: number;
    };
  }> {
    const { entries } = await this.getJournalEntries({
      customerId,
      startDate,
      endDate,
      limit: 1000,
    });

    // Calculate summary
    let totalDisbursed = 0;
    let totalRepaid = 0;
    let totalInterestCharged = 0;
    let totalInterestPaid = 0;

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.account?.accountCode === ACCOUNT_CODES.LOANS_RECEIVABLE) {
          if (line.debitAmount > 0) totalDisbursed += line.debitAmount;
          if (line.creditAmount > 0) totalRepaid += line.creditAmount;
        }
        if (line.account?.accountCode === ACCOUNT_CODES.INTEREST_INCOME) {
          totalInterestCharged += line.creditAmount;
        }
      }
    }

    return {
      entries,
      summary: {
        totalDisbursed,
        totalRepaid,
        outstandingPrincipal: totalDisbursed - totalRepaid,
        totalInterestCharged,
        totalInterestPaid: totalInterestCharged, // Simplified
      },
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getAccountTypeName(type: string): string {
  const names: Record<string, string> = {
    ASSET: 'Assets',
    LIABILITY: 'Liabilities',
    INCOME: 'Income',
    EXPENSE: 'Expenses',
    EQUITY: 'Equity',
  };
  return names[type] || type;
}

// ============================================
// STANDALONE HELPER FUNCTIONS FOR API INTEGRATION
// These can be called directly from API routes
// ============================================

/**
 * Create journal entry for loan disbursement
 * Called when Cashier disburses a loan
 */
export async function createLoanDisbursementEntry(params: {
  loanId: string;
  customerId: string;
  amount: number;
  disbursementDate: Date;
  createdById: string;
  bankAccountId?: string;
  paymentMode?: string;
  reference?: string;
}): Promise<string> {
  // Get company ID from the loan
  const loan = await db.loanApplication.findUnique({
    where: { id: params.loanId },
    select: { companyId: true }
  });
  
  if (!loan?.companyId) {
    throw new Error('Loan company not found');
  }
  
  const accountingService = new AccountingService(loan.companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.recordLoanDisbursement({
    loanId: params.loanId,
    customerId: params.customerId,
    amount: params.amount,
    disbursementDate: params.disbursementDate,
    createdById: params.createdById,
    paymentMode: params.paymentMode || 'BANK_TRANSFER',
    bankAccountId: params.bankAccountId,
    reference: params.reference
  });
}

/**
 * Create journal entry for EMI payment collection
 * Called when any role collects an EMI payment
 * 
 * IMPORTANT: For mirror loans, pass targetCompanyId as the MIRROR company ID
 * This ensures the entry is recorded in the correct company's books
 */
export async function createEMIPaymentEntry(params: {
  loanId: string;
  customerId: string;
  paymentId: string;
  totalAmount: number;
  principalComponent: number;
  interestComponent: number;
  penaltyComponent?: number;
  paymentDate: Date;
  createdById: string;
  paymentMode: string;
  bankAccountId?: string;
  reference?: string;
  targetCompanyId?: string; // For mirror loans: use MIRROR company ID instead of original loan's company
}): Promise<string> {
  // Determine which company's books to use
  // For mirror loans: targetCompanyId is the mirror company (where actual money flows)
  // For regular loans: use the loan's own company
  let companyId: string | undefined = params.targetCompanyId || undefined;
  
  if (!companyId) {
    // Get company ID from the loan (default behavior for non-mirror loans)
    const loan = await db.loanApplication.findUnique({
      where: { id: params.loanId },
      select: { companyId: true }
    });
    companyId = loan?.companyId || undefined;
  }
  
  if (!companyId) {
    throw new Error('Company ID not found for accounting entry');
  }
  
  console.log(`[ACCOUNTING] Creating EMI payment entry for company: ${companyId} (loan: ${params.loanId}, targetCompanyId: ${params.targetCompanyId || 'not specified'})`);
  
  const accountingService = new AccountingService(companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.recordEMIPayment({
    loanId: params.loanId,
    customerId: params.customerId,
    paymentId: params.paymentId,
    totalAmount: params.totalAmount,
    principalComponent: params.principalComponent,
    interestComponent: params.interestComponent,
    penaltyComponent: params.penaltyComponent,
    paymentDate: params.paymentDate,
    createdById: params.createdById,
    paymentMode: params.paymentMode,
    bankAccountId: params.bankAccountId,
    reference: params.reference
  });
}

/**
 * Create journal entry for foreclosure
 * Called when a loan is foreclosed
 */
export async function createForeclosureEntry(params: {
  loanId: string;
  customerId: string;
  principalAmount: number;
  interestAmount: number;
  foreclosureCharges: number;
  foreclosureDate: Date;
  createdById: string;
  paymentMode?: string;
  bankAccountId?: string;
  reference?: string;
}): Promise<string> {
  // Get company ID from the loan
  const loan = await db.loanApplication.findUnique({
    where: { id: params.loanId },
    select: { companyId: true }
  });
  
  if (!loan?.companyId) {
    throw new Error('Loan company not found');
  }
  
  const accountingService = new AccountingService(loan.companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  const totalSettlement = params.principalAmount + params.interestAmount + params.foreclosureCharges;
  
  return accountingService.recordForeclosure({
    loanId: params.loanId,
    customerId: params.customerId,
    foreclosureId: `FORECLOSE-${params.loanId}-${Date.now()}`,
    outstandingPrincipal: params.principalAmount,
    pendingInterest: params.interestAmount,
    foreclosureCharges: params.foreclosureCharges,
    totalSettlement,
    settlementDate: params.foreclosureDate,
    createdById: params.createdById,
    paymentMode: params.paymentMode || 'BANK_TRANSFER',
    bankAccountId: params.bankAccountId,
    reference: params.reference
  });
}

/**
 * Create journal entry for processing fee collection
 * Called when processing fee is collected
 */
export async function createProcessingFeeEntry(params: {
  loanId: string;
  customerId: string;
  amount: number;
  collectionDate: Date;
  createdById: string;
  paymentMode?: string;
  bankAccountId?: string;
  reference?: string;
}): Promise<string> {
  // Get company ID from the loan
  const loan = await db.loanApplication.findUnique({
    where: { id: params.loanId },
    select: { companyId: true }
  });
  
  if (!loan?.companyId) {
    throw new Error('Loan company not found');
  }
  
  const accountingService = new AccountingService(loan.companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.recordProcessingFee({
    loanId: params.loanId,
    customerId: params.customerId,
    amount: params.amount,
    collectionDate: params.collectionDate,
    createdById: params.createdById,
    paymentMode: params.paymentMode || 'CASH',
    bankAccountId: params.bankAccountId,
    reference: params.reference
  });
}

/**
 * Create journal entry for expense recording
 * Called when any expense is recorded
 */
export async function createExpenseEntry(params: {
  companyId: string;
  expenseId: string;
  expenseType: string;
  amount: number;
  description: string;
  expenseDate: Date;
  createdById: string;
  paymentMode: string;
  bankAccountId?: string;
  reference?: string;
}): Promise<string> {
  const accountingService = new AccountingService(params.companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  // Map expense type to account code
  const expenseCodeMap: Record<string, string> = {
    'SALARY': '4000',
    'RENT': '4100',
    'MARKETING': '4200',
    'COMMISSION': '4300',
    'SOFTWARE': '4400',
    'BANK_CHARGES': '4500',
    'UTILITIES': '4600',
    'TRAVEL': '4700',
    'MISCELLANEOUS': '4800',
    'OTHER': '4800'
  };
  
  const expenseAccountCode = expenseCodeMap[params.expenseType.toUpperCase()] || '4800';
  
  return accountingService.recordExpense({
    expenseId: params.expenseId,
    expenseType: params.expenseType,
    expenseAccountCode,
    amount: params.amount,
    description: params.description,
    expenseDate: params.expenseDate,
    createdById: params.createdById,
    paymentMode: params.paymentMode,
    bankAccountId: params.bankAccountId,
    reference: params.reference
  });
}

/**
 * Create journal entry for settlement (money transfer between roles)
 * When money moves from Agent/Staff to Cashier
 */
export async function createSettlementEntry(params: {
  companyId: string;
  settlementId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentMode: string;
  settlementDate: Date;
  createdById: string;
  reference?: string;
}): Promise<string> {
  const accountingService = new AccountingService(params.companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  // Get entry number
  const entryNumber = await accountingService.generateEntryNumber();
  const financialYearId = await accountingService.getCurrentFinancialYear();
  
  // Create a manual journal entry for the settlement
  return accountingService.createJournalEntry({
    entryDate: params.settlementDate,
    referenceType: 'BANK_TRANSFER',
    referenceId: params.settlementId,
    narration: `Settlement transfer - ₹${params.amount.toLocaleString()}`,
    lines: [
      {
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: params.amount,
        creditAmount: 0,
        narration: 'Cash received from settlement'
      },
      {
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: 0,
        creditAmount: params.amount,
        narration: 'Settlement transfer'
      }
    ],
    createdById: params.createdById,
    paymentMode: params.paymentMode,
    bankRefNumber: params.reference,
    isAutoEntry: true
  });
}

/**
 * Create journal entry for credit increase (when someone deposits money)
 */
export async function createCreditDepositEntry(params: {
  companyId: string;
  userId: string;
  amount: number;
  paymentMode: string;
  depositDate: Date;
  createdById: string;
  description?: string;
  reference?: string;
}): Promise<string> {
  const accountingService = new AccountingService(params.companyId);
  
  // Initialize chart of accounts if needed
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.createJournalEntry({
    entryDate: params.depositDate,
    referenceType: 'CASH_DEPOSIT',
    narration: params.description || `Credit deposit by user - ₹${params.amount.toLocaleString()}`,
    lines: [
      {
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: params.amount,
        creditAmount: 0,
        narration: 'Cash/Bank deposit received'
      },
      {
        accountCode: ACCOUNT_CODES.INVESTOR_CAPITAL,
        debitAmount: 0,
        creditAmount: params.amount,
        narration: 'Capital contribution'
      }
    ],
    createdById: params.createdById,
    paymentMode: params.paymentMode,
    bankRefNumber: params.reference,
    isAutoEntry: true
  });
}

/**
 * Get all journal entries for a company (for accountant portal)
 */
export async function getAllJournalEntries(params: {
  companyId: string;
  startDate?: Date;
  endDate?: Date;
  referenceType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: any[]; total: number }> {
  const accountingService = new AccountingService(params.companyId);
  return accountingService.getJournalEntries({
    startDate: params.startDate,
    endDate: params.endDate,
    referenceType: params.referenceType,
    limit: params.limit || 100,
    offset: params.offset || 0
  });
}

/**
 * Initialize accounting for a new company
 */
export async function initializeCompanyAccounting(companyId: string): Promise<void> {
  const accountingService = new AccountingService(companyId);
  await accountingService.initializeChartOfAccounts();
  await accountingService.getCurrentFinancialYear();
}

// ============================================
// NEW CREDIT SYSTEM ACCOUNTING METHODS
// ============================================

/**
 * CREDIT TYPE OPTIONS:
 * 
 * 1. PERSONAL CREDIT (CASH only):
 *    - Entry in: Company 3 Cashbook ALWAYS
 *    - Used for: Extra EMIs when Secondary Payment Page is assigned to a role
 *    - Personal credit of that role increases
 * 
 * 2. COMPANY CREDIT - ONLINE:
 *    - Entry in: Loan Company's BANK ACCOUNT
 *    - Company credit increases
 * 
 * 3. COMPANY CREDIT - CASH:
 *    - Entry in: Loan Company's CASHBOOK
 *    - Company credit increases
 */

/**
 * Record EMI Payment with PERSONAL CREDIT (Cash only)
 * - Entry in Company 3 Cashbook ALWAYS
 * - Used for Extra EMIs when Secondary Payment Page is assigned
 */
export async function recordPersonalCreditEMIPayment(params: {
  loanId: string;
  customerId: string;
  paymentId: string;
  totalAmount: number;
  principalComponent: number;
  interestComponent: number;
  paymentDate: Date;
  createdById: string;
  collectedByName: string;
  loanNumber?: string;
  installmentNumber?: number;
}): Promise<string> {
  // Get Company 3 ID (assuming it's the third company or has specific code)
  const company3 = await db.company.findFirst({
    where: { code: 'C3' }
  }) || await db.company.findFirst({
    skip: 2,
    take: 1
  });
  
  if (!company3) {
    throw new Error('Company 3 not found');
  }
  
  // Get or create cashbook for Company 3
  let cashBook = await db.cashBook.findUnique({
    where: { companyId: company3.id }
  });
  
  if (!cashBook) {
    cashBook = await db.cashBook.create({
      data: {
        companyId: company3.id,
        currentBalance: 0
      }
    });
  }
  
  // Create cashbook entry
  const newBalance = cashBook.currentBalance + params.totalAmount;
  
  await db.cashBookEntry.create({
    data: {
      cashBookId: cashBook.id,
      entryType: 'CREDIT',
      amount: params.totalAmount,
      balanceAfter: newBalance,
      description: `EMI Collection (Personal Credit) - ${params.loanNumber || params.loanId} #${params.installmentNumber || ''} by ${params.collectedByName}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.paymentId,
      createdById: params.createdById,
      entryDate: params.paymentDate
    }
  });
  
  // Update cashbook balance
  await db.cashBook.update({
    where: { id: cashBook.id },
    data: {
      currentBalance: newBalance,
      lastUpdatedById: params.createdById,
      lastUpdatedAt: new Date()
    }
  });
  
  // Create journal entry for Company 3
  const accountingService = new AccountingService(company3.id);
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.createJournalEntry({
    entryDate: params.paymentDate,
    referenceType: 'EMI_PAYMENT',
    referenceId: params.paymentId,
    narration: `Extra EMI (Personal Credit) - ${params.loanNumber || params.loanId} by ${params.collectedByName}`,
    lines: [
      {
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: params.totalAmount,
        creditAmount: 0,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Cash received for EMI'
      },
      {
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        debitAmount: 0,
        creditAmount: params.principalComponent,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Principal repayment'
      },
      {
        accountCode: ACCOUNT_CODES.INTEREST_INCOME,
        debitAmount: 0,
        creditAmount: params.interestComponent,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Interest income'
      }
    ],
    createdById: params.createdById,
    paymentMode: 'CASH',
    isAutoEntry: true
  });
}

/**
 * Record EMI Payment with COMPANY CREDIT - ONLINE
 * - Entry in Loan Company's BANK ACCOUNT
 */
export async function recordCompanyCreditOnlineEMIPayment(params: {
  loanId: string;
  customerId: string;
  paymentId: string;
  totalAmount: number;
  principalComponent: number;
  interestComponent: number;
  paymentDate: Date;
  createdById: string;
  bankAccountId?: string;
  reference?: string;
  loanNumber?: string;
  installmentNumber?: number;
}): Promise<string> {
  // Get company ID from the loan
  const loan = await db.loanApplication.findUnique({
    where: { id: params.loanId },
    select: { companyId: true, applicationNo: true }
  });
  
  if (!loan?.companyId) {
    throw new Error('Loan company not found');
  }
  
  // Get or create bank account for the company
  let bankAccount = params.bankAccountId ? 
    await db.bankAccount.findUnique({ where: { id: params.bankAccountId } }) :
    await db.bankAccount.findFirst({ where: { companyId: loan.companyId, isActive: true } });
  
  if (!bankAccount) {
    // Create default bank account
    bankAccount = await db.bankAccount.create({
      data: {
        companyId: loan.companyId,
        bankName: 'Default Bank',
        accountNumber: 'DEFAULT-001',
        accountName: 'Operating Account',
        accountType: 'CURRENT',
        openingBalance: 0,
        currentBalance: 0,
        isDefault: true,
        isActive: true
      }
    });
  }
  
  // Create bank transaction
  const newBalance = bankAccount.currentBalance + params.totalAmount;
  
  await db.bankTransaction.create({
    data: {
      bankAccountId: bankAccount.id,
      transactionType: 'CREDIT',
      amount: params.totalAmount,
      balanceAfter: newBalance,
      description: `EMI Collection (Online) - ${params.loanNumber || loan.applicationNo} #${params.installmentNumber || ''}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.paymentId,
      createdById: params.createdById,
      transactionDate: params.paymentDate
    }
  });
  
  // Update bank account balance
  await db.bankAccount.update({
    where: { id: bankAccount.id },
    data: { currentBalance: newBalance }
  });
  
  // Update company credit
  await db.company.update({
    where: { id: loan.companyId },
    data: { companyCredit: { increment: params.totalAmount } }
  });
  
  // Create journal entry
  return createEMIPaymentEntry({
    loanId: params.loanId,
    customerId: params.customerId,
    paymentId: params.paymentId,
    totalAmount: params.totalAmount,
    principalComponent: params.principalComponent,
    interestComponent: params.interestComponent,
    paymentDate: params.paymentDate,
    createdById: params.createdById,
    paymentMode: 'ONLINE',
    bankAccountId: bankAccount.id,
    reference: params.reference
  });
}

/**
 * Record EMI Payment with COMPANY CREDIT - CASH
 * - Entry in Loan Company's CASHBOOK
 */
export async function recordCompanyCreditCashEMIPayment(params: {
  loanId: string;
  customerId: string;
  paymentId: string;
  totalAmount: number;
  principalComponent: number;
  interestComponent: number;
  paymentDate: Date;
  createdById: string;
  loanNumber?: string;
  installmentNumber?: number;
}): Promise<string> {
  // Get company ID from the loan
  const loan = await db.loanApplication.findUnique({
    where: { id: params.loanId },
    select: { companyId: true, applicationNo: true }
  });
  
  if (!loan?.companyId) {
    throw new Error('Loan company not found');
  }
  
  // Get or create cashbook for the company
  let cashBook = await db.cashBook.findUnique({
    where: { companyId: loan.companyId }
  });
  
  if (!cashBook) {
    cashBook = await db.cashBook.create({
      data: {
        companyId: loan.companyId,
        currentBalance: 0
      }
    });
  }
  
  // Create cashbook entry
  const newBalance = cashBook.currentBalance + params.totalAmount;
  
  await db.cashBookEntry.create({
    data: {
      cashBookId: cashBook.id,
      entryType: 'CREDIT',
      amount: params.totalAmount,
      balanceAfter: newBalance,
      description: `EMI Collection (Cash) - ${params.loanNumber || loan.applicationNo} #${params.installmentNumber || ''}`,
      referenceType: 'EMI_PAYMENT',
      referenceId: params.paymentId,
      createdById: params.createdById,
      entryDate: params.paymentDate
    }
  });
  
  // Update cashbook balance
  await db.cashBook.update({
    where: { id: cashBook.id },
    data: {
      currentBalance: newBalance,
      lastUpdatedById: params.createdById,
      lastUpdatedAt: new Date()
    }
  });
  
  // Update company credit
  await db.company.update({
    where: { id: loan.companyId },
    data: { companyCredit: { increment: params.totalAmount } }
  });
  
  // Create journal entry
  const accountingService = new AccountingService(loan.companyId);
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.createJournalEntry({
    entryDate: params.paymentDate,
    referenceType: 'EMI_PAYMENT',
    referenceId: params.paymentId,
    narration: `EMI Payment (Cash) - ${params.loanNumber || loan.applicationNo}`,
    lines: [
      {
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: params.totalAmount,
        creditAmount: 0,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Cash received for EMI'
      },
      {
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        debitAmount: 0,
        creditAmount: params.principalComponent,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Principal repayment'
      },
      {
        accountCode: ACCOUNT_CODES.INTEREST_INCOME,
        debitAmount: 0,
        creditAmount: params.interestComponent,
        loanId: params.loanId,
        customerId: params.customerId,
        narration: 'Interest income'
      }
    ],
    createdById: params.createdById,
    paymentMode: 'CASH',
    isAutoEntry: true
  });
}

// ============================================
// MIRROR LOAN ACCOUNTING
// ============================================

/**
 * Record MIRROR LOAN EMI Payment
 * IMPORTANT: Uses FULL MIRROR amounts, NOT the difference
 * - Entry in Mirror Company's books (Company 1 or 2)
 */
export async function recordMirrorLoanEMIPayment(params: {
  originalLoanId: string;
  mirrorLoanId: string;
  mirrorCompanyId: string;
  paymentId: string;
  mirrorPrincipal: number;  // Full mirror principal
  mirrorInterest: number;   // Full mirror interest
  paymentDate: Date;
  createdById: string;
  paymentMode: 'ONLINE' | 'CASH';
  bankAccountId?: string;
  mirrorLoanNumber?: string;
  installmentNumber?: number;
}): Promise<string> {
  const totalAmount = params.mirrorPrincipal + params.mirrorInterest;
  
  // Get or create cashbook/bank for mirror company
  if (params.paymentMode === 'ONLINE') {
    let bankAccount = params.bankAccountId ?
      await db.bankAccount.findUnique({ where: { id: params.bankAccountId } }) :
      await db.bankAccount.findFirst({ where: { companyId: params.mirrorCompanyId, isActive: true } });
    
    if (!bankAccount) {
      bankAccount = await db.bankAccount.create({
        data: {
          companyId: params.mirrorCompanyId,
          bankName: 'Default Bank',
          accountNumber: 'DEFAULT-001',
          accountName: 'Operating Account',
          accountType: 'CURRENT',
          openingBalance: 0,
          currentBalance: 0,
          isDefault: true,
          isActive: true
        }
      });
    }
    
    const newBalance = bankAccount.currentBalance + totalAmount;
    
    await db.bankTransaction.create({
      data: {
        bankAccountId: bankAccount.id,
        transactionType: 'CREDIT',
        amount: totalAmount,
        balanceAfter: newBalance,
        description: `Mirror EMI Collection - ${params.mirrorLoanNumber || params.mirrorLoanId} #${params.installmentNumber || ''}`,
        referenceType: 'MIRROR_EMI_PAYMENT',
        referenceId: params.paymentId,
        createdById: params.createdById,
        transactionDate: params.paymentDate
      }
    });
    
    await db.bankAccount.update({
      where: { id: bankAccount.id },
      data: { currentBalance: newBalance }
    });
  } else {
    // CASH - Update cashbook
    let cashBook = await db.cashBook.findUnique({
      where: { companyId: params.mirrorCompanyId }
    });
    
    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId: params.mirrorCompanyId,
          currentBalance: 0
        }
      });
    }
    
    const newBalance = cashBook.currentBalance + totalAmount;
    
    await db.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType: 'CREDIT',
        amount: totalAmount,
        balanceAfter: newBalance,
        description: `Mirror EMI Collection (Cash) - ${params.mirrorLoanNumber || params.mirrorLoanId} #${params.installmentNumber || ''}`,
        referenceType: 'MIRROR_EMI_PAYMENT',
        referenceId: params.paymentId,
        createdById: params.createdById,
        entryDate: params.paymentDate
      }
    });
    
    await db.cashBook.update({
      where: { id: cashBook.id },
      data: {
        currentBalance: newBalance,
        lastUpdatedById: params.createdById,
        lastUpdatedAt: new Date()
      }
    });
  }
  
  // Create journal entry for mirror company with FULL amounts
  const accountingService = new AccountingService(params.mirrorCompanyId);
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.createJournalEntry({
    entryDate: params.paymentDate,
    referenceType: 'MIRROR_EMI_PAYMENT',
    referenceId: params.paymentId,
    narration: `Mirror EMI Payment - ${params.mirrorLoanNumber || params.mirrorLoanId} - Principal: ₹${params.mirrorPrincipal}, Interest: ₹${params.mirrorInterest}`,
    lines: [
      {
        accountCode: params.paymentMode === 'ONLINE' ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: totalAmount,
        creditAmount: 0,
        loanId: params.mirrorLoanId,
        narration: `${params.paymentMode === 'ONLINE' ? 'Bank' : 'Cash'} received for Mirror EMI`
      },
      {
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        debitAmount: 0,
        creditAmount: params.mirrorPrincipal,
        loanId: params.mirrorLoanId,
        narration: 'Mirror principal repayment'
      },
      {
        accountCode: ACCOUNT_CODES.INTEREST_INCOME,
        debitAmount: 0,
        creditAmount: params.mirrorInterest,
        loanId: params.mirrorLoanId,
        narration: 'Mirror interest income'
      }
    ],
    createdById: params.createdById,
    paymentMode: params.paymentMode,
    bankAccountId: params.paymentMode === 'ONLINE' ? params.bankAccountId : undefined,
    isAutoEntry: true
  });
}

/**
 * Record EXTRA EMI Payment (After Mirror Tenure)
 * - Full amount is profit for Company 3
 * - Personal Credit goes to the role who collected (if Secondary Payment Page assigned)
 */
export async function recordExtraEMIPayment(params: {
  loanId: string;
  customerId: string;
  paymentId: string;
  totalAmount: number;
  paymentDate: Date;
  createdById: string;
  isPersonalCredit: boolean;  // true = Secondary Payment Page assigned
  collectedByName?: string;
  loanNumber?: string;
  installmentNumber?: number;
}): Promise<string> {
  if (params.isPersonalCredit) {
    // Personal Credit - Entry in Company 3 Cashbook
    return recordPersonalCreditEMIPayment({
      loanId: params.loanId,
      customerId: params.customerId,
      paymentId: params.paymentId,
      totalAmount: params.totalAmount,
      principalComponent: params.totalAmount,  // Full amount as principal (it's profit)
      interestComponent: 0,
      paymentDate: params.paymentDate,
      createdById: params.createdById,
      collectedByName: params.collectedByName || 'Staff',
      loanNumber: params.loanNumber,
      installmentNumber: params.installmentNumber
    });
  } else {
    // Company Credit - Entry in Company 3 Cashbook
    const company3 = await db.company.findFirst({
      where: { code: 'C3' }
    }) || await db.company.findFirst({ skip: 2, take: 1 });
    
    if (!company3) {
      throw new Error('Company 3 not found');
    }
    
    // Get or create cashbook
    let cashBook = await db.cashBook.findUnique({
      where: { companyId: company3.id }
    });
    
    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId: company3.id,
          currentBalance: 0
        }
      });
    }
    
    const newBalance = cashBook.currentBalance + params.totalAmount;
    
    await db.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType: 'CREDIT',
        amount: params.totalAmount,
        balanceAfter: newBalance,
        description: `Extra EMI Collection - ${params.loanNumber || params.loanId} #${params.installmentNumber || ''}`,
        referenceType: 'EXTRA_EMI_PAYMENT',
        referenceId: params.paymentId,
        createdById: params.createdById,
        entryDate: params.paymentDate
      }
    });
    
    await db.cashBook.update({
      where: { id: cashBook.id },
      data: {
        currentBalance: newBalance,
        lastUpdatedById: params.createdById,
        lastUpdatedAt: new Date()
      }
    });
    
    // Journal entry
    const accountingService = new AccountingService(company3.id);
    await accountingService.initializeChartOfAccounts();
    
    return accountingService.createJournalEntry({
      entryDate: params.paymentDate,
      referenceType: 'EXTRA_EMI_PAYMENT',
      referenceId: params.paymentId,
      narration: `Extra EMI Payment - ${params.loanNumber || params.loanId} - Full Profit`,
      lines: [
        {
          accountCode: ACCOUNT_CODES.CASH_IN_HAND,
          debitAmount: params.totalAmount,
          creditAmount: 0,
          loanId: params.loanId,
          customerId: params.customerId,
          narration: 'Cash received for Extra EMI'
        },
        {
          accountCode: ACCOUNT_CODES.OTHER_INCOME,
          debitAmount: 0,
          creditAmount: params.totalAmount,
          loanId: params.loanId,
          customerId: params.customerId,
          narration: 'Extra EMI income (full profit)'
        }
      ],
      createdById: params.createdById,
      paymentMode: 'CASH',
      isAutoEntry: true
    });
  }
}

// ============================================
// LOAN DISBURSEMENT ACCOUNTING
// ============================================

/**
 * Record Loan Disbursement
 * - If Mirror Loan: Entry in Mirror Company's Bank
 * - If No Mirror (Company 3): Entry in Company 3 Cashbook
 */
export async function recordLoanDisbursementEntry(params: {
  loanId: string;
  customerId: string;
  amount: number;
  disbursementDate: Date;
  createdById: string;
  isMirrorLoan: boolean;
  mirrorCompanyId?: string;
  paymentMode: 'BANK_TRANSFER' | 'CASH';
  bankAccountId?: string;
  reference?: string;
}): Promise<string> {
  let targetCompanyId: string;
  
  if (params.isMirrorLoan && params.mirrorCompanyId) {
    // Mirror Loan - Entry in Mirror Company's books
    targetCompanyId = params.mirrorCompanyId;
  } else {
    // No Mirror - Entry in Company 3's Cashbook (Company 3 has no bank)
    const company3 = await db.company.findFirst({
      where: { code: 'C3' }
    }) || await db.company.findFirst({ skip: 2, take: 1 });
    
    if (!company3) {
      throw new Error('Company 3 not found');
    }
    targetCompanyId = company3.id;
  }
  
  // For Company 3 (no bank account) - use Cashbook
  if (!params.isMirrorLoan) {
    let cashBook = await db.cashBook.findUnique({
      where: { companyId: targetCompanyId }
    });
    
    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId: targetCompanyId,
          currentBalance: 0
        }
      });
    }
    
    const newBalance = cashBook.currentBalance - params.amount; // Money goes OUT
    
    await db.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType: 'DEBIT',
        amount: params.amount,
        balanceAfter: newBalance,
        description: `Loan Disbursement - ${params.loanId}`,
        referenceType: 'LOAN_DISBURSEMENT',
        referenceId: params.loanId,
        createdById: params.createdById,
        entryDate: params.disbursementDate
      }
    });
    
    await db.cashBook.update({
      where: { id: cashBook.id },
      data: {
        currentBalance: newBalance,
        lastUpdatedById: params.createdById,
        lastUpdatedAt: new Date()
      }
    });
  }
  
  // Create journal entry
  const accountingService = new AccountingService(targetCompanyId);
  await accountingService.initializeChartOfAccounts();
  
  return accountingService.recordLoanDisbursement({
    loanId: params.loanId,
    customerId: params.customerId,
    amount: params.amount,
    disbursementDate: params.disbursementDate,
    createdById: params.createdById,
    paymentMode: params.isMirrorLoan ? 'BANK_TRANSFER' : 'CASH',
    bankAccountId: params.isMirrorLoan ? params.bankAccountId : undefined,
    reference: params.reference
  });
}
