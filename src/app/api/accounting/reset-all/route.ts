import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

export async function POST(request: NextRequest) {
  try {
    // Support optional companyId for per-company reset
    let targetCompanyId: string | undefined;
    try {
      const body = await request.json();
      targetCompanyId = body?.companyId || undefined;
    } catch { /* no body = global reset */ }

    const companyFilter = targetCompanyId ? { companyId: targetCompanyId } : {};
    const companyLabel = targetCompanyId ? `company [${targetCompanyId}]` : 'ALL companies';
    console.log(`Starting FULL accounting data reset for ${companyLabel}...`);

    // ── For global reset: delete in FK order (journal lines before entries) ──
    // ── For per-company reset: filter by companyId where possible ──

    // 1. Journal Entry Lines (FK to JournalEntry – no direct companyId, cascade via JournalEntry)
    let deletedJournalLines: { count: number };
    if (targetCompanyId) {
      // Get journal entry IDs for this company first
      const jeIds = await db.journalEntry.findMany({ where: { companyId: targetCompanyId }, select: { id: true } });
      const ids = jeIds.map(j => j.id);
      deletedJournalLines = ids.length > 0
        ? await db.journalEntryLine.deleteMany({ where: { journalEntryId: { in: ids } } })
        : { count: 0 };
    } else {
      deletedJournalLines = await db.journalEntryLine.deleteMany({});
    }
    console.log(`Deleted ${deletedJournalLines.count} journal entry lines`);

    // 2. Journal Entries
    const deletedJournalEntries = await db.journalEntry.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedJournalEntries.count} journal entries`);

    // 3. Daybook Entries
    const deletedDaybook = await db.daybookEntry.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedDaybook.count} daybook entries`);

    // 4. Ledger Balances (FK to ChartOfAccount — filter via account)
    let deletedLedgerBalances: { count: number };
    if (targetCompanyId) {
      const accts = await db.chartOfAccount.findMany({ where: { companyId: targetCompanyId }, select: { id: true } });
      const ids = accts.map(a => a.id);
      deletedLedgerBalances = ids.length > 0
        ? await db.ledgerBalance.deleteMany({ where: { accountId: { in: ids } } })
        : { count: 0 };
    } else {
      deletedLedgerBalances = await db.ledgerBalance.deleteMany({});
    }
    console.log(`Deleted ${deletedLedgerBalances.count} ledger balances`);

    // 5. Chart of Accounts
    const deletedChartOfAccounts = await db.chartOfAccount.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedChartOfAccounts.count} chart of accounts`);

    // 6. Account Heads
    const deletedAccountHeads = await db.accountHead.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedAccountHeads.count} account heads`);

    // 7. Financial Years
    const deletedFinancialYears = await db.financialYear.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedFinancialYears.count} financial years`);

    // 8. Equity Entries
    const deletedEquity = await db.equityEntry.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedEquity.count} equity entries`);

    // 9. Borrowed Money — THIS IS THE KEY FIX: filter by companyId
    const deletedBorrowed = await db.borrowedMoney.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedBorrowed.count} borrowed money entries`);

    // 10. Invest Money
    const deletedInvest = await db.investMoney.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedInvest.count} invest money entries`);

    // 11. Expenses
    const deletedExpenses = await db.expense.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedExpenses.count} expenses`);

    // 12. Bank Transactions (FK to BankAccount)
    let deletedBankTransactions: { count: number };
    if (targetCompanyId) {
      const accts = await db.bankAccount.findMany({ where: { companyId: targetCompanyId }, select: { id: true } });
      const ids = accts.map(a => a.id);
      deletedBankTransactions = ids.length > 0
        ? await db.bankTransaction.deleteMany({ where: { bankAccountId: { in: ids } } })
        : { count: 0 };
    } else {
      deletedBankTransactions = await db.bankTransaction.deleteMany({});
    }
    console.log(`Deleted ${deletedBankTransactions.count} bank transactions`);

    // 13. Bank Accounts
    const deletedBankAccounts = await db.bankAccount.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedBankAccounts.count} bank accounts`);

    // 14. Cash Book Entries (FK to CashBook)
    let deletedCashBookEntries: { count: number };
    if (targetCompanyId) {
      const cashBooks = await db.cashBook.findMany({ where: { companyId: targetCompanyId }, select: { id: true } });
      const ids = cashBooks.map(c => c.id);
      deletedCashBookEntries = ids.length > 0
        ? await db.cashBookEntry.deleteMany({ where: { cashBookId: { in: ids } } })
        : { count: 0 };
    } else {
      deletedCashBookEntries = await db.cashBookEntry.deleteMany({});
    }
    console.log(`Deleted ${deletedCashBookEntries.count} cash book entries`);

    // 15. Cash Books
    const deletedCashBook = await db.cashBook.deleteMany({ where: companyFilter });
    console.log(`Deleted ${deletedCashBook.count} cash books`);

    // ── CRITICAL: Clear AccountingService static in-memory caches ──────────────
    if (targetCompanyId) {
      AccountingService.clearCompanyCache(targetCompanyId);
    } else {
      AccountingService.clearAllCaches();
    }

    console.log(`✅ Full accounting data reset completed for ${companyLabel}!`);

    return NextResponse.json({
      success: true,
      message: `All accounting data has been reset to ZERO for ${companyLabel}!`,
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
    message: 'Use POST method to reset all accounting data. Pass { companyId } for per-company reset, or empty body for global reset.',
    warning: 'This will delete ALL accounting data — CashBook, Bank, Journals, Expenses, Borrowings, everything!',
    usage: {
      globalReset: 'POST /api/accounting/reset-all (empty body or {})',
      perCompanyReset: 'POST /api/accounting/reset-all { "companyId": "your-company-id" }'
    }
  });
}

