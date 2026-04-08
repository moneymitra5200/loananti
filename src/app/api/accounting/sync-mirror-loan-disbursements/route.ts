import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Sync Mirror Loan Disbursements
 * 
 * This API fixes missing accounting entries for mirror loans.
 * It's used when:
 * 1. Mirror loan was created but bank/cash deduction failed
 * 2. Journal entry was not created
 * 3. BankTransaction or CashBookEntry is missing
 * 
 * The sync will:
 * 1. Find all mirror loans (isMirrorLoan = true)
 * 2. Check if they have accounting entries
 * 3. Create missing entries based on available bank/cash balance
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, mirrorCompanyId, createdBy } = body;

    if (!createdBy) {
      return NextResponse.json({ error: 'createdBy is required' }, { status: 400 });
    }

    const results = {
      totalMirrorLoans: 0,
      alreadyHasEntries: 0,
      fixedWithBank: 0,
      fixedWithCash: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Get all mirror loans
    const whereClause: any = { isMirrorLoan: true };
    if (mirrorCompanyId) {
      whereClause.companyId = mirrorCompanyId;
    }

    const mirrorLoans = await db.offlineLoan.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    results.totalMirrorLoans = mirrorLoans.length;
    console.log(`[Sync] Found ${mirrorLoans.length} mirror loans to check`);

    for (const loan of mirrorLoans) {
      try {
        // Check if this loan already has accounting entries
        const existingBankTxn = await db.bankTransaction.findFirst({
          where: {
            referenceId: loan.id,
            referenceType: 'MIRROR_LOAN_DISBURSEMENT'
          }
        });

        const existingCashEntry = await db.cashBookEntry.findFirst({
          where: {
            referenceId: loan.id,
            referenceType: 'MIRROR_LOAN_DISBURSEMENT'
          }
        });

        const existingJournalEntry = await db.journalEntry.findFirst({
          where: {
            referenceId: loan.id,
            referenceType: 'MIRROR_LOAN_DISBURSEMENT'
          }
        });

        // If all entries exist, skip
        if ((existingBankTxn || existingCashEntry) && existingJournalEntry) {
          results.alreadyHasEntries++;
          continue;
        }

        console.log(`[Sync] Processing mirror loan ${loan.loanNumber} - Company: ${loan.company?.name}`);

        // Try to create missing entries
        let disbursementSuccess = false;
        let disbursementMode: 'BANK' | 'CASH' = 'BANK';
        let bankAccountIdUsed: string | null = null;

        // Try bank first
        if (!existingBankTxn) {
          const defaultBank = await db.bankAccount.findFirst({
            where: { companyId: loan.companyId, isDefault: true, isActive: true }
          });

          if (defaultBank) {
            const currentBank = await db.bankAccount.findUnique({
              where: { id: defaultBank.id },
              select: { currentBalance: true }
            });

            if (currentBank && currentBank.currentBalance >= loan.loanAmount) {
              // Update bank balance
              await db.bankAccount.update({
                where: { id: defaultBank.id },
                data: { currentBalance: currentBank.currentBalance - loan.loanAmount }
              });

              // Create bank transaction
              await db.bankTransaction.create({
                data: {
                  bankAccountId: defaultBank.id,
                  transactionType: 'DEBIT',
                  amount: loan.loanAmount,
                  balanceAfter: currentBank.currentBalance - loan.loanAmount,
                  description: `Mirror Loan Disbursement - ${loan.loanNumber}`,
                  referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                  referenceId: loan.id,
                  createdById: createdBy
                }
              });

              disbursementSuccess = true;
              disbursementMode = 'BANK';
              bankAccountIdUsed = defaultBank.id;
              results.fixedWithBank++;
              console.log(`[Sync] ✓ Fixed with bank for ${loan.loanNumber}`);
            }
          }
        } else {
          // Bank transaction already exists
          disbursementSuccess = true;
          disbursementMode = 'BANK';
          bankAccountIdUsed = existingBankTxn.bankAccountId;
        }

        // Try cash if bank failed
        if (!disbursementSuccess && !existingCashEntry) {
          try {
            const { recordCashBookEntry } = await import('@/lib/simple-accounting');
            
            const cashResult = await recordCashBookEntry({
              companyId: loan.companyId,
              entryType: 'DEBIT',
              amount: loan.loanAmount,
              description: `Mirror Loan Disbursement - ${loan.loanNumber}`,
              referenceType: 'MIRROR_LOAN_DISBURSEMENT',
              referenceId: loan.id,
              createdById: createdBy
            });

            disbursementSuccess = true;
            disbursementMode = 'CASH';
            results.fixedWithCash++;
            console.log(`[Sync] ✓ Fixed with cash for ${loan.loanNumber}`);
          } catch (cashError) {
            console.error(`[Sync] Cash failed for ${loan.loanNumber}:`, cashError);
          }
        } else if (existingCashEntry) {
          disbursementSuccess = true;
          disbursementMode = 'CASH';
        }

        // Create journal entry if missing
        if (!existingJournalEntry && disbursementSuccess) {
          try {
            const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
            const accountingService = new AccountingService(loan.companyId);
            await accountingService.initializeChartOfAccounts();

            const creditAccountCode = disbursementMode === 'BANK'
              ? ACCOUNT_CODES.BANK_ACCOUNT
              : ACCOUNT_CODES.CASH_IN_HAND;

            await accountingService.createJournalEntry({
              entryDate: loan.disbursementDate || loan.createdAt,
              referenceType: 'MIRROR_LOAN_DISBURSEMENT',
              referenceId: loan.id,
              narration: `Mirror Loan Disbursement - ${loan.loanNumber} - ₹${loan.loanAmount.toLocaleString()} via ${disbursementMode} (SYNCED)`,
              lines: [
                {
                  accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
                  debitAmount: loan.loanAmount,
                  creditAmount: 0,
                  loanId: loan.id,
                  narration: 'Mirror loan principal disbursed (synced)',
                },
                {
                  accountCode: creditAccountCode,
                  debitAmount: 0,
                  creditAmount: loan.loanAmount,
                  narration: `${disbursementMode} account debited (synced)`,
                },
              ],
              createdById: createdBy,
              paymentMode: disbursementMode === 'BANK' ? 'BANK_TRANSFER' : 'CASH',
              bankAccountId: bankAccountIdUsed || undefined,
              isAutoEntry: true,
            });

            console.log(`[Sync] ✓ Created journal entry for ${loan.loanNumber}`);
          } catch (journalError) {
            console.error(`[Sync] Journal entry failed for ${loan.loanNumber}:`, journalError);
          }
        }

        if (!disbursementSuccess) {
          results.failed++;
          results.errors.push(`${loan.loanNumber}: No bank or cash available in ${loan.company?.name}`);
        }

      } catch (loanError) {
        results.failed++;
        results.errors.push(`${loan.loanNumber}: ${loanError instanceof Error ? loanError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.fixedWithBank + results.fixedWithCash} mirror loans`,
      results
    });

  } catch (error) {
    console.error('Mirror loan sync error:', error);
    return NextResponse.json({
      error: 'Failed to sync mirror loans',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get status of mirror loan accounting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mirrorCompanyId = searchParams.get('mirrorCompanyId');

    const whereClause: any = { isMirrorLoan: true };
    if (mirrorCompanyId) {
      whereClause.companyId = mirrorCompanyId;
    }

    const mirrorLoans = await db.offlineLoan.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    const status = [];

    for (const loan of mirrorLoans) {
      const hasBankTxn = await db.bankTransaction.findFirst({
        where: { referenceId: loan.id, referenceType: 'MIRROR_LOAN_DISBURSEMENT' }
      });

      const hasCashEntry = await db.cashBookEntry.findFirst({
        where: { referenceId: loan.id, referenceType: 'MIRROR_LOAN_DISBURSEMENT' }
      });

      const hasJournalEntry = await db.journalEntry.findFirst({
        where: { referenceId: loan.id, referenceType: 'MIRROR_LOAN_DISBURSEMENT' }
      });

      status.push({
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        loanAmount: loan.loanAmount,
        company: loan.company,
        hasBankTransaction: !!hasBankTxn,
        hasCashEntry: !!hasCashEntry,
        hasJournalEntry: !!hasJournalEntry,
        isComplete: (hasBankTxn || hasCashEntry) && hasJournalEntry,
        createdAt: loan.createdAt
      });
    }

    const summary = {
      total: status.length,
      complete: status.filter(s => s.isComplete).length,
      incomplete: status.filter(s => !s.isComplete).length
    };

    return NextResponse.json({
      success: true,
      summary,
      details: status
    });

  } catch (error) {
    console.error('Mirror loan status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
