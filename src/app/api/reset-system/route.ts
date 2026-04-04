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

    const stats: Record<string, number> = {};

    // Delete all data in the correct order (respecting foreign key constraints)
    
    // ========================================
    // PHASE 1: Independent tables
    // ========================================
    
    // Delete Workflow Logs
    stats.workflowLogs = (await db.workflowLog.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.workflowLogs} workflow logs`);

    // Delete Audit Logs
    stats.auditLogs = (await db.auditLog.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.auditLogs} audit logs`);

    // Delete Action Logs
    stats.actionLogs = (await db.actionLog.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.actionLogs} action logs`);

    // Delete Location Logs
    stats.locationLogs = (await db.locationLog.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.locationLogs} location logs`);

    // ========================================
    // PHASE 2: Notifications and Communication
    // ========================================
    
    stats.notifications = (await db.notification.deleteMany({})).count;
    stats.reminders = (await db.reminder.deleteMany({})).count;
    stats.notificationSettings = (await db.notificationSetting.deleteMany({})).count;
    stats.notificationTemplates = (await db.notificationTemplate.deleteMany({})).count;
    
    // Chatbot
    stats.chatbotMessages = (await db.chatbotMessage.deleteMany({})).count;
    stats.chatbotSessions = (await db.chatbotSession.deleteMany({})).count;
    
    // Live Chat
    stats.liveChatMessages = (await db.liveChatMessage.deleteMany({})).count;
    stats.liveChatSessions = (await db.liveChatSession.deleteMany({})).count;
    
    // Support Tickets
    stats.ticketActivities = (await db.ticketActivity.deleteMany({})).count;
    stats.ticketMessages = (await db.ticketMessage.deleteMany({})).count;
    stats.supportTickets = (await db.supportTicket.deleteMany({})).count;
    
    console.log(`[RESET] Deleted notifications and communication data`);

    // ========================================
    // PHASE 3: Transactions
    // ========================================
    
    stats.journalEntryLines = (await db.journalEntryLine.deleteMany({})).count;
    stats.journalEntries = (await db.journalEntry.deleteMany({})).count;
    stats.bankTransactions = (await db.bankTransaction.deleteMany({})).count;
    stats.expenses = (await db.expense.deleteMany({})).count;
    stats.ledgerBalances = (await db.ledgerBalance.deleteMany({})).count;
    stats.cashierSettlements = (await db.cashierSettlement.deleteMany({})).count;
    stats.dailyCollections = (await db.dailyCollection.deleteMany({})).count;
    stats.creditTransactions = (await db.creditTransaction.deleteMany({})).count;
    stats.interestPaymentHistory = (await db.interestPaymentHistory.deleteMany({})).count;
    console.log(`[RESET] Deleted transaction data`);

    // ========================================
    // PHASE 4: Loan-dependent tables
    // ========================================
    
    // EMI related
    stats.emiReminderLogs = (await db.eMIReminderLog.deleteMany({})).count;
    stats.emiPaymentSettings = (await db.eMIPaymentSetting.deleteMany({})).count;
    stats.payments = (await db.payment.deleteMany({})).count;
    stats.emiSchedules = (await db.eMISchedule.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.emiSchedules} EMI schedules`);
    
    // Loan child tables
    stats.loanTopUps = (await db.loanTopUp.deleteMany({})).count;
    stats.foreclosureRequests = (await db.foreclosureRequest.deleteMany({})).count;
    stats.emiDateChangeRequests = (await db.eMIDateChangeRequest.deleteMany({})).count;
    stats.counterOffers = (await db.counterOffer.deleteMany({})).count;
    stats.documentRequests = (await db.documentRequest.deleteMany({})).count;
    stats.loanRestructures = (await db.loanRestructure.deleteMany({})).count;
    stats.npaTrackings = (await db.nPATracking.deleteMany({})).count;
    stats.fraudAlerts = (await db.fraudAlert.deleteMany({})).count;
    stats.appointments = (await db.appointment.deleteMany({})).count;
    stats.loanAgreements = (await db.loanAgreement.deleteMany({})).count;
    stats.loanProgressTimelines = (await db.loanProgressTimeline.deleteMany({})).count;
    stats.applicationFingerprints = (await db.applicationFingerprint.deleteMany({})).count;
    stats.creditRiskScores = (await db.creditRiskScore.deleteMany({})).count;
    stats.preApprovedOffers = (await db.preApprovedOffer.deleteMany({})).count;
    stats.referrals = (await db.referral.deleteMany({})).count;
    stats.paymentRequests = (await db.paymentRequest.deleteMany({})).count;
    stats.secondaryPaymentPages = (await db.secondaryPaymentPage.deleteMany({})).count;
    stats.secureDocuments = (await db.secureDocument.deleteMany({})).count;
    
    // Agent/Commission
    stats.commissionSlabs = (await db.commissionSlab.deleteMany({})).count;
    stats.agentPerformances = (await db.agentPerformance.deleteMany({})).count;
    
    // Grace Period
    stats.gracePeriodConfigs = (await db.gracePeriodConfig.deleteMany({})).count;
    
    // Mirror Loans
    stats.mirrorLoanMappings = (await db.mirrorLoanMapping.deleteMany({})).count;
    stats.pendingMirrorLoans = (await db.pendingMirrorLoan.deleteMany({})).count;
    console.log(`[RESET] Deleted loan-dependent data`);

    // ========================================
    // PHASE 5: Session and Form data
    // ========================================
    
    stats.sessionForms = (await db.sessionForm.deleteMany({})).count;
    stats.loanForms = (await db.loanForm.deleteMany({})).count;
    stats.goldLoanDetails = (await db.goldLoanDetail.deleteMany({})).count;
    stats.vehicleLoanDetails = (await db.vehicleLoanDetail.deleteMany({})).count;
    console.log(`[RESET] Deleted session/form data`);

    // ========================================
    // PHASE 6: Loan Applications
    // ========================================
    
    stats.loanApplications = (await db.loanApplication.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.loanApplications} loan applications`);

    // ========================================
    // PHASE 7: Offline Loans
    // ========================================
    
    stats.offlineLoanEMIs = (await db.offlineLoanEMI.deleteMany({})).count;
    stats.offlineLoans = (await db.offlineLoan.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.offlineLoans} offline loans`);

    // ========================================
    // PHASE 8: Customers
    // ========================================
    
    // Get customer IDs first
    const customerIds = await db.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true }
    }).then(users => users.map(u => u.id));

    if (customerIds.length > 0) {
      await db.deviceFingerprint.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      await db.blacklist.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      await db.userSession.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      await db.userPreference.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
    }
    
    stats.customers = (await db.user.deleteMany({ where: { role: 'CUSTOMER' } })).count;
    console.log(`[RESET] Deleted ${stats.customers} customers`);

    // ========================================
    // PHASE 9: Accounting Portal - Full Reset
    // ========================================
    
    // Chart of Accounts (after LedgerBalance)
    stats.chartOfAccounts = (await db.chartOfAccount.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.chartOfAccounts} chart accounts`);

    // Financial Years
    stats.financialYears = (await db.financialYear.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.financialYears} financial years`);

    // GST Configs
    stats.gstConfigs = (await db.gSTConfig.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.gstConfigs} GST configs`);

    // Cash Book
    stats.cashBookEntries = (await db.cashBookEntry.deleteMany({})).count;
    stats.cashBooks = (await db.cashBook.deleteMany({})).count;
    console.log(`[RESET] Deleted cash book data`);

    // Accounting Settings
    stats.accountingSettings = (await db.accountingSettings.deleteMany({})).count;
    stats.companyAccountingSettings = (await db.companyAccountingSettings.deleteMany({})).count;
    console.log(`[RESET] Deleted accounting settings`);

    // Fixed Assets
    stats.assetDepreciationLogs = (await db.assetDepreciationLog.deleteMany({})).count;
    stats.fixedAssets = (await db.fixedAsset.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.fixedAssets} fixed assets`);

    // Ledgers
    stats.ledgers = (await db.ledger.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.ledgers} ledgers`);

    // Reports Cache
    stats.reportsCache = (await db.reportsCache.deleteMany({})).count;

    // Loan Sequence
    stats.loanSequence = (await db.loanSequence.deleteMany({})).count;
    console.log(`[RESET] Deleted loan sequences`);

    // ========================================
    // PHASE 10: Bank Accounts
    // ========================================
    
    stats.bankAccounts = (await db.bankAccount.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.bankAccounts} bank accounts`);

    // ========================================
    // PHASE 11: CMS and Configuration
    // ========================================
    
    // CMS
    stats.cmsServices = (await db.cMSService.deleteMany({})).count;
    stats.cmsBanners = (await db.cMSBanner.deleteMany({})).count;
    stats.cmsTestimonials = (await db.cMSTestimonial.deleteMany({})).count;
    
    // Form Config
    stats.formConfigs = (await db.formConfig.deleteMany({})).count;
    
    // Payment Settings
    stats.paymentOptionSettings = (await db.paymentOptionSettings.deleteMany({})).count;
    stats.companyPaymentSettings = (await db.companyPaymentSettings.deleteMany({})).count;
    stats.companyPaymentPages = (await db.companyPaymentPage.deleteMany({})).count;
    
    // Uploaded Files
    stats.uploadedFiles = (await db.uploadedFile.deleteMany({})).count;
    console.log(`[RESET] Deleted CMS and configuration data`);

    // ========================================
    // PHASE 12: Deleted Users
    // ========================================
    
    stats.deletedUsers = (await db.deletedUser.deleteMany({})).count;

    // ========================================
    // PHASE 13: User Sessions and Preferences
    // ========================================
    
    stats.userSessions = (await db.userSession.deleteMany({})).count;
    stats.userPreferences = (await db.userPreference.deleteMany({})).count;

    // ========================================
    // PHASE 14: Companies (keep users!)
    // ========================================
    
    stats.companies = (await db.company.deleteMany({})).count;
    console.log(`[RESET] Deleted ${stats.companies} companies`);

    // ========================================
    // PHASE 15: Reset User Credits (but keep users!)
    // ========================================
    
    const updatedUsers = await db.user.updateMany({
      data: {
        companyCredit: 0,
        personalCredit: 0,
        credit: 0,
        companyId: null,
        agentId: null,
      }
    });
    stats.usersReset = updatedUsers.count;
    console.log(`[RESET] Reset credits for ${stats.usersReset} users`);

    console.log('[RESET] System reset completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'System reset completed - ALL accounting portal sections cleared',
      deleted: stats
    });

  } catch (error) {
    console.error('[RESET] Error during system reset:', error);
    return NextResponse.json({
      error: 'Failed to reset system',
      details: (error as Error).message
    }, { status: 500 });
  }
}
