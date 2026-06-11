import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/db-utils';
import { AccountingService } from '@/lib/accounting-service';
import { sendPaymentConfirmationPush } from '@/lib/push-notification-service';
import { notifyEvent } from '@/lib/event-notify';

// Local type definitions - Prisma schema uses strings, not enums
type PaymentType = 'FULL_EMI' | 'PARTIAL_PAYMENT' | 'INTEREST_ONLY';
type PaymentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
      proofFileName,
      originalLoanId  // Set when customer is viewing a mirror loan but paying original EMI amounts
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
      // The user requested unlimited interest-only payments, so we bypass the restriction check here.
      // Previously, this restricted to settings?.maxInterestOnlyPerLoan (which was 3) or a fallback.
      console.log('Bypassing max interest-only limit for unlimited payments.');
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

    // Notify SUPER_ADMIN + CASHIER that customer submitted a payment request
    notifyEvent({
      event: 'PAYMENT_REQUEST',
      title: '💰 Customer Payment Submitted',
      body: `${paymentRequest.loanApplication?.customer?.name || 'Customer'} submitted ${paymentType} of ₹${requestedAmount.toLocaleString('en-IN')}`,
      data: { paymentRequestId: paymentRequest.id, requestNumber, type: 'PAYMENT_REQUEST', actionUrl: '/cashier/payments' },
      actionUrl: '/cashier/payments',
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
          include: {
            sessionForm: true,
            customer: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    if (paymentRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment request already processed' }, { status: 400 });
    }

    // Determine if this is a mirror-based payment:
    // Case A: loanApplicationId IS the mirror loan (customer viewed mirror, paid original EMI amounts)
    //         → find mirror mapping where mirrorLoanId = loanApplicationId
    // Case B: loanApplicationId IS the original loan
    //         → find mirror mapping where originalLoanId = loanApplicationId

    if (action === 'approve') {
      const emi = paymentRequest.emiSchedule;
      const loan = paymentRequest.loanApplication;

      // Ensure EMI exists
      if (!emi) {
        return NextResponse.json({ error: 'EMI schedule not found for this payment request' }, { status: 400 });
      }

      // Pre-fetch mirror mapping — needed for Phase 1 IO rolling EMI and INTEREST_ONLY deferred EMI
      let ioMirrorMapping: any = null;
      // TIMING FIX: Pre-fetch mirror EMI interest BEFORE the transaction.
      // After the transaction, mirrorEmi.paidInterest = interestAmount (already updated),
      // so we must capture the correct interest value NOW before the TX modifies it.
      let preTxMirrorInterest: number = 0;
      let preTxMirrorPrincipal: number = 0;
      let preTxMirrorTotal: number = 0;
      if (paymentRequest.paymentType === 'INTEREST_ONLY' || 
          (paymentRequest.paymentType === 'FULL_EMI' && paymentRequest.emiSchedule?.isInterestOnly)) {
        // Fetch mapping without isOfflineLoan filter to handle all mapping types
        ioMirrorMapping = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: emi.loanApplicationId }
        });
        // Pre-fetch the mirror EMI at the current installment number BEFORE the transaction
        // marks it as INTEREST_ONLY_PAID and updates paidInterest.
        if (ioMirrorMapping?.mirrorLoanId && paymentRequest.paymentType === 'INTEREST_ONLY') {
          const preTxMirrorEmi = await db.eMISchedule.findFirst({
            where: {
              loanApplicationId: ioMirrorMapping.mirrorLoanId,
              installmentNumber: emi.installmentNumber
            }
          });
          if (preTxMirrorEmi) {
            const storedInterest = Number(preTxMirrorEmi.interestAmount || 0);
            const alreadyPaid    = Number(preTxMirrorEmi.paidInterest  || 0);
            let remainingInterest = Math.max(0, storedInterest - alreadyPaid);

            // FALLBACK: If stored interestAmount is null/0 (broken deferred chain),
            // recalculate from mirrorInterestRate × outstandingPrincipal
            if (remainingInterest <= 0 && ioMirrorMapping.mirrorInterestRate) {
              const outstanding = Number(preTxMirrorEmi.outstandingPrincipal || preTxMirrorEmi.principalAmount || 0);
              const monthlyRate = Number(ioMirrorMapping.mirrorInterestRate) / 100 / 12;
              if (outstanding > 0 && monthlyRate > 0) {
                remainingInterest = Math.round(outstanding * monthlyRate * 100) / 100;
                console.log(`[PR IO Pre-TX] interestAmount was null/0 — recalculated from rate: ₹${remainingInterest} (outstanding=₹${outstanding} rate=${monthlyRate})`);
              }
            }

            preTxMirrorInterest  = remainingInterest;
            preTxMirrorPrincipal = Math.max(0, Number(preTxMirrorEmi.principalAmount || 0) - Number(preTxMirrorEmi.paidPrincipal || 0));
            preTxMirrorTotal     = Math.round((preTxMirrorInterest + preTxMirrorPrincipal) * 100) / 100;
            console.log(`[PR IO Pre-TX] Mirror EMI #${emi.installmentNumber}: I=₹${preTxMirrorInterest} P=₹${preTxMirrorPrincipal} T=₹${preTxMirrorTotal} storedInterest=₹${storedInterest}`);
          }
        }
      }

      // Start transaction for approval process with extended timeout
      const result = await withRetry(() => db.$transaction(async (tx) => {
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
          // When a partially-paid EMI is settled, only the remaining amounts are being paid now.
          // emi.paidInterest / emi.paidPrincipal track what was already collected in partial(s).
          const alreadyPaidInterest  = emi.paidInterest  || 0;
          const alreadyPaidPrincipal = emi.paidPrincipal || 0;
          const remainingInterest    = Math.max(0, emi.interestAmount  - alreadyPaidInterest);
          const remainingPrincipal   = Math.max(0, emi.principalAmount - alreadyPaidPrincipal);

          const newEmiStatus = 'PAID';

          // Mark EMI as fully paid
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paidAmount: emi.totalAmount,
              paidPrincipal: emi.principalAmount,
              paidInterest: emi.interestAmount,
              paymentStatus: newEmiStatus,
              paidDate: new Date(),
              paymentMode: paymentRequest.paymentMethod,
              utrNumber: paymentRequest.utrNumber,
              proofUrl: paymentRequest.proofUrl
            }
          });

          // ============ PHASE 1 ROLLING EMI LOGIC ============
          const isPhase1IO = loan.status === 'ACTIVE_INTEREST_ONLY' && emi.isInterestOnly;
          if (isPhase1IO && newEmiStatus === 'PAID') {
            console.log(`[PR Pay] Phase 1 IO Payment - Creating next rolling EMI`);
            const nextInstNum = emi.installmentNumber + 1;
            const nextDue = new Date(emi.dueDate);
            nextDue.setMonth(nextDue.getMonth() + 1);
            
            const existingNextEMI = await tx.eMISchedule.findFirst({
              where: { loanApplicationId: loan.id, installmentNumber: nextInstNum }
            });
            
            if (!existingNextEMI) {
              await tx.eMISchedule.create({
                data: {
                  loanApplicationId: loan.id,
                  installmentNumber: nextInstNum,
                  dueDate: nextDue,
                  originalDueDate: nextDue,
                  principalAmount: 0,
                  interestAmount: emi.interestAmount,
                  totalAmount: emi.interestAmount,
                  outstandingPrincipal: emi.outstandingPrincipal,
                  outstandingInterest: emi.interestAmount,
                  paymentStatus: 'PENDING',
                  isInterestOnly: true,
                  interestOnlyAmount: emi.interestAmount,
                }
              });
            }
            
            if (ioMirrorMapping?.mirrorLoanId) {
              const existingMirrorNextEMI = await tx.eMISchedule.findFirst({
                where: { loanApplicationId: ioMirrorMapping.mirrorLoanId, installmentNumber: nextInstNum }
              });
              if (!existingMirrorNextEMI) {
                const curMirrorEMI = await tx.eMISchedule.findFirst({
                  where: { loanApplicationId: ioMirrorMapping.mirrorLoanId, installmentNumber: emi.installmentNumber }
                });
                if (curMirrorEMI) {
                  await tx.eMISchedule.create({
                    data: {
                      loanApplicationId: ioMirrorMapping.mirrorLoanId,
                      installmentNumber: nextInstNum,
                      dueDate: nextDue,
                      originalDueDate: nextDue,
                      principalAmount: 0,
                      interestAmount: curMirrorEMI.interestAmount,
                      totalAmount: curMirrorEMI.interestAmount,
                      outstandingPrincipal: curMirrorEMI.outstandingPrincipal,
                      outstandingInterest: curMirrorEMI.interestAmount,
                      paymentStatus: 'PENDING',
                      isInterestOnly: true,
                      interestOnlyAmount: curMirrorEMI.interestAmount,
                    }
                  });
                }
              }
            }
          }

          // Create payment record — only for what's actually being paid now, not the full EMI again
          await tx.payment.create({
            data: {
              loanApplicationId: paymentRequest.loanApplicationId,
              emiScheduleId: emi.id,
              customerId: paymentRequest.customerId,
              paymentType: 'FULL_EMI',
              amount: paymentRequest.requestedAmount,
              principalComponent: remainingPrincipal,
              interestComponent: remainingInterest,
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
          // Business rule: interest is collected before principal on any partial payment.
          // IMPORTANT: subtract already-paid interest (from a previous partial) so interest
          // is NEVER charged more than once across multiple partial payments on the same EMI.
          const interestAlreadyPaid = emi.paidInterest || 0;
          const remainingInterest   = Math.max(0, emi.interestAmount - interestAlreadyPaid);
          let paidPrincipal: number;
          let paidInterest: number;
          if (partialAmount <= remainingInterest) {
            paidInterest  = partialAmount;
            paidPrincipal = 0;
          } else {
            paidInterest  = remainingInterest;
            paidPrincipal = Math.round((partialAmount - remainingInterest) * 100) / 100;
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
          const requestedAmt = paymentRequest.requestedAmount || 0;
          // For original loan schedule update, use original EMI interest
          const remainingInterestIO = (emi.interestAmount || 0) - (emi.paidInterest || 0);
          const interestToCollect   = Math.max(0, remainingInterestIO);
          
          // Mark current EMI as interest-only paid, principal deferred
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paidAmount: (emi.paidAmount || 0) + interestToCollect,
              paidInterest: (emi.paidInterest || 0) + interestToCollect,
              interestOnlyPaidAt: new Date(),
              interestOnlyAmount: interestToCollect,
              paymentStatus: 'INTEREST_ONLY_PAID',
              isInterestOnly: true,
              principalDeferred: true
            }
          });

          // Create payment record for interest only using actual collected amount
          await tx.payment.create({
            data: {
              loanApplicationId: paymentRequest.loanApplicationId,
              emiScheduleId: emi.id,
              customerId: paymentRequest.customerId,
              paymentType: 'INTEREST_ONLY',
              amount: requestedAmt,
              principalComponent: 0,
              interestComponent: requestedAmt,
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

          // Notify customer (inside tx so it's atomic with the rest)
          await tx.notification.create({
            data: {
              userId: paymentRequest.customerId,
              type: 'PAYMENT_CONFIRMATION',
              title: 'Interest-Only Payment Confirmed',
              message: `Your interest payment of ₹${requestedAmt.toFixed(2)} is confirmed. A new EMI (principal + same interest) will be added to your schedule.`
            }
          });
          // ============ NEW INTEREST ONLY PAYMENT LOGIC ============
          try {
            const loanId = emi.loanApplicationId;
            const firstPendingEmi = await tx.eMISchedule.findFirst({
              where: { loanApplicationId: loanId, paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] } },
              orderBy: { installmentNumber: 'asc' },
              select: { dueDate: true }
            });
            const dueDateDay = firstPendingEmi?.dueDate?.getDate() || new Date(emi.dueDate).getDate() || 15;
            const newEmiDueDate = new Date(emi.dueDate);
            newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
            newEmiDueDate.setDate(dueDateDay);

            const subsequentEmis = await tx.eMISchedule.findMany({
              where: { loanApplicationId: loanId, installmentNumber: { gt: emi.installmentNumber } },
              orderBy: { installmentNumber: 'desc' }
            });
            for (const sub of subsequentEmis) {
              const shifted = new Date(sub.dueDate);
              shifted.setMonth(shifted.getMonth() + 1);
              shifted.setDate(dueDateDay);
              await tx.eMISchedule.update({
                where: { id: sub.id },
                data: { installmentNumber: sub.installmentNumber + 1, dueDate: shifted, originalDueDate: sub.originalDueDate || sub.dueDate }
              });
            }

            const deferredPrincipal = Math.max(0, Number(emi.principalAmount || 0) - Number(emi.paidPrincipal || 0));
            const deferredInterest  = Number(emi.interestAmount  || 0);
            await tx.eMISchedule.create({
              data: {
                loanApplicationId: loanId, installmentNumber: emi.installmentNumber + 1, dueDate: newEmiDueDate, originalDueDate: newEmiDueDate,
                principalAmount: deferredPrincipal, interestAmount: Math.round(deferredInterest * 100) / 100, totalAmount: Math.round((deferredPrincipal + deferredInterest) * 100) / 100,
                outstandingPrincipal: deferredPrincipal, outstandingInterest: Math.round(deferredInterest * 100) / 100,
                paymentStatus: 'PENDING', principalDeferred: true, originalEMIId: emi.id, duplicatedEMINumber: emi.installmentNumber,
                notes: `Deferred from Interest-Only on EMI #${emi.installmentNumber}. P:₹${deferredPrincipal}+I:₹${Math.round(deferredInterest*100)/100}. Due:${newEmiDueDate.toISOString().split('T')[0]}`
              }
            });

            const sf = loan.sessionForm;
            if (sf) {
              await tx.sessionForm.update({
                where: { loanApplicationId: loanId },
                data: { tenure: (sf.tenure || 0) + 1, totalInterest: (sf.totalInterest || 0) + deferredInterest, totalAmount: (sf.totalAmount || 0) + deferredInterest }
              });
            }

            if (ioMirrorMapping) {
              await tx.mirrorLoanMapping.update({
                where: { id: ioMirrorMapping.id },
                data: { mirrorTenure: ioMirrorMapping.mirrorTenure + 1 }
              });
            }

            if (ioMirrorMapping?.mirrorLoanId) {
              const mirrorLoanId = ioMirrorMapping.mirrorLoanId;
              const mirrorEMI = await tx.eMISchedule.findFirst({
                where: { loanApplicationId: mirrorLoanId, installmentNumber: emi.installmentNumber }
              });
              if (mirrorEMI) {
                let mInterest = Number(mirrorEMI.interestAmount || 0);
                // CRITICAL FIX: If stored interestAmount is null/0 (broken deferred chain),
                // recalculate from mirrorInterestRate × outstandingPrincipal.
                // This prevents null/0 from propagating to future deferred EMIs.
                if (mInterest <= 0 && ioMirrorMapping.mirrorInterestRate) {
                  const outstanding = Number(mirrorEMI.outstandingPrincipal || mirrorEMI.principalAmount || 0);
                  const monthlyRate = Number(ioMirrorMapping.mirrorInterestRate) / 100 / 12;
                  if (outstanding > 0 && monthlyRate > 0) {
                    mInterest = Math.round(outstanding * monthlyRate * 100) / 100;
                    console.log(`[PR IO TX] mirrorEMI.interestAmount null/0 — recalculated mInterest=₹${mInterest} from rate`);
                    // Also fix this EMI's stored interestAmount so it's correct going forward
                    await tx.eMISchedule.update({
                      where: { id: mirrorEMI.id },
                      data: { interestAmount: mInterest, totalAmount: Math.round((outstanding + mInterest) * 100) / 100 }
                    });
                  }
                }
                const mRemainingInterest = Math.max(0, mInterest - Number(mirrorEMI.paidInterest || 0));
                const mRemainingPrincipal = Math.max(0, Number(mirrorEMI.principalAmount || 0) - Number(mirrorEMI.paidPrincipal || 0));

                await tx.eMISchedule.update({
                  where: { id: mirrorEMI.id },
                  data: {
                    paymentStatus: 'INTEREST_ONLY_PAID', 
                    paidAmount: (mirrorEMI.paidAmount || 0) + mRemainingInterest,
                    paidPrincipal: mirrorEMI.paidPrincipal || 0, 
                    paidInterest: (mirrorEMI.paidInterest || 0) + mRemainingInterest, 
                    paidDate: new Date(), isInterestOnly: true, principalDeferred: true,
                    notes: `Interest only synced from PR ${paymentRequest.requestNumber}`
                  }
                });

                const firstPendingMirror = await tx.eMISchedule.findFirst({
                  where: { loanApplicationId: mirrorLoanId, paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] } },
                  orderBy: { installmentNumber: 'asc' }, select: { dueDate: true }
                });
                const mirrorDay = firstPendingMirror?.dueDate?.getDate() || new Date(mirrorEMI.dueDate).getDate() || dueDateDay;

                const subsequentMirrorEmis = await tx.eMISchedule.findMany({
                  where: { loanApplicationId: mirrorLoanId, installmentNumber: { gt: mirrorEMI.installmentNumber } },
                  orderBy: { installmentNumber: 'desc' }
                });
                for (const sub of subsequentMirrorEmis) {
                  const shifted = new Date(sub.dueDate);
                  shifted.setMonth(shifted.getMonth() + 1);
                  shifted.setDate(mirrorDay);
                  await tx.eMISchedule.update({
                    where: { id: sub.id },
                    data: { installmentNumber: sub.installmentNumber + 1, dueDate: shifted, originalDueDate: sub.originalDueDate || sub.dueDate }
                  });
                }

                const newMirrorDueDate = new Date(mirrorEMI.dueDate);
                newMirrorDueDate.setMonth(newMirrorDueDate.getMonth() + 1);
                newMirrorDueDate.setDate(mirrorDay);
                await tx.eMISchedule.create({
                  data: {
                    loanApplicationId: mirrorLoanId, installmentNumber: mirrorEMI.installmentNumber + 1,
                    dueDate: newMirrorDueDate, originalDueDate: newMirrorDueDate,
                    principalAmount: mRemainingPrincipal, interestAmount: Math.round(mInterest * 100) / 100,
                    totalAmount: Math.round((mRemainingPrincipal + mInterest) * 100) / 100,
                    outstandingPrincipal: mRemainingPrincipal, outstandingInterest: Math.round(mInterest * 100) / 100,
                    paymentStatus: 'PENDING', principalDeferred: true,
                    originalEMIId: mirrorEMI.id, duplicatedEMINumber: mirrorEMI.installmentNumber,
                    notes: `Mirror deferred EMI from Interest-Only PR ${paymentRequest.requestNumber}`
                  }
                });
              }
            }
          } catch (ioErr) {
            console.error('[PR IO] ❌ INTEREST_ONLY post-transaction failed (non-blocking):', ioErr);
          }
        }

        return updated;
      }, { timeout: 30000 })); // 30 second timeout for complex payment processing

      // ============ AUTO-CLOSE AFTER APPROVAL ============
      // CRITICAL: Phase 1 ACTIVE_INTEREST_ONLY loans MUST NEVER auto-close on payment approval.
      // They only close when cashier explicitly clicks "Close Loan" after Phase 2 Start Loan.
      // This matches the exact same logic in offline loan interest-only payments.
      if (paymentRequest.loanApplication.status !== 'ACTIVE_INTEREST_ONLY') {
        const allEMIsCheck = await db.eMISchedule.findMany({
          where: { loanApplicationId: paymentRequest.loanApplicationId },
          select: { id: true, paymentStatus: true }
        });
        const allPaidCheck = allEMIsCheck.length > 0 && allEMIsCheck.every(e =>
          e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID' || e.paymentStatus === 'WAIVED'
        );
        if (allPaidCheck) {
          await db.loanApplication.update({
            where: { id: paymentRequest.loanApplicationId },
            data: { status: 'CLOSED' }
          });
          console.log(`[PR Auto-Close] ✅ Loan ${paymentRequest.loanApplicationId} auto-closed after all EMIs paid`);
          // Mirror auto-close
          if (ioMirrorMapping?.mirrorLoanId) {
            const mirrorEmisCheck = await db.eMISchedule.findMany({
              where: { loanApplicationId: ioMirrorMapping.mirrorLoanId },
              select: { paymentStatus: true }
            });
            const mirrorAllPaid = mirrorEmisCheck.length === 0 || mirrorEmisCheck.every(e =>
              e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID' || e.paymentStatus === 'WAIVED'
            );
            if (mirrorAllPaid) {
              await db.loanApplication.update({
                where: { id: ioMirrorMapping.mirrorLoanId }, data: { status: 'CLOSED' }
              });
              console.log(`[PR Auto-Close] ✅ Mirror loan also auto-closed`);
            }
          }
        }
      } else {
        console.log(`[PR Auto-Close] ⏭️ Skipping auto-close — loan is ACTIVE_INTEREST_ONLY (Phase 1)`);
      }

      // ── Compute notification values FIRST (used in credit block below) ──
      const paidAmtForNotif = paymentRequest.paymentType === 'PARTIAL_PAYMENT'
        ? (paymentRequest.partialAmount || 0)
        : paymentRequest.requestedAmount;
      const typeLabels: Record<string, string> = {
        FULL_EMI: 'EMI Payment',
        PARTIAL_PAYMENT: 'Partial Payment',
        INTEREST_ONLY: 'Interest Payment',
      };
      const typeLabel = typeLabels[paymentRequest.paymentType] || 'Payment';
      const appNo = paymentRequest.loanApplication?.applicationNo || '';

      // ── Detect extra EMI (EMI# > mirrorTenure) ─────────────────────────
      let isExtraEmi = false;
      try {
        const mirrorForExtra = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: paymentRequest.loanApplicationId },
          select: { mirrorTenure: true }
        });
        if (mirrorForExtra && emi && emi.installmentNumber > mirrorForExtra.mirrorTenure) {
          isExtraEmi = true;
        }
      } catch (_) { /* non-critical */ }

      // ── Credit increment for cashier who approved ────────────────────
      // Customer pays via UPI/bank directly → reviewer gets PERSONAL credit
      try {
        const reviewerUser = await db.user.findUnique({
          where: { id: reviewedById },
          select: { personalCredit: true, companyCredit: true, credit: true }
        });
        if (reviewerUser) {
          const newPersonal = (reviewerUser.personalCredit || 0) + paidAmtForNotif;
          const newTotal    = (reviewerUser.credit         || 0) + paidAmtForNotif;
          await db.user.update({
            where: { id: reviewedById },
            data: { personalCredit: newPersonal, credit: newTotal }
          });
          await db.creditTransaction.create({ data: {
            // @ts-ignore
            userId:               reviewedById,
            transactionType:      'PERSONAL_COLLECTION',
            amount:               paidAmtForNotif,
            paymentMode:          'UPI',
            creditType:           'PERSONAL',
            sourceType:           'EMI_PAYMENT',
            balanceAfter:         newTotal,
            personalBalanceAfter: newPersonal,
            companyBalanceAfter:  reviewerUser.companyCredit || 0,
            loanApplicationId:    paymentRequest.loanApplicationId,
            emiScheduleId:        emi?.id,
            installmentNumber:    emi?.installmentNumber,
            description:          `PR#${paymentRequest.requestNumber} approved — ${isExtraEmi ? '⭐ Extra EMI' : typeLabel} ₹${paidAmtForNotif.toFixed(2)} for ${appNo}`,
            transactionDate:      new Date()
          }});
          console.log(`[PR Credit] +₹${paidAmtForNotif} personal credit → reviewer ${reviewedById}`);
        }
      } catch (creditErr) {
        console.error('[PR Credit] Credit increment failed (non-critical):', creditErr);
      }

      // ── Customer approval notification (in-app + push) ──────────────

      const notifTitle = isExtraEmi
        ? `⭐ Extra EMI Approved ✅`
        : `${typeLabel} Approved ✅`;
      const notifMessage = isExtraEmi
        ? `Your Extra EMI payment of ₹${paidAmtForNotif.toFixed(2)} for loan ${appNo} (EMI #${emi?.installmentNumber}) has been approved. This is a bonus EMI payment. 🎉`
        : `Your payment of ₹${paidAmtForNotif.toFixed(2)} for loan ${appNo} (EMI #${emi?.installmentNumber}) has been approved by cashier.`;

      // 1. In-app DB notification
      await db.notification.create({
        data: {
          userId: paymentRequest.customerId,
          type: 'PAYMENT_CONFIRMATION',
          title: notifTitle,
          message: notifMessage
        }
      }).catch(e => console.error('[PR Notification] In-app notify failed:', e));

      // Notify SUPER_ADMIN that a payment was approved
      notifyEvent({
        event: 'PAYMENT_REQUEST',
        title: `✅ Payment Approved — ₹${paidAmtForNotif.toFixed(2)}`,
        body: `${typeLabel} approved for loan ${appNo} EMI #${emi?.installmentNumber}`,
        data: { loanId: paymentRequest.loanApplicationId, type: 'PAYMENT_REQUEST', actionUrl: '/?section=paymentRequests' },
        actionUrl: '/?section=paymentRequests',
      });

      // FCM Push notification to customer phone
      sendPaymentConfirmationPush(paymentRequest.customerId, {
        amount: paidAmtForNotif,
        paymentId: paymentRequest.id,
        loanId: paymentRequest.loanApplicationId,
        applicationNo: appNo,
      }).catch(e => console.error('[PR Notification] Push notify failed:', e));

      // ============================================================
      // POST-APPROVAL ACCOUNTING + MIRROR SYNC  (SYNCHRONOUS — awaited)
      // Runs BEFORE the response so entries are GUARANTEED in the DB.
      //
      // CONTRACT (same as emi/pay/route.ts + simple-accounting.ts):
      //  • Customer ALWAYS pays via bank/UPI → BANK_ACCOUNT (1102) always
      //  • Original company gets NO entries (customer-payment policy)
      //  • Mirror company gets:
      //      – Bank transaction (Day Book) credit
      //      – Double-entry journal DR Bank 1102, CR Loans Receivable + CR Interest
      //      – Processing fee on EMI #1 (Bank + journal + processingFeeRecorded flag)
      //  • Mirror EMI + MirrorLoanMapping counters kept in sync
      //  • Mirror Payment record created for audit trail
      // ============================================================
      try {
        const loan = paymentRequest.loanApplication;

        if (loan?.companyId) {
          const pType   = paymentRequest.paymentType;
          // Customer always pays online (UPI/bank transfer) — always BANK
          const payMode: string = 'UPI';

          // ── Fetch the Payment record just created inside the transaction ───
          // CRITICAL: read principalComponent + interestComponent from the Payment
          // record we just saved — they correctly reflect remainingInterest for partial
          // payments (interest-first logic, never double-charged).
          const recentPayment = await db.payment.findFirst({
            where: { emiScheduleId: emi.id, status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            select: { id: true, principalComponent: true, interestComponent: true, amount: true }
          });
          const paymentId         = recentPayment?.id || `PR-${paymentRequest.id}`;
          // Use actual saved components — these are ALWAYS correct even for 2nd partial
          const savedTotalComp    = Number(recentPayment?.amount             ?? paymentRequest.requestedAmount ?? 0);
          const savedInterestComp = Number(recentPayment?.interestComponent  ?? 0);
          const savedPrincipalComp= Number(recentPayment?.principalComponent ?? 0);

          // ── Check mirror mapping (as original) ──────────────────────────
          const mirrorMapping = await db.mirrorLoanMapping.findFirst({
            where: { originalLoanId: loan.id }
          });

          console.log(`[PR Accounting] loanId=${loan.id} mirrorMapping=${mirrorMapping?.id ?? 'null'} mirrorLoanId=${mirrorMapping?.mirrorLoanId ?? 'null'} isOffline=${mirrorMapping?.isOfflineLoan}`);

          if (!mirrorMapping) {
            // Loan is NOT the original in any mirror relationship.
            // Sub-cases:
            //   A) loan.id IS a mirror loan → account in mirror company using mirror EMI P+I
            //   C) Truly standalone → account in original company using original P+I
            try {
              const { AccountingService: AccSvc } = await import('@/lib/accounting-service');
              const { recordBankTransaction } = await import('@/lib/simple-accounting');
              const payMode: string = 'UPI';
              const pType = paymentRequest.paymentType;

              // Check if THIS loan is itself a mirror
              const selfAsMirror = await db.mirrorLoanMapping.findFirst({ where: { mirrorLoanId: loan.id } });

              if (selfAsMirror) {
                // ── CASE A: Loan IS a mirror — use MIRROR EMI amounts ──────
                console.log(`[PR Accounting] CASE A: ${loan.id} IS mirror → company ${loan.companyId} with MIRROR P+I`);
                const accSvc = new AccSvc(loan.companyId);
                await accSvc.initializeChartOfAccounts();

                // Fetch this mirror loan's own EMI for correct P+I (mirror rate, not original)
                const mirrorOwnEmi = await db.eMISchedule.findFirst({
                  where: { loanApplicationId: loan.id, installmentNumber: emi.installmentNumber }
                });
                const mP = Number(mirrorOwnEmi?.principalAmount ?? emi.principalAmount);
                const mI = Number(mirrorOwnEmi?.interestAmount  ?? emi.interestAmount);
                const mT = Number(mirrorOwnEmi?.totalAmount     ?? (mP + mI));

                // On-demand interest accrual for CASE A mirror EMI
                let isMirrorOwnEmiAccrued = mirrorOwnEmi?.interestAccrued || false;
                if (mirrorOwnEmi && !isMirrorOwnEmiAccrued && mI > 0) {
                  try {
                    await accSvc.recordInterestAccrual({
                      loanId: loan.id,
                      customerId: paymentRequest.customerId,
                      customerName: loan.customer?.name || 'Customer',
                      emiId: mirrorOwnEmi.id,
                      interestAmount: mI,
                      accrualDate: new Date(), // use payment date so accrual sorts before payment in ledger
                      createdById: reviewedById
                    });
                    await db.eMISchedule.update({
                      where: { id: mirrorOwnEmi.id },
                      data: { interestAccrued: true, accruedAt: new Date() }
                    });
                    isMirrorOwnEmiAccrued = true;
                    console.log(`[PR Accounting CASE A] Auto-accrued mirror interest of ₹${mI} on-demand`);
                  } catch (accErr) {
                    console.error('[PR Accounting CASE A] Failed to auto-accrue mirror interest:', accErr);
                  }
                }

                // ALL payment types use MIRROR EMI stored amounts — never original loan data
                let mTotal: number;
                let mInterest: number;
                let mPrincipal: number;

                if (pType === 'PARTIAL_PAYMENT') {
                  // Interest-first on MIRROR EMI, subtract already-paid mirror interest (no double)
                  const partialAmt = paymentRequest.partialAmount || 0;
                  const mirrorInterestAlreadyPaid = Number(mirrorOwnEmi?.paidInterest || 0);
                  const mirrorRemainingInterest   = Math.max(0, mI - mirrorInterestAlreadyPaid);
                  if (partialAmt <= mirrorRemainingInterest) {
                    mInterest  = partialAmt;
                    mPrincipal = 0;
                  } else {
                    mInterest  = mirrorRemainingInterest;
                    mPrincipal = Math.round((partialAmt - mirrorRemainingInterest) * 100) / 100;
                  }
                  mTotal = partialAmt;
                } else if (pType === 'INTEREST_ONLY') {
                  // TIMING FIX: mirrorOwnEmi is fetched AFTER the TX which already set
                  // paidInterest = interestAmount. Use emi.paidInterest (pre-TX, from
                  // paymentRequest.emiSchedule fetched before the transaction).
                  const preTxPaidInterest       = Number(emi.paidInterest || 0);
                  const mirrorRemainingInterest  = Math.max(0, mI - preTxPaidInterest);
                  // Layer 2: if stored mI is also 0/null, use mirrorInterestRate × outstanding
                  let finalInterest = mirrorRemainingInterest;
                  if (finalInterest <= 0 && selfAsMirror?.mirrorInterestRate) {
                    const outstanding  = Number(mirrorOwnEmi?.outstandingPrincipal || mirrorOwnEmi?.principalAmount || emi.outstandingPrincipal || 0);
                    const monthlyRate  = Number(selfAsMirror.mirrorInterestRate) / 100 / 12;
                    if (outstanding > 0 && monthlyRate > 0) {
                      finalInterest = Math.round(outstanding * monthlyRate * 100) / 100;
                      console.log(`[PR Accounting CASE A] fallback rate-calc: ₹${finalInterest} (outstanding=₹${outstanding})`);
                    }
                  }
                  console.log(`[PR Accounting CASE A IO] preTxPaid=₹${preTxPaidInterest} mI=₹${mI} final=₹${finalInterest}`);
                  mTotal    = finalInterest;
                  mInterest = finalInterest;
                  mPrincipal= 0;
                } else {
                  // FULL_EMI — TIMING FIX: use emi.paidInterest/paidPrincipal (pre-TX)
                  mInterest  = Math.max(0, mI - Number(emi.paidInterest  || 0));
                  mPrincipal = Math.max(0, mP - Number(emi.paidPrincipal || 0));
                  mTotal     = Math.round((mInterest + mPrincipal) * 100) / 100;
                }

                await recordBankTransaction({
                  companyId: loan.companyId, transactionType: 'CREDIT', amount: mTotal,
                  description: `EMI RECEIPT (UPI) - Orig:${selfAsMirror.originalLoanId} [${loan.customer?.name || 'Customer'}] EMI #${emi.installmentNumber} [Mirror P:₹${mP}+I:₹${mI}]`,
                  referenceType: 'MIRROR_EMI_PAYMENT', referenceId: paymentId, createdById: reviewedById
                });
                await accSvc.recordEMIPayment({
                  loanId: loan.id, customerId: paymentRequest.customerId, paymentId,
                  totalAmount: mTotal, principalComponent: mPrincipal, interestComponent: mInterest,
                  paymentDate: new Date(), paymentMode: payMode, createdById: reviewedById,
                  reference: `PR#${paymentRequest.requestNumber} Mirror EMI #${emi.installmentNumber}`,
                  isInterestAccrued: isMirrorOwnEmiAccrued
                });
                // Mark mirror's own EMI — use additive logic for PARTIAL/FULL
                if (mirrorOwnEmi && pType !== 'INTEREST_ONLY') {
                  const isPartial = pType === 'PARTIAL_PAYMENT';
                  await db.eMISchedule.update({ where: { id: mirrorOwnEmi.id }, data: {
                    paymentStatus: isPartial ? 'PARTIALLY_PAID' : 'PAID',
                    // Use increment for all cases so we don't wipe out previous partial payments
                    paidAmount:    { increment: mTotal },
                    paidPrincipal: { increment: mPrincipal },
                    paidInterest:  { increment: mInterest },
                    paidDate: new Date(), paymentMode: payMode, notes: `[PR SYNC] ${paymentRequest.requestNumber}`
                  }});
                  await db.mirrorLoanMapping.update({ where: { id: selfAsMirror.id }, data: { mirrorEMIsPaid: { increment: 1 } } });
                }
                // Processing fee on EMI #1
                if (emi.installmentNumber === 1 && !selfAsMirror.processingFeeRecorded) {
                  try {
                    const { ACCOUNT_CODES: AC } = await import('@/lib/accounting-service');
                    const regularEMI = loan.sessionForm?.emiAmount ?? emi.totalAmount ?? 0;
                    const procFee = Math.max(0, Math.round((regularEMI - mT) * 100) / 100) || (selfAsMirror.mirrorProcessingFee ?? 0);
                    if (procFee > 0) {
                      await recordBankTransaction({ companyId: loan.companyId, transactionType: 'CREDIT', amount: procFee,
                        description: `Processing Fee (UPI) EMI#1 - Orig:${selfAsMirror.originalLoanId}`,
                        referenceType: 'PROCESSING_FEE', referenceId: `${loan.id}-PF-PR`, createdById: reviewedById });
                      await accSvc.createJournalEntry({ entryDate: new Date(), referenceType: 'PROCESSING_FEE_COLLECTION',
                        referenceId: loan.id, narration: `Mirror Processing Fee EMI#1 ₹${procFee}`,
                        createdById: reviewedById, isAutoEntry: true, lines: [
                          { accountCode: AC.BANK_ACCOUNT,              debitAmount: procFee, creditAmount: 0,       narration: 'Processing fee bank' },
                          { accountCode: AC.PROCESSING_FEE_RECEIVABLE, debitAmount: 0,       creditAmount: procFee, loanId: loan.id, customerId: paymentRequest.customerId, narration: 'Processing fee receivable cleared' }
                        ]});
                      await db.mirrorLoanMapping.update({ where: { id: selfAsMirror.id }, data: { processingFeeRecorded: true, mirrorProcessingFee: procFee } });
                    } else {
                      await db.mirrorLoanMapping.update({ where: { id: selfAsMirror.id }, data: { processingFeeRecorded: true } });
                    }
                  } catch (pfErr) { console.error('[PR Accounting] CASE A PF error:', pfErr); }
                }
                console.log(`[PR Accounting] ✓ CASE A done: mirror P:₹${mPrincipal} I:₹${mInterest} in ${loan.companyId}`);

              } else {
                // ── CASE C: Truly no mirror — record in original company ───
                console.log(`[PR Accounting] CASE C: No mirror → original company ${loan.companyId}`);
                const accSvc = new AccSvc(loan.companyId);
                await accSvc.initializeChartOfAccounts();
                // Use actual payment record components (correct for partial, no double-interest)
                const totalComp    = savedTotalComp;
                const interestComp = savedInterestComp;
                const principalComp= savedPrincipalComp;

                // On-demand interest accrual for CASE C EMI
                let isEmiAccrued = emi.interestAccrued || false;
                if (!isEmiAccrued && interestComp > 0) {
                  try {
                    await accSvc.recordInterestAccrual({
                      loanId: loan.id,
                      customerId: paymentRequest.customerId,
                      customerName: loan.customer?.name || 'Customer',
                      emiId: emi.id,
                      interestAmount: emi.interestAmount,
                      accrualDate: new Date(), // use payment date so accrual sorts before payment in ledger
                      createdById: reviewedById
                    });
                    await db.eMISchedule.update({
                      where: { id: emi.id },
                      data: { interestAccrued: true, accruedAt: new Date() }
                    });
                    isEmiAccrued = true;
                    console.log(`[PR Accounting CASE C] Auto-accrued interest of ₹${emi.interestAmount} on-demand`);
                  } catch (accErr) {
                    console.error('[PR Accounting CASE C] Failed to auto-accrue interest:', accErr);
                  }
                }

                await recordBankTransaction({
                  companyId: loan.companyId, transactionType: 'CREDIT', amount: totalComp,
                  description: `EMI RECEIPT (UPI) - ${loan.applicationNo} [${loan.customer?.name || 'Customer'}] EMI #${emi.installmentNumber}`,
                  referenceType: 'EMI_PAYMENT', referenceId: paymentId, createdById: reviewedById
                });
                await accSvc.recordEMIPayment({
                  loanId: loan.id, customerId: paymentRequest.customerId, paymentId,
                  totalAmount: totalComp, principalComponent: principalComp, interestComponent: interestComp,
                  paymentDate: new Date(), paymentMode: payMode, createdById: reviewedById,
                  reference: `PR#${paymentRequest.requestNumber} EMI #${emi.installmentNumber}`,
                  isInterestAccrued: isEmiAccrued
                });
                console.log(`[PR Accounting] ✓ CASE C: original company ₹${totalComp} (P:₹${principalComp} I:₹${interestComp})`);
                const pfAmount = loan.sessionForm?.processingFee || 0;
                if (emi.installmentNumber === 1 && pfAmount > 0) {
                  const existingPf = await db.journalEntry.findFirst({
                    where: { companyId: loan.companyId, referenceId: loan.id, referenceType: 'PROCESSING_FEE_COLLECTION', isReversed: false }
                  });
                  if (!existingPf) {
                    await accSvc.recordProcessingFee({ loanId: loan.id, customerId: paymentRequest.customerId,
                      amount: pfAmount, collectionDate: new Date(), createdById: reviewedById, paymentMode: payMode });
                    
                    
                    const pfDesc = `Processing Fee Collection - ${loan.applicationNo}${loan.customer?.name ? ` [${loan.customer.name}]` : ''}`;
                    const pfRef = `${loan.id}-PF-PR`;
                    if (payMode === 'CASH') {
                      let cashBook = await db.cashBook.findUnique({ where: { companyId: loan.companyId } });
                      if (!cashBook) cashBook = await db.cashBook.create({ data: { companyId: loan.companyId, currentBalance: 0 } });
                      const newCashBal = cashBook.currentBalance + pfAmount;
                      await db.cashBookEntry.create({ data: { cashBookId: cashBook.id, entryType: 'CREDIT', amount: pfAmount, balanceAfter: newCashBal, description: pfDesc, referenceType: 'PROCESSING_FEE', referenceId: pfRef, createdById: reviewedById, entryDate: new Date() } });
                      await db.cashBook.update({ where: { id: cashBook.id }, data: { currentBalance: newCashBal, lastUpdatedById: reviewedById, lastUpdatedAt: new Date() } });
                    } else {
                      const bankAcct = await db.bankAccount.findFirst({ where: { companyId: loan.companyId, isActive: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
                      if (bankAcct) {
                        const newBankBal = bankAcct.currentBalance + pfAmount;
                        await db.bankTransaction.create({ data: { bankAccountId: bankAcct.id, transactionType: 'CREDIT', amount: pfAmount, balanceAfter: newBankBal, description: pfDesc, referenceType: 'PROCESSING_FEE', referenceId: pfRef, createdById: reviewedById, transactionDate: new Date() } });
                        await db.bankAccount.update({ where: { id: bankAcct.id }, data: { currentBalance: newBankBal } });
                      }
                    }
                    console.log(`[PR Accounting] ✓ CASE C Processing fee ₹${pfAmount} (Journal + Passbook)`);
                  }
                }
              }
            } catch (noMirrorAccErr) {
              console.error('[PR Accounting] ❌ A/C accounting failed (non-blocking):', noMirrorAccErr);
            }
          } else {
            const mirrorCompanyId = mirrorMapping.mirrorCompanyId;
            const { AccountingService: AccSvc, ACCOUNT_CODES: AC } = await import('@/lib/accounting-service');
            const { recordBankTransaction } = await import('@/lib/simple-accounting');
            const accSvc = new AccSvc(mirrorCompanyId);
            await accSvc.initializeChartOfAccounts();

            // ── Get mirror EMI ───────────────────────────────────────────
            const mirrorEmi = await db.eMISchedule.findFirst({
              where: {
                loanApplicationId: mirrorMapping.mirrorLoanId || undefined,
                installmentNumber: emi.installmentNumber
              }
            });

            // ── Mirror amounts: READ from stored mirror EMI schedule — NEVER recalculate ─
            // Using outstandingPrincipal × mirrorMonthlyRate gives wrong values for reducing
            // loans (outstandingPrincipal decreases over time). The stored interestAmount /
            // principalAmount / totalAmount are what the mirror customer actually owes.
            const mirrorInterest  = Number(mirrorEmi?.interestAmount  || 0);
            const mirrorPrincipal = Number(mirrorEmi?.principalAmount || 0);
            const mirrorTotal     = Number(mirrorEmi?.totalAmount     || 0);
            // Remaining mirror amounts (after any previous partial payments on mirror EMI)
            const mirrorRemainingInterest  = Math.max(0, mirrorInterest  - (mirrorEmi?.paidInterest  || 0));
            const mirrorRemainingPrincipal = Math.max(0, mirrorPrincipal - (mirrorEmi?.paidPrincipal || 0));
            const mirrorRemainingTotal     = Math.round((mirrorRemainingInterest + mirrorRemainingPrincipal) * 100) / 100;

            // On-demand interest accrual for mirror loan EMI
            let isMirrorEmiAccrued = mirrorEmi?.interestAccrued || false;
            if (mirrorEmi && !isMirrorEmiAccrued && mirrorInterest > 0) {
              try {
                await accSvc.recordInterestAccrual({
                  loanId: mirrorMapping.mirrorLoanId || loan.id,
                  customerId: paymentRequest.customerId,
                  customerName: loan.customer?.name || 'Customer',
                  emiId: mirrorEmi.id,
                  interestAmount: mirrorInterest,
                  accrualDate: new Date(), // use payment date so accrual sorts before payment in ledger
                  createdById: reviewedById
                });
                await db.eMISchedule.update({
                  where: { id: mirrorEmi.id },
                  data: { interestAccrued: true, accruedAt: new Date() }
                });
                isMirrorEmiAccrued = true;
                console.log(`[PR Accounting Mirror] Auto-accrued mirror interest of ₹${mirrorInterest} on-demand`);
              } catch (accErr) {
                console.error('[PR Accounting Mirror] Failed to auto-accrue mirror interest:', accErr);
              }
            }

            // ==================================================================
            // FULL_EMI
            // ==================================================================
            if (pType === 'FULL_EMI' && mirrorEmi) {
              // For FULL_EMI we settle whatever is REMAINING on the mirror EMI
              // (may be less than mirrorTotal if mirror had a previous partial payment)
              const settleMirrorAmt       = savedTotalComp; // Bank gets what customer paid
              const settleMirrorInterest  = mirrorRemainingInterest;
              const settleMirrorPrincipal = mirrorRemainingPrincipal;

              // 1. Bank transaction in mirror company
              await recordBankTransaction({
                companyId:       mirrorCompanyId,
                transactionType: 'CREDIT',
                amount:          settleMirrorAmt,
                description:     `MIRROR EMI RECEIPT (UPI) - ${loan.applicationNo} [${loan.customer?.name || 'Customer'}] EMI #${emi.installmentNumber} (P:₹${settleMirrorPrincipal} + I:₹${settleMirrorInterest})`,
                referenceType:   'MIRROR_EMI_PAYMENT',
                referenceId:     paymentId,
                createdById:     reviewedById
              });
              console.log(`[PR Accounting] ✓ Bank CREDIT ₹${settleMirrorAmt} (P:₹${settleMirrorPrincipal} I:₹${settleMirrorInterest}) in mirror company`);

              // 2. Mark mirror EMI as fully PAID
              await db.eMISchedule.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'PAID',
                  paidAmount:    mirrorTotal,
                  paidPrincipal: mirrorPrincipal,
                  paidInterest:  mirrorInterest,
                  paidDate:      new Date(),
                  paymentMode:   payMode,
                  isInterestOnly: mirrorEmi.isInterestOnly || undefined,
                  notes:         `[MIRROR SYNC via PR] ${paymentRequest.requestNumber}`
                }
              });

              // 3. Mirror EMI counter
              await db.mirrorLoanMapping.update({
                where: { id: mirrorMapping.id },
                data: { mirrorEMIsPaid: { increment: 1 } }
              });

              // 4. Mirror Payment record (audit trail — only for what's paid NOW)
              if (mirrorMapping.mirrorLoanId) {
                await db.payment.create({
                  data: {
                    loanApplicationId:  mirrorMapping.mirrorLoanId,
                    emiScheduleId:      mirrorEmi.id,
                    customerId:         paymentRequest.customerId,
                    amount:             settleMirrorAmt,
                    principalComponent: settleMirrorPrincipal,
                    interestComponent:  settleMirrorInterest,
                    paymentMode:        payMode,
                    status:             'COMPLETED',
                    receiptNumber:      `RCP-MIRROR-${Date.now()}`,
                    paidById:           reviewedById,
                    remarks:            `Auto-synced via PR ${paymentRequest.requestNumber}`,
                    paymentType:        mirrorEmi.isInterestOnly ? 'INTEREST_ONLY_PAYMENT' : 'FULL_EMI'
                  }
                });
              }

              // 5. Double-entry journal: DR Bank | CR Loans Receivable | CR Interest Income
              await accSvc.recordEMIPayment({
                loanId:             mirrorMapping.mirrorLoanId || loan.id,
                customerId:         paymentRequest.customerId,
                paymentId,
                totalAmount:        settleMirrorAmt,
                principalComponent: settleMirrorPrincipal,
                interestComponent:  settleMirrorInterest,
                paymentDate:        new Date(),
                paymentMode:        payMode,
                createdById:        reviewedById,
                reference:          `PR#${paymentRequest.requestNumber} → Mirror EMI #${emi.installmentNumber}`,
                isInterestAccrued:  isMirrorEmiAccrued
              });
              console.log(`[PR Accounting] ✓ Journal DR Bank ₹${settleMirrorAmt} (P:₹${settleMirrorPrincipal} I:₹${settleMirrorInterest}) in mirror company ${mirrorCompanyId}`);

              // 6. Mirror loan closure check (only for online mirror loans)
              if (mirrorMapping.mirrorLoanId) {
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

              // =================================================================
              // PROCESSING FEE — EMI #1 only
              // DYNAMIC CALC: processingFee = regularEMI - lastMirrorEMI (installment #1)
              // The mirror schedule is shifted so position #1 = the smallest (last) EMI.
              // =================================================================
              if (emi.installmentNumber === 1 && !mirrorMapping.processingFeeRecorded) {
                try {
                  // regularEMI = the standard EMI amount of the original loan
                  const regularEMI = loan.sessionForm?.emiAmount ?? (emi?.totalAmount ?? 0);

                  // lastMirrorEMI = mirror installment #1 (shifted from last position)
                  let dynamicProcFee = 0;
                  if (mirrorEmi) {
                    dynamicProcFee = Math.max(0, Math.round((regularEMI - mirrorEmi.totalAmount) * 100) / 100);
                  }

                  // Fallback to stored value if dynamic calc gives 0
                  const procFee = dynamicProcFee > 0 ? dynamicProcFee : (mirrorMapping.mirrorProcessingFee ?? 0);

                  console.log(`[PR Accounting] Processing fee dynamic calc: regularEMI=₹${regularEMI} - lastMirrorEMI=₹${mirrorEmi?.totalAmount ?? 0} = ₹${procFee}`);

                  if (procFee > 0) {
                    // Store the dynamically-calculated fee back on the mapping
                    await db.mirrorLoanMapping.update({
                      where: { id: mirrorMapping.id },
                      data: { mirrorProcessingFee: procFee }
                    });

                    // 6a. Bank transaction for processing fee (customer pays online)
                    await recordBankTransaction({
                      companyId:       mirrorCompanyId,
                      transactionType: 'CREDIT',
                      amount:          procFee,
                      description:     `Processing Fee Collection (UPI) - ${loan.applicationNo} [${loan.customer?.name || 'Customer'}] EMI #1 (Last EMI ₹${mirrorEmi?.totalAmount ?? 0} vs Regular EMI ₹${regularEMI})`,
                      referenceType:   'PROCESSING_FEE',
                      referenceId:     `${loan.id}-PF-PR`,
                      createdById:     reviewedById
                    });

                    // 6b. Journal: DR Bank 1102 → CR Processing Fee Income 4121
                    await accSvc.createJournalEntry({
                      entryDate:     new Date(),
                      referenceType: 'PROCESSING_FEE_COLLECTION',
                      referenceId:   mirrorMapping.mirrorLoanId || loan.id,
                      narration:     `Processing Fee (Mirror) - ${loan.applicationNo} [${loan.customer?.name || 'Customer'}] EMI #1 ₹${procFee}`,
                      createdById:   reviewedById,
                      isAutoEntry:   true,
                      lines: [
                        { accountCode: AC.BANK_ACCOUNT,              debitAmount: procFee, creditAmount: 0,       narration: `Processing fee = Regular ₹${regularEMI} - Last Mirror EMI ₹${mirrorEmi?.totalAmount ?? 0}` },
                        { accountCode: AC.PROCESSING_FEE_RECEIVABLE, debitAmount: 0,       creditAmount: procFee, loanId: mirrorMapping.mirrorLoanId || loan.id, customerId: paymentRequest.customerId, narration: 'Processing fee receivable cleared' }
                      ]
                    });

                    // 6c. Mark flag — never double-record
                    await db.mirrorLoanMapping.update({
                      where: { id: mirrorMapping.id },
                      data: { processingFeeRecorded: true }
                    });
                    console.log(`[PR Accounting] ✓ Processing fee ₹${procFee} (dynamic: lastEMI method) → Bank + Journal`);
                  } else {
                    await db.mirrorLoanMapping.update({
                      where: { id: mirrorMapping.id },
                      data: { processingFeeRecorded: true }
                    });
                    console.log(`[PR Accounting] Processing fee ₹0 — skipping (regularEMI=${regularEMI})`);
                  }
                } catch (pfErr) {
                  console.error('[PR Accounting] Processing fee error (non-blocking):', pfErr);
                }
              }
            }

            // ==================================================================
            // PARTIAL_PAYMENT
            // ==================================================================
            else if (pType === 'PARTIAL_PAYMENT' && mirrorEmi && mirrorEmi.paymentStatus !== 'PAID') {
              const partialAmt          = paymentRequest.partialAmount || 0;
              const mirrorPartialAmt    = partialAmt; // What bank receives
              const ratio               = partialAmt / (emi.totalAmount || 1);
              const mirrorAppliedAmt    = Math.round((mirrorEmi.totalAmount || 0) * ratio * 100) / 100;

              // Interest-first logic on MIRROR EMI — same as original loan:
              // Use mirrorEmi.interestAmount (stored, never recalculate from rate)
              // Subtract mirrorEmi.paidInterest to avoid double-charging across partials
              const mirrorInterestAlreadyPaid = mirrorEmi.paidInterest || 0;
              const mirrorRemainingInterest   = Math.max(0, (mirrorEmi.interestAmount || 0) - mirrorInterestAlreadyPaid);
              let mirrorPaidInterest:  number;
              let mirrorPaidPrincipal: number;
              if (mirrorAppliedAmt <= mirrorRemainingInterest) {
                mirrorPaidInterest  = mirrorAppliedAmt;
                mirrorPaidPrincipal = 0;
              } else {
                mirrorPaidInterest  = mirrorRemainingInterest;
                mirrorPaidPrincipal = Math.round((mirrorAppliedAmt - mirrorRemainingInterest) * 100) / 100;
              }
              const mirrorIsFullyPaid = mirrorAppliedAmt >= (mirrorEmi.totalAmount || 0) - (mirrorEmi.paidAmount || 0) - 1;

              // 1. Bank transaction (customer always pays online)
              await recordBankTransaction({
                companyId:       mirrorCompanyId,
                transactionType: 'CREDIT',
                amount:          mirrorPartialAmt,
                description:     `MIRROR PARTIAL EMI (UPI) - PR#${paymentRequest.requestNumber} EMI #${emi.installmentNumber} ${Math.round(ratio * 100)}% P:₹${mirrorPaidPrincipal} I:₹${mirrorPaidInterest}`,
                referenceType:   'MIRROR_EMI_PAYMENT',
                referenceId:     `${paymentId}-PARTIAL`,
                createdById:     reviewedById
              });

              // 2. Update mirror EMI
              await db.eMISchedule.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus:    mirrorIsFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
                  paidAmount:       (mirrorEmi.paidAmount    || 0) + mirrorAppliedAmt,
                  paidPrincipal:    (mirrorEmi.paidPrincipal || 0) + mirrorPaidPrincipal,
                  paidInterest:     (mirrorEmi.paidInterest  || 0) + mirrorPaidInterest,
                  paidDate:         new Date(),
                  paymentMode:      payMode,
                  isPartialPayment: !mirrorIsFullyPaid,
                  notes: `[MIRROR SYNC Partial] PR#${paymentRequest.requestNumber} (${Math.round(ratio * 100)}%) P:₹${mirrorPaidPrincipal} I:₹${mirrorPaidInterest}`
                }
              });

              // 3. Journal with mirror amounts (interest-first, no double)
              await accSvc.recordEMIPayment({
                loanId:             mirrorMapping.mirrorLoanId || loan.id,
                customerId:         paymentRequest.customerId,
                paymentId:          `${paymentId}-PARTIAL`,
                totalAmount:        mirrorPartialAmt,
                principalComponent: mirrorPaidPrincipal,
                interestComponent:  mirrorPaidInterest,
                paymentDate:        new Date(),
                paymentMode:        payMode,
                createdById:        reviewedById,
                reference:          `PR#${paymentRequest.requestNumber} → Mirror Partial ${Math.round(ratio * 100)}%`,
                isInterestAccrued:  isMirrorEmiAccrued
              });
              console.log(`[PR Accounting] ✓ PARTIAL Mirror Bank+Journal ₹${mirrorPartialAmt} (P:₹${mirrorPaidPrincipal} I:₹${mirrorPaidInterest}) in mirror company`);
            }

            // ==================================================================
            // INTEREST_ONLY
            // ==================================================================
            else if (pType === 'INTEREST_ONLY') {
              // LAYER 1: Use pre-TX captured value (before transaction modified paidInterest)
              let ioMirrorInterest = preTxMirrorInterest > 0
                ? preTxMirrorInterest
                : (mirrorEmi ? Number(mirrorEmi.interestAmount || 0) : 0);

              // LAYER 2: If still 0 (null/0 interestAmount in DB), calculate from mirror rate
              if (ioMirrorInterest <= 0 && mirrorMapping.mirrorInterestRate) {
                const outstanding = Number(mirrorEmi?.outstandingPrincipal || mirrorEmi?.principalAmount || 0);
                const monthlyRate = Number(mirrorMapping.mirrorInterestRate) / 100 / 12;
                if (outstanding > 0 && monthlyRate > 0) {
                  ioMirrorInterest = Math.round(outstanding * monthlyRate * 100) / 100;
                  console.log(`[PR Accounting IO] LAYER 2: rate-based fallback ₹${ioMirrorInterest} (outstanding=₹${outstanding} rate=${monthlyRate})`);
                }
              }

              console.log(`[PR Accounting IO] preTx=₹${preTxMirrorInterest} stored=₹${mirrorEmi?.interestAmount ?? 'null'} final=₹${ioMirrorInterest}`);

              if (ioMirrorInterest > 0) {
                // 1. Bank transaction in mirror company
                await recordBankTransaction({
                  companyId:       mirrorCompanyId,
                  transactionType: 'CREDIT',
                  amount:          ioMirrorInterest,
                  description:     `MIRROR INTEREST-ONLY (UPI) - PR#${paymentRequest.requestNumber} EMI #${emi.installmentNumber} I:₹${ioMirrorInterest}`,
                  referenceType:   'MIRROR_INTEREST_INCOME',
                  referenceId:     `${paymentId}-IO`,
                  createdById:     reviewedById
                });

                // NOTE: Mirror EMI status update (INTEREST_ONLY_PAID) is already handled
                // by the post-transaction INTEREST_ONLY block above — do NOT update again here.

                // 2. Journal: DR Bank | CR Interest Income (principal=0, interest-only)
                await accSvc.recordEMIPayment({
                  loanId:             mirrorMapping.mirrorLoanId || loan.id,
                  customerId:         paymentRequest.customerId,
                  paymentId:          `${paymentId}-IO`,
                  totalAmount:        ioMirrorInterest,
                  principalComponent: 0,
                  interestComponent:  ioMirrorInterest,
                  paymentDate:        new Date(),
                  paymentMode:        payMode,
                  createdById:        reviewedById,
                  reference:          `PR#${paymentRequest.requestNumber} → Mirror Interest-Only EMI #${emi.installmentNumber}`,
                  isInterestAccrued:  isMirrorEmiAccrued
                });
                console.log(`[PR Accounting] ✓ INTEREST_ONLY Mirror Bank+Journal ₹${ioMirrorInterest} in mirror company ${mirrorCompanyId}`);
              } else {
                console.warn(`[PR Accounting IO] ⚠️ ioMirrorInterest=0 — skipping mirror entry. mirrorLoanId=${mirrorMapping.mirrorLoanId} installment=${emi.installmentNumber}`);
              }
            }
          }
        }
      } catch (accErr) {
        // ══════════════════════════════════════════════════════════════════
        // ACCOUNTING FAILURE → REVERT APPROVAL
        // If accounting entries could not be written, roll back the approval
        // so the cashier can retry. A partial ledger is worse than no entry.
        // ══════════════════════════════════════════════════════════════════
        console.error('[PR Accounting] ❌ Accounting failed — reverting approval:', accErr);
        try {
          // 1. Revert PaymentRequest → PENDING
          await db.paymentRequest.update({
            where: { id: paymentRequestId },
            data: {
              status:       'PENDING',
              reviewedById: null,
              reviewedAt:   null,
              reviewRemarks: `[AUTO-REVERTED] Accounting failed: ${(accErr as Error)?.message?.slice(0, 200)}`
            }
          });

          // 2. Revert EMI back to its pre-approval status
          //    Determine correct status from paidAmount after reverting this payment
          const paymentRecord = await db.payment.findFirst({
            where: { emiScheduleId: emi.id, status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' }
          });
          const revertedPaidAmount = Math.max(0, (emi.paidAmount || 0) - (paymentRecord?.amount || 0));
          const revertedStatus = revertedPaidAmount <= 0
            ? 'PENDING'
            : revertedPaidAmount >= (emi.totalAmount || 0) - 1
              ? 'PAID'
              : 'PARTIALLY_PAID';

          await db.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paymentStatus: revertedStatus,
              paidAmount:    revertedPaidAmount,
              paidPrincipal: Math.max(0, (emi.paidPrincipal || 0) - (paymentRecord?.principalComponent || 0)),
              paidInterest:  Math.max(0, (emi.paidInterest  || 0) - (paymentRecord?.interestComponent  || 0)),
              paidDate:      revertedPaidAmount > 0 ? emi.paidDate : null,
            }
          });

          // 3. Delete the Payment record created inside the transaction
          if (paymentRecord) {
            await db.payment.delete({ where: { id: paymentRecord.id } });
          }

          console.error('[PR Accounting] ↩ Approval reverted — PaymentRequest back to PENDING, EMI reset to', revertedStatus);
        } catch (revertErr) {
          console.error('[PR Accounting] ❌❌ REVERT ALSO FAILED — manual intervention required:', revertErr);
        }

        return NextResponse.json({
          error: 'Accounting entries could not be written. Approval has been reverted to PENDING. Please retry.',
          details: (accErr as Error)?.message
        }, { status: 500 });
      }


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
