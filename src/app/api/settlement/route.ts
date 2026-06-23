import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSettlementEntry } from '@/lib/accounting-service';
// ACID: retry on deadlock + settlement status guard
import { withRetry, guardSettlementStatus } from '@/lib/db-utils';


// Local type definitions - Prisma schema uses strings, not enums
type SettlementStatus = 'PENDING' | 'VERIFIED' | 'COMPLETED' | 'REJECTED';

// Generate unique settlement number
function generateSettlementNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SET${dateStr}${random}`;
}

// GET - Fetch settlements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const cashierId = searchParams.get('cashierId');
    const status = searchParams.get('status');

    // Get pending settlements for cashier to receive
    if (action === 'pending') {
      const pendingSettlements = await db.cashierSettlement.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, credit: true } }
        }
      });
      return NextResponse.json({ success: true, settlements: pendingSettlements });
    }

    // Get settlements by user (who gave money)
    if (userId) {
      const settlements = await db.cashierSettlement.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true, role: true } }
        }
      });
      return NextResponse.json({ success: true, settlements });
    }

    // Get settlements received by cashier
    if (cashierId) {
      const settlements = await db.cashierSettlement.findMany({
        where: { cashierId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      });
      return NextResponse.json({ success: true, settlements });
    }

    // Get all settlements (for accountant/super admin)
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      db.cashierSettlement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          cashier: { select: { id: true, name: true, role: true } }
        }
      }),
      db.cashierSettlement.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      settlements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Settlement fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}

// POST - Create a new settlement (role wants to give money to cashier)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      cashierId,
      amount,
      paymentMode,
      chequeNumber,
      chequeDate,
      bankRefNumber,
      utrNumber,
      cashDenominations,
      remarks
    } = body;

    if (!userId || !cashierId || !amount || !paymentMode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate user has enough credit
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credit: true, personalCredit: true, companyCredit: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.credit < amount) {
      return NextResponse.json({
        error: 'Insufficient credit balance',
        currentCredit: user.credit,
        requestedAmount: amount
      }, { status: 400 });
    }

    // Validate cashier exists
    const cashier = await db.user.findUnique({
      where: { id: cashierId },
      select: { id: true, role: true }
    });

    if (!cashier || cashier.role !== 'CASHIER') {
      return NextResponse.json({ error: 'Invalid cashier' }, { status: 400 });
    }

    const settlementNumber = generateSettlementNumber();

    // Create settlement and decrease user's credit atomically
    // withRetry: retries on deadlock (P2034) up to 3 times
    const { settlement, creditTx } = await withRetry(() => db.$transaction(async (tx) => {
      const settlement = await tx.cashierSettlement.create({
        data: {
          settlementNumber,
          userId,
          cashierId,
          amount,
          paymentMode: paymentMode,
          chequeNumber,
          chequeDate: chequeDate ? new Date(chequeDate) : null,
          bankRefNumber,
          utrNumber,
          cashDenominations,
          remarks
        }
      });

      const creditType = paymentMode === 'CASH' ? 'COMPANY' : 'PERSONAL';
      const userCompanyCredit = creditType === 'COMPANY' ? Math.max(0, (user.companyCredit || 0) - amount) : (user.companyCredit || 0);
      const userPersonalCredit = creditType === 'PERSONAL' ? Math.max(0, (user.personalCredit || 0) - amount) : (user.personalCredit || 0);
      const userTotalCredit = userCompanyCredit + userPersonalCredit;

      await tx.user.update({
        where: { id: userId },
        data: {
          credit: userTotalCredit,
          companyCredit: userCompanyCredit,
          personalCredit: userPersonalCredit
        }
      });
      const creditTx = await tx.creditTransaction.create({
        data: { // @ts-ignore
          userId,
          transactionType: 'CREDIT_DECREASE',
          amount,
          paymentMode: paymentMode,
          creditType: creditType as any,
          companyBalanceAfter: userCompanyCredit,
          personalBalanceAfter: userPersonalCredit,
          balanceAfter: userTotalCredit,
          sourceType: 'SETTLEMENT',
          settlementId: settlement.id,
          remarks: `Settlement ${settlementNumber}`
        }
      });
      // ActionLog inside transaction — ACID-safe (rolls back if tx fails)
      await tx.actionLog.create({
        data: {
          userId,
          userRole: 'STAFF',
          actionType: 'CREATE',
          module: 'SETTLEMENT',
          recordId: settlement.id,
          recordType: 'CashierSettlement',
          previousData: JSON.stringify({ credit: user.credit, companyCredit: user.companyCredit, personalCredit: user.personalCredit }),
          newData: JSON.stringify({ amount, paymentMode, cashierId, settlementNumber, settlementId: settlement.id, creditType }),
          description: `Settlement ₹${amount} submitted to cashier (${settlementNumber})`,
          canUndo: true,
        },
      });
      return { settlement, creditTx };
    }));

    // Update daily collection
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingRecord = await db.dailyCollection.findFirst({
      where: { date: today }
    });

    if (existingRecord) {
      await db.dailyCollection.update({
        where: { id: existingRecord.id },
        data: {
          settlementsCount: { increment: 1 }
        }
      });
    }

    return NextResponse.json({
      success: true,
      settlement: {
        ...settlement,
        creditTx
      },
      newCreditBalance: user.credit - amount
    });
  } catch (error) {
    console.error('Settlement creation error:', error);
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
  }
}

// PUT - Update settlement status (cashier/accountant verifies)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settlementId, action, verifiedById, rejectionReason } = body;

    if (!settlementId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settlement = await db.cashierSettlement.findUnique({
      where: { id: settlementId },
      include: { user: { select: { id: true, credit: true, personalCredit: true, companyCredit: true } } }
    });

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    if (action === 'verify') {
      // Cashier verifies they received the money
      const updatedSettlement = await db.cashierSettlement.update({
        where: { id: settlementId },
        data: {
          status: 'VERIFIED',
          verifiedById,
          verifiedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, settlement: updatedSettlement });
    }

    if (action === 'complete') {
      // Accountant marks as completed
      const updatedSettlement = await db.cashierSettlement.update({
        where: { id: settlementId },
        data: {
          status: 'COMPLETED'
        }
      });

      // Create accounting entry for settlement
      try {
        const settlementUser = await db.user.findUnique({
          where: { id: settlement.userId },
          select: { companyId: true }
        });
        
        if (settlementUser?.companyId) {
          await createSettlementEntry({
            companyId: settlementUser.companyId,
            settlementId: settlement.id,
            fromUserId: settlement.userId,
            toUserId: settlement.cashierId,
            amount: settlement.amount,
            paymentMode: settlement.paymentMode,
            settlementDate: new Date(),
            createdById: verifiedById || settlement.cashierId
          });
        }
      } catch (accountingError) {
        console.error('Settlement accounting entry failed:', accountingError);
        // Don't fail the settlement if accounting fails
      }

      // Add credit transaction for cashier (they received the money)
      const cashier = await db.user.findUnique({
        where: { id: settlement.cashierId },
        select: { credit: true, personalCredit: true, companyCredit: true, role: true }
      });

      if (cashier) {
        await withRetry(() => db.$transaction(async (tx) => {
          // ACID GUARD: Re-read settlement status inside tx to prevent double-processing
          await guardSettlementStatus(tx, settlementId, 'VERIFIED');

          const creditType = settlement.paymentMode === 'CASH' ? 'COMPANY' : 'PERSONAL';
          const cashierCompanyCredit = creditType === 'COMPANY' ? (cashier.companyCredit || 0) + settlement.amount : (cashier.companyCredit || 0);
          const cashierPersonalCredit = creditType === 'PERSONAL' ? (cashier.personalCredit || 0) + settlement.amount : (cashier.personalCredit || 0);
          const cashierTotalCredit = cashierCompanyCredit + cashierPersonalCredit;

          await tx.creditTransaction.create({
            data: { // @ts-ignore
              userId: settlement.cashierId,
              transactionType: 'SETTLEMENT',
              amount: settlement.amount,
              paymentMode: settlement.paymentMode,
              creditType: creditType as any,
              companyBalanceAfter: cashierCompanyCredit,
              personalBalanceAfter: cashierPersonalCredit,
              balanceAfter: cashierTotalCredit,
              sourceType: 'SETTLEMENT',
              sourceId: settlementId,
              settlementId: settlementId,
              description: `Received from ${settlement.user?.id || 'user'}`
            }
          });
          await tx.user.update({
            where: { id: settlement.cashierId },
            data: {
              credit: cashierTotalCredit,
              companyCredit: cashierCompanyCredit,
              personalCredit: cashierPersonalCredit
            }
          });
          // ActionLog inside transaction — ACID-safe
          await tx.actionLog.create({
            data: {
              userId: verifiedById || settlement.cashierId,
              userRole: 'STAFF',
              actionType: 'COMPLETE',
              module: 'SETTLEMENT',
              recordId: settlementId,
              recordType: 'CashierSettlement',
              previousData: JSON.stringify({ status: 'VERIFIED', cashierCredit: cashier.credit, cashierCompanyCredit: cashier.companyCredit, cashierPersonalCredit: cashier.personalCredit }),
              newData: JSON.stringify({ status: 'COMPLETED', amount: settlement.amount, cashierCreditAfter: cashierTotalCredit, cashierCompanyCreditAfter: cashierCompanyCredit, cashierPersonalCreditAfter: cashierPersonalCredit }),
              description: `Settlement ${settlement.settlementNumber || settlementId} completed. Cashier received ₹${settlement.amount}`,
              canUndo: false, // completed settlements should not be undone
            },
          });
        }));
      }

      return NextResponse.json({ success: true, settlement: updatedSettlement });
    }

    if (action === 'reject') {
      // Rejected - return credit to user
      const updatedSettlement = await db.cashierSettlement.update({
        where: { id: settlementId },
        data: {
          status: 'REJECTED',
          rejectionReason
        }
      });

      const creditType = settlement.paymentMode === 'CASH' ? 'COMPANY' : 'PERSONAL';
      const userCompanyCredit = creditType === 'COMPANY' ? (settlement.user?.companyCredit || 0) + settlement.amount : (settlement.user?.companyCredit || 0);
      const userPersonalCredit = creditType === 'PERSONAL' ? (settlement.user?.personalCredit || 0) + settlement.amount : (settlement.user?.personalCredit || 0);
      const userTotalCredit = userCompanyCredit + userPersonalCredit;

      // Return credit to user
      await db.$transaction([
        db.creditTransaction.create({
          data: { // @ts-ignore
            userId: settlement.userId,
            transactionType: 'ADJUSTMENT',
            amount: settlement.amount,
            paymentMode: settlement.paymentMode,
            creditType: creditType as any,
            companyBalanceAfter: userCompanyCredit,
            personalBalanceAfter: userPersonalCredit,
            balanceAfter: userTotalCredit,
            sourceType: 'SETTLEMENT',
            sourceId: settlementId,
            settlementId: settlementId,
            description: 'Settlement rejected - credit returned',
            remarks: rejectionReason
          }
        }),
        db.user.update({
          where: { id: settlement.userId },
          data: {
            credit: userTotalCredit,
            companyCredit: userCompanyCredit,
            personalCredit: userPersonalCredit
          }
        })
      ]);

      return NextResponse.json({ success: true, settlement: updatedSettlement });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Settlement update error:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
}
