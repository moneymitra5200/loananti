import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Local type definitions - Prisma schema uses strings, not enums

// GET - Calculate foreclosure amount for a loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: true,
        customer: { select: { id: true, name: true, phone: true } },
        emiSchedules: {
          orderBy: { installmentNumber: 'asc' }
        }
      }
    });

    if (!loan || !loan.sessionForm) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Find all unpaid EMIs
    const unpaidEMIs = loan.emiSchedules.filter(emi => 
      emi.paymentStatus !== 'PAID' && emi.paymentStatus !== 'INTEREST_ONLY_PAID'
    );

    if (unpaidEMIs.length === 0) {
      return NextResponse.json({ 
        error: 'No pending EMIs. Loan is already fully paid.' 
      }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalPrincipal = 0;
    let totalInterest = 0;
    let foreclosureDetails: any[] = [];

    // Calculate foreclosure amount based on EMI status
    for (const emi of unpaidEMIs) {
      const dueDate = new Date(emi.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Get the start of the EMI month
      const emiMonthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
      emiMonthStart.setHours(0, 0, 0, 0);

      // Check if this EMI's month has started
      const monthHasStarted = today >= emiMonthStart;

      // Calculate remaining amount for this EMI
      const remainingAmount = emi.totalAmount - (emi.paidAmount || 0);
      const remainingPrincipal = emi.principalAmount - (emi.paidPrincipal || 0);
      const remainingInterest = emi.interestAmount - (emi.paidInterest || 0);

      let principalToPay = remainingPrincipal;
      let interestToPay = 0;

      if (monthHasStarted) {
        // Month has started - charge interest for this EMI
        interestToPay = remainingInterest;
      } else {
        // Month hasn't started - no interest, only principal
        interestToPay = 0;
      }

      totalPrincipal += principalToPay;
      totalInterest += interestToPay;

      foreclosureDetails.push({
        installmentNumber: emi.installmentNumber,
        dueDate: emi.dueDate,
        totalAmount: emi.totalAmount,
        paidAmount: emi.paidAmount || 0,
        remainingAmount,
        principalToPay,
        interestToPay,
        monthHasStarted,
        amountToPay: principalToPay + interestToPay
      });
    }

    const totalForeclosureAmount = totalPrincipal + totalInterest;

    // Calculate savings
    const originalRemainingAmount = unpaidEMIs.reduce((sum, e) => sum + (e.totalAmount - (e.paidAmount || 0)), 0);
    const savings = originalRemainingAmount - totalForeclosureAmount;

    // Check for any mirror loan mapping
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany: { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } }
      }
    });

    return NextResponse.json({
      success: true,
      foreclosure: {
        loanId: loan.id,
        applicationNo: loan.applicationNo,
        customer: loan.customer,
        unpaidEMICount: unpaidEMIs.length,
        totalEMIs: loan.sessionForm.tenure,
        paidEMIs: loan.emiSchedules.filter(e => e.paymentStatus === 'PAID').length,
        originalRemainingAmount,
        totalPrincipal,
        totalInterest,
        totalForeclosureAmount,
        savings,
        interestRate: loan.sessionForm.interestRate,
        emiDetails: foreclosureDetails,
        mirrorLoan: mirrorMapping ? {
          isMirrorLoan: true,
          mirrorCompany: mirrorMapping.mirrorCompany,
          originalCompany: mirrorMapping.originalCompany,
          mirrorTenure: mirrorMapping.mirrorTenure
        } : null
      }
    });

  } catch (error) {
    console.error('Error calculating foreclosure:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate foreclosure amount',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Close loan (foreclosure payment)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      loanId,
      userId,
      amount,
      paymentMode,
      creditType,
      proofUrl,
      remarks,
      bankAccountId
    } = body;

    if (!loanId || !userId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: true,
        customer: { select: { id: true, name: true, phone: true } },
        emiSchedules: { orderBy: { installmentNumber: 'asc' } },
        company: true
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check mirror loan mapping
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany: { select: { id: true, name: true } },
        originalCompany: { select: { id: true, name: true } }
      }
    });

    // Determine credit company based on mirror loan status
    let creditCompanyId = loan.companyId;
    let isMirrorForeclosure = false;

    if (mirrorMapping) {
      // For mirror loan foreclosure, credit goes to mirror company
      creditCompanyId = mirrorMapping.mirrorCompanyId;
      isMirrorForeclosure = true;
    }

    const result = await db.$transaction(async (tx) => {
      // Mark all unpaid EMIs as paid
      const unpaidEMIs = loan.emiSchedules.filter(e => 
        e.paymentStatus !== 'PAID' && e.paymentStatus !== 'INTEREST_ONLY_PAID'
      );

      for (const emi of unpaidEMIs) {
        await tx.eMISchedule.update({
          where: { id: emi.id },
          data: {
            paymentStatus: 'PAID',
            paidAmount: emi.totalAmount,
            paidPrincipal: emi.principalAmount,
            paidInterest: emi.interestAmount,
            paidDate: new Date(),
            paymentMode: paymentMode,
            proofUrl: proofUrl,
            notes: `Foreclosure payment - Loan closed`
          }
        });
      }

      // Update loan status to CLOSED
      await tx.loanApplication.update({
        where: { id: loanId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          rejectionReason: `Loan closed via foreclosure. Amount: ₹${amount}`
        }
      });

      // Create payment record
      await tx.payment.create({
        data: {
          loanApplicationId: loanId,
          customerId: loan.customerId,
          amount: amount,
          paymentType: 'FORECLOSURE',
          paymentMode: paymentMode,
          status: 'COMPLETED',
          paidById: userId,
          proofUrl: proofUrl,
          remarks: remarks || 'Foreclosure payment - Loan closed',
          verified: true,
          verifiedById: userId,
          verifiedAt: new Date()
        }
      });

      // Update user's credit
      const actualCreditType: string = creditType === 'PERSONAL' || paymentMode !== 'CASH'
        ? 'PERSONAL' 
        : 'COMPANY';

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credit: { increment: amount },
          personalCredit: actualCreditType === 'PERSONAL' 
            ? { increment: amount } 
            : undefined,
          companyCredit: actualCreditType === 'COMPANY' 
            ? { increment: amount } 
            : undefined
        }
      });

      // Create credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: userId,
          transactionType: actualCreditType === 'PERSONAL' 
            ? 'PERSONAL_COLLECTION' 
            : 'CREDIT_INCREASE',
          amount: amount,
          paymentMode: paymentMode as any,
          creditType: actualCreditType as any,
          companyBalanceAfter: updatedUser.companyCredit,
          personalBalanceAfter: updatedUser.personalCredit,
          balanceAfter: updatedUser.credit,
          sourceType: 'FORECLOSURE',
          sourceId: loanId,
          loanApplicationId: loanId,
          customerId: loan.customerId,
          customerName: loan.customer?.name,
          customerPhone: loan.customer?.phone,
          loanApplicationNo: loan.applicationNo,
          description: `Foreclosure payment - ${loan.applicationNo}`,
          proofDocument: proofUrl,
          proofUploadedAt: proofUrl ? new Date() : null,
          proofVerified: actualCreditType === 'COMPANY',
          transactionDate: new Date()
        }
      });

      // Update bank account if specified
      if (bankAccountId && paymentMode !== 'CASH') {
        const bankAccount = await tx.bankAccount.findUnique({
          where: { id: bankAccountId }
        });

        if (bankAccount) {
          const newBalance = bankAccount.currentBalance + amount;
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { currentBalance: newBalance }
          });

          await tx.bankTransaction.create({
            data: {
              bankAccountId: bankAccountId,
              transactionType: 'CREDIT',
              amount: amount,
              balanceAfter: newBalance,
              description: `Foreclosure payment - ${loan.applicationNo} - ${loan.customer?.name}`,
              referenceType: 'FORECLOSURE',
              referenceId: loanId,
              createdById: userId,
              transactionDate: new Date()
            }
          });
        }
      }

      // Update mirror loan mapping if applicable
      if (mirrorMapping) {
        await tx.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: {
            mirrorCompletedAt: new Date()
          }
        });
      }

      return {
        success: true,
        closedLoan: {
          id: loan.id,
          applicationNo: loan.applicationNo,
          amountPaid: amount,
          emiCount: unpaidEMIs.length
        }
      };
    }, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.applicationNo} closed successfully. ₹${amount} credited to your ${creditType?.toLowerCase() || 'company'} credit.`,
      closedLoan: result.closedLoan
    });

  } catch (error) {
    console.error('Error closing loan:', error);
    return NextResponse.json({ 
      error: 'Failed to close loan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
