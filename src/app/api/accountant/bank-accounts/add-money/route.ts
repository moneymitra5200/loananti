import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Add money to bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankAccountId, amount, description, createdById } = body;

    if (!bankAccountId) {
      return NextResponse.json({ error: 'Bank Account ID is required' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // Get the bank account
    const bankAccount = await db.bankAccount.findUnique({
      where: { id: bankAccountId }
    });

    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    if (!bankAccount.isActive) {
      return NextResponse.json({ error: 'Bank account is not active' }, { status: 400 });
    }

    // Calculate new balance
    const newBalance = bankAccount.currentBalance + amount;

    // Create transaction and update balance in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create bank transaction
      const transaction = await tx.bankTransaction.create({
        data: {
          bankAccountId,
          transactionType: 'CREDIT',
          amount,
          balanceAfter: newBalance,
          description: description || 'Deposit to bank account',
          referenceType: 'MANUAL_DEPOSIT',
          referenceId: null
        }
      });

      // Update bank account balance
      const updatedAccount = await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: newBalance }
      });

      return { transaction, updatedAccount };
    });

    return NextResponse.json({
      success: true,
      message: 'Money added successfully',
      transaction: result.transaction,
      newBalance: result.updatedAccount.currentBalance
    });
  } catch (error) {
    console.error('Error adding money to bank account:', error);
    return NextResponse.json({ error: 'Failed to add money' }, { status: 500 });
  }
}
