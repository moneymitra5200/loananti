import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentType, PaymentRequestStatus } from '@prisma/client';
import { AccountingService } from '@/lib/accounting-service';

// GET - List payment requests (for cashier/admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const loanId = searchParams.get('loanId');

    // Get payment request settings
    if (action === 'settings') {
      const loanApplicationId = searchParams.get('loanApplicationId');
      let companyId = searchParams.get('companyId');
      
      // If companyId not provided, get it from the loan application
      if (loanApplicationId && !companyId) {
        const loan = await db.loanApplication.findUnique({
          where: { id: loanApplicationId },
          select: { companyId: true }
        });
        companyId = loan?.companyId || null;
      }
      
      let settings: any = null;
      
      // First check loan-specific settings
      if (loanApplicationId) {
        const loanSettings = await db.paymentOptionSettings.findFirst({
          where: { loanApplicationId, scope: 'LOAN' }
        });
        if (loanSettings) {
          settings = loanSettings;
        }
      }
      
      // Then check company-specific settings
      if (!settings && companyId) {
        const companySettings = await db.companyPaymentSettings.findUnique({
          where: { companyId }
        });
        if (companySettings) {
          settings = companySettings;
        }
      }
      
      // Return global default settings if no specific settings found
      if (!settings) {
        const globalSettings = await db.paymentOptionSettings.findFirst({
          where: { scope: 'GLOBAL' }
        });
        
        if (globalSettings) {
          settings = globalSettings;
        } else {
          // Create default settings
          settings = await db.paymentOptionSettings.create({
            data: {
              scope: 'GLOBAL',
              enableFullPayment: true,
              enablePartialPayment: true,
              enableInterestOnly: true,
              maxPartialPayments: 2,
              maxInterestOnlyPerLoan: 3,
              acceptedPaymentMethods: 'UPI,BANK_TRANSFER,CASH',
              createdById: userId || 'system'
            }
          });
        }
      }
      
      // Fetch company's default bank account details for payment
      let bankAccountDetails: {
        bankAccountId: string;
        bankName: string;
        bankAccountNumber: string;
        bankAccountName: string;
        bankIfscCode: string | null;
        bankBranch: string | null;
        companyUpiId: string | null;
        companyQrCodeUrl: string | null;
      } | null = null;
      if (companyId) {
        const defaultBankAccount = await db.bankAccount.findFirst({
          where: { 
            companyId,
            isDefault: true 
          },
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
            ifscCode: true,
            branchName: true,
            upiId: true,
            qrCodeUrl: true
          }
        });
        
        if (defaultBankAccount) {
          bankAccountDetails = {
            bankAccountId: defaultBankAccount.id,
            bankName: defaultBankAccount.bankName,
            bankAccountNumber: defaultBankAccount.accountNumber,
            bankAccountName: defaultBankAccount.accountName,
            bankIfscCode: defaultBankAccount.ifscCode,
            bankBranch: defaultBankAccount.branchName,
            companyUpiId: defaultBankAccount.upiId,
            companyQrCodeUrl: defaultBankAccount.qrCodeUrl
          };
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        settings: {
          ...settings,
          ...bankAccountDetails
        }
      });
    }

    // Get EMI details for payment
    if (action === 'emi-details') {
      const emiScheduleId = searchParams.get('emiScheduleId');
      
      if (!emiScheduleId) {
        return NextResponse.json({ error: 'EMI Schedule ID required' }, { status: 400 });
      }
      
      const emi = await db.eMISchedule.findUnique({
        where: { id: emiScheduleId },
        include: {
          loanApplication: {
            include: {
              sessionForm: true,
              company: true
            }
          }
        }
      });
      
      if (!emi) {
        return NextResponse.json({ error: 'EMI not found' }, { status: 404 });
      }
      
      // Get payment settings for this loan
      const settings = await db.paymentOptionSettings.findFirst({
        where: {
          OR: [
            { loanApplicationId: emi.loanApplicationId, scope: 'LOAN' },
            { companyId: emi.loanApplication.companyId || undefined, scope: 'COMPANY' },
            { scope: 'GLOBAL' }
          ]
        },
        orderBy: { scope: 'desc' }  // LOAN > COMPANY > GLOBAL
      });
      
      return NextResponse.json({ 
        success: true, 
        emi,
        settings: settings || {
          enableFullPayment: true,
          enablePartialPayment: true,
          enableInterestOnly: true,
          maxPartialPayments: 2,
          maxInterestOnlyPerLoan: 3
        }
      });
    }

    // List payment requests
    let whereClause: any = {};
    
    if (role === 'CUSTOMER' && userId) {
      whereClause.customerId = userId;
    }
    
    if (status) {
      whereClause.status = status as PaymentRequestStatus;
    }
    
    if (loanId) {
      whereClause.loanApplicationId = loanId;
    }

    const paymentRequests = await db.paymentRequest.findMany({
      where: whereClause,
      include: {
        loanApplication: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            sessionForm: true
          }
        },
        emiSchedule: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        reviewer: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, paymentRequests });
  } catch (error) {
    console.error('Error in payment request GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      loanApplicationId,
      emiScheduleId,
      customerId,
      paymentType,
      requestedAmount,
      partialAmount,
      remainingAmount,
      newDueDate,
      paymentMethod,
      utrNumber,
      proofUrl,
      proofFileName
    } = body;

    // Validate required fields
    if (!loanApplicationId || !customerId || !paymentType || !requestedAmount || !emiScheduleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get EMI details
    const emi = await db.eMISchedule.findUnique({
      where: { id: emiScheduleId },
      include: {
        loanApplication: {
          include: { company: true, sessionForm: true }
        }
      }
    });

    if (!emi) {
      return NextResponse.json({ error: 'EMI not found' }, { status: 404 });
    }

    // Get payment settings
    const settings = await db.paymentOptionSettings.findFirst({
      where: {
        OR: [
          { loanApplicationId, scope: 'LOAN' },
          { companyId: emi.loanApplication.companyId || undefined, scope: 'COMPANY' },
          { scope: 'GLOBAL' }
        ]
      },
      orderBy: { scope: 'desc' }
    });

    // Validate payment options
    if (paymentType === 'PARTIAL_PAYMENT' && settings && !settings.enablePartialPayment) {
      return NextResponse.json({ error: 'Partial payment is not enabled for this loan' }, { status: 400 });
    }
    
    if (paymentType === 'INTEREST_ONLY' && settings && !settings.enableInterestOnly) {
      return NextResponse.json({ error: 'Interest-only payment is not enabled for this loan' }, { status: 400 });
    }

    // Validate partial payment
    if (paymentType === 'PARTIAL_PAYMENT') {
      const maxPartial = settings?.maxPartialPayments || 2;
      
      if (emi.partialPaymentCount >= maxPartial) {
        return NextResponse.json({ 
          error: `Maximum ${maxPartial} partial payments allowed for this EMI` 
        }, { status: 400 });
      }

      // Partial amount is required
      if (!partialAmount || partialAmount <= 0) {
        return NextResponse.json({ 
          error: 'Partial amount is required and must be greater than 0' 
        }, { status: 400 });
      }

      // Partial amount must be less than total EMI
      if (partialAmount >= emi.totalAmount) {
        return NextResponse.json({ 
          error: 'Partial amount must be less than total EMI amount (' + emi.totalAmount + ')' 
        }, { status: 400 });
      }

      // New due date is required for partial payment
      if (!newDueDate) {
        return NextResponse.json({ 
          error: 'New due date is required for partial payment' 
        }, { status: 400 });
      }

      // Validate date - must be after original due date and before next EMI due date
      const newDate = new Date(newDueDate);
      const dueDate = new Date(emi.dueDate);
      
      if (newDate <= dueDate) {
        return NextResponse.json({ 
          error: 'New due date must be after the original due date' 
        }, { status: 400 });
      }

      // Check if new date is before the next EMI's due date
      const nextEMI = await db.eMISchedule.findFirst({
        where: { 
          loanApplicationId,
          installmentNumber: emi.installmentNumber + 1
        }
      });

      if (nextEMI) {
        const nextDueDate = new Date(nextEMI.dueDate);
        if (newDate >= nextDueDate) {
          return NextResponse.json({ 
            error: 'New due date must be before the next EMI due date (' + nextDueDate.toLocaleDateString() + ')' 
          }, { status: 400 });
        }
      }
    }

    // Validate interest only payment
    if (paymentType === 'INTEREST_ONLY') {
      const maxInterestOnly = settings?.maxInterestOnlyPerLoan || 3;
      
      // Count how many interest-only payments already made for this loan
      const existingInterestOnly = await db.paymentRequest.count({
        where: {
          loanApplicationId,
          paymentType: 'INTEREST_ONLY',
          status: 'APPROVED'
        }
      });

      if (existingInterestOnly >= maxInterestOnly) {
        return NextResponse.json({ 
          error: `Maximum ${maxInterestOnly} interest-only payments allowed for this loan` 
        }, { status: 400 });
      }
    }

    // Generate request number
    const requestNumber = `PR${Date.now().toString(36).toUpperCase()}`;

    // Get company payment settings for UPI/Bank details
    const companySettings = emi.loanApplication.companyId 
      ? await db.companyPaymentSettings.findUnique({
          where: { companyId: emi.loanApplication.companyId }
        })
      : null;

    // Create payment request
    const paymentRequest = await db.paymentRequest.create({
      data: {
        requestNumber,
        loanApplicationId,
        emiScheduleId,
        customerId,
        paymentType: paymentType as PaymentType,
        requestedAmount,
        partialAmount: partialAmount || null,
        remainingAmount: remainingAmount || null,
        newDueDate: newDueDate ? new Date(newDueDate) : null,
        partialPaymentNumber: paymentType === 'PARTIAL_PAYMENT' ? emi.partialPaymentCount + 1 : null,
        interestAmount: paymentType === 'INTEREST_ONLY' ? emi.interestAmount : null,
        principalDeferred: paymentType === 'INTEREST_ONLY',
        paymentMethod,
        utrNumber,
        proofUrl,
        proofFileName,
        upiId: companySettings?.companyUpiId,
        qrCodeUrl: companySettings?.companyQrCodeUrl,
        bankAccountDetails: companySettings?.collectionBankAccountId ? 
          JSON.stringify({ bankAccountId: companySettings.collectionBankAccountId }) : null,
        status: 'PENDING'
      },
      include: {
        loanApplication: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } }
          }
        },
        emiSchedule: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Payment request submitted successfully. Awaiting approval.',
      paymentRequest 
    });
  } catch (error) {
    console.error('Error creating payment request:', error);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}

// PUT - Approve or reject payment request
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, paymentRequestId, reviewedById, reviewRemarks, rejectionReason } = body;

    if (!paymentRequestId || !action || !reviewedById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        emiSchedule: true,
        loanApplication: {
          include: { sessionForm: true }
        }
      }
    });

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    if (paymentRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment request already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      const emi = paymentRequest.emiSchedule;
      const loan = paymentRequest.loanApplication;

      // Ensure EMI exists
      if (!emi) {
        return NextResponse.json({ error: 'EMI schedule not found for this payment request' }, { status: 400 });
      }

      // Pre-fetch data needed for INTEREST_ONLY payment BEFORE transaction
      let lastEMI: any = null;
      let nextEMI: any = null;
      
      if (paymentRequest.paymentType === 'INTEREST_ONLY') {
        // Fetch last EMI for installment number
        lastEMI = await db.eMISchedule.findFirst({
          where: { loanApplicationId: paymentRequest.loanApplicationId },
          orderBy: { installmentNumber: 'desc' }
        });
        
        // Fetch next EMI for due date calculation
        nextEMI = await db.eMISchedule.findFirst({
          where: { 
            loanApplicationId: paymentRequest.loanApplicationId,
            installmentNumber: emi.installmentNumber + 1
          }
        });
      }

      // Start transaction for approval process with extended timeout
      const result = await db.$transaction(async (tx) => {
        // Update payment request status
        const updated = await tx.paymentRequest.update({
          where: { id: paymentRequestId },
          data: {
            status: 'APPROVED',
            reviewedById,
            reviewedAt: new Date(),
            reviewRemarks,
            paymentConfirmedAt: new Date()
          }
        });

        // Handle different payment types
        if (paymentRequest.paymentType === 'FULL_EMI') {
          // Mark EMI as fully paid
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paidAmount: paymentRequest.requestedAmount,
              paidPrincipal: emi.principalAmount,
              paidInterest: emi.interestAmount,
              paymentStatus: 'PAID',
              paidDate: new Date(),
              paymentMode: paymentRequest.paymentMethod,
              utrNumber: paymentRequest.utrNumber,
              proofUrl: paymentRequest.proofUrl
            }
          });

          // Create payment record
          await tx.payment.create({
            data: {
              loanApplicationId: paymentRequest.loanApplicationId,
              emiScheduleId: emi.id,
              customerId: paymentRequest.customerId,
              paymentType: 'FULL_EMI',
              amount: paymentRequest.requestedAmount,
              principalComponent: emi.principalAmount,
              interestComponent: emi.interestAmount,
              utrNumber: paymentRequest.utrNumber,
              paymentMode: paymentRequest.paymentMethod,
              status: 'COMPLETED',
              verified: true,
              verifiedById: reviewedById,
              verifiedAt: new Date(),
              proofUrl: paymentRequest.proofUrl
            }
          });
        } 
        else if (paymentRequest.paymentType === 'PARTIAL_PAYMENT') {
          const partialAmount = paymentRequest.partialAmount || 0;
          const remainingAmount = paymentRequest.remainingAmount || (emi.totalAmount - partialAmount);
          const partialCount = emi.partialPaymentCount + 1;
          const maxPartialPayments = 2;

          // Calculate principal and interest for partial payment — INTEREST FIRST
          // Business rule: interest is collected before principal on any partial payment
          const totalInterest = emi.interestAmount;
          let paidPrincipal: number;
          let paidInterest: number;
          if (partialAmount <= totalInterest) {
            paidInterest  = partialAmount;
            paidPrincipal = 0;
          } else {
            paidInterest  = totalInterest;
            paidPrincipal = Math.round((partialAmount - totalInterest) * 100) / 100;
          }

          // Update EMI with partial payment info
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paidAmount: emi.paidAmount + partialAmount,
              paidPrincipal: emi.paidPrincipal + paidPrincipal,
              paidInterest: emi.paidInterest + paidInterest,
              remainingAmount,
              partialPaymentCount: partialCount,
              newDueDate: paymentRequest.newDueDate,
              paymentStatus: 'PARTIALLY_PAID',
              isPartialPayment: true,
              nextPaymentDate: paymentRequest.newDueDate
            }
          });

          // Create payment record
          await tx.payment.create({
            data: {
              loanApplicationId: paymentRequest.loanApplicationId,
              emiScheduleId: emi.id,
              customerId: paymentRequest.customerId,
              paymentType: 'PARTIAL_PAYMENT',
              amount: partialAmount,
              principalComponent: paidPrincipal,
              interestComponent: paidInterest,
              utrNumber: paymentRequest.utrNumber,
              paymentMode: paymentRequest.paymentMethod,
              status: 'COMPLETED',
              verified: true,
              verifiedById: reviewedById,
              verifiedAt: new Date(),
              proofUrl: paymentRequest.proofUrl,
              remarks: `Partial payment ${partialCount}/2`
            }
          });

          // If this is the last partial payment, notify customer
          if (partialCount === maxPartialPayments && remainingAmount > 0) {
            await tx.notification.create({
              data: {
                userId: paymentRequest.customerId,
                type: 'PAYMENT_WARNING',
                title: 'Last Partial Payment Done',
                message: `You have used both partial payments. Remaining amount: ₹${remainingAmount.toFixed(2)} must be paid in full.`
              }
            });
          }
        }
        else if (paymentRequest.paymentType === 'INTEREST_ONLY') {
          const interestAmount = emi.interestAmount;
          
          // Update EMI - mark interest paid but keep principal pending
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paidAmount: emi.paidAmount + interestAmount,
              paidInterest: emi.paidInterest + interestAmount,
              interestOnlyPaidAt: new Date(),
              interestOnlyAmount: interestAmount,
              paymentStatus: 'INTEREST_ONLY_PAID',
              isInterestOnly: true,
              principalDeferred: true
            }
          });

          // Create payment record for interest only
          await tx.payment.create({
            data: {
              loanApplicationId: paymentRequest.loanApplicationId,
              emiScheduleId: emi.id,
              customerId: paymentRequest.customerId,
              paymentType: 'INTEREST_ONLY',
              amount: interestAmount,
              principalComponent: 0,
              interestComponent: interestAmount,
              utrNumber: paymentRequest.utrNumber,
              paymentMode: paymentRequest.paymentMethod,
              status: 'COMPLETED',
              verified: true,
              verifiedById: reviewedById,
              verifiedAt: new Date(),
              proofUrl: paymentRequest.proofUrl,
              remarks: 'Interest only payment - Principal deferred to new EMI'
            }
          });

          // Use pre-fetched last EMI for installment number
          const newInstallmentNumber = (lastEMI?.installmentNumber || 0) + 1;
          
          // Create a new EMI for the deferred principal with NEW interest
          const newPrincipal = emi.principalAmount;
          const interestRate = loan.sessionForm?.interestRate || 12;
          const monthlyRate = Number(interestRate) / 100 / 12;
          const newInterest = newPrincipal * monthlyRate;
          const newTotalAmount = newPrincipal + newInterest;

          // New EMI due date: 15 days after current EMI or before next EMI (using pre-fetched nextEMI)
          let newDueDate: Date;
          if (nextEMI) {
            const nextDueDate = new Date(nextEMI.dueDate);
            const currentDueDate = new Date(emi.dueDate);
            const midDate = new Date(currentDueDate.getTime() + (nextDueDate.getTime() - currentDueDate.getTime()) / 2);
            newDueDate = midDate;
          } else {
            newDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
          }

          // Create duplicate EMI with principal + NEW interest
          await tx.eMISchedule.create({
            data: {
              loanApplicationId: paymentRequest.loanApplicationId,
              installmentNumber: newInstallmentNumber,
              dueDate: newDueDate,
              originalDueDate: newDueDate,
              principalAmount: newPrincipal,
              interestAmount: newInterest,
              totalAmount: newTotalAmount,
              outstandingPrincipal: newPrincipal,
              outstandingInterest: newInterest,
              duplicatedEMINumber: emi.installmentNumber,
              originalEMIId: emi.id,
              notes: `Created due to interest-only payment on EMI #${emi.installmentNumber}. Principal + new interest.`
            }
          });

          // Update the loan tenure
          if (loan.sessionForm) {
            await tx.sessionForm.update({
              where: { loanApplicationId: paymentRequest.loanApplicationId },
              data: {
                tenure: (loan.sessionForm.tenure || 0) + 1,
                totalInterest: (loan.sessionForm.totalInterest || 0) + newInterest,
                totalAmount: (loan.sessionForm.totalAmount || 0) + newInterest
              }
            });
          }

          // Notify customer
          await tx.notification.create({
            data: {
              userId: paymentRequest.customerId,
              type: 'PAYMENT_CONFIRMATION',
              title: 'Interest-Only Payment Confirmed',
              message: `Your interest-only payment of ₹${interestAmount.toFixed(2)} is confirmed. A new EMI for ₹${newTotalAmount.toFixed(2)} (principal + new interest) has been added.`
            }
          });
        }

        return updated;
      }, { timeout: 30000 }); // 30 second timeout for complex payment processing

      // ── Customer approval notification ─────────────────────────────
      // Send APPROVED notification for FULL_EMI and PARTIAL_PAYMENT
      if (paymentRequest.paymentType !== 'INTEREST_ONLY') {
        const paidAmtForNotif = paymentRequest.paymentType === 'PARTIAL_PAYMENT'
          ? (paymentRequest.partialAmount || 0)
          : paymentRequest.requestedAmount;
        const typeLabel = paymentRequest.paymentType === 'PARTIAL_PAYMENT' ? 'Partial Payment' : 'EMI Payment';
        await db.notification.create({
          data: {
            userId: paymentRequest.customerId,
            type: 'PAYMENT_CONFIRMATION',
            title: `${typeLabel} Approved ✅`,
            message: `Your payment request ${paymentRequest.requestNumber} of ₹${paidAmtForNotif.toFixed(2)} has been approved. EMI #${emi?.installmentNumber} is now updated.`
          }
        }).catch(e => console.error('[PR Notification] Approval notify failed:', e));
      }

      // ============================================================
      // POST-APPROVAL ACCOUNTING + MIRROR SYNC
      // Runs AFTER the DB transaction — never blocks the approval response.
      //
      // CONTRACT (same as emi/pay/route.ts):
      //  • Original company gets NO accounting entries (customer-payment policy)
      //  • Mirror company gets:
      //      – CashBook credit for mirror interest income
      //      – Double-entry journal (DR Cash, CR Loans Receivable + CR Interest)
      //      – Processing fee on EMI #1 (CashBook + journal + flag guard)
      //  • Mirror EMI + MirrorLoanMapping counters are kept in sync
      //  • Mirror Payment record is created for audit trail
      // ============================================================
      setImmediate(async () => {
        try {
          const loan = paymentRequest.loanApplication;
          if (!loan?.companyId) return;

          const pType   = paymentRequest.paymentType;
          const payMode = (paymentRequest.paymentMethod || 'UPI').toUpperCase();

          // ── Fetch the Payment record just created inside the transaction ───
          // We need its ID for journal entry referenceId (NOT the paymentRequest ID)
          const recentPayment = await db.payment.findFirst({
            where: { emiScheduleId: emi.id, status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
          });
          const paymentId = recentPayment?.id || `PR-${paymentRequest.id}`;

          // ── Check if original loan has a mirror mapping ──────────────────
          const mirrorMapping = await db.mirrorLoanMapping.findFirst({
            where: { originalLoanId: loan.id }
          });

          if (!mirrorMapping || !mirrorMapping.mirrorLoanId) {
            console.log(`[PR Accounting] Skipping — loan ${loan.id} has no mirror mapping.`);
            return;
          }

          const mirrorCompanyId = mirrorMapping.mirrorCompanyId;
          const { AccountingService: AccSvc, ACCOUNT_CODES: AC } = await import('@/lib/accounting-service');
          const accSvc = new AccSvc(mirrorCompanyId);
          await accSvc.initializeChartOfAccounts();

          // ── Helper: ensure CashBook exists ───────────────────────────────
          const getMirrorCashBook = async () => {
            let cb = await db.cashBook.findUnique({ where: { companyId: mirrorCompanyId } });
            if (!cb) cb = await db.cashBook.create({ data: { companyId: mirrorCompanyId, currentBalance: 0 } });
            return cb;
          };

          // ────────────────────────────────────────────────────────────────
          // Get mirror EMI for this installment
          // ────────────────────────────────────────────────────────────────
          const mirrorEmi = await db.eMISchedule.findFirst({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: emi.installmentNumber
            }
          });

          // ============================================================
          // FULL_EMI  ─ same logic as emi/pay/route.ts (lines 1029-1122)
          // ============================================================
          if (pType === 'FULL_EMI') {
            if (mirrorEmi) {
              const mirrorMonthlyRate = (mirrorMapping.mirrorInterestRate || 0) / 12 / 100;
              const mirrorInterest    = Math.round((mirrorEmi.outstandingPrincipal || 0) * mirrorMonthlyRate * 100) / 100;
              const mirrorPrincipal   = Math.min(
                (mirrorEmi.totalAmount || 0) - mirrorInterest,
                mirrorEmi.outstandingPrincipal || 0
              );

              // 1. CashBook credit for mirror interest income
              if (mirrorInterest > 0) {
                const cb       = await getMirrorCashBook();
                const newBal   = cb.currentBalance + mirrorInterest;
                await db.cashBook.update({ where: { id: cb.id }, data: { currentBalance: newBal } });
                await db.cashBookEntry.create({
                  data: {
                    cashBookId:    cb.id,
                    entryType:     'CREDIT',
                    amount:        mirrorInterest,
                    balanceAfter:  newBal,
                    description:   `MIRROR INTEREST INCOME - PR#${paymentRequest.requestNumber} EMI #${emi.installmentNumber}`,
                    referenceType: 'MIRROR_INTEREST_INCOME',
                    referenceId:   paymentId,
                    createdById:   reviewedById
                  }
                });
                console.log(`[PR Accounting] CashBook ✓ mirror interest ₹${mirrorInterest}`);
              }

              // 2. Mark mirror EMI as PAID
              await db.eMISchedule.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'PAID',
                  paidAmount:    mirrorEmi.totalAmount,
                  paidPrincipal: mirrorPrincipal,
                  paidInterest:  mirrorInterest,
                  paidDate:      new Date(),
                  paymentMode:   payMode,
                  notes:         `[MIRROR SYNC via Payment Request] PR#${paymentRequest.requestNumber}`
                }
              });

              // 3. Increment mirror EMI counter on mapping
              await db.mirrorLoanMapping.update({
                where: { id: mirrorMapping.id },
                data: { mirrorEMIsPaid: { increment: 1 } }
              });

              // 4. Create mirror Payment record for audit trail
              await db.payment.create({
                data: {
                  loanApplicationId: mirrorMapping.mirrorLoanId,
                  emiScheduleId:     mirrorEmi.id,
                  customerId:        paymentRequest.customerId,
                  amount:            mirrorEmi.totalAmount,
                  principalComponent: mirrorPrincipal,
                  interestComponent:  mirrorInterest,
                  paymentMode:       payMode,
                  status:            'COMPLETED',
                  receiptNumber:     `RCP-MIRROR-${Date.now()}`,
                  paidById:          reviewedById,
                  remarks:           `Auto-synced via PaymentReq ${paymentRequest.requestNumber}`,
                  paymentType:       'FULL_EMI'
                }
              });

              // 5. Double-entry journal in mirror company (MIRROR amounts, not original!)
              //    DR Cash/Bank → CR Loans Receivable (principal) + CR Interest Income
              await accSvc.recordEMIPayment({
                loanId:             mirrorMapping.mirrorLoanId,
                customerId:         paymentRequest.customerId,
                paymentId,
                totalAmount:        mirrorEmi.totalAmount,
                principalComponent: mirrorPrincipal,
                interestComponent:  mirrorInterest,
                paymentDate:        new Date(),
                paymentMode:        payMode,
                createdById:        reviewedById,
                reference:          `PaymentReq#${paymentRequest.requestNumber} → Mirror EMI #${emi.installmentNumber}`
              });
              console.log(`[PR Accounting] ✓ FULL_EMI journal ₹${mirrorEmi.totalAmount} in mirror company ${mirrorCompanyId}`);

              // 6. Mirror loan closure check
              const allMirrorEmis = await db.eMISchedule.findMany({
                where: { loanApplicationId: mirrorMapping.mirrorLoanId }
              });
              if (allMirrorEmis.every(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID')) {
                await db.loanApplication.update({
                  where: { id: mirrorMapping.mirrorLoanId },
                  data: { status: 'CLOSED' }
                });
                console.log(`[PR Accounting] Mirror loan ${mirrorMapping.mirrorLoanId} CLOSED`);
              }
            }

            // ─────────────────────────────────────────────────────────────
            // PROCESSING FEE on EMI #1 — exact copy of emi/pay/route.ts
            //   Uses mirrorMapping.mirrorProcessingFee (= originalEMI - lastMirrorEMI)
            //   Guards with processingFeeRecorded flag to prevent double-entry
            // ─────────────────────────────────────────────────────────────
            if (emi.installmentNumber === 1 && !mirrorMapping.processingFeeRecorded && (mirrorMapping.mirrorProcessingFee ?? 0) > 0) {
              try {
                const procFee = mirrorMapping.mirrorProcessingFee!;

                // 6a. CashBook credit in mirror company
                const pfCb    = await getMirrorCashBook();
                const pfBal   = pfCb.currentBalance + procFee;
                await db.cashBook.update({ where: { id: pfCb.id }, data: { currentBalance: pfBal } });
                await db.cashBookEntry.create({
                  data: {
                    cashBookId:    pfCb.id,
                    entryType:     'CREDIT',
                    amount:        procFee,
                    balanceAfter:  pfBal,
                    description:   `Processing Fee Income - PR#${paymentRequest.requestNumber} (EMI #1)`,
                    referenceType: 'PROCESSING_FEE',
                    referenceId:   loan.id,
                    createdById:   reviewedById
                  }
                });

                // 6b. DR Cash in Hand (1101) → CR Processing Fee Income (4121)
                await accSvc.createJournalEntry({
                  entryDate:     new Date(),
                  referenceType: 'PROCESSING_FEE_COLLECTION',
                  referenceId:   `${loan.id}-MIR-PF-PR`,
                  narration:     `Processing Fee Income - PR#${paymentRequest.requestNumber} (Mirror EMI #1)`,
                  createdById:   reviewedById,
                  lines: [
                    { accountCode: AC.CASH_IN_HAND,           debitAmount: procFee, creditAmount: 0,        narration: 'Processing fee collected' },
                    { accountCode: AC.PROCESSING_FEE_INCOME,  debitAmount: 0,       creditAmount: procFee,  narration: 'Processing fee income recognised' }
                  ]
                });

                // 6c. Mark flag so we never double-record
                await db.mirrorLoanMapping.update({
                  where: { id: mirrorMapping.id },
                  data: { processingFeeRecorded: true }
                });
                console.log(`[PR Accounting] ✓ Processing fee ₹${procFee} (mirrorProcessingFee) recorded for EMI #1`);
              } catch (pfErr) {
                console.error('[PR Accounting] Processing fee error (non-blocking):', pfErr);
              }
            }
          }

          // ============================================================
          // PARTIAL_PAYMENT  ─ same logic as emi/pay/route.ts (lines 1127-1199)
          // ============================================================
          else if (pType === 'PARTIAL_PAYMENT' && mirrorEmi && mirrorEmi.paymentStatus !== 'PAID') {
            const partialAmt         = paymentRequest.partialAmount || 0;
            const mirrorMonthlyRate  = (mirrorMapping.mirrorInterestRate || 0) / 12 / 100;
            const mirrorInterestFull = Math.round((mirrorEmi.outstandingPrincipal || 0) * mirrorMonthlyRate * 100) / 100;
            const ratio              = partialAmt / (emi.totalAmount || 1);
            const mirrorPartialAmt   = Math.round((mirrorEmi.totalAmount || 0) * ratio * 100) / 100;
            const mirrorPaidInterest = Math.min(mirrorPartialAmt, mirrorInterestFull);
            const mirrorPaidPrincipal = Math.max(0, mirrorPartialAmt - mirrorInterestFull);
            const mirrorIsFullyPaid  = mirrorPartialAmt >= (mirrorEmi.totalAmount || 0) - 1;

            // 1. Update mirror EMI
            await db.eMISchedule.update({
              where: { id: mirrorEmi.id },
              data: {
                paymentStatus:  mirrorIsFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
                paidAmount:     (mirrorEmi.paidAmount    || 0) + mirrorPartialAmt,
                paidPrincipal:  (mirrorEmi.paidPrincipal || 0) + mirrorPaidPrincipal,
                paidInterest:   (mirrorEmi.paidInterest  || 0) + mirrorPaidInterest,
                paidDate:       new Date(),
                paymentMode:    payMode,
                isPartialPayment: !mirrorIsFullyPaid,
                notes: `[MIRROR SYNC Partial] PR#${paymentRequest.requestNumber} (${Math.round(ratio * 100)}%)`
              }
            });

            // 2. CashBook credit for mirror interest portion
            if (mirrorPaidInterest > 0) {
              const cb    = await getMirrorCashBook();
              const newBal = cb.currentBalance + mirrorPaidInterest;
              await db.cashBook.update({ where: { id: cb.id }, data: { currentBalance: newBal } });
              await db.cashBookEntry.create({
                data: {
                  cashBookId:    cb.id,
                  entryType:     'CREDIT',
                  amount:        mirrorPaidInterest,
                  balanceAfter:  newBal,
                  description:   `MIRROR PARTIAL INTEREST - PR#${paymentRequest.requestNumber} EMI #${emi.installmentNumber}`,
                  referenceType: 'MIRROR_INTEREST_INCOME',
                  referenceId:   paymentId,
                  createdById:   reviewedById
                }
              });
            }

            // 3. Double-entry journal with mirror amounts
            await accSvc.recordEMIPayment({
              loanId:             mirrorMapping.mirrorLoanId,
              customerId:         paymentRequest.customerId,
              paymentId:          `${paymentId}-PARTIAL`,
              totalAmount:        mirrorPartialAmt,
              principalComponent: mirrorPaidPrincipal,
              interestComponent:  mirrorPaidInterest,
              paymentDate:        new Date(),
              paymentMode:        payMode,
              createdById:        reviewedById,
              reference:          `PaymentReq#${paymentRequest.requestNumber} → Mirror Partial ${Math.round(ratio * 100)}%`
            });
            console.log(`[PR Accounting] ✓ PARTIAL mirror journal ₹${mirrorPartialAmt} in mirror company`);
          }

          // ============================================================
          // INTEREST_ONLY  ─ same as emi/pay/route.ts interest-only section
          // ============================================================
          else if (pType === 'INTEREST_ONLY' && mirrorEmi) {
            const mirrorMonthlyRate = (mirrorMapping.mirrorInterestRate || 0) / 12 / 100;
            const mirrorInterest    = Math.round((mirrorEmi.outstandingPrincipal || 0) * mirrorMonthlyRate * 100) / 100;

            // 1. Update mirror EMI with interest-only status
            await db.eMISchedule.update({
              where: { id: mirrorEmi.id },
              data: {
                paymentStatus: 'INTEREST_ONLY_PAID',
                paidAmount:    mirrorInterest,
                paidPrincipal: 0,
                paidInterest:  mirrorInterest,
                paidDate:      new Date(),
                paymentMode:   payMode,
                notes:         `[MIRROR SYNC Interest-Only] PR#${paymentRequest.requestNumber}`
              }
            });

            // 2. CashBook credit for mirror interest
            if (mirrorInterest > 0) {
              const cb    = await getMirrorCashBook();
              const newBal = cb.currentBalance + mirrorInterest;
              await db.cashBook.update({ where: { id: cb.id }, data: { currentBalance: newBal } });
              await db.cashBookEntry.create({
                data: {
                  cashBookId:    cb.id,
                  entryType:     'CREDIT',
                  amount:        mirrorInterest,
                  balanceAfter:  newBal,
                  description:   `MIRROR INTEREST (Interest-Only) - PR#${paymentRequest.requestNumber} EMI #${emi.installmentNumber}`,
                  referenceType: 'MIRROR_INTEREST_INCOME',
                  referenceId:   paymentId,
                  createdById:   reviewedById
                }
              });
            }

            // 3. Double-entry journal
            await accSvc.recordEMIPayment({
              loanId:             mirrorMapping.mirrorLoanId,
              customerId:         paymentRequest.customerId,
              paymentId:          `${paymentId}-IO`,
              totalAmount:        mirrorInterest,
              principalComponent: 0,
              interestComponent:  mirrorInterest,
              paymentDate:        new Date(),
              paymentMode:        payMode,
              createdById:        reviewedById,
              reference:          `PaymentReq#${paymentRequest.requestNumber} → Mirror Interest-Only`
            });
            console.log(`[PR Accounting] ✓ INTEREST_ONLY mirror journal ₹${mirrorInterest} in mirror company`);
          }

        } catch (accErr) {
          console.error('[PR Accounting] Error (non-blocking):', accErr);
        }
      });


      return NextResponse.json({ 
        success: true, 
        message: 'Payment request approved successfully',
        paymentRequest: result 
      });
    } 
    else if (action === 'reject') {
      const updated = await db.paymentRequest.update({
        where: { id: paymentRequestId },
        data: {
          status: 'REJECTED',
          reviewedById,
          reviewedAt: new Date(),
          reviewRemarks,
          rejectionReason
        }
      });

      // Notify customer about rejection
      await db.notification.create({
        data: {
          userId: paymentRequest.customerId,
          type: 'PAYMENT_REJECTED',
          title: 'Payment Request Rejected',
          message: `Your payment request ${paymentRequest.requestNumber} has been rejected. Reason: ${rejectionReason || 'Not specified'}`
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Payment request rejected',
        paymentRequest: updated 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing payment request:', error);
    return NextResponse.json({ error: 'Failed to process payment request' }, { status: 500 });
  }
}
