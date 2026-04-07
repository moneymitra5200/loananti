import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch daybook transactions for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const filterType = searchParams.get('type') || 'ALL';
    const filterSource = searchParams.get('source') || 'ALL';

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const transactions: any[] = [];
    let totalCredits = 0;
    let totalDebits = 0;
    let openingBalance = 0;

    // 1. Fetch Bank Transactions
    if (filterSource === 'ALL' || filterSource === 'BANK') {
      const bankAccounts = await db.bankAccount.findMany({
        where: { companyId },
        select: { id: true, bankName: true, accountNumber: true, openingBalance: true }
      });

      for (const bank of bankAccounts) {
        // Get opening balance (balance before start date)
        const txnBeforeStart = await db.bankTransaction.findFirst({
          where: {
            bankAccountId: bank.id,
            createdAt: { lt: start }
          },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true }
        });
        
        openingBalance += txnBeforeStart?.balanceAfter || bank.openingBalance;

        // Get transactions in date range
        const bankTxns = await db.bankTransaction.findMany({
          where: {
            bankAccountId: bank.id,
            createdAt: {
              gte: start,
              lte: end
            },
            ...(filterType !== 'ALL' && { transactionType: filterType })
          },
          orderBy: { createdAt: 'desc' }
        });

        for (const txn of bankTxns) {
          const amount = txn.amount;
          const isCredit = txn.transactionType === 'CREDIT';
          
          if (isCredit) totalCredits += amount;
          else totalDebits += amount;

          transactions.push({
            id: txn.id,
            date: txn.createdAt.toISOString(),
            type: txn.transactionType,
            amount,
            balanceAfter: txn.balanceAfter,
            description: txn.description,
            referenceType: txn.referenceType,
            referenceId: txn.referenceId,
            category: getCategoryFromReference(txn.referenceType),
            source: 'BANK',
            bankName: bank.bankName,
            accountNumber: bank.accountNumber?.slice(-4).padStart(bank.accountNumber?.length || 4, '*'),
            createdAt: txn.createdAt.toISOString()
          });
        }
      }
    }

    // 2. Fetch CashBook Entries
    if (filterSource === 'ALL' || filterSource === 'CASHBOOK') {
      const cashBook = await db.cashBook.findUnique({
        where: { companyId },
        select: { id: true, openingBalance: true }
      });

      if (cashBook) {
        // Get opening balance for cashbook
        const cashTxnBeforeStart = await db.cashBookEntry.findFirst({
          where: {
            cashBookId: cashBook.id,
            createdAt: { lt: start }
          },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true }
        });
        
        openingBalance += cashTxnBeforeStart?.balanceAfter || cashBook.openingBalance;

        // Get cashbook entries in date range
        const cashEntries = await db.cashBookEntry.findMany({
          where: {
            cashBookId: cashBook.id,
            createdAt: {
              gte: start,
              lte: end
            },
            ...(filterType !== 'ALL' && { entryType: filterType })
          },
          orderBy: { createdAt: 'desc' }
        });

        for (const entry of cashEntries) {
          const amount = entry.amount;
          const isCredit = entry.entryType === 'CREDIT';
          
          if (isCredit) totalCredits += amount;
          else totalDebits += amount;

          transactions.push({
            id: entry.id,
            date: entry.createdAt.toISOString(),
            type: entry.entryType,
            amount,
            balanceAfter: entry.balanceAfter,
            description: entry.description,
            referenceType: entry.referenceType,
            referenceId: entry.referenceId,
            category: getCategoryFromReference(entry.referenceType),
            source: 'CASHBOOK',
            createdAt: entry.createdAt.toISOString()
          });
        }
      }
    }

    // 3. Fetch Journal Entries
    if (filterSource === 'ALL' || filterSource === 'JOURNAL') {
      const journalEntries = await db.journalEntry.findMany({
        where: {
          companyId,
          entryDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          lines: {
            include: {
              account: { select: { accountName: true, accountCode: true } }
            }
          }
        },
        orderBy: { entryDate: 'desc' }
      });

      for (const journal of journalEntries) {
        // Calculate debit and credit totals from lines
        const debitTotal = journal.lines.reduce((sum, l) => sum + l.debitAmount, 0);
        const creditTotal = journal.lines.reduce((sum, l) => sum + l.creditAmount, 0);

        // For journal entries, we show both debit and credit
        if (filterType === 'ALL' || filterType === 'DEBIT') {
          totalDebits += debitTotal;
          transactions.push({
            id: `${journal.id}-debit`,
            date: journal.entryDate.toISOString(),
            type: 'DEBIT',
            amount: debitTotal,
            balanceAfter: 0, // Journal entries don't have running balance
            description: journal.narration || `Journal: ${journal.entryNumber}`,
            referenceType: 'JOURNAL_ENTRY',
            referenceId: journal.id,
            category: 'JOURNAL_ENTRY',
            source: 'JOURNAL',
            createdAt: journal.createdAt.toISOString()
          });
        }

        if (filterType === 'ALL' || filterType === 'CREDIT') {
          totalCredits += creditTotal;
          transactions.push({
            id: `${journal.id}-credit`,
            date: journal.entryDate.toISOString(),
            type: 'CREDIT',
            amount: creditTotal,
            balanceAfter: 0,
            description: journal.narration || `Journal: ${journal.entryNumber}`,
            referenceType: 'JOURNAL_ENTRY',
            referenceId: journal.id,
            category: 'JOURNAL_ENTRY',
            source: 'JOURNAL',
            createdAt: journal.createdAt.toISOString()
          });
        }
      }
    }

    // Sort all transactions by date (descending)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate closing balance
    const closingBalance = openingBalance + totalCredits - totalDebits;

    // Summary
    const summary = {
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      openingBalance,
      closingBalance,
      transactionCount: transactions.length
    };

    return NextResponse.json({
      success: true,
      transactions,
      summary
    });

  } catch (error) {
    console.error('Daybook fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch daybook' }, { status: 500 });
  }
}

// Helper function to get category from reference type
function getCategoryFromReference(referenceType: string): string {
  const categoryMap: Record<string, string> = {
    'LOAN_DISBURSEMENT': 'LOAN_DISBURSEMENT',
    'EMI_PAYMENT': 'EMI_PAYMENT',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'CASH_TRANSACTION': 'CASH_TRANSACTION',
    'JOURNAL_ENTRY': 'JOURNAL_ENTRY',
    'MIRROR_LOAN_DISBURSEMENT': 'MIRROR_LOAN',
    'MIRROR_LOAN': 'MIRROR_LOAN',
    'EQUITY': 'EQUITY',
    'PROCESSING_FEE': 'PROCESSING_FEE',
    'INTEREST_PAYMENT': 'INTEREST',
    'INTEREST_ONLY': 'INTEREST',
    'OFFLINE_LOAN': 'LOAN_DISBURSEMENT',
    'ADD_MONEY': 'BANK_TRANSFER',
    'WITHDRAWAL': 'BANK_TRANSFER',
  };
  
  return categoryMap[referenceType] || referenceType || 'OTHER';
}
