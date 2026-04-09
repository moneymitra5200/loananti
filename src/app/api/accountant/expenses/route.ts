import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Expenses for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const where: any = { companyId };

    if (startDate && endDate) {
      where.paymentDate = { gte: startDate, lte: endDate };
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        expenseNumber: true,
        expenseType: true,
        description: true,
        amount: true,
        paymentDate: true,
        paymentMode: true,
        companyId: true
      }
    });

    return NextResponse.json({ expenses });

  } catch (error) {
    console.error('Expenses error:', error);
    return NextResponse.json({ 
      error: 'Failed to get expenses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      expenseType,
      description,
      amount,
      paymentMode,
      paymentDate
    } = body;

    if (!companyId || !description || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate expense number
    const expenseCount = await db.expense.count({ where: { companyId } });
    const expenseNumber = `EXP-${String(expenseCount + 1).padStart(5, '0')}`;

    // Create expense
    const expense = await db.expense.create({
      data: {
        companyId,
        expenseNumber,
        expenseType: expenseType || 'MISCELLANEOUS',
        description,
        amount: Number(amount),
        paymentMode: paymentMode || 'BANK_TRANSFER',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        isApproved: true,
        createdById: 'system' // Default to system user
      }
    });

    // Create bank transaction if payment is via bank
    if (paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI') {
      const defaultBank = await db.bankAccount.findFirst({
        where: { companyId, isActive: true },
        orderBy: { isDefault: 'desc' }
      });

      if (defaultBank) {
        const newBalance = defaultBank.currentBalance - Number(amount);
        
        await db.bankTransaction.create({
          data: {
            bankAccountId: defaultBank.id,
            transactionType: 'DEBIT',
            amount: Number(amount),
            balanceAfter: newBalance,
            description: `Expense: ${description}`,
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            transactionDate: expense.paymentDate,
            createdById: 'system' // Default to system user
          }
        });

        // Update bank balance
        await db.bankAccount.update({
          where: { id: defaultBank.id },
          data: { currentBalance: newBalance }
        });
      }
    }

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: 'system', // Default to system user
          action: 'CREATE',
          module: 'EXPENSE',
          description: `Created expense ${expenseNumber}: ${description} - ₹${amount}`,
          recordId: expense.id,
          recordType: 'EXPENSE'
        }
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
      // Continue even if audit log fails
    }

    return NextResponse.json({ success: true, expense });

  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ 
      error: 'Failed to create expense',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
