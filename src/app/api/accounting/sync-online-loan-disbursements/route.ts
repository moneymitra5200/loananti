import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * Sync Online Loan (LoanApplication) Disbursements to Chart of Accounts
 * 
 * This API fixes existing loans that were created without proper accounting entries.
 * When a loan is disbursed:
 * - Debit: Loans Receivable (Asset increases)
 * - Credit: Cash/Bank (Asset decreases)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const dryRun = searchParams.get('dryRun') === 'true';

    const results = {
      scanned: 0,
      missing: 0,
      fixed: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Get all ACTIVE online loans (LoanApplication)
    const whereClause: any = {
      status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY'] }
    };
    if (companyId) {
      whereClause.companyId = companyId;
    }

    const onlineLoans = await db.loanApplication.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, name: true, code: true, isMirrorCompany: true } },
        sessionForm: { select: { approvedAmount: true } },
        customer: { select: { name: true } }
      }
    });

    results.scanned = onlineLoans.length;
    console.log(`[Sync Online Loans] Scanning ${onlineLoans.length} active loans`);

    for (const loan of onlineLoans) {
      try {
        // Skip loans without company
        if (!loan.companyId) {
          results.errors.push(`Loan ${loan.applicationNo} has no company assigned`);
          continue;
        }

        // Get the disbursed amount
        const disburseAmount = loan.disbursedAmount || loan.sessionForm?.approvedAmount || loan.requestedAmount;
        if (!disburseAmount || disburseAmount <= 0) {
          results.errors.push(`Loan ${loan.applicationNo} has no valid disbursement amount`);
          continue;
        }

        // Check if journal entry exists for this loan disbursement
        const existingEntry = await db.journalEntry.findFirst({
          where: {
            companyId: loan.companyId,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: loan.id
          }
        });

        if (existingEntry) {
          // Entry already exists, skip
          console.log(`[Sync] Loan ${loan.applicationNo} already has journal entry, skipping`);
          continue;
        }

        results.missing++;
        console.log(`[Sync] Loan ${loan.applicationNo} missing journal entry for ₹${disburseAmount}`);

        if (!dryRun) {
          // Get or create accounting service for the company
          const accountingService = new AccountingService(loan.companyId);
          await accountingService.initializeChartOfAccounts();

          // Get account IDs
          const loansReceivableAccount = await db.chartOfAccount.findFirst({
            where: { companyId: loan.companyId, accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE }
          });

          // Get the correct cash/bank account based on disbursement mode
          let cashAccount = await db.chartOfAccount.findFirst({
            where: { companyId: loan.companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
          });

          // If disbursement was via bank, try to find or use the bank account
          if (loan.disbursementMode === 'BANK_TRANSFER' && loan.disbursementRef) {
            // Try to find a bank chart of account
            const bankChartAccount = await db.chartOfAccount.findFirst({
              where: { 
                companyId: loan.companyId, 
                accountCode: { startsWith: '14' } 
              }
            });
            if (bankChartAccount) {
              cashAccount = bankChartAccount;
            }
          }

          if (!loansReceivableAccount || !cashAccount) {
            results.errors.push(`Chart of Accounts not initialized for company ${loan.companyId}`);
            continue;
          }

          const entryNumber = await accountingService.generateEntryNumber();

          // Create journal entry
          await db.journalEntry.create({
            data: {
              companyId: loan.companyId,
              entryNumber,
              entryDate: loan.disbursedAt || loan.createdAt,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: loan.id,
              narration: `Loan Disbursement - ${loan.applicationNo} - ${loan.customer?.name || 'Customer'}`,
              totalDebit: disburseAmount,
              totalCredit: disburseAmount,
              isAutoEntry: true,
              isApproved: true,
              createdById: loan.disbursedById || 'system-sync',
              lines: {
                create: [
                  {
                    accountId: loansReceivableAccount.id,
                    debitAmount: disburseAmount,
                    creditAmount: 0,
                    loanId: loan.id,
                    customerId: loan.customerId,
                    narration: 'Loan principal disbursed'
                  },
                  {
                    accountId: cashAccount.id,
                    debitAmount: 0,
                    creditAmount: disburseAmount,
                    narration: loan.disbursementMode === 'BANK_TRANSFER' 
                      ? 'Bank transfer for loan disbursement' 
                      : 'Cash paid out for loan'
                  }
                ]
              }
            }
          });

          // Update account balances
          await db.chartOfAccount.update({
            where: { id: loansReceivableAccount.id },
            data: {
              currentBalance: { increment: disburseAmount }
            }
          });

          await db.chartOfAccount.update({
            where: { id: cashAccount.id },
            data: {
              currentBalance: { decrement: disburseAmount }
            }
          });

          results.fixed++;
          results.details.push({
            loanId: loan.id,
            applicationNo: loan.applicationNo,
            amount: disburseAmount,
            company: loan.company?.name,
            disbursementMode: loan.disbursementMode,
            status: 'FIXED'
          });

          console.log(`[Sync] Fixed loan ${loan.applicationNo} - Loans Receivable: +${disburseAmount}, Cash/Bank: -${disburseAmount}`);
        } else {
          results.details.push({
            loanId: loan.id,
            applicationNo: loan.applicationNo,
            amount: disburseAmount,
            company: loan.company?.name,
            disbursementMode: loan.disbursementMode,
            status: 'MISSING (dry run)'
          });
        }
      } catch (error) {
        const errorMsg = `Failed to sync loan ${loan.applicationNo}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Sync completed',
      results
    });
  } catch (error) {
    console.error('Sync online loan disbursements error:', error);
    return NextResponse.json({
      error: 'Failed to sync loan disbursements',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // POST also triggers sync (for convenience)
  return GET(request);
}
