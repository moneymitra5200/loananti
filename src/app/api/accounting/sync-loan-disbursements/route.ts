import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * Sync Loan Disbursements to Chart of Accounts
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

    // Get all offline loans
    const whereClause: any = {};
    if (companyId) {
      whereClause.companyId = companyId;
    }

    const offlineLoans = await db.offlineLoan.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    results.scanned = offlineLoans.length;

    for (const loan of offlineLoans) {
      try {
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
          continue;
        }

        results.missing++;

        // Get or create accounting service for the company
        const accountingService = new AccountingService(loan.companyId);
        await accountingService.initializeChartOfAccounts();

        const targetCompanyId = loan.companyId;

        if (!dryRun) {
          // Create journal entry for loan disbursement
          // Debit: Loans Receivable (Asset)
          // Credit: Cash in Hand (Asset)
          
          const entryNumber = await accountingService.generateEntryNumber();

          // Get account IDs
          const loansReceivableAccount = await db.chartOfAccount.findFirst({
            where: { companyId: targetCompanyId, accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE }
          });
          const cashInHandAccount = await db.chartOfAccount.findFirst({
            where: { companyId: targetCompanyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
          });

          if (!loansReceivableAccount || !cashInHandAccount) {
            results.errors.push(`Chart of Accounts not initialized for company ${loan.companyId}`);
            continue;
          }

          // Create journal entry without ledger balance updates (simpler approach)
          const journalEntry = await db.journalEntry.create({
            data: {
              companyId: targetCompanyId,
              entryNumber,
              entryDate: loan.disbursementDate || loan.startDate,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: loan.id,
              narration: `Loan Disbursement - ${loan.loanNumber} - ${loan.customerName}`,
              totalDebit: loan.loanAmount,
              totalCredit: loan.loanAmount,
              isAutoEntry: true,
              isApproved: true,
              createdById: loan.createdById || 'system-sync',
              lines: {
                create: [
                  {
                    accountId: loansReceivableAccount.id,
                    debitAmount: loan.loanAmount,
                    creditAmount: 0,
                    loanId: loan.id,
                    narration: 'Loan principal disbursed'
                  },
                  {
                    accountId: cashInHandAccount.id,
                    debitAmount: 0,
                    creditAmount: loan.loanAmount,
                    narration: 'Cash paid out for loan'
                  }
                ]
              }
            }
          });

          // Update account balances separately
          await db.chartOfAccount.update({
            where: { id: loansReceivableAccount.id },
            data: {
              currentBalance: loansReceivableAccount.currentBalance + loan.loanAmount
            }
          });

          await db.chartOfAccount.update({
            where: { id: cashInHandAccount.id },
            data: {
              currentBalance: cashInHandAccount.currentBalance - loan.loanAmount
            }
          });

          results.fixed++;
          results.details.push({
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            amount: loan.loanAmount,
            company: loan.company?.name,
            status: 'FIXED'
          });

          console.log(`[Sync] Fixed loan ${loan.loanNumber} - Loans Receivable: +${loan.loanAmount}`);
        } else {
          results.details.push({
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            amount: loan.loanAmount,
            company: loan.company?.name,
            status: 'MISSING (dry run)'
          });
        }
      } catch (error) {
        const errorMsg = `Failed to sync loan ${loan.loanNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Also check mirror loans that were created in mirror companies
    const mirrorLoanMappings = await db.mirrorLoanMapping.findMany({
      where: companyId ? { mirrorCompanyId: companyId } : {},
      include: {
        mirrorCompany: { select: { id: true, name: true, code: true } }
      }
    });

    for (const mapping of mirrorLoanMappings) {
      if (!mapping.mirrorLoanId) continue;

      try {
        const mirrorLoan = await db.offlineLoan.findUnique({
          where: { id: mapping.mirrorLoanId }
        });

        if (!mirrorLoan) continue;

        // Check if journal entry exists
        const existingEntry = await db.journalEntry.findFirst({
          where: {
            companyId: mapping.mirrorCompanyId,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: mirrorLoan.id
          }
        });

        if (existingEntry) continue;

        results.missing++;

        if (!dryRun) {
          const accountingService = new AccountingService(mapping.mirrorCompanyId);
          await accountingService.initializeChartOfAccounts();

          const entryNumber = await accountingService.generateEntryNumber();

          const loansReceivableAccount = await db.chartOfAccount.findFirst({
            where: { companyId: mapping.mirrorCompanyId, accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE }
          });
          const cashInHandAccount = await db.chartOfAccount.findFirst({
            where: { companyId: mapping.mirrorCompanyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
          });

          if (!loansReceivableAccount || !cashInHandAccount) {
            results.errors.push(`Chart of Accounts not initialized for mirror company ${mapping.mirrorCompanyId}`);
            continue;
          }

          // Create journal entry
          const journalEntry = await db.journalEntry.create({
            data: {
              companyId: mapping.mirrorCompanyId,
              entryNumber,
              entryDate: mirrorLoan.disbursementDate || mirrorLoan.startDate,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: mirrorLoan.id,
              narration: `Mirror Loan Disbursement - ${mirrorLoan.loanNumber}`,
              totalDebit: mirrorLoan.loanAmount,
              totalCredit: mirrorLoan.loanAmount,
              isAutoEntry: true,
              isApproved: true,
              createdById: mirrorLoan.createdById || 'system-sync',
              lines: {
                create: [
                  {
                    accountId: loansReceivableAccount.id,
                    debitAmount: mirrorLoan.loanAmount,
                    creditAmount: 0,
                    loanId: mirrorLoan.id,
                    narration: 'Mirror loan principal disbursed'
                  },
                  {
                    accountId: cashInHandAccount.id,
                    debitAmount: 0,
                    creditAmount: mirrorLoan.loanAmount,
                    narration: 'Cash paid for mirror loan'
                  }
                ]
              }
            }
          });

          // Update account balances
          await db.chartOfAccount.update({
            where: { id: loansReceivableAccount.id },
            data: { currentBalance: loansReceivableAccount.currentBalance + mirrorLoan.loanAmount }
          });

          await db.chartOfAccount.update({
            where: { id: cashInHandAccount.id },
            data: { currentBalance: cashInHandAccount.currentBalance - mirrorLoan.loanAmount }
          });

          results.fixed++;
          results.details.push({
            loanId: mirrorLoan.id,
            loanNumber: mirrorLoan.loanNumber,
            amount: mirrorLoan.loanAmount,
            company: mapping.mirrorCompany?.name,
            status: 'FIXED (mirror loan)'
          });

          console.log(`[Sync] Fixed MIRROR loan ${mirrorLoan.loanNumber} - Loans Receivable: +${mirrorLoan.loanAmount}`);
        }
      } catch (error) {
        const errorMsg = `Failed to sync mirror loan: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
    console.error('Sync loan disbursements error:', error);
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
