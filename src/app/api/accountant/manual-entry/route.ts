import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Record a manual expense or income entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      entryType, // 'EXPENSE' or 'INCOME'
      amount,
      reason,
      category,
      paymentMode, // 'BANK' or 'CASH'
      bankAccountId,
      createdById
    } = body;

    // Validation
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }
    if (!entryType || !['EXPENSE', 'INCOME'].includes(entryType)) {
      return NextResponse.json({ error: 'Valid entry type (EXPENSE/INCOME) is required' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }
    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Reason/description is required' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!paymentMode || !['BANK', 'CASH'].includes(paymentMode)) {
      return NextResponse.json({ error: 'Valid payment mode (BANK/CASH) is required' }, { status: 400 });
    }

    const entryNumber = `ME-${Date.now().toString(36).toUpperCase()}`;
    const expenseNumber = `EXP-${Date.now().toString(36).toUpperCase()}`;
    const narration = `${entryType === 'EXPENSE' ? 'Expense' : 'Income'}: ${category} - ${reason}`;
    const userId = createdById || 'system';

    let result;

    if (paymentMode === 'BANK') {
      // Bank transaction
      if (!bankAccountId) {
        return NextResponse.json({ error: 'Bank account is required for bank payment mode' }, { status: 400 });
      }

      // Get current bank account
      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });

      if (!bankAccount) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }

      // Calculate new balance
      const isDebit = entryType === 'EXPENSE';
      const newBalance = isDebit 
        ? bankAccount.currentBalance - amount 
        : bankAccount.currentBalance + amount;

      // Create transaction and update balance
      result = await db.$transaction(async (tx) => {
        // Create bank transaction
        const transaction = await tx.bankTransaction.create({
          data: {
            bankAccountId,
            transactionType: isDebit ? 'DEBIT' : 'CREDIT',
            amount,
            balanceAfter: newBalance,
            description: narration,
            referenceType: 'MANUAL_ENTRY',
            referenceId: null,
            createdById: userId
          }
        });

        // Update bank account balance
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: newBalance }
        });

        // Create expense record if expense
        if (entryType === 'EXPENSE') {
          await tx.expense.create({
            data: {
              companyId,
              expenseNumber,
              expenseType: category.toUpperCase().replace(/[^A-Z_]/g, '_'),
              description: reason,
              amount,
              paymentDate: new Date(),
              paymentMode: 'BANK_TRANSFER',
              isApproved: true,
              createdById: userId
            }
          });
        }

        return { transaction, newBalance };
      });

    } else {
      // Cash transaction - update cashbook
      let cashBook = await db.cashBook.findUnique({
        where: { companyId }
      });

      if (!cashBook) {
        cashBook = await db.cashBook.create({
          data: {
            companyId,
            currentBalance: 0
          }
        });
      }

      const isDebit = entryType === 'EXPENSE';
      const newBalance = isDebit 
        ? cashBook.currentBalance - amount 
        : cashBook.currentBalance + amount;

      result = await db.$transaction(async (tx) => {
        // Create cashbook entry
        const entry = await tx.cashBookEntry.create({
          data: {
            cashBookId: cashBook!.id,
            entryType: isDebit ? 'DEBIT' : 'CREDIT',
            amount,
            balanceAfter: newBalance,
            description: narration,
            referenceType: 'MANUAL_ENTRY',
            createdById: userId
          }
        });

        // Update cashbook balance
        await tx.cashBook.update({
          where: { id: cashBook!.id },
          data: { currentBalance: newBalance }
        });

        // Create expense record if expense
        if (entryType === 'EXPENSE') {
          await tx.expense.create({
            data: {
              companyId,
              expenseNumber,
              expenseType: category.toUpperCase().replace(/[^A-Z_]/g, '_'),
              description: reason,
              amount,
              paymentDate: new Date(),
              paymentMode: 'CASH',
              isApproved: true,
              createdById: userId
            }
          });
        }

        return { entry, newBalance };
      });
    }

    // Create journal entry for double-entry accounting
    try {
      const journalEntryNumber = `JE-${Date.now().toString(36).toUpperCase()}`;
      
      // For expense: Debit Expense Account, Credit Cash/Bank
      // For income: Debit Cash/Bank, Credit Income Account
      await db.journalEntry.create({
        data: {
          companyId,
          entryNumber: journalEntryNumber,
          entryDate: new Date(),
          referenceType: 'MANUAL_ENTRY',
          narration,
          totalDebit: amount,
          totalCredit: amount,
          isAutoEntry: false,
          isApproved: true,
          createdById: userId,
          paymentMode: paymentMode === 'BANK' ? 'BANK_TRANSFER' : 'CASH',
          bankAccountId: paymentMode === 'BANK' ? bankAccountId : null,
          lines: {
            create: [
              {
                accountId: await getOrCreateAccount(companyId, entryType === 'EXPENSE' ? 'EXPENSE' : 'INCOME', category),
                debitAmount: entryType === 'EXPENSE' ? amount : 0,
                creditAmount: entryType === 'INCOME' ? amount : 0,
                narration: category
              },
              {
                accountId: await getOrCreateAccount(companyId, 'ASSET', paymentMode === 'BANK' ? 'Bank Account' : 'Cash'),
                debitAmount: entryType === 'INCOME' ? amount : 0,
                creditAmount: entryType === 'EXPENSE' ? amount : 0,
                narration: paymentMode === 'BANK' ? 'Bank' : 'Cash'
              }
            ]
          }
        }
      });
    } catch (journalError) {
      console.error('Journal entry creation failed (non-critical):', journalError);
      // Don't fail the whole transaction if journal entry fails
    }

    return NextResponse.json({
      success: true,
      message: `${entryType === 'EXPENSE' ? 'Expense' : 'Income'} entry recorded successfully`,
      entryNumber,
      newBalance: result.newBalance
    });

  } catch (error) {
    console.error('Manual entry error:', error);
    return NextResponse.json({ 
      error: 'Failed to record entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get or create account
async function getOrCreateAccount(companyId: string, accountType: string, accountName: string): Promise<string> {
  const accountCode = `${accountType.charAt(0)}${accountName.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4)}001`;
  
  let account = await db.chartOfAccount.findFirst({
    where: {
      companyId,
      accountCode: { startsWith: accountCode.slice(0, 5) }
    }
  });

  if (!account) {
    account = await db.chartOfAccount.create({
      data: {
        companyId,
        accountCode,
        accountName: `${accountName} Account`,
        accountType: accountType as any,
        isActive: true
      }
    });
  }

  return account.id;
}
