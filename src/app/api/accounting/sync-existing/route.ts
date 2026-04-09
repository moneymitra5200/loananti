import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST - Sync existing loans and payments to bank transactions
 * This is used for migrating existing data to the new bank tracking system
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { companyId, action } = body;

    if (action === 'sync-all') {
      const disbursementResult = await syncExistingDisbursements(companyId);
      const emiResult = await syncExistingEMIPayments(companyId);
      return NextResponse.json({
        success: true,
        message: 'Sync completed',
        disbursements: disbursementResult,
        emiPayments: emiResult
      });
    }

    if (action === 'sync-disbursements') {
      const result = await syncExistingDisbursements(companyId);
      return NextResponse.json(result);
    }

    if (action === 'sync-emi-payments') {
      const result = await syncExistingEMIPayments(companyId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync data', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * Get summary of data that needs to be synced
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'default';

    // Get or create default bank account
    let bankAccount = await db.bankAccount.findFirst({
      where: { 
        ...(companyId !== 'default' ? { companyId } : {}),
        isActive: true 
      },
      orderBy: { isDefault: 'desc' }
    });

    // Count existing bank transactions
    const existingBankTransactions = bankAccount ? 
      await db.bankTransaction.count({
        where: { bankAccountId: bankAccount.id }
      }) : 0;

    // Count disbursed loans without bank transactions
    const disbursedLoans = await db.loanApplication.findMany({
      where: {
        ...(companyId !== 'default' ? { companyId } : {}),
        status: { in: ['ACTIVE', 'DISBURSED'] },
        disbursedAt: { not: null },
        disbursedAmount: { not: null }
      },
      select: {
        id: true,
        applicationNo: true,
        disbursedAmount: true,
        disbursedAt: true,
        customerId: true,
        companyId: true
      }
    });

    // Count completed payments
    const completedPayments = await db.payment.findMany({
      where: {
        status: 'COMPLETED'
      },
      include: {
        loanApplication: {
          select: { companyId: true }
        }
      }
    });

    const paymentsForCompany = completedPayments.filter(p => 
      companyId === 'default' || p.loanApplication?.companyId === companyId
    );

    return NextResponse.json({
      bankAccount: bankAccount ? {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        currentBalance: bankAccount.currentBalance,
        existingTransactions: existingBankTransactions
      } : null,
      needsSync: {
        disbursedLoans: disbursedLoans.length,
        totalDisbursedAmount: disbursedLoans.reduce((sum, l) => sum + (l.disbursedAmount || 0), 0),
        emiPayments: paymentsForCompany.length,
        totalEMIAmount: paymentsForCompany.reduce((sum, p) => sum + p.amount, 0)
      },
      message: bankAccount ? 
        'Ready to sync' : 
        'No bank account found. Please create a bank account first.'
    });
  } catch (error) {
    console.error('Error getting sync summary:', error);
    return NextResponse.json({ error: 'Failed to get sync summary' }, { status: 500 });
  }
}

/**
 * Sync existing loan disbursements to bank transactions
 */
async function syncExistingDisbursements(companyId: string): Promise<{ syncedCount: number; totalAmount: number; errors: string[] }> {
  // Get or create default bank account
  let bankAccount = await db.bankAccount.findFirst({
    where: { 
      ...(companyId !== 'default' ? { companyId } : {}),
      isActive: true 
    },
    orderBy: { isDefault: 'desc' }
  });

  if (!bankAccount) {
    // Create a default bank account
    bankAccount = await db.bankAccount.create({
      data: {
        companyId: companyId === 'default' ? 'default' : companyId,
        bankName: 'Primary Bank Account',
        accountNumber: 'PRIMARY',
        accountName: 'Primary Account',
        accountType: 'CURRENT',
        openingBalance: 0,
        currentBalance: 0,
        isDefault: true,
        isActive: true
      }
    });
  }

  // Get all disbursed loans
  const disbursedLoans = await db.loanApplication.findMany({
    where: {
      ...(companyId !== 'default' ? { companyId } : {}),
      status: { in: ['ACTIVE', 'DISBURSED'] },
      disbursedAt: { not: null },
      disbursedAmount: { not: null }
    },
    select: {
      id: true,
      applicationNo: true,
      disbursedAmount: true,
      disbursedAt: true,
      customerId: true,
      companyId: true,
      disbursementMode: true,
      disbursementRef: true,
      disbursedById: true,
      customer: { select: { name: true } }
    }
  });

  let syncedCount = 0;
  let totalAmount = 0;
  const errors: string[] = [];

  for (const loan of disbursedLoans) {
    try {
      // Check if bank transaction already exists for this loan
      const existingTx = await db.bankTransaction.findFirst({
        where: {
          bankAccountId: bankAccount.id,
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: loan.id
        }
      });

      if (existingTx) {
        continue; // Already synced
      }

      // Calculate new balance (disbursement = money going OUT = DEBIT)
      const newBalance = bankAccount.currentBalance - (loan.disbursedAmount || 0);

      // Create bank transaction for disbursement
      await db.bankTransaction.create({
        data: {
          bankAccountId: bankAccount.id,
          transactionType: 'DEBIT', // Money going out
          amount: loan.disbursedAmount!,
          balanceAfter: newBalance,
          description: `Loan Disbursement - ${loan.applicationNo} - ${loan.customer?.name || 'Customer'}`,
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: loan.id,
          createdById: loan.disbursedById || 'SYSTEM',
          transactionDate: loan.disbursedAt || new Date()
        }
      });

      // Update bank account balance
      await db.bankAccount.update({
        where: { id: bankAccount.id },
        data: { currentBalance: newBalance }
      });

      bankAccount.currentBalance = newBalance;
      syncedCount++;
      totalAmount += loan.disbursedAmount || 0;
    } catch (error) {
      errors.push(`Failed to sync loan ${loan.applicationNo}: ${(error as Error).message}`);
    }
  }

  return {
    syncedCount,
    totalAmount,
    errors
  };
}

/**
 * Sync existing EMI payments to bank transactions
 */
async function syncExistingEMIPayments(companyId: string): Promise<{ syncedCount: number; totalAmount: number; errors: string[] }> {
  // Get default bank account
  let bankAccount = await db.bankAccount.findFirst({
    where: { 
      ...(companyId !== 'default' ? { companyId } : {}),
      isActive: true 
    },
    orderBy: { isDefault: 'desc' }
  });

  if (!bankAccount) {
    return { syncedCount: 0, totalAmount: 0, errors: ['No bank account found'] };
  }

  // Get all completed payments
  const payments = await db.payment.findMany({
    where: {
      status: 'COMPLETED',
      loanApplication: {
        ...(companyId !== 'default' ? { companyId } : {})
      }
    },
    include: {
      loanApplication: {
        select: {
          applicationNo: true,
          customerId: true,
          companyId: true,
          customer: { select: { name: true } }
        }
      },
      emiSchedule: {
        select: { installmentNumber: true, principalAmount: true, interestAmount: true }
      }
    }
  });

  let syncedCount = 0;
  let totalAmount = 0;
  const errors: string[] = [];

  for (const payment of payments) {
    try {
      // Check if bank transaction already exists
      const existingTx = await db.bankTransaction.findFirst({
        where: {
          bankAccountId: bankAccount.id,
          referenceType: 'EMI_PAYMENT',
          referenceId: payment.id
        }
      });

      if (existingTx) {
        continue; // Already synced
      }

      // Calculate new balance (EMI payment = money coming IN = CREDIT)
      const newBalance = bankAccount.currentBalance + payment.amount;

      // Create bank transaction for EMI payment
      await db.bankTransaction.create({
        data: {
          bankAccountId: bankAccount.id,
          transactionType: 'CREDIT', // Money coming in
          amount: payment.amount,
          balanceAfter: newBalance,
          description: `EMI Collection - ${payment.loanApplication?.applicationNo} - EMI #${payment.emiSchedule?.installmentNumber || 'N/A'} - ${payment.loanApplication?.customer?.name || 'Customer'}`,
          referenceType: 'EMI_PAYMENT',
          referenceId: payment.id,
          createdById: payment.paidById || 'SYSTEM',
          transactionDate: payment.createdAt
        }
      });

      // Update bank account balance
      await db.bankAccount.update({
        where: { id: bankAccount.id },
        data: { currentBalance: newBalance }
      });

      bankAccount.currentBalance = newBalance;
      syncedCount++;
      totalAmount += payment.amount;
    } catch (error) {
      errors.push(`Failed to sync payment ${payment.id}: ${(error as Error).message}`);
    }
  }

  return {
    syncedCount,
    totalAmount,
    errors
  };
}
