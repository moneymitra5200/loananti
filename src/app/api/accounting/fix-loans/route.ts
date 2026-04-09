import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Simple Fix: Update Chart of Accounts balances for Loan Disbursements
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[Fix Loans] Starting...');
    
    // Get all offline loans
    const offlineLoans = await db.offlineLoan.findMany({
      select: {
        id: true,
        loanNumber: true,
        loanAmount: true,
        companyId: true,
        disbursementDate: true,
        startDate: true,
        createdById: true
      }
    });

    console.log(`[Fix Loans] Found ${offlineLoans.length} loans`);

    const results = {
      total: offlineLoans.length,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const loan of offlineLoans) {
      try {
        // Skip loans without company
        if (!loan.companyId) {
          results.errors.push(`Loan ${loan.loanNumber} has no company assigned`);
          continue;
        }

        // Check if journal entry already exists
        const existingEntry = await db.journalEntry.findFirst({
          where: {
            companyId: loan.companyId,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: loan.id
          }
        });

        if (existingEntry) {
          results.skipped++;
          continue;
        }

        // Get Loans Receivable account (code 1200)
        const loansReceivable = await db.chartOfAccount.findFirst({
          where: {
            companyId: loan.companyId,
            accountCode: '1200'
          },
          select: { id: true, currentBalance: true }
        });

        // Get Cash in Hand account (code 1101)
        const cashInHand = await db.chartOfAccount.findFirst({
          where: {
            companyId: loan.companyId,
            accountCode: '1101'
          },
          select: { id: true, currentBalance: true }
        });

        if (!loansReceivable || !cashInHand) {
          results.errors.push(`Accounts not found for loan ${loan.loanNumber}`);
          continue;
        }

        // Update Loans Receivable balance
        await db.chartOfAccount.update({
          where: { id: loansReceivable.id },
          data: {
            currentBalance: loansReceivable.currentBalance + loan.loanAmount
          }
        });

        // Update Cash balance
        await db.chartOfAccount.update({
          where: { id: cashInHand.id },
          data: {
            currentBalance: cashInHand.currentBalance - loan.loanAmount
          }
        });

        // Create journal entry record
        await db.journalEntry.create({
          data: {
            companyId: loan.companyId!, // Already checked above
            entryNumber: `JE-${loan.loanNumber}`,
            entryDate: loan.disbursementDate || loan.startDate || new Date(),
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: loan.id,
            narration: `Loan Disbursement - ${loan.loanNumber}`,
            totalDebit: loan.loanAmount,
            totalCredit: loan.loanAmount,
            isAutoEntry: true,
            isApproved: true,
            createdById: loan.createdById || 'system-fix',
            lines: {
              create: [
                {
                  accountId: loansReceivable.id,
                  debitAmount: loan.loanAmount,
                  creditAmount: 0,
                  loanId: loan.id,
                  narration: 'Loan disbursed'
                },
                {
                  accountId: cashInHand.id,
                  debitAmount: 0,
                  creditAmount: loan.loanAmount,
                  narration: 'Cash paid'
                }
              ]
            }
          }
        });

        results.updated++;
        console.log(`[Fix Loans] Updated ${loan.loanNumber}: +${loan.loanAmount} to Loans Receivable`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${loan.loanNumber}: ${msg}`);
        console.error(`[Fix Loans] Error for loan:`, msg);
      }
    }

    console.log('[Fix Loans] Completed:', results);

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('[Fix Loans] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
