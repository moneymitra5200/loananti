import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Reset all accountant portal data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmReset, requestedBy } = body;

    if (!confirmReset || confirmReset !== 'RESET_ACCOUNTANT_DATA') {
      return NextResponse.json({ 
        error: 'Please send confirmReset: "RESET_ACCOUNTANT_DATA" to confirm reset' 
      }, { status: 400 });
    }

    console.log(`[Reset Accountant] Starting reset requested by: ${requestedBy || 'unknown'}`);

    const results: Record<string, number> = {};

    // Delete in order (respecting foreign key constraints)
    
    // 1. Delete Bank Transactions
    try {
      const bankTransactions = await db.bankTransaction.deleteMany({});
      results.bankTransactions = bankTransactions.count;
      console.log(`[Reset Accountant] Deleted ${bankTransactions.count} bank transactions`);
    } catch (e) {
      console.log('[Reset Accountant] bankTransaction not found or already empty');
      results.bankTransactions = 0;
    }

    // 2. Delete Bank Accounts
    try {
      const bankAccounts = await db.bankAccount.deleteMany({});
      results.bankAccounts = bankAccounts.count;
      console.log(`[Reset Accountant] Deleted ${bankAccounts.count} bank accounts`);
    } catch (e) {
      console.log('[Reset Accountant] bankAccount not found or already empty');
      results.bankAccounts = 0;
    }

    // 3. Delete Journal Entry Lines
    try {
      const journalLines = await db.journalEntryLine.deleteMany({});
      results.journalEntryLines = journalLines.count;
      console.log(`[Reset Accountant] Deleted ${journalLines.count} journal entry lines`);
    } catch (e) {
      console.log('[Reset Accountant] journalEntryLine not found or already empty');
      results.journalEntryLines = 0;
    }

    // 4. Delete Journal Entries
    try {
      const journalEntries = await db.journalEntry.deleteMany({});
      results.journalEntries = journalEntries.count;
      console.log(`[Reset Accountant] Deleted ${journalEntries.count} journal entries`);
    } catch (e) {
      console.log('[Reset Accountant] journalEntry not found or already empty');
      results.journalEntries = 0;
    }

    // 5. Delete Ledger Balances
    try {
      const ledgerBalances = await db.ledgerBalance.deleteMany({});
      results.ledgerBalances = ledgerBalances.count;
      console.log(`[Reset Accountant] Deleted ${ledgerBalances.count} ledger balances`);
    } catch (e) {
      console.log('[Reset Accountant] ledgerBalance not found or already empty');
      results.ledgerBalances = 0;
    }

    // 6. Delete Chart of Accounts
    try {
      const chartOfAccounts = await db.chartOfAccount.deleteMany({});
      results.chartOfAccounts = chartOfAccounts.count;
      console.log(`[Reset Accountant] Deleted ${chartOfAccounts.count} chart of accounts`);
    } catch (e) {
      console.log('[Reset Accountant] chartOfAccount not found or already empty');
      results.chartOfAccounts = 0;
    }

    // 7. Delete Financial Years
    try {
      const financialYears = await db.financialYear.deleteMany({});
      results.financialYears = financialYears.count;
      console.log(`[Reset Accountant] Deleted ${financialYears.count} financial years`);
    } catch (e) {
      console.log('[Reset Accountant] financialYear not found or already empty');
      results.financialYears = 0;
    }

    // 8. Delete Expenses
    try {
      const expenses = await db.expense.deleteMany({});
      results.expenses = expenses.count;
      console.log(`[Reset Accountant] Deleted ${expenses.count} expenses`);
    } catch (e) {
      console.log('[Reset Accountant] expense not found or already empty');
      results.expenses = 0;
    }

    // 9. Delete Reports Cache
    try {
      const reportsCache = await db.reportsCache.deleteMany({});
      results.reportsCache = reportsCache.count;
      console.log(`[Reset Accountant] Deleted ${reportsCache.count} reports cache`);
    } catch (e) {
      console.log('[Reset Accountant] reportsCache not found or already empty');
      results.reportsCache = 0;
    }

    // 10. Delete GST Config
    try {
      const gstConfigs = await db.gSTConfig.deleteMany({});
      results.gstConfigs = gstConfigs.count;
      console.log(`[Reset Accountant] Deleted ${gstConfigs.count} GST configs`);
    } catch (e) {
      console.log('[Reset Accountant] gSTConfig not found or already empty');
      results.gstConfigs = 0;
    }

    // 11. Delete Secondary Payment Pages
    try {
      const secondaryPaymentPages = await db.secondaryPaymentPage.deleteMany({});
      results.secondaryPaymentPages = secondaryPaymentPages.count;
      console.log(`[Reset Accountant] Deleted ${secondaryPaymentPages.count} secondary payment pages`);
    } catch (e) {
      console.log('[Reset Accountant] secondaryPaymentPage not found or already empty');
      results.secondaryPaymentPages = 0;
    }

    // 12. Delete EMI Payment Settings
    try {
      const emiPaymentSettings = await db.eMIPaymentSetting.deleteMany({});
      results.emiPaymentSettings = emiPaymentSettings.count;
      console.log(`[Reset Accountant] Deleted ${emiPaymentSettings.count} EMI payment settings`);
    } catch (e) {
      console.log('[Reset Accountant] eMIPaymentSetting not found or already empty');
      results.emiPaymentSettings = 0;
    }

    // 13. Delete Uploaded Files (QR codes, etc.)
    try {
      const uploadedFiles = await db.uploadedFile.deleteMany({});
      results.uploadedFiles = uploadedFiles.count;
      console.log(`[Reset Accountant] Deleted ${uploadedFiles.count} uploaded files`);
    } catch (e) {
      console.log('[Reset Accountant] uploadedFile not found or already empty');
      results.uploadedFiles = 0;
    }

    // 14. Delete Company Payment Settings
    try {
      const companyPaymentSettings = await db.companyPaymentSettings.deleteMany({});
      results.companyPaymentSettings = companyPaymentSettings.count;
      console.log(`[Reset Accountant] Deleted ${companyPaymentSettings.count} company payment settings`);
    } catch (e) {
      console.log('[Reset Accountant] companyPaymentSettings not found or already empty');
      results.companyPaymentSettings = 0;
    }

    // 15. Reset Company Ledger entries
    try {
      const ledger = await db.ledger.deleteMany({});
      results.ledger = ledger.count;
      console.log(`[Reset Accountant] Deleted ${ledger.count} ledger entries`);
    } catch (e) {
      console.log('[Reset Accountant] ledger not found or already empty');
      results.ledger = 0;
    }

    // 16. Delete Company Accounting Settings
    try {
      const companyAccountingSettings = await db.companyAccountingSettings.deleteMany({});
      results.companyAccountingSettings = companyAccountingSettings.count;
      console.log(`[Reset Accountant] Deleted ${companyAccountingSettings.count} company accounting settings`);
    } catch (e) {
      console.log('[Reset Accountant] companyAccountingSettings not found or already empty');
      results.companyAccountingSettings = 0;
    }

    // 17. Delete Accounting Settings
    try {
      const accountingSettings = await db.accountingSettings.deleteMany({});
      results.accountingSettings = accountingSettings.count;
      console.log(`[Reset Accountant] Deleted ${accountingSettings.count} accounting settings`);
    } catch (e) {
      console.log('[Reset Accountant] accountingSettings not found or already empty');
      results.accountingSettings = 0;
    }

    // 18. Delete Payment Request records
    try {
      const paymentRequests = await db.paymentRequest.deleteMany({});
      results.paymentRequests = paymentRequests.count;
      console.log(`[Reset Accountant] Deleted ${paymentRequests.count} payment requests`);
    } catch (e) {
      console.log('[Reset Accountant] paymentRequest not found or already empty');
      results.paymentRequests = 0;
    }

    // 19. Delete Payment Option Settings
    try {
      const paymentOptionSettings = await db.paymentOptionSettings.deleteMany({});
      results.paymentOptionSettings = paymentOptionSettings.count;
      console.log(`[Reset Accountant] Deleted ${paymentOptionSettings.count} payment option settings`);
    } catch (e) {
      console.log('[Reset Accountant] paymentOptionSettings not found or already empty');
      results.paymentOptionSettings = 0;
    }

    console.log('[Reset Accountant] Reset completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Accountant portal data has been reset successfully',
      deleted: results,
      totalDeleted: Object.values(results).reduce((sum, count) => sum + count, 0)
    });

  } catch (error) {
    console.error('Error resetting accountant data:', error);
    return NextResponse.json({
      error: 'Failed to reset accountant data',
      details: (error as Error).message
    }, { status: 500 });
  }
}
