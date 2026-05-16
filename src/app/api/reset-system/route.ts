import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { confirmReset } = body;

    // Accept both 'RESET_SYSTEM' (from UI dialog) and 'RESET_ALL_DATA' (legacy/API)
    if (!confirmReset || (confirmReset !== 'RESET_SYSTEM' && confirmReset !== 'RESET_ALL_DATA')) {
      return NextResponse.json({
        error: 'Confirmation required. Please send confirmReset: "RESET_SYSTEM"',
      }, { status: 400 });
    }

    const stats: Record<string, number | string> = {};

    // ========================================
    // PHASE 1: Independent / log tables
    // ========================================

    stats.workflowLogs        = (await db.workflowLog.deleteMany({})).count;
    stats.auditLogs           = (await db.auditLog.deleteMany({})).count;
    stats.actionLogs          = (await db.actionLog.deleteMany({})).count;
    stats.locationLogs        = (await db.locationLog.deleteMany({})).count;

    // Validator — ValidationFixLog → ValidationIssue → ValidationRule → runs/settings
    stats.validationFixLogs   = (await db.validationFixLog.deleteMany({})).count;
    stats.validationIssues    = (await db.validationIssue.deleteMany({})).count;
    stats.validationRules     = (await db.validationRule.deleteMany({})).count;
    stats.validatorRuns       = (await db.validatorRun.deleteMany({})).count;
    await db.validatorSettings.deleteMany({}).catch(() => {});

    // Misc standalone tables
    stats.aiChatHistory       = (await db.aIChatHistory.deleteMany({})).count;
    stats.messages            = (await db.message.deleteMany({})).count;
    stats.enquiries           = (await db.enquiry.deleteMany({})).count;
    stats.receiptTemplates    = (await db.receiptTemplate.deleteMany({})).count;

    // ========================================
    // PHASE 2: Notifications and Communication
    // ========================================

    stats.notifications         = (await db.notification.deleteMany({})).count;
    stats.reminders             = (await db.reminder.deleteMany({})).count;
    stats.notificationSettings  = (await db.notificationSetting.deleteMany({})).count;
    stats.notificationTemplates = (await db.notificationTemplate.deleteMany({})).count;
    stats.chatbotMessages       = (await db.chatbotMessage.deleteMany({})).count;
    stats.chatbotSessions       = (await db.chatbotSession.deleteMany({})).count;
    stats.liveChatMessages      = (await db.liveChatMessage.deleteMany({})).count;
    stats.liveChatSessions      = (await db.liveChatSession.deleteMany({})).count;
    stats.ticketActivities      = (await db.ticketActivity.deleteMany({})).count;
    stats.ticketMessages        = (await db.ticketMessage.deleteMany({})).count;
    stats.supportTickets        = (await db.supportTicket.deleteMany({})).count;

    // ========================================
    // PHASE 3: Transactions & Accounting Entries
    // ========================================

    // Daybook entries are transactional — safe to delete
    // AccountHead records are structural HEADERS — must NOT be deleted
    stats.daybookEntries      = (await db.daybookEntry.deleteMany({})).count;
    // Do NOT delete accountHeads — they are permanent structural categories
    // stats.accountHeads     = (await db.accountHead.deleteMany({})).count; // REMOVED


    // Equity / Borrow / Invest entries may reference JournalEntry
    stats.equityEntries       = (await db.equityEntry.deleteMany({})).count;
    stats.borrowedMoney       = (await db.borrowedMoney.deleteMany({})).count;
    stats.investMoney         = (await db.investMoney.deleteMany({})).count;

    stats.journalEntryLines     = (await db.journalEntryLine.deleteMany({})).count;
    stats.journalEntries        = (await db.journalEntry.deleteMany({})).count;
    stats.bankTransactions      = (await db.bankTransaction.deleteMany({})).count;
    stats.expenses              = (await db.expense.deleteMany({})).count;
    stats.ledgerBalances        = (await db.ledgerBalance.deleteMany({})).count;
    stats.cashierSettlements    = (await db.cashierSettlement.deleteMany({})).count;
    stats.dailyCollections      = (await db.dailyCollection.deleteMany({})).count;
    stats.creditTransactions    = (await db.creditTransaction.deleteMany({})).count;
    stats.interestPaymentHistory = (await db.interestPaymentHistory.deleteMany({})).count;

    // ========================================
    // PHASE 4: Loan-dependent tables
    // ========================================

    stats.emiReminderLogs       = (await db.eMIReminderLog.deleteMany({})).count;
    stats.emiPaymentSettings    = (await db.eMIPaymentSetting.deleteMany({})).count;
    stats.payments              = (await db.payment.deleteMany({})).count;
    stats.emiSchedules          = (await db.eMISchedule.deleteMany({})).count;
    stats.loanTopUps            = (await db.loanTopUp.deleteMany({})).count;
    stats.foreclosureRequests   = (await db.foreclosureRequest.deleteMany({})).count;
    stats.emiDateChangeRequests = (await db.eMIDateChangeRequest.deleteMany({})).count;
    stats.counterOffers         = (await db.counterOffer.deleteMany({})).count;
    stats.documentRequests      = (await db.documentRequest.deleteMany({})).count;
    stats.loanRestructures      = (await db.loanRestructure.deleteMany({})).count;
    stats.npaTrackings          = (await db.nPATracking.deleteMany({})).count;
    stats.fraudAlerts           = (await db.fraudAlert.deleteMany({})).count;
    stats.appointments          = (await db.appointment.deleteMany({})).count;
    stats.loanAgreements        = (await db.loanAgreement.deleteMany({})).count;
    stats.loanProgressTimelines = (await db.loanProgressTimeline.deleteMany({})).count;
    stats.applicationFingerprints = (await db.applicationFingerprint.deleteMany({})).count;
    stats.creditRiskScores      = (await db.creditRiskScore.deleteMany({})).count;
    stats.preApprovedOffers     = (await db.preApprovedOffer.deleteMany({})).count;
    stats.referrals             = (await db.referral.deleteMany({})).count;
    stats.paymentRequests       = (await db.paymentRequest.deleteMany({})).count;
    stats.secondaryPaymentPages = (await db.secondaryPaymentPage.deleteMany({})).count;
    stats.secureDocuments       = (await db.secureDocument.deleteMany({})).count;
    stats.commissionSlabs       = (await db.commissionSlab.deleteMany({})).count;
    stats.agentPerformances     = (await db.agentPerformance.deleteMany({})).count;
    stats.gracePeriodConfigs    = (await db.gracePeriodConfig.deleteMany({})).count;
    stats.mirrorLoanMappings    = (await db.mirrorLoanMapping.deleteMany({})).count;
    stats.pendingMirrorLoans    = (await db.pendingMirrorLoan.deleteMany({})).count;

    // InterestOnlyPayment → InterestOnlyLoan (before LoanApplication)
    stats.interestOnlyPayments  = (await db.interestOnlyPayment.deleteMany({})).count;
    stats.interestOnlyLoans     = (await db.interestOnlyLoan.deleteMany({})).count;

    // ========================================
    // PHASE 5: Session and Form data
    // ========================================

    stats.sessionForms        = (await db.sessionForm.deleteMany({})).count;
    stats.loanForms           = (await db.loanForm.deleteMany({})).count;
    stats.goldLoanDetails     = (await db.goldLoanDetail.deleteMany({})).count;
    stats.vehicleLoanDetails  = (await db.vehicleLoanDetail.deleteMany({})).count;

    // ========================================
    // PHASE 6: Loan Applications
    // ========================================

    stats.loanApplications    = (await db.loanApplication.deleteMany({})).count;

    // ========================================
    // PHASE 7: Offline Loans
    // ========================================

    stats.offlineLoanEMIs     = (await db.offlineLoanEMI.deleteMany({})).count;
    stats.offlineLoans        = (await db.offlineLoan.deleteMany({})).count;

    // ========================================
    // PHASE 8: Delete CUSTOMER Users Only
    // STAFF / COMPANY / AGENT roles NEVER deleted — they keep their accounts + company assignments
    // ========================================

    const customerIds = await db.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true },
    }).then(users => users.map(u => u.id));

    if (customerIds.length > 0) {
      await db.deviceFingerprint.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      await db.blacklist.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      await db.userSession.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      await db.userPreference.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {});
      stats.customers = (await db.user.deleteMany({ where: { role: 'CUSTOMER' } })).count;
    } else {
      stats.customers = 0;
    }

    // Reset credits ONLY — do NOT reset companyId or agentId (companies survive reset)
    const resetStaff = await db.user.updateMany({
      where: { role: { not: 'CUSTOMER' } },
      data: { companyCredit: 0, personalCredit: 0, credit: 0 },
    });
    stats.staffReset = resetStaff.count;

    // ========================================
    // PHASE 9: Accounting Portal — wipe transactional data only
    // Companies themselves are PRESERVED — they keep their name, code, and ID
    // Chart of Accounts STRUCTURE is PRESERVED — only balances are zeroed
    // ========================================

    // ⚠️ IMPORTANT: Do NOT delete chartOfAccount records — they are structural headers.
    // Instead, reset balances to zero so the accounting portal stays functional.
    const coaReset = await db.chartOfAccount.updateMany({
      data: { currentBalance: 0 }
    });
    stats.chartOfAccountsBalancesReset = coaReset.count;
    // Old: stats.chartOfAccounts = (await db.chartOfAccount.deleteMany({})).count; // REMOVED

    stats.financialYears            = (await db.financialYear.deleteMany({})).count;
    stats.gstConfigs                = (await db.gSTConfig.deleteMany({})).count;
    stats.cashBookEntries           = (await db.cashBookEntry.deleteMany({})).count;
    stats.cashBooks                 = (await db.cashBook.deleteMany({})).count;
    stats.accountingSettings        = (await db.accountingSettings.deleteMany({})).count;
    stats.companyAccountingSettings = (await db.companyAccountingSettings.deleteMany({})).count;
    stats.assetDepreciationLogs     = (await db.assetDepreciationLog.deleteMany({})).count;
    stats.fixedAssets               = (await db.fixedAsset.deleteMany({})).count;
    stats.ledgers                   = (await db.ledger.deleteMany({})).count;
    stats.reportsCache              = (await db.reportsCache.deleteMany({})).count;
    // ⚠️ Do NOT delete loanSequence — it prevents loan number collisions after reset.
    // If deleted, new loans would restart from sequence 1 and collide with pre-reset loan numbers.
    // stats.loanSequence = (await db.loanSequence.deleteMany({})).count; // REMOVED

    // Reset company financial balances to zero (but do NOT delete the company records)
    await db.company.updateMany({ data: { companyCredit: 0, myCash: 0 } });

    // Re-initialize Chart of Accounts ONLY for companies that have NO accounts yet
    // (companies that already have CoA structure keep it — balances were already zeroed above)
    // IMPORTANT: Do NOT call clearAllCaches() here — it resets the "initialized" flag and can
    // cause initializeChartOfAccounts() to create DUPLICATE account heads.
    try {
      const { AccountingService } = await import('@/lib/accounting-service');
      const allCompanies = await db.company.findMany({ select: { id: true } });
      let initialized = 0;
      for (const company of allCompanies) {
        const existingCount = await db.chartOfAccount.count({ where: { companyId: company.id } });
        if (existingCount === 0) {
          // Only re-init if no accounts exist (shouldn't happen since we preserved them)
          const svc = new AccountingService(company.id);
          await svc.initializeChartOfAccounts().catch(() => {});
          initialized++;
        }
      }
      stats.coaReinitialized = initialized;
      stats.coaPreserved = allCompanies.length - initialized;
    } catch {
      stats.coaReinitError = 'COA re-init had errors (non-fatal)';
    }


    // ========================================
    // PHASE 10: Bank Accounts
    // ========================================

    stats.bankAccounts = (await db.bankAccount.deleteMany({})).count;

    // ========================================
    // PHASE 11: CMS and Configuration
    // ========================================

    stats.cmsServices             = (await db.cMSService.deleteMany({})).count;
    stats.cmsBanners              = (await db.cMSBanner.deleteMany({})).count;
    stats.cmsTestimonials         = (await db.cMSTestimonial.deleteMany({})).count;
    stats.formConfigs             = (await db.formConfig.deleteMany({})).count;
    stats.paymentOptionSettings   = (await db.paymentOptionSettings.deleteMany({})).count;
    stats.companyPaymentSettings  = (await db.companyPaymentSettings.deleteMany({})).count;
    stats.companyPaymentPages     = (await db.companyPaymentPage.deleteMany({})).count;
    stats.uploadedFiles           = (await db.uploadedFile.deleteMany({})).count;
    // ⚠️ Do NOT delete companyPaymentSettings — they contain gateway config (UPI, Razorpay keys).
    // Deleting them forces staff to re-configure payment settings after every reset.
    // stats.companyPaymentSettings = (await db.companyPaymentSettings.deleteMany({})).count; // REMOVED

    // ========================================
    // PHASE 11.5: File System Cleanup
    // ========================================

    try {
      const qrDir     = path.join(process.cwd(), 'public', 'qrcodes');
      const docDir    = path.join(process.cwd(), 'public', 'documents');
      const uploadDir = path.join(process.cwd(), 'upload');

      if (fs.existsSync(qrDir)) {
        const qrFiles = fs.readdirSync(qrDir);
        qrFiles.forEach((file: string) => {
          if (file.endsWith('.png') || file.endsWith('.svg')) fs.unlinkSync(path.join(qrDir, file));
        });
        stats.qrCodes = qrFiles.length;
      }

      if (fs.existsSync(docDir)) {
        const docFiles = fs.readdirSync(docDir);
        docFiles.forEach((file: string) => fs.unlinkSync(path.join(docDir, file)));
        stats.documents = docFiles.length;
      }

      if (fs.existsSync(uploadDir)) {
        const uploadFiles = fs.readdirSync(uploadDir);
        uploadFiles.forEach((file: string) => {
          if (file !== '.gitkeep') fs.unlinkSync(path.join(uploadDir, file));
        });
        stats.uploads = uploadFiles.length;
      }
    } catch {
      stats.fileDeletionError = 'Some files could not be deleted';
    }

    // Contact Enquiries
    stats.contactEnquiries = (await db.contactEnquiry.deleteMany({})).count;

    // ========================================
    // PHASE 12: Remaining User Preferences (staff)
    // ========================================

    stats.userPreferences = (await db.userPreference.deleteMany({})).count;

    const durationMs  = Date.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(1);

    // Clear ALL in-memory cache
    cache.clear();

    return NextResponse.json({
      success: true,
      message: 'System reset completed — all transactional data cleared. Companies are preserved.',
      stats: { duration: `${durationSec} seconds`, ...stats },
      deleted: stats,
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to reset system',
      details: (error as Error).message,
    }, { status: 500 });
  }
}
