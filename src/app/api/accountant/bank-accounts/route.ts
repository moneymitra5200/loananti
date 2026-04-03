import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Bank accounts and transactions for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get bank accounts
    const bankAccounts = await db.bankAccount.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      orderBy: { isDefault: 'desc' },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        currentBalance: true,
        companyId: true,
        isDefault: true,
        ifscCode: true,
        upiId: true,
        qrCodeUrl: true,
        branchName: true,
        accountType: true,
        isActive: true
      }
    });

    // Get bank transactions for this company's bank accounts
    const bankAccountIds = bankAccounts.map(ba => ba.id);
    
    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccountIds }
      },
      include: {
        bankAccount: {
          select: { bankName: true, accountNumber: true }
        }
      },
      orderBy: { transactionDate: 'desc' },
      take: 100
    });

    return NextResponse.json({ 
      bankAccounts,
      transactions: transactions.map(t => ({
        id: t.id,
        transactionType: t.transactionType,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        referenceType: t.referenceType,
        transactionDate: t.transactionDate,
        bankAccount: t.bankAccount
      }))
    });

  } catch (error) {
    console.error('Bank accounts error:', error);
    return NextResponse.json({ 
      error: 'Failed to get bank accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
