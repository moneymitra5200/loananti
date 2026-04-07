/**
 * AUTO-FIX SCANNER SERVICE
 * 
 * This scanner automatically detects and fixes data inconsistencies
 * that occur when code is corrected after actions were already performed.
 * 
 * Example: If equity was added before CashBook fix, this scanner
 * will detect and fix the missing CashBook entries automatically.
 */

import { db } from './db';
import { ACCOUNT_CODES, DEFAULT_CHART_OF_ACCOUNTS } from './accounting-service';
import { AccountType } from '@prisma/client';

export interface ScanResult {
  scanName: string;
  description: string;
  issuesFound: number;
  issuesFixed: number;
  details: string[];
  timestamp: Date;
}

export interface FullScanReport {
  success: boolean;
  totalIssuesFound: number;
  totalIssuesFixed: number;
  scans: ScanResult[];
  timestamp: Date;
  message: string;
}

/**
 * Run all auto-fix scanners for a company
 */
export async function runAllAutoFixScanners(companyId: string): Promise<FullScanReport> {
  const scans: ScanResult[] = [];
  let totalIssuesFound = 0;
  let totalIssuesFixed = 0;

  try {
    // CRITICAL: First initialize Chart of Accounts
    const chartInit = await scanAndInitializeChartOfAccounts(companyId);
    scans.push(chartInit);
    totalIssuesFound += chartInit.issuesFound;
    totalIssuesFixed += chartInit.issuesFixed;

    // CRITICAL: Recalculate all account balances from journal entries
    const balanceRecalc = await scanAndRecalculateAccountBalances(companyId);
    scans.push(balanceRecalc);
    totalIssuesFound += balanceRecalc.issuesFound;
    totalIssuesFixed += balanceRecalc.issuesFixed;

    // Run each scanner
    const cashBookSync = await scanAndFixCashBookSync(companyId);
    scans.push(cashBookSync);
    totalIssuesFound += cashBookSync.issuesFound;
    totalIssuesFixed += cashBookSync.issuesFixed;

    const bankBalanceSync = await scanAndFixBankBalanceSync(companyId);
    scans.push(bankBalanceSync);
    totalIssuesFound += bankBalanceSync.issuesFound;
    totalIssuesFixed += bankBalanceSync.issuesFixed;

    const journalEntrySync = await scanAndFixJournalEntryBalances(companyId);
    scans.push(journalEntrySync);
    totalIssuesFound += journalEntrySync.issuesFound;
    totalIssuesFixed += journalEntrySync.issuesFixed;

    const equitySync = await scanAndFixEquityBalance(companyId);
    scans.push(equitySync);
    totalIssuesFound += equitySync.issuesFound;
    totalIssuesFixed += equitySync.issuesFixed;

    const loanDisbursementSync = await scanAndFixLoanDisbursements(companyId);
    scans.push(loanDisbursementSync);
    totalIssuesFound += loanDisbursementSync.issuesFound;
    totalIssuesFixed += loanDisbursementSync.issuesFixed;

    return {
      success: true,
      totalIssuesFound,
      totalIssuesFixed,
      scans,
      timestamp: new Date(),
      message: totalIssuesFound > 0 
        ? `Found ${totalIssuesFound} issues, fixed ${totalIssuesFixed}` 
        : 'No issues found - all data is consistent'
    };

  } catch (error) {
    console.error('Auto-fix scanner error:', error);
    return {
      success: false,
      totalIssuesFound,
      totalIssuesFixed,
      scans,
      timestamp: new Date(),
      message: `Error during scan: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * SCANNER 0: Initialize Chart of Accounts
 * Detects: Missing Chart of Accounts for company
 * Fixes: Creates default chart of accounts
 */
async function scanAndInitializeChartOfAccounts(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Chart of Accounts Init',
    description: 'Initializes default Chart of Accounts if missing',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    const existingAccounts = await db.chartOfAccount.count({
      where: { companyId }
    });

    if (existingAccounts === 0) {
      result.issuesFound = 1;
      result.details.push('No Chart of Accounts found - initializing defaults');

      // Create all default accounts
      const allAccounts = [
        ...DEFAULT_CHART_OF_ACCOUNTS.ASSETS,
        ...DEFAULT_CHART_OF_ACCOUNTS.LIABILITIES,
        ...DEFAULT_CHART_OF_ACCOUNTS.INCOME,
        ...DEFAULT_CHART_OF_ACCOUNTS.EXPENSES,
        ...DEFAULT_CHART_OF_ACCOUNTS.EQUITY,
      ];

      for (const account of allAccounts) {
        await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type as AccountType,
            isSystemAccount: account.isSystemAccount,
            description: account.description,
            openingBalance: 0,
            currentBalance: 0,
            isActive: true
          }
        });
      }

      result.issuesFixed = 1;
      result.details.push(`Created ${allAccounts.length} default accounts`);
    } else {
      result.details.push(`Chart of Accounts exists with ${existingAccounts} accounts`);
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER: Recalculate Account Balances from Journal Entries
 * This is CRITICAL - it recalculates all account balances from journal entries
 */
async function scanAndRecalculateAccountBalances(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Account Balances Recalc',
    description: 'Recalculates all account balances from journal entries',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    // Get all accounts for this company
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true }
    });

    if (accounts.length === 0) {
      result.details.push('No accounts found to recalculate');
      return result;
    }

    // Get all journal entries for this company
    const journalEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        isApproved: true,
        isReversed: false
      },
      include: {
        lines: true
      }
    });

    if (journalEntries.length === 0) {
      result.details.push('No journal entries found');
      return result;
    }

    result.details.push(`Found ${journalEntries.length} journal entries to process`);

    // Calculate balances for each account
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const balances = new Map<string, { debit: number; credit: number }>();

    for (const account of accounts) {
      balances.set(account.id, { debit: 0, credit: 0 });
    }

    // Sum up all journal entry lines
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const current = balances.get(line.accountId);
        if (current) {
          current.debit += line.debitAmount;
          current.credit += line.creditAmount;
        }
      }
    }

    // Update each account's balance
    for (const [accountId, totals] of balances) {
      const account = accountMap.get(accountId);
      if (!account) continue;

      // Calculate balance based on account type
      let newBalance = 0;
      if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
        // Debit accounts: Debit increases, Credit decreases
        newBalance = totals.debit - totals.credit;
      } else {
        // Credit accounts: Credit increases, Debit decreases
        newBalance = totals.credit - totals.debit;
      }

      const currentBalance = account.currentBalance || 0;

      if (Math.abs(newBalance - currentBalance) > 0.01) {
        result.issuesFound++;

        await db.chartOfAccount.update({
          where: { id: accountId },
          data: { currentBalance: newBalance }
        });

        result.details.push(`${account.accountCode} ${account.accountName}: ₹${currentBalance} → ₹${newBalance}`);
        result.issuesFixed++;
      }
    }

    if (result.issuesFound === 0) {
      result.details.push('All account balances are correct');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER 1: CashBook Sync
 * Detects: Equity entries in Chart of Accounts that are missing in CashBook
 * Fixes: Creates missing CashBook entries
 */
async function scanAndFixCashBookSync(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'CashBook Sync',
    description: 'Syncs CashBook with Chart of Accounts equity entries',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    // Get Cash in Hand account from Chart of Accounts
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
    });

    if (!cashAccount) {
      result.details.push('No Cash in Hand account found');
      return result;
    }

    // Get or create CashBook
    let cashBook = await db.cashBook.findUnique({ where: { companyId } });
    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: { companyId, openingBalance: 0, currentBalance: 0 }
      });
      result.details.push('Created new CashBook');
    }

    const chartCashBalance = cashAccount.currentBalance || 0;
    const cashBookBalance = cashBook.currentBalance || 0;

    // Check for discrepancy
    if (Math.abs(chartCashBalance - cashBookBalance) > 0.01) {
      result.issuesFound = 1;
      result.details.push(`Discrepancy found: Chart of Accounts shows ₹${chartCashBalance}, CashBook shows ₹${cashBookBalance}`);

      // Find all journal entries that affect cash
      const cashJournalEntries = await db.journalEntry.findMany({
        where: {
          companyId,
          isApproved: true,
          isReversed: false,
          lines: {
            some: {
              accountId: cashAccount.id,
              OR: [
                { debitAmount: { gt: 0 } },
                { creditAmount: { gt: 0 } }
              ]
            }
          }
        },
        include: {
          lines: {
            where: { accountId: cashAccount.id }
          }
        }
      });

      // Create missing CashBook entries
      for (const entry of cashJournalEntries) {
        for (const line of entry.lines) {
          const existingEntry = await db.cashBookEntry.findFirst({
            where: { cashBookId: cashBook.id, referenceId: entry.id }
          });

          if (!existingEntry) {
            const lastEntry = await db.cashBookEntry.findFirst({
              where: { cashBookId: cashBook.id },
              orderBy: { createdAt: 'desc' }
            });
            const lastBalance = lastEntry?.balanceAfter || 0;
            
            const isCredit = line.debitAmount > 0;
            const amount = Math.max(line.debitAmount, line.creditAmount);
            const newBalance = isCredit ? lastBalance + amount : lastBalance - amount;

            await db.cashBookEntry.create({
              data: {
                cashBookId: cashBook.id,
                entryType: isCredit ? 'CREDIT' : 'DEBIT',
                amount,
                balanceAfter: newBalance,
                description: entry.narration || 'Auto-synced from journal entry',
                referenceType: entry.referenceType || 'MANUAL_ENTRY',
                referenceId: entry.id,
                entryDate: entry.entryDate,
                createdById: entry.createdById
              }
            });
            result.details.push(`Created CashBook entry for ${entry.entryNumber}: ₹${amount}`);
          }
        }
      }

      // Recalculate and update CashBook balance
      const credits = await db.cashBookEntry.aggregate({
        where: { cashBookId: cashBook.id, entryType: 'CREDIT' },
        _sum: { amount: true }
      });
      const debits = await db.cashBookEntry.aggregate({
        where: { cashBookId: cashBook.id, entryType: 'DEBIT' },
        _sum: { amount: true }
      });

      const correctBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);
      await db.cashBook.update({
        where: { id: cashBook.id },
        data: { currentBalance: correctBalance }
      });

      result.issuesFixed = 1;
      result.details.push(`CashBook balance updated to ₹${correctBalance}`);
    } else {
      result.details.push('CashBook is in sync with Chart of Accounts');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER 2: Bank Balance Sync
 * Detects: Bank account balances that don't match BankTransaction records
 * Fixes: Recalculates bank balances from transactions
 */
async function scanAndFixBankBalanceSync(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Bank Balance Sync',
    description: 'Syncs Bank Account balances with BankTransaction records',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true }
    });

    for (const bank of bankAccounts) {
      // Calculate balance from transactions
      const transactions = await db.bankTransaction.findMany({
        where: { bankAccountId: bank.id }
      });

      let calculatedBalance = 0;
      for (const txn of transactions) {
        if (txn.transactionType === 'CREDIT') {
          calculatedBalance += txn.amount;
        } else {
          calculatedBalance -= txn.amount;
        }
      }

      const recordedBalance = bank.currentBalance || 0;

      if (Math.abs(calculatedBalance - recordedBalance) > 0.01) {
        result.issuesFound++;
        result.details.push(`${bank.bankName}: Recorded ₹${recordedBalance}, Calculated ₹${calculatedBalance}`);

        // Fix the balance
        await db.bankAccount.update({
          where: { id: bank.id },
          data: { currentBalance: calculatedBalance }
        });

        // Update balanceAfter in transactions
        let runningBalance = 0;
        const sortedTxns = transactions.sort((a, b) => 
          new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
        );

        for (const txn of sortedTxns) {
          if (txn.transactionType === 'CREDIT') {
            runningBalance += txn.amount;
          } else {
            runningBalance -= txn.amount;
          }
          await db.bankTransaction.update({
            where: { id: txn.id },
            data: { balanceAfter: runningBalance }
          });
        }

        result.issuesFixed++;
        result.details.push(`${bank.bankName}: Balance corrected to ₹${calculatedBalance}`);
      }
    }

    if (result.issuesFound === 0) {
      result.details.push('All bank accounts are in sync');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER 3: Journal Entry Balance Check
 * Detects: Journal entries where totalDebit != totalCredit
 * Fixes: Recalculates and updates the totals
 */
async function scanAndFixJournalEntryBalances(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Journal Entry Balance',
    description: 'Fixes journal entries where debit != credit',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      include: { lines: true }
    });

    for (const entry of journalEntries) {
      const actualDebit = entry.lines.reduce((sum, line) => sum + line.debitAmount, 0);
      const actualCredit = entry.lines.reduce((sum, line) => sum + line.creditAmount, 0);

      if (Math.abs(actualDebit - actualCredit) > 0.01) {
        result.issuesFound++;
        result.details.push(`${entry.entryNumber}: Debit ₹${actualDebit}, Credit ₹${actualCredit} - UNBALANCED!`);
        // Note: We can't auto-fix unbalanced entries - they need manual review
        result.details.push(`${entry.entryNumber}: Needs manual review - cannot auto-fix`);
      } else if (Math.abs(entry.totalDebit - actualDebit) > 0.01 || Math.abs(entry.totalCredit - actualCredit) > 0.01) {
        result.issuesFound++;
        result.details.push(`${entry.entryNumber}: Stored totals don't match line items`);

        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: actualDebit, totalCredit: actualCredit }
        });

        result.issuesFixed++;
        result.details.push(`${entry.entryNumber}: Totals updated`);
      }
    }

    if (result.issuesFound === 0) {
      result.details.push('All journal entries are balanced');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER 4: Equity Balance Check
 * Detects: Owner's Capital account balance doesn't match total equity added
 * Fixes: Recalculates from journal entries
 */
async function scanAndFixEquityBalance(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Equity Balance',
    description: 'Syncs Owner\'s Capital account with equity journal entries',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.OWNERS_CAPITAL }
    });

    if (!equityAccount) {
      result.details.push('No Owner\'s Capital account found');
      return result;
    }

    // Calculate from journal entries
    const equityEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        referenceType: 'OPENING_BALANCE',
        isApproved: true,
        isReversed: false
      },
      include: {
        lines: {
          where: { accountId: equityAccount.id }
        }
      }
    });

    let totalEquity = 0;
    for (const entry of equityEntries) {
      for (const line of entry.lines) {
        totalEquity += line.creditAmount;
      }
    }

    const recordedBalance = equityAccount.currentBalance || 0;

    if (Math.abs(totalEquity - recordedBalance) > 0.01) {
      result.issuesFound = 1;
      result.details.push(`Recorded: ₹${recordedBalance}, Calculated: ₹${totalEquity}`);

      await db.chartOfAccount.update({
        where: { id: equityAccount.id },
        data: { currentBalance: totalEquity }
      });

      result.issuesFixed = 1;
      result.details.push(`Owner's Capital balance updated to ₹${totalEquity}`);
    } else {
      result.details.push('Equity balance is correct');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER 5: Loan Disbursement Sync
 * Detects: Loan disbursements missing journal entries
 * Fixes: Creates missing journal entries
 */
async function scanAndFixLoanDisbursements(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Loan Disbursement Sync',
    description: 'Creates missing journal entries for loan disbursements',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    // Find disbursed loans
    const disbursedLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['DISBURSED', 'ACTIVE'] },
        disbursedAmount: { not: null }
      }
    });

    for (const loan of disbursedLoans) {
      // Check if journal entry exists
      const existingEntry = await db.journalEntry.findFirst({
        where: {
          companyId,
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: loan.id
        }
      });

      if (!existingEntry && loan.disbursedAmount) {
        result.issuesFound++;
        result.details.push(`Loan ${loan.applicationNo}: Missing journal entry for ₹${loan.disbursedAmount}`);
        // Note: Creating journal entries requires AccountingService - skip for now
        result.details.push(`Loan ${loan.applicationNo}: Requires manual fix or re-disbursement`);
      }
    }

    if (result.issuesFound === 0) {
      result.details.push('All loan disbursements have journal entries');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Quick check if company needs auto-fix
 */
export async function needsAutoFix(companyId: string): Promise<{
  needed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check CashBook sync
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
    });
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });

    if (cashAccount && cashBook) {
      if (Math.abs((cashAccount.currentBalance || 0) - (cashBook.currentBalance || 0)) > 0.01) {
        issues.push('CashBook out of sync with Chart of Accounts');
      }
    }

    // Check bank balances
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true }
    });

    for (const bank of bankAccounts) {
      const transactions = await db.bankTransaction.findMany({
        where: { bankAccountId: bank.id }
      });
      const calculated = transactions.reduce((sum, txn) => 
        sum + (txn.transactionType === 'CREDIT' ? txn.amount : -txn.amount), 0
      );
      if (Math.abs(calculated - (bank.currentBalance || 0)) > 0.01) {
        issues.push(`${bank.bankName} balance mismatch`);
      }
    }

  } catch (error) {
    issues.push('Error checking for issues');
  }

  return {
    needed: issues.length > 0,
    issues
  };
}
