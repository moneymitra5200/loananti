import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/accounting/journal-entry-by-reference
 * Fetch journal entry details by reference type and ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get('referenceType');
    const referenceId = searchParams.get('referenceId');

    if (!referenceType || !referenceId) {
      return NextResponse.json({ error: 'Reference type and ID are required' }, { status: 400 });
    }

    // Find the journal entry by reference
    const journalEntry = await db.journalEntry.findFirst({
      where: {
        OR: [
          { referenceType, referenceId },
          { referenceType, id: referenceId }
        ]
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                accountCode: true,
                accountName: true,
                accountType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!journalEntry) {
      // Try to find by bank transaction reference
      const bankTransaction = await db.bankTransaction.findUnique({
        where: { id: referenceId },
        include: {
          bankAccount: {
            select: { bankName: true, accountNumber: true }
          }
        }
      });

      if (bankTransaction) {
        // Return basic transaction info if no journal entry found
        return NextResponse.json({
          entry: {
            id: bankTransaction.id,
            entryNumber: 'BT-' + bankTransaction.id.slice(0, 8).toUpperCase(),
            entryDate: bankTransaction.transactionDate,
            referenceType: bankTransaction.referenceType,
            narration: bankTransaction.description,
            totalDebit: bankTransaction.transactionType === 'DEBIT' ? bankTransaction.amount : 0,
            totalCredit: bankTransaction.transactionType === 'CREDIT' ? bankTransaction.amount : 0,
            paymentMode: 'BANK_TRANSFER',
            lines: [
              {
                accountCode: '1400',
                accountName: 'Bank Account - ' + bankTransaction.bankAccount.bankName,
                accountType: 'ASSET',
                debitAmount: bankTransaction.transactionType === 'CREDIT' ? bankTransaction.amount : 0,
                creditAmount: bankTransaction.transactionType === 'DEBIT' ? bankTransaction.amount : 0,
                narration: bankTransaction.description
              }
            ]
          }
        });
      }

      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Format the response
    const formattedEntry = {
      id: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      entryDate: journalEntry.entryDate,
      referenceType: journalEntry.referenceType,
      narration: journalEntry.narration,
      totalDebit: journalEntry.totalDebit,
      totalCredit: journalEntry.totalCredit,
      paymentMode: journalEntry.paymentMode,
      lines: journalEntry.lines.map(line => ({
        accountCode: line.account.accountCode,
        accountName: line.account.accountName,
        accountType: line.account.accountType,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        narration: line.narration
      }))
    };

    return NextResponse.json({ entry: formattedEntry });

  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch journal entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
