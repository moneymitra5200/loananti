import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * Quick Fix: Update Chart of Accounts for Loan Disbursements
 * 
 * Simple approach: Just update account balances without complex journal entries
 */

export async function GET(request: NextRequest) {
  try {
    const results = {
      loansProcessed: 0,
      accountsUpdated: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Get all offline loans
    const offlineLoans = await db.offlineLoan.findMany({
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    for (const loan of offlineLoans) {
      try {
        // Skip loans without company
        if (!loan.companyId) {
          results.errors.push(`Loan ${loan.loanNumber} has no company assigned`);
          continue;
        }

        // Check if this loan already has accounting entry
        const existingEntry = await db.journalEntry.findFirst({
          where: {
            companyId: loan.companyId,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: loan.id
          }
        });

        if (existingEntry) {
          continue; // Already has entry
        }

        // Get accounts for this company
        const loansReceivable = await db.chartOfAccount.findFirst({
          where: { companyId: loan.companyId, accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE }
        });
        const cashInHand = await db.chartOfAccount.findFirst({
          where: { companyId: loan.companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
        });

        if (!loansReceivable || !cashInHand) {
          results.errors.push(`Accounts not found for company ${loan.companyId}`);
          continue;
        }

        // Update balances directly
        await db.chartOfAccount.update({
          where: { id: loansReceivable.id },
          data: { currentBalance: { increment: loan.loanAmount } }
        });

        await db.chartOfAccount.update({
          where: { id: cashInHand.id },
          data: { currentBalance: { decrement: loan.loanAmount } }
        });

        // Create a simple journal entry record
        const entryNumber = `JE-LOAN-${loan.loanNumber}`;
        await db.journalEntry.create({
          data: {
            companyId: loan.companyId!, // We already checked this is not null above
            entryNumber,
            entryDate: loan.disbursementDate || loan.startDate,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: loan.id,
            narration: `Loan Disbursement - ${loan.loanNumber}`,
            totalDebit: loan.loanAmount,
            totalCredit: loan.loanAmount,
            isAutoEntry: true,
            isApproved: true,
            createdById: loan.createdById || 'system-sync',
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

        results.loansProcessed++;
        results.accountsUpdated += 2;
        results.details.push({
          loanNumber: loan.loanNumber,
          company: loan.company?.name,
          amount: loan.loanAmount,
          status: 'UPDATED'
        });

        console.log(`[Quick Fix] Updated ${loan.loanNumber}: Loans Receivable +${loan.loanAmount}, Cash -${loan.loanAmount}`);
      } catch (error) {
        results.errors.push(`${loan.loanNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Quick fix completed',
      results
    });
  } catch (error) {
    console.error('Quick fix error:', error);
    return NextResponse.json({
      error: 'Quick fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
