import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * Sync Mirror Loans to Chart of Accounts
 * 
 * This API fixes existing mirror loans that were created without
 * proper accounting entries in the Chart of Accounts.
 * 
 * When a mirror loan is created, we need to record:
 * - Debit: Loans Receivable (Asset)
 * - Credit: Cash in Hand (Asset)
 */

// GET - Check sync status
export async function GET(request: NextRequest) {
  try {
    // Get all mirror loan mappings
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { isOfflineLoan: true },
      include: {
        mirrorCompany: { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    // Get all offline loans that are mirror loans
    const mirrorLoans = await db.offlineLoan.findMany({
      where: { isMirrorLoan: true },
      include: {
        company: { select: { id: true, name: true, code: true } },
      }
    });

    // Check which mirror loans have accounting entries
    const syncStatus: Array<{
      loanId: string;
      loanNumber: string;
      companyId: string;
      companyName: string;
      loanAmount: number;
      hasAccountingEntry: boolean;
    }> = [];

    for (const loan of mirrorLoans) {
      // Check if journal entry exists for this loan
      const journalEntry = await db.journalEntry.findFirst({
        where: {
          companyId: loan.companyId,
          referenceType: 'MIRROR_LOAN_DISBURSEMENT',
          referenceId: loan.id,
        }
      });

      syncStatus.push({
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        companyId: loan.companyId || '',
        companyName: loan.company?.name || 'Unknown',
        loanAmount: loan.loanAmount,
        hasAccountingEntry: !!journalEntry,
      });
    }

    const needsSync = syncStatus.filter(s => !s.hasAccountingEntry);

    return NextResponse.json({
      success: true,
      totalMirrorLoans: mirrorLoans.length,
      syncedCount: syncStatus.filter(s => s.hasAccountingEntry).length,
      needsSyncCount: needsSync.length,
      needsSync: needsSync,
      syncStatus: syncStatus,
    });
  } catch (error) {
    console.error('Error checking mirror loan sync status:', error);
    return NextResponse.json({
      error: 'Failed to check sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Sync all mirror loans
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = false, loanId } = body;

    // Get system user for createdById
    const systemUser = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true }
    }) || await db.user.findFirst({ select: { id: true } });

    if (!systemUser) {
      return NextResponse.json({ error: 'No system user found' }, { status: 500 });
    }

    const createdById = systemUser.id;

    // Get all offline loans that are mirror loans
    const whereClause: any = { isMirrorLoan: true };
    if (loanId) {
      whereClause.id = loanId;
    }

    const mirrorLoans = await db.offlineLoan.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, name: true, code: true } },
      }
    });

    console.log(`[Sync Mirror Loans] Found ${mirrorLoans.length} mirror loans to check`);

    const results: Array<{
      loanId: string;
      loanNumber: string;
      companyId: string;
      companyName: string;
      loanAmount: number;
      status: 'synced' | 'skipped' | 'error';
      message?: string;
    }> = [];

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const loan of mirrorLoans) {
      try {
        if (!loan.companyId) {
          results.push({
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            companyId: '',
            companyName: 'No Company',
            loanAmount: loan.loanAmount,
            status: 'error',
            message: 'Loan has no company assigned',
          });
          errorCount++;
          continue;
        }

        // Check if journal entry already exists
        const existingEntry = await db.journalEntry.findFirst({
          where: {
            companyId: loan.companyId,
            referenceType: 'MIRROR_LOAN_DISBURSEMENT',
            referenceId: loan.id,
          }
        });

        if (existingEntry) {
          results.push({
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            companyId: loan.companyId,
            companyName: loan.company?.name || 'Unknown',
            loanAmount: loan.loanAmount,
            status: 'skipped',
            message: 'Accounting entry already exists',
          });
          skippedCount++;
          continue;
        }

        if (dryRun) {
          results.push({
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            companyId: loan.companyId,
            companyName: loan.company?.name || 'Unknown',
            loanAmount: loan.loanAmount,
            status: 'synced',
            message: 'Would create accounting entry (dry run)',
          });
          continue;
        }

        // Create accounting entry
        const accountingService = new AccountingService(loan.companyId);
        await accountingService.initializeChartOfAccounts();

        await accountingService.createJournalEntry({
          entryDate: loan.disbursementDate || loan.startDate || new Date(),
          referenceType: 'MIRROR_LOAN_DISBURSEMENT',
          referenceId: loan.id,
          narration: `Mirror Loan Disbursement - ${loan.loanNumber} - Principal: ₹${loan.loanAmount.toLocaleString()} (Synced)`,
          lines: [
            {
              accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
              debitAmount: loan.loanAmount,
              creditAmount: 0,
              loanId: loan.id,
              narration: 'Mirror loan principal disbursed',
            },
            {
              accountCode: ACCOUNT_CODES.CASH_IN_HAND,
              debitAmount: 0,
              creditAmount: loan.loanAmount,
              narration: 'Cash paid out for mirror loan',
            },
          ],
          createdById,
          paymentMode: 'BANK_TRANSFER',
          isAutoEntry: true,
        });

        results.push({
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          companyId: loan.companyId,
          companyName: loan.company?.name || 'Unknown',
          loanAmount: loan.loanAmount,
          status: 'synced',
          message: 'Accounting entry created successfully',
        });
        syncedCount++;

        console.log(`[Sync Mirror Loans] Synced ${loan.loanNumber} - Loans Receivable: ₹${loan.loanAmount}`);

      } catch (loanError) {
        console.error(`[Sync Mirror Loans] Error syncing loan ${loan.loanNumber}:`, loanError);
        results.push({
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          companyId: loan.companyId || '',
          companyName: loan.company?.name || 'Unknown',
          loanAmount: loan.loanAmount,
          status: 'error',
          message: loanError instanceof Error ? loanError.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `Dry run complete. Would sync ${mirrorLoans.length - skippedCount} mirror loans.`
        : `Synced ${syncedCount} mirror loans to Chart of Accounts`,
      dryRun,
      total: mirrorLoans.length,
      syncedCount,
      skippedCount,
      errorCount,
      results,
    });

  } catch (error) {
    console.error('Error syncing mirror loans:', error);
    return NextResponse.json({
      error: 'Failed to sync mirror loans',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
