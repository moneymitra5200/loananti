import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/accounting/recalculate-balances
 * 
 * Recalculates all Chart of Account currentBalance values from Journal Entries
 * Use this if balances are out of sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log(`[Recalculate] Starting balance recalculation for company: ${companyId}`);

    // Get all accounts for this company
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    console.log(`[Recalculate] Found ${accounts.length} accounts`);

    // Get all journal entry lines for this company
    const journalLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
        },
      },
      include: {
        journalEntry: true,
        account: true,
      },
    });

    console.log(`[Recalculate] Found ${journalLines.length} journal entry lines`);

    // Calculate balances for each account
    const accountBalances: Record<string, {
      totalDebit: number;
      totalCredit: number;
      accountType: string;
      openingBalance: number;
      currentBalance: number;
    }> = {};

    for (const account of accounts) {
      accountBalances[account.id] = {
        totalDebit: 0,
        totalCredit: 0,
        accountType: account.accountType,
        openingBalance: account.openingBalance || 0,
        currentBalance: account.currentBalance || 0,
      };
    }

    // Sum up all journal entry lines
    for (const line of journalLines) {
      if (accountBalances[line.accountId]) {
        accountBalances[line.accountId].totalDebit += line.debitAmount;
        accountBalances[line.accountId].totalCredit += line.creditAmount;
      }
    }

    // Calculate and update balances
    const updates: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      oldBalance: number;
      newBalance: number;
      totalDebit: number;
      totalCredit: number;
    }> = [];

    for (const account of accounts) {
      const balances = accountBalances[account.id];
      const isDebitAccount = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';

      // Calculate correct closing balance
      let calculatedBalance = balances.openingBalance;
      if (isDebitAccount) {
        calculatedBalance += balances.totalDebit - balances.totalCredit;
      } else {
        calculatedBalance += balances.totalCredit - balances.totalDebit;
      }

      // Only update if there's a difference
      if (Math.abs(calculatedBalance - account.currentBalance) > 0.01) {
        await db.chartOfAccount.update({
          where: { id: account.id },
          data: { currentBalance: calculatedBalance },
        });

        updates.push({
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          oldBalance: account.currentBalance,
          newBalance: calculatedBalance,
          totalDebit: balances.totalDebit,
          totalCredit: balances.totalCredit,
        });

        console.log(`[Recalculate] Updated ${account.accountCode} ${account.accountName}: ${account.currentBalance} → ${calculatedBalance}`);
      }
    }

    console.log(`[Recalculate] Updated ${updates.length} accounts`);

    return NextResponse.json({
      success: true,
      message: `Recalculated balances for ${accounts.length} accounts. ${updates.length} accounts were updated.`,
      accountsProcessed: accounts.length,
      accountsUpdated: updates.length,
      updates,
    });

  } catch (error) {
    console.error('[Recalculate] Error:', error);
    return NextResponse.json({
      error: 'Failed to recalculate balances',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/accounting/recalculate-balances
 * 
 * Preview what changes would be made without applying them
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get all accounts for this company
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    // Get all journal entry lines for this company
    const journalLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
        },
      },
      include: {
        account: true,
      },
    });

    // Calculate balances for each account
    const accountBalances: Record<string, {
      totalDebit: number;
      totalCredit: number;
      accountType: string;
      openingBalance: number;
      currentBalance: number;
    }> = {};

    for (const account of accounts) {
      accountBalances[account.id] = {
        totalDebit: 0,
        totalCredit: 0,
        accountType: account.accountType,
        openingBalance: account.openingBalance || 0,
        currentBalance: account.currentBalance || 0,
      };
    }

    for (const line of journalLines) {
      if (accountBalances[line.accountId]) {
        accountBalances[line.accountId].totalDebit += line.debitAmount;
        accountBalances[line.accountId].totalCredit += line.creditAmount;
      }
    }

    // Calculate differences
    const preview: Array<{
      accountCode: string;
      accountName: string;
      accountType: string;
      openingBalance: number;
      totalDebit: number;
      totalCredit: number;
      currentBalance: number;
      calculatedBalance: number;
      difference: number;
      needsUpdate: boolean;
    }> = [];

    for (const account of accounts) {
      const balances = accountBalances[account.id];
      const isDebitAccount = account.accountType === 'ASSET' || account.accountType === 'EXPENSE';

      let calculatedBalance = balances.openingBalance;
      if (isDebitAccount) {
        calculatedBalance += balances.totalDebit - balances.totalCredit;
      } else {
        calculatedBalance += balances.totalCredit - balances.totalDebit;
      }

      const difference = calculatedBalance - account.currentBalance;

      preview.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        openingBalance: balances.openingBalance,
        totalDebit: balances.totalDebit,
        totalCredit: balances.totalCredit,
        currentBalance: account.currentBalance,
        calculatedBalance,
        difference,
        needsUpdate: Math.abs(difference) > 0.01,
      });
    }

    return NextResponse.json({
      success: true,
      companyId,
      totalAccounts: accounts.length,
      totalJournalLines: journalLines.length,
      accountsNeedingUpdate: preview.filter(p => p.needsUpdate).length,
      preview,
    });

  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({
      error: 'Failed to preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
