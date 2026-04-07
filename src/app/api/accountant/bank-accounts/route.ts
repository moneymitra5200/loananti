import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Bank accounts and transactions for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    console.log('[Bank Accounts API] Request received for companyId:', companyId);

    // Validate companyId - must be a valid cuid (starts with 'c' and is 25 characters)
    if (!companyId || companyId.startsWith(':') || companyId.length < 10) {
      console.error('[Bank Accounts API] Invalid companyId received:', companyId);
      return NextResponse.json({ 
        error: 'Valid Company ID is required',
        receivedId: companyId 
      }, { status: 400 });
    }

    console.log('[Bank Accounts API] Fetching bank accounts...');
    
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
        ownerName: true,
        currentBalance: true,
        companyId: true,
        isDefault: true,
        ifscCode: true,
        upiId: true,
        qrCodeUrl: true,
        branchName: true,
        accountType: true,
        isActive: true,
        company: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    console.log('[Bank Accounts API] Found', bankAccounts.length, 'bank accounts');

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

    console.log('[Bank Accounts API] Found', transactions.length, 'transactions');

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
    console.error('[Bank Accounts API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get bank accounts',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST - Create new bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bankName,
      accountNumber,
      accountName,
      ownerName,
      ifscCode,
      branchName,
      companyId,
      accountType = 'CURRENT',
      openingBalance = 0,
      upiId,
      qrCodeUrl,
      isDefault
    } = body;

    if (!bankName || !accountNumber || !companyId) {
      return NextResponse.json({ error: 'Bank name, account number and company ID are required' }, { status: 400 });
    }

    // If setting as default, unset any existing default for this company
    if (isDefault && companyId) {
      await db.bankAccount.updateMany({
        where: {
          companyId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const account = await db.bankAccount.create({
      data: {
        companyId,
        bankName,
        accountNumber,
        accountName: accountName || bankName,
        ownerName,
        ifscCode,
        branchName,
        accountType,
        openingBalance,
        currentBalance: openingBalance,
        isActive: true,
        isDefault: isDefault ?? false,
        upiId,
        qrCodeUrl
      },
      include: {
        company: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // Create opening balance transaction if balance > 0
    if (openingBalance > 0) {
      await db.bankTransaction.create({
        data: {
          bankAccountId: account.id,
          transactionType: 'CREDIT',
          amount: openingBalance,
          balanceAfter: openingBalance,
          description: 'Opening Balance',
          referenceType: 'OPENING_BALANCE',
          transactionDate: new Date(),
          createdById: 'system'
        }
      });
    }

    return NextResponse.json({
      success: true,
      bankAccount: account
    });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 });
  }
}
