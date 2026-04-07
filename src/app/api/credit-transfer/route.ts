import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CreditType, CreditTransactionType, PaymentModeType } from '@prisma/client';

// GET - Get credit transfer history and balances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const action = searchParams.get('action');

    // Get Company 3's My Cash balance
    if (action === 'my-cash' && companyId) {
      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, code: true, myCash: true }
      });
      return NextResponse.json({ success: true, company });
    }

    // Get user's credit balance
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
          companyCredit: true,
          personalCredit: true,
          credit: true,
          companyId: true
        }
      });

      // Get recent credit transactions
      const transactions = await db.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return NextResponse.json({ success: true, user, transactions });
    }

    // Get all companies with bank accounts and cash
    const companies = await db.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        myCash: true,
        companyCredit: true,
        bankAccounts: {
          where: { isActive: true },
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            currentBalance: true,
            isDefault: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, companies });
  } catch (error) {
    console.error('Error fetching credit data:', error);
    return NextResponse.json({ error: 'Failed to fetch credit data' }, { status: 500 });
  }
}

// POST - Transfer credit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      fromUserId,
      toUserId,
      amount,
      creditType,
      paymentMode,
      proofUrl,
      remarks,
      companyId,
      bankAccountId,
      createdBy
    } = body;

    // ============================================
    // TRANSFER FROM USER TO USER (Agent -> Super Admin)
    // ============================================
    if (action === 'user-to-user') {
      if (!fromUserId || !toUserId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
      }

      const fromUser = await db.user.findUnique({ where: { id: fromUserId } });
      const toUser = await db.user.findUnique({ where: { id: toUserId } });

      if (!fromUser || !toUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if fromUser has enough credit
      const availableCredit = creditType === 'PERSONAL' ? fromUser.personalCredit : fromUser.companyCredit;
      if (availableCredit < amount) {
        return NextResponse.json({ error: 'Insufficient credit balance' }, { status: 400 });
      }

      const result = await db.$transaction(async (tx) => {
        // Deduct from sender
        await tx.user.update({
          where: { id: fromUserId },
          data: {
            personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : fromUser.personalCredit,
            companyCredit: creditType === 'COMPANY' ? { decrement: amount } : fromUser.companyCredit,
            credit: { decrement: amount }
          }
        });

        // Add to receiver
        await tx.user.update({
          where: { id: toUserId },
          data: {
            personalCredit: creditType === 'PERSONAL' ? { increment: amount } : toUser.personalCredit,
            companyCredit: creditType === 'COMPANY' ? { increment: amount } : toUser.companyCredit,
            credit: { increment: amount }
          }
        });

        // Create transaction record for sender
        await tx.creditTransaction.create({
          data: {
            userId: fromUserId,
            transactionType: CreditTransactionType.CREDIT_DECREASE,
            amount: -amount,
            paymentMode: paymentMode as PaymentModeType,
            creditType: creditType as CreditType,
            companyBalanceAfter: creditType === 'COMPANY' ? fromUser.companyCredit - amount : fromUser.companyCredit,
            personalBalanceAfter: creditType === 'PERSONAL' ? fromUser.personalCredit - amount : fromUser.personalCredit,
            balanceAfter: fromUser.credit - amount,
            sourceType: 'CREDIT_TRANSFER',
            description: `Credit transferred to ${toUser.name} (${toUser.role})`,
            proofDocument: proofUrl,
            transactionDate: new Date()
          }
        });

        // Create transaction record for receiver
        await tx.creditTransaction.create({
          data: {
            userId: toUserId,
            transactionType: CreditTransactionType.CREDIT_INCREASE,
            amount: amount,
            paymentMode: paymentMode as PaymentModeType,
            creditType: creditType as CreditType,
            companyBalanceAfter: creditType === 'COMPANY' ? toUser.companyCredit + amount : toUser.companyCredit,
            personalBalanceAfter: creditType === 'PERSONAL' ? toUser.personalCredit + amount : toUser.personalCredit,
            balanceAfter: toUser.credit + amount,
            sourceType: 'CREDIT_TRANSFER',
            description: `Credit received from ${fromUser.name} (${fromUser.role})`,
            proofDocument: proofUrl,
            transactionDate: new Date()
          }
        });

        return { success: true };
      });

      return NextResponse.json({ success: true, message: 'Credit transferred successfully' });
    }

    // ============================================
    // TRANSFER FROM USER TO COMPANY BANK ACCOUNT
    // ============================================
    if (action === 'user-to-bank') {
      if (!fromUserId || !bankAccountId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
      }

      const fromUser = await db.user.findUnique({ where: { id: fromUserId } });
      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId },
        include: { company: true }
      });

      if (!fromUser || !bankAccount) {
        return NextResponse.json({ error: 'User or bank account not found' }, { status: 404 });
      }

      // Check if user has enough credit
      const availableCredit = creditType === 'PERSONAL' ? fromUser.personalCredit : fromUser.companyCredit;
      if (availableCredit < amount) {
        return NextResponse.json({ error: 'Insufficient credit balance' }, { status: 400 });
      }

      const result = await db.$transaction(async (tx) => {
        // Deduct from user
        await tx.user.update({
          where: { id: fromUserId },
          data: {
            personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : fromUser.personalCredit,
            companyCredit: creditType === 'COMPANY' ? { decrement: amount } : fromUser.companyCredit,
            credit: { decrement: amount }
          }
        });

        // Add to bank account
        const newBalance = bankAccount.currentBalance + amount;
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: newBalance }
        });

        // Create bank transaction
        await tx.bankTransaction.create({
          data: {
            bankAccountId: bankAccountId,
            transactionType: 'CREDIT',
            amount: amount,
            balanceAfter: newBalance,
            description: `Credit deposit from ${fromUser.name} (${fromUser.role})`,
            referenceType: 'CREDIT_TRANSFER',
            createdById: fromUserId,
            transactionDate: new Date()
          }
        });

        // Create transaction record for user
        await tx.creditTransaction.create({
          data: {
            userId: fromUserId,
            transactionType: CreditTransactionType.CREDIT_DECREASE,
            amount: -amount,
            paymentMode: paymentMode as PaymentModeType,
            creditType: creditType as CreditType,
            companyBalanceAfter: creditType === 'COMPANY' ? fromUser.companyCredit - amount : fromUser.companyCredit,
            personalBalanceAfter: creditType === 'PERSONAL' ? fromUser.personalCredit - amount : fromUser.personalCredit,
            balanceAfter: fromUser.credit - amount,
            sourceType: 'BANK_DEPOSIT',
            description: `Credit deposited to ${bankAccount.bankName} (${bankAccount.company?.name})`,
            proofDocument: proofUrl,
            transactionDate: new Date()
          }
        });

        return { success: true, newBalance };
      });

      return NextResponse.json({ 
        success: true, 
        message: `₹${amount} deposited to ${bankAccount.bankName}. New balance: ₹${result.newBalance}` 
      });
    }

    // ============================================
    // TRANSFER FROM USER TO COMPANY 3 CASH (My Cash)
    // ============================================
    if (action === 'user-to-cash') {
      if (!fromUserId || !companyId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
      }

      const fromUser = await db.user.findUnique({ where: { id: fromUserId } });
      const company = await db.company.findUnique({ where: { id: companyId } });

      if (!fromUser || !company) {
        return NextResponse.json({ error: 'User or company not found' }, { status: 404 });
      }

      // Check if user has enough credit
      const availableCredit = creditType === 'PERSONAL' ? fromUser.personalCredit : fromUser.companyCredit;
      if (availableCredit < amount) {
        return NextResponse.json({ error: 'Insufficient credit balance' }, { status: 400 });
      }

      const result = await db.$transaction(async (tx) => {
        // Deduct from user
        await tx.user.update({
          where: { id: fromUserId },
          data: {
            personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : fromUser.personalCredit,
            companyCredit: creditType === 'COMPANY' ? { decrement: amount } : fromUser.companyCredit,
            credit: { decrement: amount }
          }
        });

        // Add to company's My Cash
        const newCashBalance = company.myCash + amount;
        await tx.company.update({
          where: { id: companyId },
          data: { myCash: newCashBalance }
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            userId: fromUserId,
            transactionType: CreditTransactionType.CREDIT_DECREASE,
            amount: -amount,
            paymentMode: 'CASH',
            creditType: creditType as CreditType,
            companyBalanceAfter: creditType === 'COMPANY' ? fromUser.companyCredit - amount : fromUser.companyCredit,
            personalBalanceAfter: creditType === 'PERSONAL' ? fromUser.personalCredit - amount : fromUser.personalCredit,
            balanceAfter: fromUser.credit - amount,
            sourceType: 'CASH_DEPOSIT',
            description: `Cash deposited to ${company.name} (My Cash)`,
            proofDocument: proofUrl,
            transactionDate: new Date()
          }
        });

        // Create journal entry for company
        await tx.journalEntry.create({
          data: {
            companyId: companyId,
            entryNumber: `JE-${Date.now()}`,
            entryDate: new Date(),
            referenceType: 'CASH_DEPOSIT',
            narration: `Cash deposit from ${fromUser.name} (${fromUser.role})`,
            totalDebit: amount,
            totalCredit: amount,
            isAutoEntry: true,
            isApproved: true,
            createdById: fromUserId,
            lines: {
              create: [
                {
                  accountId: 'CASH_ACCOUNT',
                  debitAmount: amount,
                  creditAmount: 0,
                  narration: 'Cash received from user'
                },
                {
                  accountId: 'CAPITAL_ACCOUNT',
                  debitAmount: 0,
                  creditAmount: amount,
                  narration: 'Credit transfer from user'
                }
              ]
            }
          }
        });

        return { success: true, newCashBalance };
      });

      return NextResponse.json({ 
        success: true, 
        message: `₹${amount} added to ${company.name}'s My Cash. New balance: ₹${result.newCashBalance}` 
      });
    }

    // ============================================
    // ADD CASH TO COMPANY 3 (Accountant)
    // ============================================
    if (action === 'add-cash') {
      if (!companyId || !amount || amount <= 0 || !createdBy) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
      }

      const company = await db.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const newCashBalance = await db.$transaction(async (tx) => {
        const updated = await tx.company.update({
          where: { id: companyId },
          data: { myCash: { increment: amount } }
        });

        // Create journal entry
        await tx.journalEntry.create({
          data: {
            companyId: companyId,
            entryNumber: `JE-${Date.now()}`,
            entryDate: new Date(),
            referenceType: 'CASH_ADDITION',
            narration: remarks || 'Cash added to company',
            totalDebit: amount,
            totalCredit: amount,
            isAutoEntry: true,
            isApproved: true,
            createdById: createdBy,
            lines: {
              create: [
                {
                  accountId: 'CASH_ACCOUNT',
                  debitAmount: amount,
                  creditAmount: 0,
                  narration: 'Cash added'
                },
                {
                  accountId: 'CAPITAL_ACCOUNT',
                  debitAmount: 0,
                  creditAmount: amount,
                  narration: 'Capital contribution'
                }
              ]
            }
          }
        });

        return updated.myCash;
      });

      return NextResponse.json({ 
        success: true, 
        message: `₹${amount} added to ${company.name}'s My Cash. New balance: ₹${newCashBalance}` 
      });
    }

    // ============================================
    // ADD MONEY TO BANK ACCOUNT (Accountant)
    // ============================================
    if (action === 'add-to-bank') {
      if (!bankAccountId || !amount || amount <= 0 || !createdBy) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
      }

      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId },
        include: { company: true }
      });

      if (!bankAccount) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }

      const newBalance = await db.$transaction(async (tx) => {
        const updated = await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: { increment: amount } }
        });

        // Create bank transaction
        await tx.bankTransaction.create({
          data: {
            bankAccountId: bankAccountId,
            transactionType: 'CREDIT',
            amount: amount,
            balanceAfter: updated.currentBalance,
            description: remarks || 'Funds added to bank account',
            referenceType: 'BANK_DEPOSIT',
            createdById: createdBy,
            transactionDate: new Date()
          }
        });

        // Create journal entry
        await tx.journalEntry.create({
          data: {
            companyId: bankAccount.companyId,
            entryNumber: `JE-${Date.now()}`,
            entryDate: new Date(),
            referenceType: 'BANK_DEPOSIT',
            narration: remarks || 'Bank deposit',
            totalDebit: amount,
            totalCredit: amount,
            isAutoEntry: true,
            isApproved: true,
            bankAccountId: bankAccountId,
            createdById: createdBy,
            lines: {
              create: [
                {
                  accountId: 'BANK_ACCOUNT',
                  debitAmount: amount,
                  creditAmount: 0,
                  narration: 'Bank deposit'
                },
                {
                  accountId: 'CAPITAL_ACCOUNT',
                  debitAmount: 0,
                  creditAmount: amount,
                  narration: 'Capital contribution'
                }
              ]
            }
          }
        });

        return updated.currentBalance;
      });

      return NextResponse.json({ 
        success: true, 
        message: `₹${amount} added to ${bankAccount.bankName}. New balance: ₹${newBalance}` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in credit transfer:', error);
    return NextResponse.json({ 
      error: 'Failed to process credit transfer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
