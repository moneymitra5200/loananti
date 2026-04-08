import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

// POST - Delete ALL companies (DANGEROUS - Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmDelete, userId } = body;

    console.log('[Delete All Companies] Starting cascade delete...');
    console.log('[Delete All Companies] Initiated by:', userId);

    // Safety check - require explicit confirmation
    if (confirmDelete !== 'DELETE_ALL_COMPANIES') {
      return NextResponse.json({ 
        error: 'Confirmation required. Please send confirmDelete: "DELETE_ALL_COMPANIES"' 
      }, { status: 400 });
    }

    // Get all companies first
    const companies = await db.company.findMany({
      select: { id: true, name: true, code: true }
    });

    console.log(`[Delete All Companies] Found ${companies.length} companies to delete`);

    if (companies.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No companies to delete',
        deletedCount: 0 
      });
    }

    const deletedCompanies: string[] = [];
    const errors: string[] = [];

    // Delete in proper order to respect foreign key constraints
    for (const company of companies) {
      try {
        console.log(`[Delete All Companies] Processing company: ${company.id} (${company.name})`);

        // 1. Get all loans for this company
        const loans = await db.loanApplication.findMany({
          where: { companyId: company.id },
          select: { id: true }
        });
        const loanIds = loans.map(l => l.id);

        if (loanIds.length > 0) {
          // Delete loan-related records
          await db.eMISchedule.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
          await db.sessionForm.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
          await db.payment.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
          await db.secureDocument.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
          await db.workflowLog.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
          
          // Delete mirror loan mappings
          await db.mirrorLoanMapping.deleteMany({
            where: { 
              OR: [
                { originalCompanyId: company.id },
                { mirrorCompanyId: company.id }
              ]
            }
          });

          // Delete pending mirror loans
          await db.pendingMirrorLoan.deleteMany({
            where: {
              OR: [
                { originalCompanyId: company.id },
                { mirrorCompanyId: company.id }
              ]
            }
          });

          // Delete offline loans
          await db.offlineLoan.deleteMany({ where: { companyId: company.id } });

          // Delete the loans
          await db.loanApplication.deleteMany({ where: { companyId: company.id } });
        }

        // Delete accounting records
        await db.ledgerBalance.deleteMany({ where: { account: { companyId: company.id } } });
        await db.journalEntryLine.deleteMany({ where: { account: { companyId: company.id } } });
        await db.chartOfAccount.deleteMany({ where: { companyId: company.id } });
        await db.journalEntry.deleteMany({ where: { companyId: company.id } });
        await db.ledgerBalance.deleteMany({ where: { financialYear: { companyId: company.id } } });
        await db.financialYear.deleteMany({ where: { companyId: company.id } });
        await db.ledger.deleteMany({ where: { companyId: company.id } });
        await db.bankAccount.deleteMany({ where: { companyId: company.id } });
        
        // Delete other company records
        await db.expense.deleteMany({ where: { companyId: company.id } });
        await db.gSTConfig.deleteMany({ where: { companyId: company.id } });
        await db.fixedAsset.deleteMany({ where: { companyId: company.id } });
        await db.commissionSlab.deleteMany({ where: { companyId: company.id } });
        await db.gracePeriodConfig.deleteMany({ where: { companyId: company.id } });
        await db.preApprovedOffer.deleteMany({ where: { companyId: company.id } });
        await db.agentPerformance.deleteMany({ where: { companyId: company.id } });
        await db.companyAccountingSettings.deleteMany({ where: { companyId: company.id } });
        await db.companyPaymentSettings.deleteMany({ where: { companyId: company.id } });
        await db.companyPaymentPage.deleteMany({ where: { companyId: company.id } });
        await db.daybookEntry.deleteMany({ where: { companyId: company.id } });
        await db.borrowedMoney.deleteMany({ where: { companyId: company.id } });
        await db.investMoney.deleteMany({ where: { companyId: company.id } });
        await db.equityEntry.deleteMany({ where: { companyId: company.id } });

        // Get and delete the company user
        const companyUser = await db.user.findFirst({
          where: { companyId: company.id, role: 'COMPANY' }
        });

        if (companyUser) {
          // Delete user-related records
          await db.auditLog.deleteMany({ where: { userId: companyUser.id } });
          await db.notification.deleteMany({ where: { userId: companyUser.id } });
          await db.workflowLog.deleteMany({ where: { actionById: companyUser.id } });
          await db.locationLog.deleteMany({ where: { userId: companyUser.id } });
          await db.reminder.deleteMany({ where: { userId: companyUser.id } });
          await db.notificationSetting.deleteMany({ where: { userId: companyUser.id } });
          await db.deviceFingerprint.deleteMany({ where: { userId: companyUser.id } });
          await db.blacklist.deleteMany({ where: { userId: companyUser.id } });
          await db.userSession.deleteMany({ where: { userId: companyUser.id } });
          await db.userPreference.deleteMany({ where: { userId: companyUser.id } });

          // Delete the user permanently
          await db.user.delete({ where: { id: companyUser.id } });
        }

        // FINALLY - Delete the company
        await db.company.delete({ where: { id: company.id } });
        
        deletedCompanies.push(company.id);
        console.log(`[Delete All Companies] Deleted company: ${company.name}`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Delete All Companies] Error deleting company ${company.id}:`, errorMsg);
        errors.push(`Company ${company.name}: ${errorMsg}`);
      }
    }

    // Clear all caches
    cache.deletePattern('companies:');
    cache.deletePattern('users:');
    cache.deletePattern('loans:');

    console.log(`[Delete All Companies] Completed. Deleted: ${deletedCompanies.length}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCompanies.length} companies`,
      deletedCount: deletedCompanies.length,
      deletedCompanies: deletedCompanies,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Delete All Companies] Fatal error:', error);
    return NextResponse.json({
      error: 'Failed to delete all companies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
