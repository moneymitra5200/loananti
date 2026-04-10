import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, JournalEntryType } from '@/lib/accounting-service';

/**
 * API for creating manual journal entries
 * Allows direct debit/credit between chart of accounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      entryDate,
      narration,
      lines, // Array of { accountCode: string, debitAmount: number, creditAmount: number, narration?: string, loanId?: string, customerId?: string }
      createdById,
      paymentMode,
      bankAccountId
    } = body;

    if (!companyId || !lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: 'Company ID and at least 2 entry lines are required' }, { status: 400 });
    }

    if (!narration) {
      return NextResponse.json({ error: 'Narration is required' }, { status: 400 });
    }

    // Validate totals
    const totalDebit = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ 
        error: 'Journal entry not balanced', 
        details: { totalDebit, totalCredit, difference: totalDebit - totalCredit } 
      }, { status: 400 });
    }

    const accountingService = new AccountingService(companyId);
    await accountingService.initializeChartOfAccounts();

    const journalEntryId = await accountingService.createJournalEntry({
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      referenceType: 'MANUAL_ENTRY' as JournalEntryType,
      narration,
      lines: lines.map(line => ({
        accountCode: line.accountCode,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        narration: line.narration,
        loanId: line.loanId,
        customerId: line.customerId
      })),
      createdById: createdById || 'system',
      paymentMode,
      bankAccountId,
      isAutoEntry: false // This is a manual entry
    });

    return NextResponse.json({
      success: true,
      journalEntryId,
      message: 'Journal entry created successfully'
    });

  } catch (error) {
    console.error('[Manual Journal Entry] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create journal entry', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
