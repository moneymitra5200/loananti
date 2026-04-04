import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ResetOptions {
  loanApplications: boolean;
  emiSchedules: boolean;
  offlineLoans: boolean;
  bankAccounts: boolean;
  transactions: boolean;
  credits: boolean;
  customers: boolean;
  auditLogs: boolean;
  notifications: boolean;
  documents: boolean;
  // Accounting Portal Options
  chartOfAccounts: boolean;
  financialYears: boolean;
  journalEntries: boolean;
  expenses: boolean;
  gstConfig: boolean;
  cashBook: boolean;
  accountingSettings: boolean;
  fixedAssets: boolean;
  allAccounting: boolean;
}

// GET - Check system status before reset
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1 as test`;

    // Get counts of data that can be reset
    const [
      loanApplicationsCount,
      emiSchedulesCount,
      offlineLoansCount,
      bankAccountsCount,
      bankTransactionsCount,
      customersCount,
      auditLogsCount,
      notificationsCount,
      // Accounting counts
      chartOfAccountsCount,
      financialYearsCount,
      journalEntriesCount,
      expensesCount,
      gstConfigCount,
      cashBookCount,
      fixedAssetsCount,
    ] = await Promise.all([
      db.loanApplication.count().catch(() => 0),
      db.eMISchedule.count().catch(() => 0),
      db.offlineLoan.count().catch(() => 0),
      db.bankAccount.count().catch(() => 0),
      db.bankTransaction.count().catch(() => 0),
      db.user.count({ where: { role: 'CUSTOMER' } }).catch(() => 0),
      db.auditLog.count().catch(() => 0),
      db.notification.count().catch(() => 0),
      // Accounting counts
      db.chartOfAccount.count().catch(() => 0),
      db.financialYear.count().catch(() => 0),
      db.journalEntry.count().catch(() => 0),
      db.expense.count().catch(() => 0),
      db.gSTConfig.count().catch(() => 0),
      db.cashBook.count().catch(() => 0),
      db.fixedAsset.count().catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      status: {
        loanApplications: loanApplicationsCount,
        emiSchedules: emiSchedulesCount,
        offlineLoans: offlineLoansCount,
        bankAccounts: bankAccountsCount,
        bankTransactions: bankTransactionsCount,
        customers: customersCount,
        auditLogs: auditLogsCount,
        notifications: notificationsCount,
        // Accounting status
        accounting: {
          chartOfAccounts: chartOfAccountsCount,
          financialYears: financialYearsCount,
          journalEntries: journalEntriesCount,
          expenses: expensesCount,
          gstConfig: gstConfigCount,
          cashBook: cashBookCount,
          fixedAssets: fixedAssetsCount,
        }
      }
    });
  } catch (error) {
    console.error('[System Reset Status] Error:', error);
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Reset system with selective options (CORRECT DELETION ORDER)
export async function POST(request: NextRequest) {
  try {
    // First, test database connection with timeout
    console.log('[System Reset] Testing database connection...');
    await db.$queryRaw`SELECT 1 as test`;
    console.log('[System Reset] Database connected');
    
    const body = await request.json();
    const { confirmReset, userId, options } = body as { confirmReset: string; userId: string; options: ResetOptions };

    if (!confirmReset || confirmReset !== 'RESET_SYSTEM') {
      return NextResponse.json({ error: 'Please type "RESET_SYSTEM" to confirm' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the requester is a SUPER_ADMIN
    const requester = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true }
    });

    if (!requester || requester.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only Super Admin can reset the system' }, { status: 403 });
    }

    console.log(`[System Reset] Initiated by: ${requester.name} (${userId})`);

    const resetOptions: ResetOptions = options || {
      loanApplications: true,
      emiSchedules: true,
      offlineLoans: true,
      bankAccounts: true,
      transactions: true,
      credits: true,
      customers: true,
      auditLogs: true,
      notifications: true,
      documents: true,
      // Accounting Portal - ALL TRUE by default
      chartOfAccounts: true,
      financialYears: true,
      journalEntries: true,
      expenses: true,
      gstConfig: true,
      cashBook: true,
      accountingSettings: true,
      fixedAssets: true,
      allAccounting: true,
    };

    console.log('[System Reset] Starting with options:', resetOptions);
    const startTime = Date.now();
    const stats: Record<string, number> = {};
    const errors: string[] = [];

    // ========================================
    // PHASE 1: Delete all INDEPENDENT tables first
    // ========================================
    
    if (resetOptions.auditLogs) {
      console.log('[System Reset] Deleting audit logs...');
      try {
        await Promise.all([
          db.workflowLog.deleteMany({}).then(r => { stats.workflowLogs = r.count; }).catch(e => { errors.push(`workflowLog: ${e.message}`); }),
          db.auditLog.deleteMany({}).then(r => { stats.auditLogs = r.count; }).catch(e => { errors.push(`auditLog: ${e.message}`); }),
          db.actionLog.deleteMany({}).then(r => { stats.actionLogs = r.count; }).catch(e => { errors.push(`actionLog: ${e.message}`); }),
          db.locationLog.deleteMany({}).then(r => { stats.locationLogs = r.count; }).catch(e => { errors.push(`locationLog: ${e.message}`); })
        ]);
      } catch (e) {
        errors.push(`Phase 1 (auditLogs): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    if (resetOptions.notifications) {
      console.log('[System Reset] Deleting notifications...');
      try {
        await Promise.all([
          db.notification.deleteMany({}).then(r => { stats.notifications = r.count; }).catch(e => { errors.push(`notification: ${e.message}`); }),
          db.reminder.deleteMany({}).then(r => { stats.reminders = r.count; }).catch(e => { errors.push(`reminder: ${e.message}`); }),
          db.notificationSetting.deleteMany({}).then(r => { stats.notificationSettings = r.count; }).catch(() => {}),
          db.notificationTemplate.deleteMany({}).then(r => { stats.notificationTemplates = r.count; }).catch(() => {}),
          // Chatbot data
          db.chatbotSession.deleteMany({}).then(r => { stats.chatbotSessions = r.count; }).catch(() => {}),
          db.chatbotMessage.deleteMany({}).then(r => { stats.chatbotMessages = r.count; }).catch(() => {}),
          // Live chat data
          db.liveChatMessage.deleteMany({}).then(r => { stats.liveChatMessages = r.count; }).catch(() => {}),
          db.liveChatSession.deleteMany({}).then(r => { stats.liveChatSessions = r.count; }).catch(() => {}),
          // Support tickets
          db.supportTicket.deleteMany({}).then(r => { stats.supportTickets = r.count; }).catch(() => {}),
          db.ticketMessage.deleteMany({}).then(r => { stats.ticketMessages = r.count; }).catch(() => {}),
          db.ticketActivity.deleteMany({}).then(r => { stats.ticketActivities = r.count; }).catch(() => {}),
        ]);
      } catch (e) {
        errors.push(`Phase 1 (notifications): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    if (resetOptions.transactions) {
      console.log('[System Reset] Deleting transactions...');
      try {
        await Promise.all([
          db.journalEntryLine.deleteMany({}).then(r => { stats.journalLines = r.count; }).catch(e => { errors.push(`journalEntryLine: ${e.message}`); }),
          db.journalEntry.deleteMany({}).then(r => { stats.journalEntries = r.count; }).catch(e => { errors.push(`journalEntry: ${e.message}`); }),
          db.bankTransaction.deleteMany({}).then(r => { stats.bankTransactions = r.count; }).catch(e => { errors.push(`bankTransaction: ${e.message}`); }),
          db.expense.deleteMany({}).then(r => { stats.expenses = r.count; }).catch(e => { errors.push(`expense: ${e.message}`); }),
          db.ledgerBalance.deleteMany({}).then(r => { stats.ledgerBalances = r.count; }).catch(e => { errors.push(`ledgerBalance: ${e.message}`); }),
          db.cashierSettlement.deleteMany({}).then(r => { stats.cashierSettlements = r.count; }).catch(() => {}),
          db.dailyCollection.deleteMany({}).then(r => { stats.dailyCollections = r.count; }).catch(() => {}),
          db.creditTransaction.deleteMany({}).then(r => { stats.creditTransactions = r.count; }).catch(e => { errors.push(`creditTransaction: ${e.message}`); }),
          // Interest payment history
          db.interestPaymentHistory.deleteMany({}).then(r => { stats.interestPaymentHistory = r.count; }).catch(() => {}),
        ]);
      } catch (e) {
        errors.push(`Phase 1 (transactions): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 2: Delete LOAN-DEPENDENT tables (CRITICAL ORDER)
    // ========================================
    
    if (resetOptions.loanApplications || resetOptions.emiSchedules) {
      console.log('[System Reset] Deleting loan-dependent records...');
      
      try {
        // Step 1: Delete all tables that reference loanApplicationId
        await Promise.all([
          db.eMIReminderLog.deleteMany({}).catch(() => {}),
          db.eMIPaymentSetting.deleteMany({}).catch(() => {}),
        ]);
        
        // Delete Payments (references EMISchedule and LoanApplication)
        await db.payment.deleteMany({}).then(r => { stats.payments = r.count; }).catch(e => { errors.push(`payment: ${e.message}`); });
        
        // Delete EMI Schedules (references LoanApplication)
        await db.eMISchedule.deleteMany({}).then(r => { stats.emiSchedules = r.count; }).catch(e => { errors.push(`eMISchedule: ${e.message}`); });
        
        // Delete all other loan-related child tables
        await Promise.all([
          db.loanTopUp.deleteMany({}).catch(() => {}),
          db.foreclosureRequest.deleteMany({}).catch(() => {}),
          db.eMIDateChangeRequest.deleteMany({}).catch(() => {}),
          db.counterOffer.deleteMany({}).catch(() => {}),
          db.documentRequest.deleteMany({}).catch(() => {}),
          db.loanRestructure.deleteMany({}).catch(() => {}),
          db.nPATracking.deleteMany({}).catch(() => {}),
          db.fraudAlert.deleteMany({}).catch(() => {}),
          db.appointment.deleteMany({}).catch(() => {}),
          db.loanAgreement.deleteMany({}).catch(() => {}),
          db.loanProgressTimeline.deleteMany({}).catch(() => {}),
          db.applicationFingerprint.deleteMany({}).catch(() => {}),
          db.creditRiskScore.deleteMany({}).catch(() => {}),
          db.preApprovedOffer.deleteMany({}).catch(() => {}),
          db.referral.deleteMany({}).catch(() => {}),
          db.paymentRequest.deleteMany({}).catch(() => {}),
          db.secondaryPaymentPage.deleteMany({}).catch(() => {}),
          // Agent/Commission related
          db.commissionSlab.deleteMany({}).catch(() => {}),
          db.agentPerformance.deleteMany({}).catch(() => {}),
          // Grace period config
          db.gracePeriodConfig.deleteMany({}).catch(() => {}),
          // Secure documents
          db.secureDocument.deleteMany({}).catch(() => {}),
        ]);
        
        // Delete Mirror Loan related
        await Promise.all([
          db.mirrorLoanMapping.deleteMany({}).catch(() => {}),
          db.pendingMirrorLoan.deleteMany({}).catch(() => {}),
        ]);
        
        // Delete SessionForm and LoanForm
        await Promise.all([
          db.sessionForm.deleteMany({}).catch(() => {}),
          db.loanForm.deleteMany({}).catch(() => {}),
        ]);
        
        // Delete Gold and Vehicle Loan Details
        await Promise.all([
          db.goldLoanDetail.deleteMany({}).catch(() => {}),
          db.vehicleLoanDetail.deleteMany({}).catch(() => {}),
        ]);
        
        // NOW delete Loan Applications (all children are gone)
        if (resetOptions.loanApplications) {
          await db.loanApplication.deleteMany({}).then(r => { stats.loanApplications = r.count; });
          console.log('[System Reset] Loan applications deleted:', stats.loanApplications);
        }
      } catch (e) {
        errors.push(`Phase 2 (loans): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 3: Delete OFFLINE LOANS
    // ========================================
    
    if (resetOptions.offlineLoans) {
      console.log('[System Reset] Deleting offline loans...');
      try {
        await db.offlineLoanEMI.deleteMany({}).then(r => { stats.offlineEMIs = r.count; }).catch(e => { errors.push(`offlineLoanEMI: ${e.message}`); });
        await db.offlineLoan.deleteMany({}).then(r => { stats.offlineLoans = r.count; }).catch(e => { errors.push(`offlineLoan: ${e.message}`); });
      } catch (e) {
        errors.push(`Phase 3 (offlineLoans): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 4: Delete CUSTOMERS
    // ========================================
    
    if (resetOptions.customers) {
      console.log('[System Reset] Deleting customers...');
      try {
        const customerIds = await db.user.findMany({
          where: { role: 'CUSTOMER' },
          select: { id: true }
        }).then(users => users.map(u => u.id));

        if (customerIds.length > 0) {
          await Promise.all([
            db.notification.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.reminder.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.deviceFingerprint.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.blacklist.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.locationLog.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.notificationSetting.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.userSession.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
            db.userPreference.deleteMany({ where: { userId: { in: customerIds } } }).catch(() => {}),
          ]);

          await db.user.deleteMany({ where: { role: 'CUSTOMER' } }).then(r => { stats.customers = r.count; });
        }
      } catch (e) {
        errors.push(`Phase 4 (customers): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 5: Delete BANK ACCOUNTS
    // ========================================
    
    if (resetOptions.bankAccounts) {
      console.log('[System Reset] Deleting bank accounts...');
      try {
        await db.bankAccount.deleteMany({}).then(r => { stats.bankAccounts = r.count; }).catch(e => { errors.push(`bankAccount: ${e.message}`); });
      } catch (e) {
        errors.push(`Phase 5 (bankAccounts): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 6: Reset CREDITS
    // ========================================

    if (resetOptions.credits) {
      console.log('[System Reset] Resetting credits...');
      try {
        await Promise.all([
          db.user.updateMany({ data: { companyCredit: 0, personalCredit: 0, credit: 0 } }),
          db.company.updateMany({ data: { companyCredit: 0 } })
        ]);
        stats.creditsReset = 1;
      } catch (e) {
        errors.push(`Phase 6 (credits): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 7: ACCOUNTING PORTAL - FULL RESET
    // ========================================

    if (resetOptions.allAccounting || resetOptions.journalEntries || resetOptions.chartOfAccounts) {
      console.log('[System Reset] Resetting Accounting Portal...');

      try {
        // Delete Journal Entry Lines first (references JournalEntry)
        if (resetOptions.allAccounting || resetOptions.journalEntries) {
          console.log('[System Reset] Deleting journal entries...');
          await db.journalEntryLine.deleteMany({}).then(r => { stats.journalEntryLines = r.count; }).catch(() => {});
          await db.journalEntry.deleteMany({}).then(r => { stats.journalEntries = r.count; }).catch(() => {});
        }

        // Delete Ledger Balances (references ChartOfAccount and FinancialYear)
        await db.ledgerBalance.deleteMany({}).then(r => { stats.ledgerBalances = r.count; }).catch(() => {});

        // Delete Reports Cache
        await db.reportsCache.deleteMany({}).then(r => { stats.reportsCache = r.count; }).catch(() => {});

        // Delete Chart of Accounts
        if (resetOptions.allAccounting || resetOptions.chartOfAccounts) {
          console.log('[System Reset] Deleting chart of accounts...');
          await db.chartOfAccount.deleteMany({}).then(r => { stats.chartOfAccounts = r.count; }).catch(() => {});
        }

        // Delete Financial Years
        if (resetOptions.allAccounting || resetOptions.financialYears) {
          console.log('[System Reset] Deleting financial years...');
          await db.financialYear.deleteMany({}).then(r => { stats.financialYears = r.count; }).catch(() => {});
        }

        // Delete Expenses
        if (resetOptions.allAccounting || resetOptions.expenses) {
          console.log('[System Reset] Deleting expenses...');
          await db.expense.deleteMany({}).then(r => { stats.expenses = r.count; }).catch(() => {});
        }

        // Delete GST Config
        if (resetOptions.allAccounting || resetOptions.gstConfig) {
          console.log('[System Reset] Deleting GST config...');
          await db.gSTConfig.deleteMany({}).then(r => { stats.gstConfigs = r.count; }).catch(() => {});
        }

        // Delete Cash Book Entries and Cash Book
        if (resetOptions.allAccounting || resetOptions.cashBook) {
          console.log('[System Reset] Deleting cash book...');
          await db.cashBookEntry.deleteMany({}).then(r => { stats.cashBookEntries = r.count; }).catch(() => {});
          await db.cashBook.deleteMany({}).then(r => { stats.cashBooks = r.count; }).catch(() => {});
        }

        // Delete Accounting Settings
        if (resetOptions.allAccounting || resetOptions.accountingSettings) {
          console.log('[System Reset] Deleting accounting settings...');
          await db.accountingSettings.deleteMany({}).then(r => { stats.accountingSettings = r.count; }).catch(() => {});
          await db.companyAccountingSettings.deleteMany({}).then(r => { stats.companyAccountingSettings = r.count; }).catch(() => {});
        }

        // Delete Fixed Assets and Depreciation Logs
        if (resetOptions.allAccounting || resetOptions.fixedAssets) {
          console.log('[System Reset] Deleting fixed assets...');
          await db.assetDepreciationLog.deleteMany({}).then(r => { stats.assetDepreciationLogs = r.count; }).catch(() => {});
          await db.fixedAsset.deleteMany({}).then(r => { stats.fixedAssets = r.count; }).catch(() => {});
        }

        // Delete Ledgers (company-level ledgers)
        await db.ledger.deleteMany({}).then(r => { stats.ledgers = r.count; }).catch(() => {});

        // Reset Loan Sequence (for mirror loan numbering)
        await db.loanSequence.deleteMany({}).then(r => { stats.loanSequence = r.count; }).catch(() => {});

        console.log('[System Reset] Accounting portal reset complete:', stats);

      } catch (e) {
        errors.push(`Phase 7 (accounting): ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================
    // PHASE 8: Delete CMS and Configuration
    // ========================================
    
    console.log('[System Reset] Deleting CMS and configuration...');
    try {
      await Promise.all([
        // CMS data
        db.cMSService.deleteMany({}).then(r => { stats.cmsServices = r.count; }).catch(() => {}),
        db.cMSBanner.deleteMany({}).then(r => { stats.cmsBanners = r.count; }).catch(() => {}),
        db.cMSTestimonial.deleteMany({}).then(r => { stats.cmsTestimonials = r.count; }).catch(() => {}),
        // Form config
        db.formConfig.deleteMany({}).then(r => { stats.formConfigs = r.count; }).catch(() => {}),
        // Payment settings
        db.paymentOptionSettings.deleteMany({}).then(r => { stats.paymentOptionSettings = r.count; }).catch(() => {}),
        db.companyPaymentSettings.deleteMany({}).then(r => { stats.companyPaymentSettings = r.count; }).catch(() => {}),
        db.companyPaymentPage.deleteMany({}).then(r => { stats.companyPaymentPages = r.count; }).catch(() => {}),
        // Uploaded files
        db.uploadedFile.deleteMany({}).then(r => { stats.uploadedFilesDb = r.count; }).catch(() => {}),
      ]);
    } catch (e) {
      errors.push(`Phase 8 (cms): ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // ========================================
    // PHASE 9: Delete UPLOADED DOCUMENTS
    // ========================================
    
    if (resetOptions.documents) {
      console.log('[System Reset] Deleting documents...');
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        
        try {
          await fs.rm(path.join(uploadsDir, 'documents'), { recursive: true, force: true });
          await fs.rm(path.join(uploadsDir, 'qr-codes'), { recursive: true, force: true });
          stats.uploadedFiles = 1;
        } catch {}
      } catch {}
    }

    // ========================================
    // PHASE 10: Clear Deleted Users
    // ========================================
    
    console.log('[System Reset] Clearing deleted users...');
    try {
      await db.deletedUser.deleteMany({}).then(r => { stats.deletedUsers = r.count; }).catch(() => {});
    } catch (e) {
      errors.push(`Phase 10 (deletedUsers): ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // ========================================
    // PHASE 11: Clear User Sessions (keep users logged in if needed)
    // ========================================
    
    console.log('[System Reset] Clearing user sessions...');
    try {
      await db.userSession.deleteMany({}).then(r => { stats.userSessions = r.count; }).catch(() => {});
      await db.userPreference.deleteMany({}).then(r => { stats.userPreferences = r.count; }).catch(() => {});
    } catch (e) {
      errors.push(`Phase 11 (sessions): ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[System Reset] Completed in ${duration}s`, stats);

    // Create an action log for the reset
    try {
      await db.actionLog.create({
        data: {
          userId,
          userRole: 'SUPER_ADMIN',
          actionType: 'SYSTEM_RESET',
          module: 'SYSTEM',
          recordId: 'system-reset',
          recordType: 'System',
          newData: JSON.stringify({ options: resetOptions, stats, duration }),
          description: `System reset completed in ${duration}s`,
          canUndo: false
        }
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'System reset completed - ALL accounting portal sections cleared',
      stats: { duration: `${duration}s`, deleted: stats },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[System Reset] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to reset system',
      details: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}
