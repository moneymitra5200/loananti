import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmReset } = body;

    if (!confirmReset || confirmReset !== 'RESET_ALL_DATA') {
      return NextResponse.json({ 
        error: 'Confirmation required. Please send confirmReset: "RESET_ALL_DATA"' 
      }, { status: 400 });
    }

    console.log('[RESET] Starting full system reset...');

    // Delete all data in the correct order (respecting foreign key constraints)
    
    // 1. Delete EMI Schedules
    const deletedEMI = await db.eMISchedule.deleteMany({});
    console.log(`[RESET] Deleted ${deletedEMI.count} EMI schedules`);

    // 2. Delete Payments
    const deletedPayments = await db.payment.deleteMany({});
    console.log(`[RESET] Deleted ${deletedPayments.count} payments`);

    // 3. Delete Credit Transactions
    const deletedCreditTx = await db.creditTransaction.deleteMany({});
    console.log(`[RESET] Deleted ${deletedCreditTx.count} credit transactions`);

    // 4. Delete Cashier Settlements
    const deletedSettlements = await db.cashierSettlement.deleteMany({});
    console.log(`[RESET] Deleted ${deletedSettlements.count} settlements`);

    // 5. Delete Session Forms
    const deletedSessions = await db.sessionForm.deleteMany({});
    console.log(`[RESET] Deleted ${deletedSessions.count} session forms`);

    // 6. Delete Loan Forms
    const deletedLoanForms = await db.loanForm.deleteMany({});
    console.log(`[RESET] Deleted ${deletedLoanForms.count} loan forms`);

    // 7. Delete Workflow Logs
    const deletedWorkflow = await db.workflowLog.deleteMany({});
    console.log(`[RESET] Deleted ${deletedWorkflow.count} workflow logs`);

    // 8. Delete Audit Logs
    const deletedAudit = await db.auditLog.deleteMany({});
    console.log(`[RESET] Deleted ${deletedAudit.count} audit logs`);

    // 9. Delete Action Logs
    const deletedAction = await db.actionLog.deleteMany({});
    console.log(`[RESET] Deleted ${deletedAction.count} action logs`);

    // 10. Delete Notifications
    const deletedNotifications = await db.notification.deleteMany({});
    console.log(`[RESET] Deleted ${deletedNotifications.count} notifications`);

    // 11. Delete Reminders
    const deletedReminders = await db.reminder.deleteMany({});
    console.log(`[RESET] Deleted ${deletedReminders.count} reminders`);

    // 12. Delete Location Logs
    const deletedLocations = await db.locationLog.deleteMany({});
    console.log(`[RESET] Deleted ${deletedLocations.count} location logs`);

    // 13. Delete Bank Transactions
    const deletedBankTx = await db.bankTransaction.deleteMany({});
    console.log(`[RESET] Deleted ${deletedBankTx.count} bank transactions`);

    // 14. Delete Journal Entry Lines
    const deletedJournalLines = await db.journalEntryLine.deleteMany({});
    console.log(`[RESET] Deleted ${deletedJournalLines.count} journal entry lines`);

    // 15. Delete Journal Entries
    const deletedJournal = await db.journalEntry.deleteMany({});
    console.log(`[RESET] Deleted ${deletedJournal.count} journal entries`);

    // 16. Delete Expenses
    const deletedExpenses = await db.expense.deleteMany({});
    console.log(`[RESET] Deleted ${deletedExpenses.count} expenses`);

    // 17. Delete Bank Accounts
    const deletedBanks = await db.bankAccount.deleteMany({});
    console.log(`[RESET] Deleted ${deletedBanks.count} bank accounts`);

    // 18. Delete Ledger Balances (must be before ChartOfAccount - has FK reference)
    const deletedLedgerBal = await db.ledgerBalance.deleteMany({});
    console.log(`[RESET] Deleted ${deletedLedgerBal.count} ledger balances`);

    // 19. Delete Chart of Accounts (after LedgerBalance is deleted)
    const deletedChart = await db.chartOfAccount.deleteMany({});
    console.log(`[RESET] Deleted ${deletedChart.count} chart accounts`);

    // 20. Delete Financial Years
    const deletedFinYears = await db.financialYear.deleteMany({});
    console.log(`[RESET] Deleted ${deletedFinYears.count} financial years`);

    // 21. Delete Offline Loan EMIs
    const deletedOfflineEMI = await db.offlineLoanEMI.deleteMany({});
    console.log(`[RESET] Deleted ${deletedOfflineEMI.count} offline loan EMIs`);

    // 22. Delete Offline Loans
    const deletedOfflineLoans = await db.offlineLoan.deleteMany({});
    console.log(`[RESET] Deleted ${deletedOfflineLoans.count} offline loans`);

    // 23. Delete Loan Applications
    const deletedLoans = await db.loanApplication.deleteMany({});
    console.log(`[RESET] Deleted ${deletedLoans.count} loan applications`);

    // 24. Delete Companies (keep users!)
    const deletedCompanies = await db.company.deleteMany({});
    console.log(`[RESET] Deleted ${deletedCompanies.count} companies`);

    // 25. Reset User Credits and other fields (but keep users!)
    const updatedUsers = await db.user.updateMany({
      data: {
        companyCredit: 0,
        personalCredit: 0,
        credit: 0,
        companyId: null,
        agentId: null,
      }
    });
    console.log(`[RESET] Reset credits for ${updatedUsers.count} users`);

    // 26. Delete Ledgers
    const deletedLedgers = await db.ledger.deleteMany({});
    console.log(`[RESET] Deleted ${deletedLedgers.count} ledgers`);

    // 27. Delete Daily Collections
    const deletedDaily = await db.dailyCollection.deleteMany({});
    console.log(`[RESET] Deleted ${deletedDaily.count} daily collections`);

    // 28. Delete GST Configs
    const deletedGST = await db.gSTConfig.deleteMany({});
    console.log(`[RESET] Deleted ${deletedGST.count} GST configs`);

    // 29. Delete Uploaded Files
    const deletedFiles = await db.uploadedFile.deleteMany({});
    console.log(`[RESET] Deleted ${deletedFiles.count} uploaded files`);

    console.log('[RESET] System reset completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'System reset completed successfully',
      deleted: {
        emiSchedules: deletedEMI.count,
        payments: deletedPayments.count,
        creditTransactions: deletedCreditTx.count,
        settlements: deletedSettlements.count,
        sessionForms: deletedSessions.count,
        loanForms: deletedLoanForms.count,
        workflowLogs: deletedWorkflow.count,
        auditLogs: deletedAudit.count,
        actionLogs: deletedAction.count,
        notifications: deletedNotifications.count,
        reminders: deletedReminders.count,
        locationLogs: deletedLocations.count,
        bankTransactions: deletedBankTx.count,
        journalEntryLines: deletedJournalLines.count,
        journalEntries: deletedJournal.count,
        expenses: deletedExpenses.count,
        bankAccounts: deletedBanks.count,
        chartAccounts: deletedChart.count,
        ledgerBalances: deletedLedgerBal.count,
        financialYears: deletedFinYears.count,
        offlineLoanEMIs: deletedOfflineEMI.count,
        offlineLoans: deletedOfflineLoans.count,
        loanApplications: deletedLoans.count,
        companies: deletedCompanies.count,
        ledgers: deletedLedgers.count,
        dailyCollections: deletedDaily.count,
        gstConfigs: deletedGST.count,
        uploadedFiles: deletedFiles.count,
        usersReset: updatedUsers.count
      }
    });

  } catch (error) {
    console.error('[RESET] Error during system reset:', error);
    return NextResponse.json({
      error: 'Failed to reset system',
      details: (error as Error).message
    }, { status: 500 });
  }
}
