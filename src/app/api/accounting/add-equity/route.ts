import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * POST /api/accounting/add-equity
 * 
 * Add owner's equity with double-entry accounting
 * 
 * Example: Adding 5k cash + 5k bank
 * - Debit: Cash in Hand (1101) - 5,000 (increases cash asset)
 * - Debit: Bank Account (14xx) - 5,000 (increases bank asset)
 * - Credit: Owner's Capital (3002) - 10,000 (records equity source)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      cashAmount, 
      bankAmount, 
      bankAccountId,
      date,
      description,
      createdById 
    } = body;

    // Validation
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const cash = parseFloat(cashAmount) || 0;
    const bank = parseFloat(bankAmount) || 0;
    const totalEquity = cash + bank;

    if (totalEquity <= 0) {
      return NextResponse.json({ error: 'At least one amount (cash or bank) must be greater than 0' }, { status: 400 });
    }

    if (bank > 0 && !bankAccountId) {
      return NextResponse.json({ error: 'Bank account ID is required when bank amount is provided' }, { status: 400 });
    }

    // Initialize accounting service
    const accountingService = new AccountingService(companyId);
    await accountingService.initializeChartOfAccounts();

    const entryDate = date ? new Date(date) : new Date();
    const entryNumber = await accountingService.generateEntryNumber();

    // Build journal entry lines
    const lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      narration?: string;
    }> = [];

    // Debit: Cash in Hand (if cash amount provided)
    if (cash > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: cash,
        creditAmount: 0,
        narration: 'Cash capital investment'
      });
    }

    // Debit: Bank Account (if bank amount provided)
    // We need to get or create a bank account chart of account
    let bankAccountCode = '1400'; // Default bank account code
    if (bank > 0 && bankAccountId) {
      // Get the bank account to find or create its chart of account
      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });

      if (bankAccount) {
        // Check if a chart of account exists for this bank
        let bankChartAccount = await db.chartOfAccount.findFirst({
          where: { 
            companyId,
            accountCode: { startsWith: '14' },
            accountName: { contains: bankAccount.bankName }
          }
        });

        if (!bankChartAccount) {
          // Create a chart of account for this bank
          const bankCount = await db.chartOfAccount.count({
            where: { companyId, accountCode: { startsWith: '14' } }
          });
          const newCode = `140${bankCount + 1}`;
          
          bankChartAccount = await db.chartOfAccount.create({
            data: {
              companyId,
              accountCode: newCode,
              accountName: `${bankAccount.bankName} - ${bankAccount.accountNumber.slice(-4)}`,
              accountType: 'ASSET',
              description: `Bank account: ${bankAccount.bankName}`,
              openingBalance: 0,
              currentBalance: 0,
              isActive: true
            }
          });
        }

        bankAccountCode = bankChartAccount.accountCode;
      }

      lines.push({
        accountCode: bankAccountCode,
        debitAmount: bank,
        creditAmount: 0,
        narration: 'Bank capital investment'
      });
    }

    // Credit: Owner's Capital (Total equity)
    lines.push({
      accountCode: ACCOUNT_CODES.OWNERS_CAPITAL,
      debitAmount: 0,
      creditAmount: totalEquity,
      narration: description || 'Owner\'s capital investment'
    });

    // Create the journal entry
    const journalEntryId = await accountingService.createJournalEntry({
      entryDate,
      referenceType: 'OPENING_BALANCE',
      narration: description || `Owner's Equity Investment - Cash: ₹${cash.toLocaleString()}, Bank: ₹${bank.toLocaleString()}`,
      lines,
      createdById: createdById || 'system',
      paymentMode: bank > 0 ? 'BANK_TRANSFER' : 'CASH',
      bankAccountId: bankAccountId || undefined,
      isAutoEntry: true
    });

    // Update bank account balance if bank amount provided
    if (bank > 0 && bankAccountId) {
      await db.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          currentBalance: { increment: bank }
        }
      });

      // Create a bank transaction record
      await db.bankTransaction.create({
        data: {
          bankAccountId,
          transactionType: 'CREDIT',
          amount: bank,
          description: description || 'Owner\'s Capital Investment',
          referenceType: 'OPENING_BALANCE',
          referenceId: journalEntryId,
          transactionDate: entryDate,
          balanceAfter: 0, // Will be updated
          createdById: createdById || 'system'
        }
      });

      // Update balance after
      const updatedBank = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      if (updatedBank) {
        await db.bankTransaction.updateMany({
          where: { bankAccountId },
          data: { balanceAfter: updatedBank.currentBalance }
        });
      }
    }

    // Update CashBook if cash amount provided
    if (cash > 0) {
      // Get or create cashbook for the company
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

      // Calculate new balance
      const newBalance = (cashBook.currentBalance || 0) + cash;

      // Create cashbook entry
      await db.cashBookEntry.create({
        data: {
          cashBookId: cashBook.id,
          entryType: 'CREDIT',
          amount: cash,
          balanceAfter: newBalance,
          description: description || 'Owner\'s Capital Investment (Cash)',
          referenceType: 'OPENING_BALANCE',
          referenceId: journalEntryId,
          entryDate: entryDate,
          createdById: createdById || 'system'
        }
      });

      // Update cashbook balance
      await db.cashBook.update({
        where: { id: cashBook.id },
        data: { currentBalance: newBalance }
      });
    }

    // Get updated account balances
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
    });
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.OWNERS_CAPITAL }
    });

    return NextResponse.json({
      success: true,
      journalEntryId,
      entryNumber,
      summary: {
        cashAdded: cash,
        bankAdded: bank,
        totalEquity,
        cashBalance: cashAccount?.currentBalance || 0,
        equityBalance: equityAccount?.currentBalance || 0
      },
      message: `Successfully added ${totalEquity.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} as Owner's Equity`
    });

  } catch (error) {
    console.error('Error adding equity:', error);
    return NextResponse.json({
      error: 'Failed to add equity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
