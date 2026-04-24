import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Collect monthly interest payment for INTEREST_ONLY loans
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const loanId = formData.get('loanId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const paymentMode = formData.get('paymentMode') as string;
    const collectedBy = formData.get('collectedBy') as string;
    const remarks = formData.get('remarks') as string || '';
    const proofBase64 = formData.get('proofBase64') as string | null;
    
    console.log(`[Interest Payment] ========== INTEREST COLLECTION REQUEST ==========`);
    console.log(`[Interest Payment] Loan ID: ${loanId}`);
    console.log(`[Interest Payment] Amount: ${amount}`);
    console.log(`[Interest Payment] Payment Mode: ${paymentMode}`);
    console.log(`[Interest Payment] Collected By: ${collectedBy}`);
    
    if (!loanId || !amount || !paymentMode || !collectedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get loan details
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        company: {
          select: { id: true, name: true, code: true, companyCredit: true }
        },
        sessionForm: {
          select: { 
            approvedAmount: true, 
            interestRate: true, 
            tenure: true,
            interestType: true
          }
        }
      }
    });
    
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    
    // Validate loan status - must be ACTIVE_INTEREST_ONLY
    if (loan.status !== 'ACTIVE_INTEREST_ONLY') {
      return NextResponse.json({ 
        error: 'Invalid loan status',
        message: `Loan must be in ACTIVE_INTEREST_ONLY status to collect interest. Current status: ${loan.status}`
      }, { status: 400 });
    }
    
    // Validate this is an interest-only loan
    if (!loan.isInterestOnlyLoan) {
      return NextResponse.json({ 
        error: 'Not an interest-only loan',
        message: 'This loan is not configured as an interest-only loan'
      }, { status: 400 });
    }
    
    // Calculate expected monthly interest
    const principalAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount;
    const interestRate = loan.sessionForm?.interestRate || loan.interestRate || 12;
    const expectedMonthlyInterest = (principalAmount * interestRate / 100) / 12;
    
    console.log(`[Interest Payment] Principal: ${principalAmount}`);
    console.log(`[Interest Payment] Interest Rate: ${interestRate}%`);
    console.log(`[Interest Payment] Expected Monthly Interest: ${expectedMonthlyInterest}`);
    
    // Handle proof upload (now sent as a compressed base64 string directly from client)
    let proofUrl = '';
    if (proofBase64) {
      proofUrl = proofBase64;
      console.log('[Interest Payment] Proof attached as base64 string.');
    }
    
    // Generate receipt number
    const companyCode = loan.company?.code || 'MM';
    const lastPayment = await db.payment.findFirst({
      where: {
        receiptNumber: { startsWith: `INT-${companyCode}-` }
      },
      orderBy: { createdAt: 'desc' },
      select: { receiptNumber: true }
    });
    
    let nextNumber = 1;
    if (lastPayment?.receiptNumber) {
      const parts = lastPayment.receiptNumber.split('-');
      const lastNumber = parseInt(parts[parts.length - 1] || '0', 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    const receiptNo = `INT-${companyCode}-${nextNumber}`;
    console.log(`[Interest Payment] Generated receipt number: ${receiptNo}`);
    
    // Create payment record
    const payment = await db.payment.create({
      data: {
        loanApplicationId: loanId,
        customerId: loan.customerId,
        amount: amount,
        principalComponent: 0, // No principal in interest-only payment
        interestComponent: amount, // Full amount is interest
        paymentMode: paymentMode,
        status: 'COMPLETED',
        receiptNumber: receiptNo,
        receiptGenerated: true,
        paidById: collectedBy,
        remarks: remarks || `Monthly interest collection for interest-only loan. Expected: ${expectedMonthlyInterest.toFixed(2)}`,
        proofUrl: proofUrl,
        paymentType: 'INTEREST_ONLY_PAYMENT'
      }
    });
    
    console.log(`[Interest Payment] Payment created: ${payment.id}`);
    
    // Update loan's totalInterestOnlyPaid
    const updatedLoan = await db.loanApplication.update({
      where: { id: loanId },
      data: {
        totalInterestOnlyPaid: { increment: amount }
      }
    });
    
    console.log(`[Interest Payment] Loan totalInterestOnlyPaid updated: ${updatedLoan.totalInterestOnlyPaid}`);
    
    // Create bank transaction for non-cash payments
    if (paymentMode === 'BANK_TRANSFER' || paymentMode === 'ONLINE' || paymentMode === 'UPI') {
      let bankAccount = await db.bankAccount.findFirst({
        where: { 
          companyId: loan.companyId || undefined,
          isDefault: true, 
          isActive: true 
        }
      });

      if (!bankAccount) {
        bankAccount = await db.bankAccount.findFirst({
          where: { isDefault: true, isActive: true }
        });
      }

      if (bankAccount) {
        await db.bankAccount.update({
          where: { id: bankAccount.id },
          data: {
            currentBalance: { increment: amount }
          }
        });

        await db.bankTransaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: 'CREDIT',
            amount: amount,
            balanceAfter: bankAccount.currentBalance + amount,
            description: `Interest Collection (Interest-Only Phase) - ${loan.applicationNo}`,
            referenceType: 'INTEREST_ONLY_PAYMENT',
            referenceId: payment.id,
            createdById: collectedBy
          }
        });
        
        console.log(`[Interest Payment] Bank transaction created`);
      }
    }
    
    // Update collector's credit based on payment mode
    const isCashPayment = paymentMode === 'CASH';
    
    if (isCashPayment && loan.companyId) {
      // Cash payment - increase company credit
      const company = await db.company.findUnique({
        where: { id: loan.companyId },
        select: { companyCredit: true }
      });
      
      const newCompanyCredit = (company?.companyCredit || 0) + amount;
      
      await db.creditTransaction.create({
        data: {
          userId: collectedBy,
          transactionType: 'CREDIT_INCREASE',
          amount: amount,
          paymentMode: 'CASH',
          creditType: 'COMPANY',
          sourceType: 'INTEREST_ONLY_PAYMENT',
          sourceId: payment.id,
          balanceAfter: newCompanyCredit,
          personalBalanceAfter: 0,
          companyBalanceAfter: newCompanyCredit,
          loanApplicationId: loanId,
          customerId: loan.customerId,
          customerName: loan.customer?.name,
          loanApplicationNo: loan.applicationNo,
          description: `Interest Collection (Interest-Only) - ${loan.applicationNo}`,
          transactionDate: new Date()
        }
      });
      
      await db.company.update({
        where: { id: loan.companyId },
        data: { companyCredit: newCompanyCredit }
      });
      
      console.log(`[Interest Payment] Company credit updated: ${newCompanyCredit}`);
    } else {
      // Non-cash payment - increase collector's personal credit
      const collector = await db.user.findUnique({
        where: { id: collectedBy },
        select: { personalCredit: true, companyCredit: true, credit: true, name: true }
      });
      
      const newPersonalCredit = (collector?.personalCredit || 0) + amount;
      const newTotalCredit = (collector?.credit || 0) + amount;
      
      await db.creditTransaction.create({
        data: {
          userId: collectedBy,
          transactionType: 'PERSONAL_COLLECTION',
          amount: amount,
          paymentMode: paymentMode as 'CASH' | 'CHEQUE' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'SYSTEM',
          creditType: 'PERSONAL',
          sourceType: 'INTEREST_ONLY_PAYMENT',
          sourceId: payment.id,
          balanceAfter: newTotalCredit,
          personalBalanceAfter: newPersonalCredit,
          companyBalanceAfter: collector?.companyCredit || 0,
          loanApplicationId: loanId,
          customerId: loan.customerId,
          customerName: loan.customer?.name,
          loanApplicationNo: loan.applicationNo,
          description: `Interest Collection (Interest-Only) - ${loan.applicationNo}`,
          transactionDate: new Date()
        }
      });
      
      await db.user.update({
        where: { id: collectedBy },
        data: {
          personalCredit: newPersonalCredit,
          credit: newTotalCredit
        }
      });
      
      console.log(`[Interest Payment] Personal credit updated for ${collectedBy}: ${newPersonalCredit}`);
    }
    
    // Create workflow log
    await db.workflowLog.create({
      data: {
        loanApplicationId: loanId,
        actionById: collectedBy,
        previousStatus: loan.status,
        newStatus: loan.status,
        action: 'INTEREST_PAYMENT_COLLECTED',
        remarks: `Interest payment of ${amount} collected via ${paymentMode}`
      }
    });
    
    console.log(`[Interest Payment] ========== INTEREST COLLECTION COMPLETE ==========`);
    
    return NextResponse.json({
      success: true,
      message: 'Interest payment collected successfully',
      payment: {
        id: payment.id,
        receiptNumber: receiptNo,
        amount: amount,
        paymentMode: paymentMode,
        collectedAt: payment.createdAt
      },
      loan: {
        id: loan.id,
        totalInterestOnlyPaid: updatedLoan.totalInterestOnlyPaid
      }
    });
    
  } catch (error) {
    console.error('[Interest Payment] Error:', error);
    console.error('[Interest Payment] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Failed to process interest payment', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET - Fetch interest payment history for a loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    
    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }
    
    // Get loan details
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        applicationNo: true,
        isInterestOnlyLoan: true,
        interestOnlyStartDate: true,
        totalInterestOnlyPaid: true,
        requestedAmount: true,
        sessionForm: {
          select: {
            approvedAmount: true,
            interestRate: true
          }
        }
      }
    });
    
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    
    // Get all interest-only payments for this loan
    const payments = await db.payment.findMany({
      where: {
        loanApplicationId: loanId,
        paymentType: 'INTEREST_ONLY_PAYMENT'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMode: true,
        receiptNumber: true,
        createdAt: true,
        remarks: true,
        proofUrl: true,
        status: true
      }
    });
    
    // Calculate monthly interest amount
    const principalAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount;
    const interestRate = loan.sessionForm?.interestRate || 12;
    const monthlyInterestAmount = (principalAmount * interestRate / 100) / 12;
    
    return NextResponse.json({
      success: true,
      loan: {
        id: loan.id,
        applicationNo: loan.applicationNo,
        isInterestOnlyLoan: loan.isInterestOnlyLoan,
        interestOnlyStartDate: loan.interestOnlyStartDate,
        totalInterestOnlyPaid: loan.totalInterestOnlyPaid,
        principalAmount: principalAmount,
        interestRate: interestRate,
        monthlyInterestAmount: monthlyInterestAmount
      },
      payments: payments,
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
    });
    
  } catch (error) {
    console.error('[Interest Payment] Error fetching history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch interest payment history', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
