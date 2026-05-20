import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordCashBookEntry, recordBankTransaction } from '@/lib/simple-accounting';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

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
        payment = await tx.interestOnlyPayment.findUnique({ where: { id: paymentId } });
      } else {
        const now = new Date();
        payment = await tx.interestOnlyPayment.findFirst({
          where: { interestOnlyLoanId: interestLoanId, status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' }
        });
        if (!payment) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          dueDate.setDate(5);
          payment = await tx.interestOnlyPayment.create({
            data: {
              interestOnlyLoanId: interestLoanId,
              paymentMonth: now.getMonth() + 1,
              paymentYear: now.getFullYear(),
              dueDate,
              interestAmount: interestLoan.monthlyInterestAmount
            }
          });
        }
      }

      const updatedPayment = await tx.interestOnlyPayment.update({
        where: { id: payment.id },
        data: {
          paidAmount: amount, paidDate: new Date(),
          paymentMode: paymentMode || 'ONLINE',
          paymentReference: transactionId, utrNumber,
          receiptNumber: `RCP${Date.now().toString(36).toUpperCase()}`,
          status: 'PAID'
        }
      });

      await tx.interestOnlyLoan.update({
        where: { id: interestLoanId },
        data: {
          totalInterestPaid: { increment: amount }, totalMonthsPaid: { increment: 1 },
          lastPaymentDate: new Date(),
          nextPaymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      await tx.payment.create({
        data: {
          loanApplicationId: interestLoan.loanApplicationId,
          customerId: interestLoan.loanApplication.customerId,
          amount, interestComponent: amount, principalComponent: 0,
          paymentMode: paymentMode || 'ONLINE', status: 'COMPLETED',
          paymentType: 'INTEREST_ONLY',
          paidById: paidById || interestLoan.loanApplication.customerId,
          transactionId, utrNumber, remarks: remarks || 'Interest Only Payment'
        }
      });

      // ACID: cashbook/bank entry inside the same transaction — if this fails, payment rolls back
      const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS'].includes((paymentMode||'').toUpperCase());
      const loanCompanyId = (interestLoan.loanApplication as any)?.companyId || '';
      if (loanCompanyId) {
        if (isOnline) {
          await recordBankTransaction({
            companyId: loanCompanyId, transactionType: 'CREDIT', amount,
            description: `Interest Only Payment - ${interestLoan.loanApplicationId} (${paymentMode})`,
            referenceType: 'INTEREST_ONLY_PAYMENT', referenceId: updatedPayment.id,
            createdById: paidById || 'SYSTEM', tx
          });
        } else {
          await recordCashBookEntry({
            companyId: loanCompanyId, entryType: 'CREDIT', amount,
            description: `Interest Only Payment - ${interestLoan.loanApplicationId} (CASH)`,
            referenceType: 'INTEREST_ONLY_PAYMENT', referenceId: updatedPayment.id,
            createdById: paidById || 'SYSTEM', tx
          });
        }
      }

      return updatedPayment;
    });

    // Journal entry (outside tx — non-critical, CoA init can be slow)
    try {
      const loanCompanyId = (interestLoan.loanApplication as any)?.companyId || '';
      if (loanCompanyId) {
        const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS'].includes((paymentMode||'').toUpperCase());
        const accSvc = new AccountingService(loanCompanyId);
        await accSvc.initializeChartOfAccounts();
        await accSvc.createJournalEntry({
          entryDate: new Date(), referenceType: 'INTEREST_ONLY_PAYMENT', referenceId: result.id,
          narration: `Interest Only Payment - loan ${interestLoan.loanApplicationId}`,
          lines: [
            { accountCode: isOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: amount, creditAmount: 0, narration: 'Interest received' },
            { accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: amount, narration: 'Interest income (interest-only loan)' },
          ],
          createdById: paidById || 'SYSTEM', isAutoEntry: true,
        });
      }
    } catch (journalErr: any) {
      console.error('[InterestLoan/Payment] Journal entry failed (non-critical):', journalErr?.message);
    }

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
