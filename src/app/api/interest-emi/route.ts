import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get current interest EMI for a loan
// Also fixes loan status if it's an Interest Only loan with wrong status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const action = searchParams.get('action');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Get loan details
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: {
          select: {
            approvedAmount: true,
            interestRate: true
          }
        },
        emiSchedules: {
          where: { isInterestOnly: true },
          orderBy: { installmentNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Calculate monthly interest
    const principalAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount;
    const interestRate = loan.sessionForm?.interestRate || 12;
    const monthlyInterestAmount = (principalAmount * interestRate / 100) / 12;

    // Fix loan status if needed - if this is an Interest Only loan but status is not ACTIVE_INTEREST_ONLY.
    // Covers any pre-active state: DISBURSED, ACTIVE, FINAL_APPROVED, SESSION_CREATED, etc.
    const nonActiveIOStatuses = ['DISBURSED', 'ACTIVE', 'FINAL_APPROVED', 'SESSION_CREATED',
      'CUSTOMER_SESSION_APPROVED', 'LOAN_FORM_COMPLETED', 'SA_APPROVED', 'COMPANY_APPROVED',
      'AGENT_APPROVED_STAGE1'];
    if ((loan.isInterestOnlyLoan || loan.loanType === 'INTEREST_ONLY') && 
        loan.status !== 'ACTIVE_INTEREST_ONLY' && 
        nonActiveIOStatuses.includes(loan.status as string)) {
      console.log(`[Interest EMI] Fixing loan status from ${loan.status} to ACTIVE_INTEREST_ONLY for loan ${loan.applicationNo}`);
      await db.loanApplication.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE_INTEREST_ONLY',
          interestOnlyStartDate: loan.interestOnlyStartDate || new Date(),
          interestOnlyMonthlyAmount: monthlyInterestAmount
        }
      });
    }

    if (action === 'history') {
      // Get interest payment history — includes both INTEREST_ONLY_PAYMENT (offline) and
      // FULL_EMI payments on isInterestOnly EMIs (online Phase 1 IO payments)
      const isOnlineLoan = !!(loan.isInterestOnlyLoan);
      const interestPayments = await db.payment.findMany({
        where: {
          loanApplicationId: loanId,
          OR: [
            { paymentType: 'INTEREST_ONLY_PAYMENT' },
            // Online IO loans: FULL_EMI payments on interest-only EMIs
            { paymentType: 'FULL_EMI', emiSchedule: { isInterestOnly: true } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { name: true } },
          emiSchedule: { select: { isInterestOnly: true } }
        }
      });

      // Check if there's a pending interest EMI
      let currentEMI = loan.emiSchedules.find(e => e.paymentStatus === 'PENDING');

      // If no pending EMI exists, check if the last one was paid (PAID or INTEREST_ONLY_PAID)
      // and create the next month's EMI as a fallback (normally rolling EMI in emi/pay handles this).
      if (!currentEMI && loan.emiSchedules.length > 0) {
        const lastEMI = loan.emiSchedules[0];
        if (lastEMI.paymentStatus === 'PAID' || lastEMI.paymentStatus === 'INTEREST_ONLY_PAID') {
          // Create new EMI for next month
          const nextInstallmentNumber = lastEMI.installmentNumber + 1;
          const newDueDate = new Date(lastEMI.dueDate);
          newDueDate.setMonth(newDueDate.getMonth() + 1);

          // Check if it already exists (in case rolling EMI already created it)
          const existing = await db.eMISchedule.findFirst({
            where: { loanApplicationId: loanId, installmentNumber: nextInstallmentNumber }
          });
          if (!existing) {
            currentEMI = await db.eMISchedule.create({
              data: {
                loanApplicationId: loanId,
                installmentNumber: nextInstallmentNumber,
                dueDate: newDueDate,
                originalDueDate: newDueDate,
                principalAmount: 0,
                interestAmount: monthlyInterestAmount,
                totalAmount: monthlyInterestAmount,
                outstandingPrincipal: principalAmount,
                outstandingInterest: 0,
                paymentStatus: 'PENDING',
                isInterestOnly: true,
                interestOnlyAmount: monthlyInterestAmount
              }
            });
            console.log(`[Interest EMI] Fallback: Created next EMI #${nextInstallmentNumber} for loan ${loan.applicationNo}`);
          } else {
            currentEMI = existing;
            console.log(`[Interest EMI] Fallback: Using existing next EMI #${nextInstallmentNumber}`);
          }
        }
      }

      // If no interest EMIs exist at all, create the first one
      if (loan.emiSchedules.length === 0) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(5); // Due on 5th of next month

        currentEMI = await db.eMISchedule.create({
          data: {
            loanApplicationId: loanId,
            installmentNumber: 1,
            dueDate,
            originalDueDate: dueDate,
            principalAmount: 0,
            interestAmount: monthlyInterestAmount,
            totalAmount: monthlyInterestAmount,
            outstandingPrincipal: principalAmount,
            outstandingInterest: 0,
            paymentStatus: 'PENDING',
            isInterestOnly: true,
            interestOnlyAmount: monthlyInterestAmount
          }
        });

        console.log(`[Interest EMI] Created first interest EMI for loan ${loan.applicationNo}`);
      }

      return NextResponse.json({
        success: true,
        hasPendingEMI: currentEMI && currentEMI.paymentStatus === 'PENDING',
        currentEMI: currentEMI ? {
          id: currentEMI.id,
          installmentNumber: currentEMI.installmentNumber,
          dueDate: currentEMI.dueDate,
          interestOnlyAmount: currentEMI.interestOnlyAmount || currentEMI.interestAmount,
          paymentStatus: currentEMI.paymentStatus
        } : null,
        loan: {
          id: loan.id,
          applicationNo: loan.applicationNo,
          principalAmount,
          interestRate,
          monthlyInterestAmount,
          totalInterestPaid: loan.totalInterestOnlyPaid || 0
        },
        payments: interestPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          paymentMode: p.paymentMode,
          createdAt: p.createdAt,
          receiptNumber: p.receiptNumber
        }))
      });
    }

    // Check if there's a pending interest EMI
    const pendingInterestEMI = loan.emiSchedules.find(e => e.paymentStatus === 'PENDING');

    if (pendingInterestEMI) {
      return NextResponse.json({
        success: true,
        hasPendingEMI: true,
        currentEMI: pendingInterestEMI,
        loan: {
          id: loan.id,
          applicationNo: loan.applicationNo,
          principalAmount,
          interestRate,
          monthlyInterestAmount
        }
      });
    }

    return NextResponse.json({
      success: true,
      hasPendingEMI: false,
      loan: {
        id: loan.id,
        applicationNo: loan.applicationNo,
        principalAmount,
        interestRate,
        monthlyInterestAmount
      }
    });
  } catch (error) {
    console.error('Error fetching interest EMI:', error);
    return NextResponse.json({ error: 'Failed to fetch interest EMI' }, { status: 500 });
  }
}

// POST - Generate next interest EMI (called after payment)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, generatedBy } = body;

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: {
          select: {
            approvedAmount: true,
            interestRate: true
          }
        },
        emiSchedules: {
          where: { isInterestOnly: true },
          orderBy: { installmentNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check if there's already a pending interest EMI
    const pendingInterestEMI = loan.emiSchedules.find(e => e.paymentStatus === 'PENDING');
    if (pendingInterestEMI) {
      return NextResponse.json({
        success: false,
        error: 'Pending interest EMI already exists',
        currentEMI: pendingInterestEMI
      }, { status: 400 });
    }

    // Calculate monthly interest
    const principalAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount;
    const interestRate = loan.sessionForm?.interestRate || 12;
    const monthlyInterestAmount = (principalAmount * interestRate / 100) / 12;

    // Determine next installment number and due date
    let nextInstallmentNumber = 1;
    let dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(5); // Due on 5th of next month

    if (loan.emiSchedules.length > 0) {
      const lastEMI = loan.emiSchedules[0];
      nextInstallmentNumber = lastEMI.installmentNumber + 1;
      // Due date is 1 month after last EMI due date
      dueDate = new Date(lastEMI.dueDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    // Create interest-only EMI
    const interestEMI = await db.eMISchedule.create({
      data: {
        loanApplicationId: loanId,
        installmentNumber: nextInstallmentNumber,
        dueDate,
        originalDueDate: dueDate,
        principalAmount: 0, // No principal for interest-only EMI
        interestAmount: monthlyInterestAmount,
        totalAmount: monthlyInterestAmount,
        outstandingPrincipal: principalAmount,
        outstandingInterest: 0,
        paymentStatus: 'PENDING',
        isInterestOnly: true,
        interestOnlyAmount: monthlyInterestAmount
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: generatedBy || 'system',
        action: 'CREATE',
        module: 'INTEREST_EMI',
        recordId: interestEMI.id,
        recordType: 'EMISchedule',
        description: `Created Interest EMI #${nextInstallmentNumber} for loan ${loan.applicationNo}`
      }
    });

    return NextResponse.json({
      success: true,
      message: `Interest EMI #${nextInstallmentNumber} created successfully`,
      emi: interestEMI
    });
  } catch (error) {
    console.error('Error generating interest EMI:', error);
    return NextResponse.json({ error: 'Failed to generate interest EMI' }, { status: 500 });
  }
}
