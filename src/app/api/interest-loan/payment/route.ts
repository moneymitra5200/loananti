import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get payment details and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interestLoanId = searchParams.get('interestLoanId');
    const customerId = searchParams.get('customerId');

    if (!interestLoanId) {
      return NextResponse.json({ error: 'Interest Loan ID is required' }, { status: 400 });
    }

    // Get interest only loan with payments
    const loan = await db.interestOnlyLoan.findUnique({
      where: { id: interestLoanId },
      include: {
        loanApplication: {
          include: {
            customer: {
              select: { id: true, name: true, email: true, phone: true }
            }
          }
        },
        interestPayments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Interest Only Loan not found' }, { status: 404 });
    }

    // Get pending payments
    const pendingPayments = await db.interestOnlyPayment.findMany({
      where: {
        interestOnlyLoanId: interestLoanId,
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Get next due payment
    const nextPayment = pendingPayments[0] || null;

    // Calculate overdue payments
    const overduePayments = pendingPayments.filter(p => p.isOverdue);

    return NextResponse.json({
      success: true,
      loan,
      pendingPayments,
      nextPayment,
      overduePayments,
      summary: {
        totalInterestPaid: loan.totalInterestPaid,
        totalMonthsPaid: loan.totalMonthsPaid,
        pendingPaymentsCount: pendingPayments.length,
        overduePaymentsCount: overduePayments.length,
        nextPaymentAmount: nextPayment?.interestAmount || 0,
        nextPaymentDueDate: nextPayment?.dueDate || null
      }
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
}

// POST - Process interest payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      interestLoanId,
      paymentId,
      amount,
      paymentMode,
      transactionId,
      utrNumber,
      paidById,
      remarks
    } = body;

    if (!interestLoanId || !amount) {
      return NextResponse.json({
        error: 'Missing required fields: interestLoanId, amount'
      }, { status: 400 });
    }

    const interestLoan = await db.interestOnlyLoan.findUnique({
      where: { id: interestLoanId },
      include: {
        loanApplication: {
          include: { customer: true }
        }
      }
    });

    if (!interestLoan) {
      return NextResponse.json({ error: 'Interest Only Loan not found' }, { status: 404 });
    }

    if (interestLoan.currentPhase !== 'INTEREST_ONLY') {
      return NextResponse.json({ error: 'Loan is not in Interest Only phase' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      // Find or create payment record for current month
      let payment;
      if (paymentId) {
        payment = await tx.interestOnlyPayment.findUnique({
          where: { id: paymentId }
        });
      } else {
        // Create payment for current month
        const now = new Date();
        payment = await tx.interestOnlyPayment.findFirst({
          where: {
            interestOnlyLoanId,
            status: { in: ['PENDING', 'OVERDUE'] }
          },
          orderBy: { dueDate: 'asc' }
        });

        if (!payment) {
          // Create new payment record for this month
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          dueDate.setDate(5); // Due on 5th of next month

          payment = await tx.interestOnlyPayment.create({
            data: {
              interestOnlyLoanId,
              paymentMonth: now.getMonth() + 1,
              paymentYear: now.getFullYear(),
              dueDate,
              interestAmount: interestLoan.monthlyInterestAmount
            }
          });
        }
      }

      // Update payment record
      const updatedPayment = await tx.interestOnlyPayment.update({
        where: { id: payment.id },
        data: {
          paidAmount: amount,
          paidDate: new Date(),
          paymentMode: paymentMode || 'ONLINE',
          paymentReference: transactionId,
          utrNumber,
          receiptNumber: `RCP${Date.now().toString(36).toUpperCase()}`,
          status: 'PAID'
        }
      });

      // Update interest only loan totals
      await tx.interestOnlyLoan.update({
        where: { id: interestLoanId },
        data: {
          totalInterestPaid: { increment: amount },
          totalMonthsPaid: { increment: 1 },
          lastPaymentDate: new Date(),
          nextPaymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      });

      // Create payment record in main payment table
      await tx.payment.create({
        data: {
          loanApplicationId: interestLoan.loanApplicationId,
          customerId: interestLoan.loanApplication.customerId,
          amount,
          interestComponent: amount,
          principalComponent: 0,
          paymentMode: paymentMode || 'ONLINE',
          status: 'COMPLETED',
          paymentType: 'INTEREST_ONLY',
          paidById: paidById || interestLoan.loanApplication.customerId,
          transactionId,
          utrNumber,
          remarks: remarks || 'Interest Only Payment'
        }
      });

      return updatedPayment;
    });

    return NextResponse.json({
      success: true,
      message: 'Interest payment processed successfully',
      payment: result
    });

  } catch (error) {
    console.error('Error processing interest payment:', error);
    return NextResponse.json(
      { error: 'Failed to process interest payment', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Mark payment as overdue, waive penalty, etc.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, paymentId, waivedAmount, waiverReason, waivedById } = body;

    if (action === 'waive_penalty') {
      const payment = await db.interestOnlyPayment.update({
        where: { id: paymentId },
        data: {
          waivedAmount,
          waiverReason,
          waivedById,
          waivedAt: new Date(),
          status: 'WAIVED'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Penalty waived successfully',
        payment
      });
    }

    if (action === 'mark_overdue') {
      const payment = await db.interestOnlyPayment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      // Calculate days overdue
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate penalty (e.g., 2% per month of overdue interest)
      const penaltyAmount = payment.interestAmount * 0.02 * Math.ceil(daysOverdue / 30);

      const updated = await db.interestOnlyPayment.update({
        where: { id: paymentId },
        data: {
          isOverdue: true,
          daysOverdue,
          penaltyAmount
        }
      });

      return NextResponse.json({
        success: true,
        payment: updated
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
