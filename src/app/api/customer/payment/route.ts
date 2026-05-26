import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/db-utils';

// Local type definitions - Prisma schema uses strings, not enums
type EMIPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'INTEREST_ONLY_PAID' | 'WAIVED';

// POST - Process EMI payment (Full, Partial, or Interest Only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      loanId,
      customerId,
      emiScheduleId,
      paymentType, // 'FULL_EMI', 'PARTIAL', 'INTEREST_ONLY'
      amount,
      nextPaymentDate,
      remarks
    } = body;

    console.log('Customer payment request:', { loanId, customerId, emiScheduleId, paymentType, amount });

    if (!loanId || !customerId || !emiScheduleId || !paymentType || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { loanId: !!loanId, customerId: !!customerId, emiScheduleId: !!emiScheduleId, paymentType: !!paymentType, amount: !!amount }
      }, { status: 400 });
    }

    // Get EMI Schedule
    const emiSchedule = await db.eMISchedule.findUnique({
      where: { id: emiScheduleId },
      include: {
        loanApplication: {
          include: {
            customer: true,
            company: true,
            sessionForm: {
              include: {
                agent: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!emiSchedule) {
      return NextResponse.json({ error: 'EMI schedule not found' }, { status: 404 });
    }

    if (emiSchedule.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'EMI already paid' }, { status: 400 });
    }

    // Sequential Payment Validation - INTEREST_ONLY_PAID counts as "handled" for prior EMIs
    const previousEmis = await db.eMISchedule.findMany({
      where: {
        loanApplicationId: loanId,
        installmentNumber: { lt: emiSchedule.installmentNumber },
        paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID', 'WAIVED'] }
      }
    });

    if (previousEmis.length > 0) {
      const unpaidEmiNumbers = previousEmis.map(e => e.installmentNumber).sort((a, b) => a - b);
      return NextResponse.json({ 
        error: 'Sequential payment required',
        message: `Please pay EMI #${unpaidEmiNumbers[0]} first before paying this EMI`,
        unpaidEmis: unpaidEmiNumbers
      }, { status: 400 });
    }

    // Check if EMI already has partial payment - disable interest only option
    if (paymentType === 'INTEREST_ONLY' && emiSchedule.isPartialPayment) {
      return NextResponse.json({ 
        error: 'Interest only not available after partial payment',
        message: 'This EMI has a partial payment. Interest only option is not available.'
      }, { status: 400 });
    }

    const loan = emiSchedule.loanApplication;
    const paymentAmount = parseFloat(amount.toString());
    const totalAmount = emiSchedule.totalAmount;
    const principalAmount = Number(emiSchedule.principalAmount || 0);
    const interestAmount = Number(emiSchedule.interestAmount || 0);

    let updatedEmiSchedule: Awaited<ReturnType<typeof db.eMISchedule.update>> | null = null;
    let remainingAmount = 0;
    let newNextPaymentDate: Date | null = null;

    // Start transaction
    const result = await withRetry(() => db.$transaction(async (tx) => {
      if (paymentType === 'FULL_EMI') {
        // Full EMI Payment
        const paidPrincipal = principalAmount;
        const paidInterest = interestAmount;

        updatedEmiSchedule = await tx.eMISchedule.update({
          where: { id: emiScheduleId },
          data: {
            paymentStatus: 'PAID',
            paidAmount: totalAmount,
            paidPrincipal: paidPrincipal,
            paidInterest: paidInterest,
            paidDate: new Date(),
            paymentMode: 'ONLINE',
            outstandingPrincipal: 0,
            outstandingInterest: 0
          }
        });

        // Create payment record
        await tx.payment.create({
          data: {
            loanApplicationId: loanId,
            emiScheduleId: emiScheduleId,
            customerId: customerId,
            amount: totalAmount,
            principalComponent: paidPrincipal,
            interestComponent: paidInterest,
            paymentMode: 'ONLINE',
            status: 'COMPLETED',
            paymentType: 'FULL_EMI',
            paidById: customerId,
            remarks: remarks || 'Full EMI payment by customer'
          }
        });

        // Create credit transaction for agent (if agent exists)
        const agentId = loan.sessionForm?.agentId || loan.sessionForm?.agent?.id;
        if (agentId) {
          const agent = await tx.user.findUnique({
            where: { id: agentId },
            select: { personalCredit: true, companyCredit: true, credit: true }
          });
          
          const newPersonalCredit = (agent?.personalCredit || 0) + totalAmount;
          const newTotalCredit = (agent?.credit || 0) + totalAmount;
          
          await tx.creditTransaction.create({
            data: {
              userId: agentId,
              transactionType: 'CREDIT_INCREASE',
              amount: totalAmount,
              paymentMode: 'ONLINE',
              creditType: 'PERSONAL',
              sourceType: 'EMI_PAYMENT',
              loanApplicationId: loanId,
              emiScheduleId: emiScheduleId,
              customerId: customerId,
              installmentNumber: emiSchedule.installmentNumber,
              customerName: loan.customer?.name,
              customerPhone: loan.customer?.phone,
              loanApplicationNo: loan.applicationNo,
              emiDueDate: emiSchedule.dueDate,
              emiAmount: totalAmount,
              principalComponent: paidPrincipal,
              interestComponent: paidInterest,
              personalBalanceAfter: newPersonalCredit,
              companyBalanceAfter: agent?.companyCredit || 0,
              balanceAfter: newTotalCredit,
              description: `EMI #${emiSchedule.installmentNumber} payment by customer`,
              remarks: remarks || 'Full EMI payment',
              transactionDate: new Date()
            }
          });
          
          await tx.user.update({
            where: { id: agentId },
            data: {
              personalCredit: newPersonalCredit,
              credit: newTotalCredit
            }
          });
        }

      } else if (paymentType === 'PARTIAL') {
        // Partial Payment
        if (!nextPaymentDate) {
          throw new Error('Next payment date is required for partial payment');
        }

        newNextPaymentDate = new Date(nextPaymentDate);
        remainingAmount = totalAmount - paymentAmount;
        const paidPrincipal = Math.min(paymentAmount, principalAmount);
        const paidInterest = Math.max(0, paymentAmount - paidPrincipal);

        updatedEmiSchedule = await tx.eMISchedule.update({
          where: { id: emiScheduleId },
          data: {
            paymentStatus: 'PARTIALLY_PAID',
            paidAmount: { increment: paymentAmount },
            paidPrincipal: { increment: paidPrincipal },
            paidInterest: { increment: paidInterest },
            isPartialPayment: true,
            nextPaymentDate: newNextPaymentDate,
            outstandingPrincipal: principalAmount - paidPrincipal,
            outstandingInterest: interestAmount - paidInterest,
            paymentMode: 'ONLINE',
            notes: `Partial payment of ${paymentAmount}. Remaining: ${remainingAmount} due on ${newNextPaymentDate.toISOString().split('T')[0]}`
          }
        });

        await tx.payment.create({
          data: {
            loanApplicationId: loanId,
            emiScheduleId: emiScheduleId,
            customerId: customerId,
            amount: paymentAmount,
            principalComponent: paidPrincipal,
            interestComponent: paidInterest,
            paymentMode: 'ONLINE',
            status: 'COMPLETED',
            paymentType: 'PARTIAL_PAYMENT',
            paidById: customerId,
            remarks: `Partial payment. Remaining ${remainingAmount} due on ${newNextPaymentDate.toISOString().split('T')[0]}`
          }
        });

        const partialAgentId = loan.sessionForm?.agentId || loan.sessionForm?.agent?.id;
        if (partialAgentId) {
          const partialAgent = await tx.user.findUnique({
            where: { id: partialAgentId },
            select: { personalCredit: true, companyCredit: true, credit: true }
          });
          
          const partialNewPersonalCredit = (partialAgent?.personalCredit || 0) + paymentAmount;
          const partialNewTotalCredit = (partialAgent?.credit || 0) + paymentAmount;
          
          await tx.creditTransaction.create({
            data: {
              userId: partialAgentId,
              transactionType: 'CREDIT_INCREASE',
              amount: paymentAmount,
              paymentMode: 'ONLINE',
              creditType: 'PERSONAL',
              sourceType: 'EMI_PAYMENT',
              loanApplicationId: loanId,
              emiScheduleId: emiScheduleId,
              customerId: customerId,
              installmentNumber: emiSchedule.installmentNumber,
              customerName: loan.customer?.name,
              customerPhone: loan.customer?.phone,
              loanApplicationNo: loan.applicationNo,
              emiDueDate: emiSchedule.dueDate,
              emiAmount: totalAmount,
              principalComponent: paidPrincipal,
              interestComponent: paidInterest,
              personalBalanceAfter: partialNewPersonalCredit,
              companyBalanceAfter: partialAgent?.companyCredit || 0,
              balanceAfter: partialNewTotalCredit,
              description: `Partial EMI #${emiSchedule.installmentNumber} payment`,
              remarks: `Partial payment. Remaining ${remainingAmount} due on ${newNextPaymentDate.toISOString().split('T')[0]}`,
              transactionDate: new Date()
            }
          });
          
          await tx.user.update({
            where: { id: partialAgentId },
            data: {
              personalCredit: partialNewPersonalCredit,
              credit: partialNewTotalCredit
            }
          });
        }

      } else if (paymentType === 'INTEREST_ONLY') {
        // ── INTEREST ONLY PAYMENT ─────────────────────────────────────────────
        // Customer pays only interest for this month.
        // Rule: mark current EMI as INTEREST_ONLY_PAID (NOT 'PAID'),
        //       shift all subsequent EMIs +1, create a NEW EMI at position N+1
        //       with the SAME P+I as the current EMI (no recalculation).
        //       Mirror loan gets the same treatment using its OWN P+I values.
        const paidInterest = interestAmount;
        const deferredPrincipal = principalAmount;

        // CRITICAL: use INTEREST_ONLY_PAID — using 'PAID' was wrong and broke
        //           sequential validation for subsequent EMIs.
        updatedEmiSchedule = await tx.eMISchedule.update({
          where: { id: emiScheduleId },
          data: {
            paymentStatus: 'INTEREST_ONLY_PAID',
            paidAmount: interestAmount,
            paidPrincipal: 0,
            paidInterest: paidInterest,
            isInterestOnly: true,
            principalDeferred: true,
            outstandingPrincipal: deferredPrincipal,
            outstandingInterest: 0,
            paidDate: new Date(),
            paymentMode: 'ONLINE',
            notes: `[IO PAID] Customer portal. I:\u20b9${paidInterest} collected, P:\u20b9${deferredPrincipal} deferred`
          }
        });

        // Payment record
        await tx.payment.create({
          data: {
            loanApplicationId: loanId,
            emiScheduleId: emiScheduleId,
            customerId: customerId,
            amount: interestAmount,
            principalComponent: 0,
            interestComponent: paidInterest,
            paymentMode: 'ONLINE',
            status: 'COMPLETED',
            paymentType: 'INTEREST_ONLY',
            paidById: customerId,
            remarks: `Interest only payment - P:\u20b9${deferredPrincipal} deferred`
          }
        });

        // Credit transaction for the collecting agent
        const interestAgentId = loan.sessionForm?.agentId || loan.sessionForm?.agent?.id;
        if (interestAgentId) {
          const interestAgent = await tx.user.findUnique({
            where: { id: interestAgentId },
            select: { personalCredit: true, companyCredit: true, credit: true }
          });
          
          const interestNewPersonalCredit = (interestAgent?.personalCredit || 0) + interestAmount;
          const interestNewTotalCredit = (interestAgent?.credit || 0) + interestAmount;
          
          await tx.creditTransaction.create({
            data: {
              userId: interestAgentId,
              transactionType: 'CREDIT_INCREASE',
              amount: interestAmount,
              paymentMode: 'ONLINE',
              creditType: 'PERSONAL',
              sourceType: 'EMI_PAYMENT',
              loanApplicationId: loanId,
              emiScheduleId: emiScheduleId,
              customerId: customerId,
              installmentNumber: emiSchedule.installmentNumber,
              customerName: loan.customer?.name,
              customerPhone: loan.customer?.phone,
              loanApplicationNo: loan.applicationNo,
              emiDueDate: emiSchedule.dueDate,
              emiAmount: interestAmount,
              principalComponent: 0,
              interestComponent: paidInterest,
              personalBalanceAfter: interestNewPersonalCredit,
              companyBalanceAfter: interestAgent?.companyCredit || 0,
              balanceAfter: interestNewTotalCredit,
              description: `Interest only payment for EMI #${emiSchedule.installmentNumber}`,
              remarks: 'Interest only - principal deferred',
              transactionDate: new Date()
            }
          });
          
          await tx.user.update({
            where: { id: interestAgentId },
            data: {
              personalCredit: interestNewPersonalCredit,
              credit: interestNewTotalCredit
            }
          });
        }

        // ── ORIGINAL LOAN: Shift subsequent EMIs +1, create deferred EMI ────
        // Due date day pattern from the current EMI
        const dueDateDay = emiSchedule.dueDate.getDate() || 15;

        // New deferred EMI due date = current EMI due date + 1 month
        const newEmiDueDate = new Date(emiSchedule.dueDate);
        newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
        newEmiDueDate.setDate(dueDateDay);

        // Shift all subsequent EMIs (installmentNumber > current) — DESCENDING order to avoid unique clash
        const subsequentEmis = await tx.eMISchedule.findMany({
          where: {
            loanApplicationId: loanId,
            installmentNumber: { gt: emiSchedule.installmentNumber }
          },
          orderBy: { installmentNumber: 'desc' }
        });

        for (const sub of subsequentEmis) {
          const shiftedDue = new Date(sub.dueDate);
          shiftedDue.setMonth(shiftedDue.getMonth() + 1);
          shiftedDue.setDate(dueDateDay);
          await tx.eMISchedule.update({
            where: { id: sub.id },
            data: {
              installmentNumber: sub.installmentNumber + 1,
              dueDate: shiftedDue,
              originalDueDate: sub.originalDueDate || sub.dueDate
            }
          });
        }

        // Create deferred EMI at N+1 — SAME P+I as current (no recalculation)
        await tx.eMISchedule.create({
          data: {
            loanApplicationId: loanId,
            installmentNumber: emiSchedule.installmentNumber + 1,
            dueDate: newEmiDueDate,
            originalDueDate: newEmiDueDate,
            principalAmount: deferredPrincipal,
            interestAmount: interestAmount,
            totalAmount: Math.round((deferredPrincipal + interestAmount) * 100) / 100,
            outstandingPrincipal: deferredPrincipal,
            outstandingInterest: interestAmount,
            paymentStatus: 'PENDING',
            principalDeferred: true,
            notes: `Deferred from customer IO on EMI #${emiSchedule.installmentNumber}. P:\u20b9${deferredPrincipal} + I:\u20b9${interestAmount}. Due: ${newEmiDueDate.toISOString().split('T')[0]}`
          }
        });

        // ── MIRROR LOAN SYNC ──────────────────────────────────────────────────
        // Mirror uses its OWN stored P+I (different from original because it's
        // 15% reducing vs 24% flat). We never copy original values to mirror.
        const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
          where: { originalLoanId: loanId, isOfflineLoan: false }
        });
        if (mirrorMapping?.mirrorLoanId) {
          const mirrorEMI = await tx.eMISchedule.findFirst({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: emiSchedule.installmentNumber
            }
          });
          if (mirrorEMI && mirrorEMI.paymentStatus !== 'PAID' && mirrorEMI.paymentStatus !== 'INTEREST_ONLY_PAID') {
            // Use mirror's OWN interest and principal amounts
            const mirrorInterest  = Number(mirrorEMI.interestAmount  || 0);
            const mirrorPrincipal = Number(mirrorEMI.principalAmount || 0);
            const mirrorDueDateDay = mirrorEMI.dueDate.getDate() || dueDateDay;

            // Mark mirror EMI as INTEREST_ONLY_PAID
            await tx.eMISchedule.update({
              where: { id: mirrorEMI.id },
              data: {
                paymentStatus: 'INTEREST_ONLY_PAID',
                paidAmount: mirrorInterest,
                paidPrincipal: 0,
                paidInterest: mirrorInterest,
                paidDate: new Date(),
                isInterestOnly: true,
                principalDeferred: true,
                paymentMode: 'ONLINE',
                notes: `[MIRROR SYNC] Customer IO: I:\u20b9${mirrorInterest} collected, P:\u20b9${mirrorPrincipal} deferred`
              }
            });

            // Shift mirror's subsequent EMIs — DESCENDING order
            const subsequentMirrorEmis = await tx.eMISchedule.findMany({
              where: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                installmentNumber: { gt: mirrorEMI.installmentNumber }
              },
              orderBy: { installmentNumber: 'desc' }
            });
            for (const ms of subsequentMirrorEmis) {
              const mDue = new Date(ms.dueDate);
              mDue.setMonth(mDue.getMonth() + 1);
              mDue.setDate(mirrorDueDateDay);
              await tx.eMISchedule.update({
                where: { id: ms.id },
                data: { installmentNumber: ms.installmentNumber + 1, dueDate: mDue, originalDueDate: ms.originalDueDate || ms.dueDate }
              });
            }

            // Create deferred mirror EMI at N+1 — mirror's OWN P+I
            const newMirrorDueDate = new Date(mirrorEMI.dueDate);
            newMirrorDueDate.setMonth(newMirrorDueDate.getMonth() + 1);
            newMirrorDueDate.setDate(mirrorDueDateDay);
            await tx.eMISchedule.create({
              data: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                installmentNumber: mirrorEMI.installmentNumber + 1,
                dueDate: newMirrorDueDate,
                originalDueDate: newMirrorDueDate,
                principalAmount: mirrorPrincipal,
                interestAmount: mirrorInterest,
                totalAmount: Math.round((mirrorPrincipal + mirrorInterest) * 100) / 100,
                outstandingPrincipal: mirrorPrincipal,
                outstandingInterest: mirrorInterest,
                paymentStatus: 'PENDING',
                principalDeferred: true,
                notes: `[MIRROR] Deferred from customer IO on EMI #${mirrorEMI.installmentNumber}. P:\u20b9${mirrorPrincipal} + I:\u20b9${mirrorInterest}. Due: ${newMirrorDueDate.toISOString().split('T')[0]}`
              }
            });
          }
        }
      }

      // Update loan's last activity
      await tx.loanApplication.update({
        where: { id: loanId },
        data: { updatedAt: new Date() }
      });

      return updatedEmiSchedule;
    })); // end withRetry + $transaction

    return NextResponse.json({
      success: true,
      payment: {
        amount: paymentAmount,
        type: paymentType,
        remainingAmount: remainingAmount > 0 ? remainingAmount : undefined,
        nextPaymentDate: (newNextPaymentDate as Date | null)?.toISOString()
      },
      emiSchedule: result
    });

  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment processing failed' },
      { status: 500 }
    );
  }
}
