import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting FULL accounting data reset for all companies...');

    // Delete all accounting-related data in correct FK order

    // 1. JournalEntry Lines (FK to JournalEntry)
    const deletedJournalLines = await db.journalEntryLine.deleteMany({});
    console.log(`Deleted ${deletedJournalLines.count} journal entry lines`);

    // 2. Journal Entries
    const deletedJournalEntries = await db.journalEntry.deleteMany({});
    console.log(`Deleted ${deletedJournalEntries.count} journal entries`);

    // 3. Daybook Entries
    const deletedDaybook = await db.daybookEntry.deleteMany({});
    console.log(`Deleted ${deletedDaybook.count} daybook entries`);

    // 4. Ledger Balances (FK to ChartOfAccount)
    const deletedLedgerBalances = await db.ledgerBalance.deleteMany({});
    console.log(`Deleted ${deletedLedgerBalances.count} ledger balances`);

    // 5. Chart of Accounts
    const deletedChartOfAccounts = await db.chartOfAccount.deleteMany({});
    console.log(`Deleted ${deletedChartOfAccounts.count} chart of accounts`);

    // 6. Account Heads
    const deletedAccountHeads = await db.accountHead.deleteMany({});
    console.log(`Deleted ${deletedAccountHeads.count} account heads`);

    // 7. Financial Years
    const deletedFinancialYears = await db.financialYear.deleteMany({});
    console.log(`Deleted ${deletedFinancialYears.count} financial years`);

    // 8. Equity Entries
    const deletedEquity = await db.equityEntry.deleteMany({});
    console.log(`Deleted ${deletedEquity.count} equity entries`);

    // 9. Borrowed Money (all external borrowings)
    const deletedBorrowed = await db.borrowedMoney.deleteMany({});
    console.log(`Deleted ${deletedBorrowed.count} borrowed money entries`);

    // 10. Invest Money
    const deletedInvest = await db.investMoney.deleteMany({});
    console.log(`Deleted ${deletedInvest.count} invest money entries`);

    // 11. Expenses
    const deletedExpenses = await db.expense.deleteMany({});
    console.log(`Deleted ${deletedExpenses.count} expenses`);

    // 12. Bank Transactions (FK to BankAccount)
    const deletedBankTransactions = await db.bankTransaction.deleteMany({});
    console.log(`Deleted ${deletedBankTransactions.count} bank transactions`);

    // 13. Bank Accounts
    const deletedBankAccounts = await db.bankAccount.deleteMany({});
    console.log(`Deleted ${deletedBankAccounts.count} bank accounts`);

    // 14. Cash Book Entries (FK to CashBook)
    const deletedCashBookEntries = await db.cashBookEntry.deleteMany({});
    console.log(`Deleted ${deletedCashBookEntries.count} cash book entries`);

    // 15. Cash Books
    const deletedCashBook = await db.cashBook.deleteMany({});
    console.log(`Deleted ${deletedCashBook.count} cash books`);

    // ── CRITICAL: Clear AccountingService static in-memory caches ──────────────
    // After DB reset, the server process still has stale "already initialized" flags.
    // Without clearing, next Repay/EMI call skips chart-of-accounts init → "Account not found"
    AccountingService.clearAllCaches();

    console.log('✅ Full accounting data reset completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'All accounting data has been reset to ZERO — completely fresh!',
      deleted: {
        journalEntryLines: deletedJournalLines.count,
        journalEntries: deletedJournalEntries.count,
        daybookEntries: deletedDaybook.count,
        ledgerBalances: deletedLedgerBalances.count,
        chartOfAccounts: deletedChartOfAccounts.count,
        accountHeads: deletedAccountHeads.count,
        financialYears: deletedFinancialYears.count,
        equityEntries: deletedEquity.count,
        borrowedMoney: deletedBorrowed.count,
        investMoney: deletedInvest.count,
        expenses: deletedExpenses.count,
        bankTransactions: deletedBankTransactions.count,
        bankAccounts: deletedBankAccounts.count,
        cashBookEntries: deletedCashBookEntries.count,
        cashBooks: deletedCashBook.count,
      }
    });
  } catch (error) {
    console.error('Error resetting accounting data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset accounting data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to reset all accounting data',
    warning: 'This will delete ALL accounting data for ALL companies — CashBook, Bank, Journals, Expenses, Borrowings everything!',
    clears: [
      'JournalEntries + Lines',
      'DaybookEntries',
      'LedgerBalances',
      'ChartOfAccounts',
      'AccountHeads',
      'FinancialYears',
      'EquityEntries',
      'BorrowedMoney',
      'InvestMoney',
      'Expenses',
      'BankTransactions',
      'BankAccounts',
      'CashBookEntries',
      'CashBooks',
    ]
  });
}
