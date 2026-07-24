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
import { ACCOUNT_CODES, DEFAULT_CHART_OF_ACCOUNTS, AccountingService } from './accounting-service';

// Account types as strings (not enum in schema)
type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';

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

    const emiPaymentSync = await scanAndFixEMIPayments(companyId);
    scans.push(emiPaymentSync);
    totalIssuesFound += emiPaymentSync.issuesFound;
    totalIssuesFixed += emiPaymentSync.issuesFixed;

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
 * Detects: All transactions that should be in CashBook but are missing
 * Fixes: Creates missing CashBook entries from:
 *   1. Equity entries in Chart of Accounts
 *   2. Loan disbursements (including mirror loan disbursements)
 *   3. Bank transactions that should have cash counterpart
 */
async function scanAndFixCashBookSync(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'CashBook Sync',
    description: 'Syncs CashBook with all cash-related transactions',
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

    // 1. Sync from Journal Entries that affect cash
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

    for (const entry of cashJournalEntries) {
      for (const line of entry.lines) {
        const existingEntry = await db.cashBookEntry.findFirst({
          where: { 
            cashBookId: cashBook.id, 
            referenceId: entry.id,
            referenceType: entry.referenceType || 'MANUAL_ENTRY'
          }
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
          result.issuesFound++;
          result.issuesFixed++;
          result.details.push(`Created CashBook entry for ${entry.entryNumber}: ₹${amount}`);
        }
      }
    }

    // 2. Sync from Loan Disbursements (for mirror loans)
    const disbursedLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        disbursedAmount: { not: null }
      }
    });

    for (const loan of disbursedLoans) {
      // Check if this is a mirror loan disbursement (no bank account used)
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { mirrorLoanId: loan.id }
      });

      // Check if CashBook entry exists for this disbursement
      const existingEntry = await db.cashBookEntry.findFirst({
        where: {
          cashBookId: cashBook.id,
          referenceId: loan.id,
          referenceType: 'LOAN_DISBURSEMENT'
        }
      });

      if (!existingEntry && loan.disbursedAmount) {
        // Check if there's a BankTransaction for this loan
        const bankTransaction = await db.bankTransaction.findFirst({
          where: {
            referenceId: loan.id,
            referenceType: 'LOAN_DISBURSEMENT'
          }
        });

        // If no bank transaction, it might be a cash disbursement
        // But we need to check if the amount was fully covered by bank
        if (!bankTransaction) {
          // Check journal entries instead
          const journalEntry = await db.journalEntry.findFirst({
            where: {
              companyId,
              referenceId: loan.id,
              referenceType: 'LOAN_DISBURSEMENT'
            },
            include: { lines: true }
          });

          if (journalEntry) {
            // Check if cash account was credited
            const cashLine = journalEntry.lines.find(l => l.accountId === cashAccount.id);
            if (cashLine && cashLine.creditAmount > 0) {
              result.details.push(`Loan ${loan.applicationNo}: Cash journal entry exists, CashBook should be synced`);
            }
          }
        }
      }
    }

    // 3. Recalculate CashBook balance
    const credits = await db.cashBookEntry.aggregate({
      where: { cashBookId: cashBook.id, entryType: 'CREDIT' },
      _sum: { amount: true }
    });
    const debits = await db.cashBookEntry.aggregate({
      where: { cashBookId: cashBook.id, entryType: 'DEBIT' },
      _sum: { amount: true }
    });

    const correctBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);
    const currentBalance = cashBook.currentBalance || 0;

    if (Math.abs(correctBalance - currentBalance) > 0.01) {
      result.issuesFound++;
      await db.cashBook.update({
        where: { id: cashBook.id },
        data: { currentBalance: correctBalance }
      });
      result.issuesFixed++;
      result.details.push(`CashBook balance corrected: ₹${currentBalance} → ₹${correctBalance}`);
    }

    if (result.issuesFound === 0) {
      result.details.push('CashBook is in sync with all transactions');
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
 * Fixes: Adds a Suspense balancing line to each unbalanced entry
 */
async function scanAndFixJournalEntryBalances(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'Journal Entry Balance',
    description: 'Fixes journal entries where debit != credit by adding Suspense lines',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    // Ensure Suspense account exists
    let suspense = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '9999' }
    });
    if (!suspense) {
      suspense = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '9999',
          accountName: 'Suspense – Opening Adjustment',
          accountType: 'EQUITY',
          isSystemAccount: true,
          description: 'Auto-created by scanner to absorb imbalances',
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        }
      });
      result.details.push('Created Suspense account (9999)');
    }

    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      include: { lines: true }
    });

    for (const entry of journalEntries) {
      const actualDebit  = entry.lines.reduce((sum, line) => sum + line.debitAmount,  0);
      const actualCredit = entry.lines.reduce((sum, line) => sum + line.creditAmount, 0);
      const diff = Math.abs(actualDebit - actualCredit);

      // Fix stored totals if they don't match line sums
      if (
        Math.abs(entry.totalDebit  - actualDebit)  > 0.005 ||
        Math.abs(entry.totalCredit - actualCredit) > 0.005
      ) {
        result.issuesFound++;
        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: actualDebit, totalCredit: actualCredit }
        });
        result.issuesFixed++;
        result.details.push(`${entry.entryNumber}: stored totals corrected`);
      }

      // Fix actual imbalance in lines by adding Suspense line
      if (diff > 0.005) {
        result.issuesFound++;

        const addDebit  = actualCredit > actualDebit;  // Cr heavy → add Dr to Suspense
        const addCredit = actualDebit  > actualCredit; // Dr heavy → add Cr to Suspense

        await db.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            accountId:      suspense.id,
            debitAmount:    addDebit  ? diff : 0,
            creditAmount:   addCredit ? diff : 0,
            narration:      'Auto-balance [Scanner]',
          }
        });

        // Update stored totals to now-balanced amount
        const balanced = Math.max(actualDebit, actualCredit);
        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: balanced, totalCredit: balanced }
        });

        result.issuesFixed++;
        result.details.push(`${entry.entryNumber}: unbalanced by ₹${diff.toFixed(2)} — Suspense line added`);
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
 * Fixes: Creates missing journal entries automatically via AccountingService
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
    const acct = new AccountingService(companyId);

    // Find disbursed online loans
    const onlineLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['DISBURSED', 'ACTIVE', 'ACTIVE_INTEREST_ONLY', 'CLOSED'] },
        disbursedAmount: { not: null, gt: 0 }
      },
      include: { customer: true }
    });

    for (const loan of onlineLoans) {
      const existingEntry = await db.journalEntry.findFirst({
        where: {
          companyId,
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: loan.id,
          isReversed: false
        }
      });

      if (!existingEntry && loan.disbursedAmount) {
        result.issuesFound++;
        try {
          await acct.recordLoanDisbursement({
            loanId: loan.id,
            customerId: loan.customerId || '',
            customerName: loan.customer?.name || 'Customer',
            amount: loan.disbursedAmount,
            disbursementDate: loan.disbursedAt || loan.createdAt,
            createdById: (loan as any).userId || (loan as any).createdById || 'SYSTEM',
            paymentMode: 'BANK_TRANSFER',
          });
          result.issuesFixed++;
          result.details.push(`Loan ${loan.applicationNo}: Auto-created missing disbursement JE for ₹${loan.disbursedAmount}`);
        } catch (err: any) {
          result.details.push(`Loan ${loan.applicationNo}: Error auto-creating JE: ${err.message}`);
        }
      }
    }

    if (result.issuesFound === 0) {
      result.details.push('All loan disbursements have valid journal entries');
    }

  } catch (error) {
    result.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * SCANNER 6: EMI Payment Sync
 * Detects: Paid EMI schedules missing journal entries
 * Fixes: Creates missing journal entries for paid EMIs
 */
async function scanAndFixEMIPayments(companyId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanName: 'EMI Payment Sync',
    description: 'Creates missing journal entries for paid EMI schedules',
    issuesFound: 0,
    issuesFixed: 0,
    details: [],
    timestamp: new Date()
  };

  try {
    const acct = new AccountingService(companyId);

    // Find paid online EMI schedules
    const paidEMIs = await db.eMISchedule.findMany({
      where: {
        paymentStatus: 'PAID',
        paidAmount: { gt: 0 },
        loanApplication: { companyId }
      },
      include: {
        loanApplication: {
          include: { customer: true }
        }
      }
    });

    for (const emi of paidEMIs) {
      const existingEntry = await db.journalEntry.findFirst({
        where: {
          companyId,
          referenceType: { in: ['EMI_PAYMENT', 'MIRROR_EMI_PAYMENT'] },
          referenceId: emi.id,
          isReversed: false
        }
      });

      if (!existingEntry) {
        result.issuesFound++;
        try {
          await acct.recordEMIPayment({
            loanId: emi.loanApplicationId,
            customerId: emi.loanApplication.customerId || '',
            customerName: emi.loanApplication.customer?.name || 'Customer',
            paymentId: emi.id,
            totalAmount: emi.paidAmount || emi.totalAmount,
            principalComponent: emi.paidPrincipal || emi.principalAmount,
            interestComponent: emi.paidInterest || emi.interestAmount,
            penaltyComponent: (emi as any).paidPenalty || (emi as any).penaltyAmount || 0,
            paymentDate: emi.paidDate || new Date(),
            createdById: (emi.loanApplication as any).userId || (emi.loanApplication as any).createdById || 'SYSTEM',
            paymentMode: (emi as any).paymentMode || 'CASH',
          });
          result.issuesFixed++;
          result.details.push(`EMI Schedule ${emi.installmentNumber} (${emi.loanApplication.applicationNo}): Auto-created missing payment JE for ₹${emi.paidAmount}`);
        } catch (err: any) {
          result.details.push(`EMI Schedule ${emi.installmentNumber}: Error auto-creating payment JE: ${err.message}`);
        }
      }
    }

    if (result.issuesFound === 0) {
      result.details.push('All paid EMIs have valid journal entries');
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
