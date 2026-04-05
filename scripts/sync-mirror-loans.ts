/**
 * Sync Mirror Loans to Chart of Accounts
 * 
 * This script fixes existing mirror loans that were created without
 * proper accounting entries in the Chart of Accounts.
 */

import { db } from '../src/lib/db';
import { AccountingService, ACCOUNT_CODES } from '../src/lib/accounting-service';

async function syncMirrorLoans() {
  console.log('=== Starting Mirror Loan Sync ===\n');

  try {
    // Get all offline loans that are mirror loans
    const mirrorLoans = await db.offlineLoan.findMany({
      where: { isMirrorLoan: true },
      include: {
        company: { select: { id: true, name: true, code: true } },
      }
    });

    console.log(`Found ${mirrorLoans.length} mirror loans\n`);

    // Get system user for createdById
    let systemUser = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true }
    });
    
    if (!systemUser) {
      systemUser = await db.user.findFirst({ select: { id: true } });
    }

    if (!systemUser) {
      console.error('No system user found!');
      return;
    }

    const createdById = systemUser.id;
    console.log(`Using system user: ${createdById}\n`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const loan of mirrorLoans) {
      try {
        console.log(`Processing: ${loan.loanNumber}`);
        console.log(`  Company: ${loan.company?.name || 'Unknown'}`);
        console.log(`  Amount: ₹${loan.loanAmount}`);

        if (!loan.companyId) {
          console.log('  ❌ ERROR: No company assigned\n');
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
          console.log('  ⏭️ SKIPPED: Accounting entry already exists\n');
          skippedCount++;
          continue;
        }

        // Initialize chart of accounts for this company
        const accountingService = new AccountingService(loan.companyId);
        await accountingService.initializeChartOfAccounts();

        // Create accounting entry
        await accountingService.createJournalEntry({
          entryDate: loan.disbursementDate || loan.startDate || new Date(),
          referenceType: 'MIRROR_LOAN_DISBURSEMENT',
          referenceId: loan.id,
          narration: `Mirror Loan Disbursement - ${loan.loanNumber} - Principal: ₹${loan.loanAmount.toLocaleString()}`,
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

        console.log('  ✅ SYNCED: Accounting entry created\n');
        syncedCount++;

      } catch (loanError) {
        console.log(`  ❌ ERROR: ${loanError instanceof Error ? loanError.message : 'Unknown error'}\n`);
        errorCount++;
      }
    }

    console.log('=== Sync Summary ===');
    console.log(`Total Mirror Loans: ${mirrorLoans.length}`);
    console.log(`Synced: ${syncedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    await db.$disconnect();
  }
}

syncMirrorLoans();
