import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting accounting data reset for all companies...');

    // Delete all accounting-related data in the correct order (respecting foreign key constraints)
    
    // 1. Delete Daybook Entries
    const deletedDaybook = await db.daybookEntry.deleteMany({});
    console.log(`Deleted ${deletedDaybook.count} daybook entries`);

    // 2. Delete Account Heads
    const deletedAccountHeads = await db.accountHead.deleteMany({});
    console.log(`Deleted ${deletedAccountHeads.count} account heads`);

    // 3. Delete Equity Entries
    const deletedEquity = await db.equityEntry.deleteMany({});
    console.log(`Deleted ${deletedEquity.count} equity entries`);

    // 4. Delete Borrowed Money
    const deletedBorrowed = await db.borrowedMoney.deleteMany({});
    console.log(`Deleted ${deletedBorrowed.count} borrowed money entries`);

    // 5. Delete Invest Money
    const deletedInvest = await db.investMoney.deleteMany({});
    console.log(`Deleted ${deletedInvest.count} invest money entries`);

    // 6. Delete Journal Entry Lines first (due to foreign key)
    const deletedJournalLines = await db.journalEntryLine.deleteMany({});
    console.log(`Deleted ${deletedJournalLines.count} journal entry lines`);

    // 7. Delete Journal Entries
    const deletedJournalEntries = await db.journalEntry.deleteMany({});
    console.log(`Deleted ${deletedJournalEntries.count} journal entries`);

    // 8. Delete Ledger Balances first (due to foreign key)
    const deletedLedgerBalances = await db.ledgerBalance.deleteMany({});
    console.log(`Deleted ${deletedLedgerBalances.count} ledger balances`);

    // 9. Delete Chart of Accounts
    const deletedChartOfAccounts = await db.chartOfAccount.deleteMany({});
    console.log(`Deleted ${deletedChartOfAccounts.count} chart of accounts`);

    // 10. Delete Financial Years
    const deletedFinancialYears = await db.financialYear.deleteMany({});
    console.log(`Deleted ${deletedFinancialYears.count} financial years`);

    // 11. Delete Expenses
    const deletedExpenses = await db.expense.deleteMany({});
    console.log(`Deleted ${deletedExpenses.count} expenses`);

    // 12. Delete Bank Accounts
    const deletedBankAccounts = await db.bankAccount.deleteMany({});
    console.log(`Deleted ${deletedBankAccounts.count} bank accounts`);

    // 13. Delete Cash Book Entries first (due to foreign key)
    const deletedCashBookEntries = await db.cashBookEntry.deleteMany({});
    console.log(`Deleted ${deletedCashBookEntries.count} cash book entries`);

    // 14. Delete Cash Book
    const deletedCashBook = await db.cashBook.deleteMany({});
    console.log(`Deleted ${deletedCashBook.count} cash books`);

    console.log('Accounting data reset completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'All accounting data has been reset successfully',
      deleted: {
        daybookEntries: deletedDaybook.count,
        accountHeads: deletedAccountHeads.count,
        equityEntries: deletedEquity.count,
        borrowedMoney: deletedBorrowed.count,
        investMoney: deletedInvest.count,
        journalEntryLines: deletedJournalLines.count,
        journalEntries: deletedJournalEntries.count,
        ledgerBalances: deletedLedgerBalances.count,
        chartOfAccounts: deletedChartOfAccounts.count,
        financialYears: deletedFinancialYears.count,
        expenses: deletedExpenses.count,
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
    warning: 'This will delete ALL accounting data for ALL companies!'
  });
}
