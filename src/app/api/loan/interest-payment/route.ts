import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
// ACID: retry on deadlock + duplicate guard
import { withRetry } from '@/lib/db-utils';

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
    
    // ── MIRROR ROUTING: check before transaction ─────────────────────────────────
    // Rule: Mirror exists → entry in MIRROR company using MIRROR rate
    const mirrorMapForAcct = await db.mirrorLoanMapping.findFirst({
      where: {
        OR: [
          { originalLoanId: loanId },
          { mirrorLoanId: loanId }
        ],
        isOfflineLoan: false
      },
      select: { id: true, originalLoanId: true, mirrorLoanId: true, mirrorCompanyId: true, mirrorInterestRate: true }
    });
    const isMirrorChild = mirrorMapForAcct ? loanId === mirrorMapForAcct.mirrorLoanId : false;
    const acctCompanyId   = mirrorMapForAcct?.mirrorCompanyId || loan.companyId || '';
    const acctAmount      = mirrorMapForAcct
      ? (isMirrorChild
          ? amount
          : Math.round((principalAmount * (mirrorMapForAcct.mirrorInterestRate || 0) / 100 / 12) * 100) / 100)
      : amount;
    console.log(`[Interest Payment] Accounting target: ${mirrorMapForAcct ? 'MIRROR company ' + acctCompanyId : 'ORIGINAL company ' + loan.companyId} | amount: ₹${acctAmount}`);

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

    // ── ACID: All writes in one atomic transaction ──────────────────────────
    // withRetry: deadlock resilience (P2034) up to 3×
    // DUPLICATE GUARD: re-reads for an INTEREST_ONLY_PAYMENT in the same month
    //   INSIDE the transaction to prevent concurrent double-collection.
    const { payment, updatedLoan, paidInstNum } = await withRetry(() => db.$transaction(async (tx) => {
      // ACID GUARD: check for duplicate interest collection in the same calendar month
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      const existing = await tx.payment.findFirst({
        where: {
          loanApplicationId: loanId,
          paymentType: 'INTEREST_ONLY_PAYMENT',
          createdAt: { gte: thisMonthStart },
        },
        select: { id: true }
      });
      if (existing) {
        const err: any = new Error('Duplicate interest payment this month');
        err.code = 'DUPLICATE_INTEREST_PAYMENT';
        throw err;
      }

      // A. Create payment record
      const payment = await tx.payment.create({
        data: {
          loanApplicationId: loanId,
          customerId: loan.customerId,
          amount: amount,
          principalComponent: 0,
          interestComponent: amount,
          paymentMode: paymentMode,
          status: 'COMPLETED',
          receiptNumber: receiptNo,
          receiptGenerated: true,
          paidById: collectedBy,
          remarks: remarks || `Monthly interest collection. Expected: ₹${expectedMonthlyInterest.toFixed(2)}`,
          proofUrl: proofUrl,
          paymentType: 'INTEREST_ONLY_PAYMENT'
        }
      });

      // B. Update loan's totalInterestOnlyPaid
      const updatedLoan = await tx.loanApplication.update({
        where: { id: loanId },
        data: { totalInterestOnlyPaid: { increment: amount } }
      });

      // C. Bank / CashBook entry — routed to MIRROR company if mapping exists, else ORIGINAL.
      // acctCompanyId and acctAmount are determined before the transaction (mirror-aware).
      const isBankPayment = ['BANK_TRANSFER', 'ONLINE', 'UPI'].includes(paymentMode);
      if (isBankPayment) {
        // Prefer the accounting-target company's bank account; fall back to any default.
        let bankAccount = await tx.bankAccount.findFirst({
          where: { companyId: acctCompanyId || undefined, isDefault: true, isActive: true }
        });
        if (!bankAccount && acctCompanyId) {
          bankAccount = await tx.bankAccount.findFirst({ where: { companyId: acctCompanyId, isActive: true } });
        }
        if (!bankAccount) {
          bankAccount = await tx.bankAccount.findFirst({ where: { isDefault: true, isActive: true } });
        }
        if (bankAccount) {
          await tx.bankAccount.update({
            where: { id: bankAccount.id },
            data: { currentBalance: { increment: acctAmount } }
          });
          await tx.bankTransaction.create({
            data: {
              bankAccountId: bankAccount.id,
              transactionType: 'CREDIT',
              amount: acctAmount,
              balanceAfter: bankAccount.currentBalance + acctAmount,
              description: `IO Interest - ${loan.applicationNo} - ${loan.customer?.name || 'Customer'}`,
              referenceType: 'INTEREST_ONLY_PAYMENT',
              referenceId: payment.id,
              createdById: collectedBy
            }
          });
        }
      } else {
        // CASH: record in CashBook of the accounting target company
        if (acctCompanyId) {
          const { recordCashBookEntry } = await import('@/lib/simple-accounting');
          await recordCashBookEntry({
            companyId: acctCompanyId,
            entryType: 'CREDIT',
            amount: acctAmount,
            description: `IO Interest - ${loan.applicationNo} - ${loan.customer?.name || 'Customer'}`,
            referenceType: 'INTEREST_ONLY_PAYMENT',
            referenceId: payment.id,
            createdById: collectedBy,
            tx,
          });
        }
      }

      // D. Credit update (atomic — reads & writes in same tx)
      const isCashPayment = !isBankPayment;
      if (isCashPayment && loan.companyId) {
        const company = await tx.company.findUnique({
          where: { id: loan.companyId }, select: { companyCredit: true }
        });
        const newCompanyCredit = (company?.companyCredit || 0) + amount;
        await tx.creditTransaction.create({
          data: {
            userId: collectedBy, transactionType: 'CREDIT_INCREASE', amount,
            paymentMode: 'CASH', creditType: 'COMPANY', sourceType: 'INTEREST_ONLY_PAYMENT',
            sourceId: payment.id, balanceAfter: newCompanyCredit, personalBalanceAfter: 0,
            companyBalanceAfter: newCompanyCredit, loanApplicationId: loanId,
            customerId: loan.customerId, customerName: loan.customer?.name,
            loanApplicationNo: loan.applicationNo,
            description: `Interest Collection (Interest-Only) - ${loan.applicationNo}`,
            transactionDate: new Date()
          }
        });
        await tx.company.update({ where: { id: loan.companyId }, data: { companyCredit: newCompanyCredit } });
      } else {
        const collector = await tx.user.findUnique({
          where: { id: collectedBy }, select: { personalCredit: true, companyCredit: true, credit: true }
        });
        const newPersonalCredit = (collector?.personalCredit || 0) + amount;
        const newTotalCredit    = (collector?.credit        || 0) + amount;
        await tx.creditTransaction.create({
          data: {
            userId: collectedBy, transactionType: 'PERSONAL_COLLECTION', amount,
            paymentMode: paymentMode as any, creditType: 'PERSONAL',
            sourceType: 'INTEREST_ONLY_PAYMENT', sourceId: payment.id,
            balanceAfter: newTotalCredit, personalBalanceAfter: newPersonalCredit,
            companyBalanceAfter: collector?.companyCredit || 0,
            loanApplicationId: loanId, customerId: loan.customerId,
            customerName: loan.customer?.name, loanApplicationNo: loan.applicationNo,
            description: `Interest Collection (Interest-Only) - ${loan.applicationNo}`,
            transactionDate: new Date()
          }
        });
        await tx.user.update({
          where: { id: collectedBy },
          data: { personalCredit: newPersonalCredit, credit: newTotalCredit }
        });
      }

      // E. WorkflowLog inside transaction
      await tx.workflowLog.create({
        data: {
          loanApplicationId: loanId,
          actionById: collectedBy,
          previousStatus: loan.status,
          newStatus: loan.status,
          action: 'INTEREST_PAYMENT_COLLECTED',
          remarks: `Interest payment of ₹${amount} collected via ${paymentMode} (Receipt: ${receiptNo})`
        }
      });

      // E2. Rolling EMI update — identical to offline IO loan pattern.
      // Mark the current PENDING IO EMI as INTEREST_ONLY_PAID and create the next month's
      // PENDING EMI so the cashier can collect next month without calling interest-emi GET first.
      // If no PENDING EMI exists yet (first-time, before interest-emi GET was called), this is a
      // no-op — the next GET call will auto-create EMI #1 and subsequent collections will roll.
      const currentIOEmi = await tx.eMISchedule.findFirst({
        where: {
          loanApplicationId: loanId,
          isInterestOnly: true,
          paymentStatus: { in: ['PENDING', 'OVERDUE'] }
        },
        orderBy: { installmentNumber: 'asc' },
      });
      if (currentIOEmi) {
        await tx.eMISchedule.update({
          where: { id: currentIOEmi.id },
          data: {
            paymentStatus: 'INTEREST_ONLY_PAID',
            paidAmount: amount,
            paidInterest: amount,
            paidDate: new Date(),
            paymentMode: paymentMode,
            interestOnlyPaidAt: new Date(),
            interestOnlyAmount: amount,
            notes: `[IO PAID] Receipt: ${receiptNo}`,
          }
        });
        console.log(`[Interest Payment] EMI #${currentIOEmi.installmentNumber} marked INTEREST_ONLY_PAID`);
        // Create next month's EMI (rolling)
        const nextInstNum = currentIOEmi.installmentNumber + 1;
        const nextAlreadyExists = await tx.eMISchedule.findFirst({
          where: { loanApplicationId: loanId, installmentNumber: nextInstNum },
        });
        if (!nextAlreadyExists) {
          const nextDue = new Date(currentIOEmi.dueDate);
          nextDue.setMonth(nextDue.getMonth() + 1);
          await tx.eMISchedule.create({
            data: {
              loanApplicationId: loanId,
              installmentNumber: nextInstNum,
              dueDate: nextDue,
              originalDueDate: nextDue,
              principalAmount: 0,
              interestAmount: expectedMonthlyInterest,
              totalAmount: expectedMonthlyInterest,
              outstandingPrincipal: principalAmount,
              outstandingInterest: expectedMonthlyInterest,
              paymentStatus: 'PENDING',
              isInterestOnly: true,
              interestOnlyAmount: expectedMonthlyInterest,
            }
          });
          console.log(`[Interest Payment] Next IO EMI #${nextInstNum} created (rolling)`);
        }
      }

      return { payment, updatedLoan, paidInstNum: currentIOEmi?.installmentNumber };
    })); // end withRetry + $transaction

    console.log(`[Interest Payment] ✅ All writes committed atomically.`);

    // ── DOUBLE-ENTRY JOURNAL (outside tx — non-critical, CoA init can be slow) ──────────────
    // Routes to mirror company if mapping exists, else original company.
    try {
      if (acctCompanyId) {
        const { AccountingService: AccSvc, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        const accSvc = new AccSvc(acctCompanyId);
        await accSvc.initializeChartOfAccounts();
        const isOnlineMode = ['BANK_TRANSFER', 'ONLINE', 'UPI'].includes(paymentMode);
        await accSvc.createJournalEntry({
          entryDate: new Date(),
          referenceType: 'INTEREST_ONLY_PAYMENT',
          referenceId: payment.id,
          narration: `IO Interest - ${loan.applicationNo} - ${loan.customer?.name || 'Customer'}`,
          lines: [
            {
              accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND,
              debitAmount: acctAmount, creditAmount: 0,
              narration: `Interest received (${paymentMode})`,
              loanId: loan.id,
              customerId: loan.customerId,
            },
            {
              accountCode: ACCOUNT_CODES.INTEREST_INCOME,
              debitAmount: 0, creditAmount: acctAmount,
              narration: `Interest income — ${loan.applicationNo}`,
              loanId: loan.id,
              customerId: loan.customerId,
            },
          ],
          createdById: collectedBy,
          paymentMode: paymentMode || 'CASH',
          isAutoEntry: true,
        });
        console.log(`[Interest Payment] ✅ Journal entry in ${mirrorMapForAcct ? 'MIRROR' : 'ORIGINAL'} company ${acctCompanyId} ₹${acctAmount}`);

        // ── Partner EMI rolling sync (if mirror mapping exists) ──────────────────
        const partnerLoanIdForSync = mirrorMapForAcct
          ? (loanId === mirrorMapForAcct.originalLoanId ? mirrorMapForAcct.mirrorLoanId : mirrorMapForAcct.originalLoanId)
          : null;
        if (partnerLoanIdForSync && mirrorMapForAcct) {
          try {
            if (paidInstNum) {
              const partnerEMI = await db.eMISchedule.findFirst({
                where: { loanApplicationId: partnerLoanIdForSync, installmentNumber: paidInstNum },
              });
              if (partnerEMI && partnerEMI.paymentStatus !== 'PAID') {
                const partnerSyncAmount = loanId === mirrorMapForAcct.originalLoanId ? acctAmount : expectedMonthlyInterest;
                await db.eMISchedule.update({
                  where: { id: partnerEMI.id },
                  data: {
                    paymentStatus: 'INTEREST_ONLY_PAID',
                    isInterestOnly: true,
                    interestOnlyPaidAt: new Date(),
                    interestOnlyAmount: partnerSyncAmount,
                    paidInterest: partnerSyncAmount,
                    paidAmount: partnerSyncAmount,
                    paidDate: new Date(),
                    principalDeferred: true,
                    notes: `[IO SYNC] Auto-paid ₹${partnerSyncAmount} (synced from partner loan)`,
                  }
                });
                // Create next partner EMI if it doesn't exist
                const nextInstNum = partnerEMI.installmentNumber + 1;
                const alreadyExists = await db.eMISchedule.findFirst({
                  where: { loanApplicationId: partnerLoanIdForSync, installmentNumber: nextInstNum },
                });
                if (!alreadyExists) {
                  const nextDue = new Date(partnerEMI.dueDate);
                  nextDue.setMonth(nextDue.getMonth() + 1);
                  const partnerExpectedMonthlyInterest = loanId === mirrorMapForAcct.originalLoanId ? acctAmount : expectedMonthlyInterest;
                  await db.eMISchedule.create({
                    data: {
                      loanApplicationId: partnerLoanIdForSync,
                      installmentNumber: nextInstNum,
                      dueDate: nextDue,
                      originalDueDate: nextDue,
                      principalAmount: 0,
                      interestAmount: partnerExpectedMonthlyInterest,
                      totalAmount: partnerExpectedMonthlyInterest,
                      outstandingPrincipal: principalAmount,
                      outstandingInterest: partnerExpectedMonthlyInterest,
                      paymentStatus: 'PENDING',
                      isInterestOnly: true,
                      interestOnlyAmount: partnerExpectedMonthlyInterest,
                    }
                  });
                  console.log(`[Interest Payment] ✅ Partner EMI #${nextInstNum} created for partner loan ${partnerLoanIdForSync}`);
                }
              }
            }
          } catch (mirrorSyncErr) {
            console.error('[Interest Payment] Partner EMI sync error (non-critical):', mirrorSyncErr);
          }
        }
      }
    } catch (journalErr: any) {
      console.error('[Interest Payment] Journal entry failed (non-critical):', journalErr?.message);
    }

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
    
  } catch (error: any) {
    // ACID: 409 for duplicate monthly interest payment
    if (error?.code === 'DUPLICATE_INTEREST_PAYMENT') {
      return NextResponse.json({
        error: 'Interest payment already collected for this month.',
        code: 'DUPLICATE_INTEREST_PAYMENT',
      }, { status: 409 });
    }
    console.error('[Interest Payment] Error:', error);
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
