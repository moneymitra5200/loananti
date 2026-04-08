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

    const companyIds = companies.map(c => c.id);
    const deletedCompanies: string[] = [];
    const errors: string[] = [];

    // Delete in proper order to respect foreign key constraints
    for (const companyId of companyIds) {
      try {
        console.log(`[Delete All Companies] Processing company: ${companyId}`);

        // 1. Get all loans for this company
        const loans = await db.loanApplication.findMany({
          where: { companyId },
          select: { id: true }
        });
        const loanIds = loans.map(l => l.id);

        if (loanIds.length > 0) {
          // 2. Delete EMI schedules and payments
          await db.eMISchedule.deleteMany({
            where: { loanApplicationId: { in: loanIds } }
          });
          
          // 3. Delete session forms
          await db.sessionForm.deleteMany({
            where: { loanApplicationId: { in: loanIds } }
          });

          // 4. Delete payments
          await db.payment.deleteMany({
            where: { loanApplicationId: { in: loanIds } }
          });

          // 5. Delete loan documents
          await db.loanDocument.deleteMany({
            where: { loanApplicationId: { in: loanIds } }
          });

          // 6. Delete workflow logs for these loans
          await db.workflowLog.deleteMany({
            where: { loanApplicationId: { in: loanIds } }
          });

          // 7. Delete mirror loan mappings
          await db.mirrorLoanMapping.deleteMany({
            where: { 
              OR: [
                { originalCompanyId: companyId },
                { mirrorCompanyId: companyId }
              ]
            }
          });

          // 8. Delete pending mirror loans
          await db.pendingMirrorLoan.deleteMany({
            where: {
              OR: [
                { originalCompanyId: companyId },
                { mirrorCompanyId: companyId }
              ]
            }
          });

          // 9. Delete the loans
          await db.loanApplication.deleteMany({
            where: { companyId }
          });
        }

        // 10. Delete chart of accounts and related
        await db.ledgerBalance.deleteMany({
          where: { account: { companyId } }
        });
        
        await db.journalEntryLine.deleteMany({
          where: { account: { companyId } }
        });
        
        await db.chartOfAccount.deleteMany({
          where: { companyId }
        });

        // 11. Delete journal entries
        await db.journalEntry.deleteMany({
          where: { companyId }
        });

        // 12. Delete financial years and ledgers
        await db.ledgerBalance.deleteMany({
          where: { financialYear: { companyId } }
        });
        
        await db.financialYear.deleteMany({
          where: { companyId }
        });
        
        await db.ledger.deleteMany({
          where: { companyId }
        });

        // 13. Delete bank and cash accounts
        await db.bankAccount.deleteMany({
          where: { companyId }
        });
        
        await db.cashAccount.deleteMany({
          where: { companyId }
        });

        // 14. Delete other company records
        await db.expense.deleteMany({ where: { companyId } });
        await db.gSTConfig.deleteMany({ where: { companyId } });
        await db.fixedAsset.deleteMany({ where: { companyId } });
        await db.commissionSlab.deleteMany({ where: { companyId } });
        await db.gracePeriodConfig.deleteMany({ where: { companyId } });
        await db.preApprovedOffer.deleteMany({ where: { companyId } });
        await db.agentPerformance.deleteMany({ where: { companyId } });

        // 15. Get the company user
        const companyUser = await db.user.findFirst({
          where: { companyId, role: 'COMPANY' }
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

          // Create deleted user record
          try {
            await db.deletedUser.create({
              data: {
                email: companyUser.email,
                firebaseUid: companyUser.firebaseUid,
                originalRole: companyUser.role
              }
            });
          } catch {
            // Ignore if exists
          }

          // Delete the user
          await db.user.delete({ where: { id: companyUser.id } });
        }

        // 16. FINALLY - Delete the company
        await db.company.delete({ where: { id: companyId } });
        
        deletedCompanies.push(companyId);
        console.log(`[Delete All Companies] Deleted company: ${companyId}`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Delete All Companies] Error deleting company ${companyId}:`, errorMsg);
        errors.push(`Company ${companyId}: ${errorMsg}`);
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
