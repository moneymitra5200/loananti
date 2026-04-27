import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Reset all demo data except users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmReset } = body;

    if (confirmReset !== 'RESET_ALL_DATA') {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    console.log('Starting data reset...');

    // Delete in order of dependencies (children first)
    
    // 1. Delete credit transactions
    const creditTransactions = await db.creditTransaction.deleteMany({});
    console.log(`Deleted ${creditTransactions.count} credit transactions`);

    // 2. Delete cashier settlements
    const settlements = await db.cashierSettlement.deleteMany({});
    console.log(`Deleted ${settlements.count} settlements`);

    // 3. Delete EMI schedules
    const emiSchedules = await db.eMISchedule.deleteMany({});
    console.log(`Deleted ${emiSchedules.count} EMI schedules`);

    // 4. Delete payments
    const payments = await db.payment.deleteMany({});
    console.log(`Deleted ${payments.count} payments`);

    // 5. Delete session forms
    const sessionForms = await db.sessionForm.deleteMany({});
    console.log(`Deleted ${sessionForms.count} session forms`);

    // 6. Delete loan forms
    const loanForms = await db.loanForm.deleteMany({});
    console.log(`Deleted ${loanForms.count} loan forms`);

    // 7. Delete workflow logs
    const workflowLogs = await db.workflowLog.deleteMany({});
    console.log(`Deleted ${workflowLogs.count} workflow logs`);

    // 8. Delete loan applications
    const loanApplications = await db.loanApplication.deleteMany({});
    console.log(`Deleted ${loanApplications.count} loan applications`);

    // 9. Delete offline loans and their EMIs
    const offlineEMIs = await db.offlineLoanEMI.deleteMany({});
    console.log(`Deleted ${offlineEMIs.count} offline loan EMIs`);
    
    const offlineLoans = await db.offlineLoan.deleteMany({});
    console.log(`Deleted ${offlineLoans.count} offline loans`);

    // 10. Delete CMS content (loan products, testimonials, banners)
    const testimonials = await db.cMSTestimonial.deleteMany({});
    console.log(`Deleted ${testimonials.count} testimonials`);
    
    const banners = await db.cMSBanner.deleteMany({});
    console.log(`Deleted ${banners.count} banners`);
    
    const services = await db.cMSService.deleteMany({});
    console.log(`Deleted ${services.count} services`);

    // 11. Delete daily collections
    const dailyCollections = await db.dailyCollection.deleteMany({});
    console.log(`Deleted ${dailyCollections.count} daily collections`);

    // 12. Delete journal entries (must delete lines first)
    const journalLines = await db.journalEntryLine.deleteMany({});
    console.log(`Deleted ${journalLines.count} journal entry lines`);
    
    const journalEntries = await db.journalEntry.deleteMany({});
    console.log(`Deleted ${journalEntries.count} journal entries`);

    // 13. Delete bank transactions
    const bankTransactions = await db.bankTransaction.deleteMany({});
    console.log(`Deleted ${bankTransactions.count} bank transactions`);

    // 14. Delete bank accounts
    const bankAccounts = await db.bankAccount.deleteMany({});
    console.log(`Deleted ${bankAccounts.count} bank accounts`);

    // 15. Delete expenses
    const expenses = await db.expense.deleteMany({});
    console.log(`Deleted ${expenses.count} expenses`);

    // 16. Delete chart of accounts
    const ledgerBalances = await db.ledgerBalance.deleteMany({});
    console.log(`Deleted ${ledgerBalances.count} ledger balances`);
    
    const chartOfAccounts = await db.chartOfAccount.deleteMany({});
    console.log(`Deleted ${chartOfAccounts.count} chart of accounts`);

    // 17. Delete financial years
    const financialYears = await db.financialYear.deleteMany({});
    console.log(`Deleted ${financialYears.count} financial years`);

    // 18. Delete Borrowed Money ← CRITICAL FIX: was missing, causing persistence
    try {
      const borrowedMoney = await db.borrowedMoney.deleteMany({});
      console.log(`Deleted ${borrowedMoney.count} borrowed money entries`);
    } catch (e) { console.log('borrowedMoney already empty'); }

    // 19. Delete Invest Money
    try {
      const investMoney = await db.investMoney.deleteMany({});
      console.log(`Deleted ${investMoney.count} invest money entries`);
    } catch (e) { console.log('investMoney already empty'); }

    // 20. Delete Equity Entries
    try {
      await db.equityEntry.deleteMany({});
    } catch (e) { /* ignore */ }

    // 21. Delete Account Heads
    try {
      await db.accountHead.deleteMany({});
    } catch (e) { /* ignore */ }

    // 22. Delete Cash Book Entries + Cash Books
    try {
      const cashBooks = await db.cashBook.findMany({ select: { id: true } });
      const ids = cashBooks.map(c => c.id);
      if (ids.length > 0) await db.cashBookEntry.deleteMany({ where: { cashBookId: { in: ids } } });
      await db.cashBook.deleteMany({});
    } catch (e) { /* ignore */ }

    // 23. Delete Daybook Entries
    try {
      await db.daybookEntry.deleteMany({});
    } catch (e) { /* ignore */ }

    // 24. Delete audit logs (except user management)
    const auditLogs = await db.auditLog.deleteMany({});

    console.log(`Deleted ${auditLogs.count} audit logs`);

    // 19. Delete notifications
    const notifications = await db.notification.deleteMany({});
    console.log(`Deleted ${notifications.count} notifications`);

    // 20. Delete location logs
    const locationLogs = await db.locationLog.deleteMany({});
    console.log(`Deleted ${locationLogs.count} location logs`);

    // 21. Reset user credits to 0 (but keep users)
    await db.user.updateMany({
      data: {
        companyCredit: 0,
        personalCredit: 0,
        credit: 0
      }
    });
    console.log('Reset all user credits to 0');

    // 22. Reset company credits
    await db.company.updateMany({
      data: {
        companyCredit: 0
      }
    });
    console.log('Reset all company credits to 0');

    console.log('Data reset complete!');

    return NextResponse.json({
      success: true,
      message: 'All demo data has been cleared',
      summary: {
        creditTransactions: creditTransactions.count,
        settlements: settlements.count,
        emiSchedules: emiSchedules.count,
        payments: payments.count,
        sessionForms: sessionForms.count,
        loanForms: loanForms.count,
        workflowLogs: workflowLogs.count,
        loanApplications: loanApplications.count,
        offlineLoans: offlineLoans.count,
        offlineEMIs: offlineEMIs.count,
        testimonials: testimonials.count,
        banners: banners.count,
        services: services.count,
        dailyCollections: dailyCollections.count,
        journalEntries: journalEntries.count,
        bankTransactions: bankTransactions.count,
        bankAccounts: bankAccounts.count,
        expenses: expenses.count,
        chartOfAccounts: chartOfAccounts.count,
        financialYears: financialYears.count,
        auditLogs: auditLogs.count,
        notifications: notifications.count,
        locationLogs: locationLogs.count
      }
    });
  } catch (error) {
    console.error('Data reset error:', error);
    return NextResponse.json({ 
      error: 'Failed to reset data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
