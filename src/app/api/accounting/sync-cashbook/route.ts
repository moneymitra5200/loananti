import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * POST /api/accounting/sync-cashbook
 * 
 * Sync CashBook with Chart of Accounts for existing equity entries
 * This fixes the issue where equity was added before the CashBook fix
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get Cash in Hand account from Chart of Accounts
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: ACCOUNT_CODES.CASH_IN_HAND 
      }
    });

    if (!cashAccount) {
      return NextResponse.json({ 
        success: true, 
        message: 'No Cash in Hand account found',
        synced: false 
      });
    }

    const chartCashBalance = cashAccount.currentBalance || 0;

    // Get or create CashBook
    let cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });

    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId,
          openingBalance: 0,
          currentBalance: 0
        }
      });
    }

    const cashBookBalance = cashBook.currentBalance || 0;

    // Check if there's a discrepancy
    if (Math.abs(chartCashBalance - cashBookBalance) < 0.01) {
      return NextResponse.json({
        success: true,
        message: 'CashBook is already in sync',
        chartBalance: chartCashBalance,
        cashBookBalance,
        synced: false
      });
    }

    // Find all OPENING_BALANCE journal entries for cash
    const cashJournalEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        referenceType: 'OPENING_BALANCE',
        isApproved: true,
        isReversed: false
      },
      include: {
        lines: {
          where: {
            accountId: cashAccount.id,
            debitAmount: { gt: 0 }
          }
        }
      }
    });

    let syncedAmount = 0;

    // Create CashBook entries for each journal entry that doesn't have one
    for (const entry of cashJournalEntries) {
      for (const line of entry.lines) {
        if (line.debitAmount <= 0) continue;

        // Check if a CashBook entry already exists for this journal entry
        const existingEntry = await db.cashBookEntry.findFirst({
          where: {
            cashBookId: cashBook.id,
            referenceId: entry.id
          }
        });

        if (!existingEntry) {
          // Create CashBook entry
          const currentBalance = await db.cashBookEntry.aggregate({
            where: { cashBookId: cashBook.id },
            _max: { balanceAfter: true }
          });

          const lastBalance = currentBalance._max.balanceAfter || 0;
          const newBalance = lastBalance + line.debitAmount;

          await db.cashBookEntry.create({
            data: {
              cashBookId: cashBook.id,
              entryType: 'CREDIT',
              amount: line.debitAmount,
              balanceAfter: newBalance,
              description: entry.narration || 'Owner\'s Capital Investment (Cash)',
              referenceType: 'OPENING_BALANCE',
              referenceId: entry.id,
              entryDate: entry.entryDate,
              createdById: entry.createdById
            }
          });

          syncedAmount += line.debitAmount;
        }
      }
    }

    // Update CashBook balance to match Chart of Accounts
    const credits = await db.cashBookEntry.aggregate({
      where: { 
        cashBookId: cashBook.id,
        entryType: 'CREDIT'
      },
      _sum: { amount: true }
    });

    const debits = await db.cashBookEntry.aggregate({
      where: { 
        cashBookId: cashBook.id,
        entryType: 'DEBIT'
      },
      _sum: { amount: true }
    });

    const correctBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

    await db.cashBook.update({
      where: { id: cashBook.id },
      data: { currentBalance: correctBalance }
    });

    return NextResponse.json({
      success: true,
      message: `Synced CashBook with Chart of Accounts`,
      chartBalance: chartCashBalance,
      previousCashBookBalance: cashBookBalance,
      newCashBookBalance: correctBalance,
      syncedAmount,
      entriesCreated: syncedAmount > 0
    });

  } catch (error) {
    console.error('Error syncing cashbook:', error);
    return NextResponse.json({ 
      error: 'Failed to sync cashbook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/accounting/sync-cashbook
 * Check sync status without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get Cash in Hand account
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: ACCOUNT_CODES.CASH_IN_HAND 
      }
    });

    // Get CashBook
    const cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });

    const chartBalance = cashAccount?.currentBalance || 0;
    const cashBookBalance = cashBook?.currentBalance || 0;

    return NextResponse.json({
      companyId,
      chartOfAccountsBalance: chartBalance,
      cashBookBalance,
      isSynced: Math.abs(chartBalance - cashBookBalance) < 0.01,
      difference: Math.abs(chartBalance - cashBookBalance)
    });

  } catch (error) {
    console.error('Error checking cashbook sync:', error);
    return NextResponse.json({ 
      error: 'Failed to check sync status' 
    }, { status: 500 });
  }
}
