import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';
import { AccountingService } from '@/lib/accounting-service';
import { calculateMirrorLoan } from '@/lib/mirror-loan';
import { recordBankTransaction, recordCashBookEntry } from '@/lib/simple-accounting';

// POST - Start an offline loan (convert from interest-only to normal EMI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      loanId,
      tenure,
      interestRate,
      interestType,
      startedBy,
      processingFee,
      bankAccountId,
      secondaryPaymentPageId,
    } = body;

    if (!loanId || !tenure || !interestRate) {
      return NextResponse.json({ error: 'Missing required fields: loanId, tenure, interestRate' }, { status: 400 });
    }
    if (tenure < 1 || tenure > 120) {
      return NextResponse.json({ error: 'Tenure must be between 1 and 120 months' }, { status: 400 });
    }
    if (interestRate < 1 || interestRate > 50) {
      return NextResponse.json({ error: 'Interest rate must be between 1% and 50%' }, { status: 400 });
    }

    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: { company: { select: { id: true, name: true, code: true } } }
    });

    if (!loan) return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });
    if (loan.status !== 'INTEREST_ONLY') {
      return NextResponse.json({ error: 'Loan must be in INTEREST_ONLY status to start. Current: ' + loan.status }, { status: 400 });
    }

    const principalAmount = loan.loanAmount;
    if (!principalAmount || principalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid principal amount' }, { status: 400 });
    }

    const companyId = loan.companyId;
    if (!companyId) return NextResponse.json({ error: 'Loan has no associated company' }, { status: 400 });

    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestType === 'REDUCING' ? 'REDUCING' :
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    const emiCalc = calculateEMI(principalAmount, interestRate, tenure, actualInterestType, new Date());
    const emiAmount = emiCalc.emi;
    const parsedProcessingFee = parseFloat(processingFee) || 0;

    console.log(`[Start Offline Loan] ${loan.loanNumber} | ₹${principalAmount} @ ${interestRate}% ${actualInterestType} × ${tenure}mo = EMI ₹${emiAmount} | PF ₹${parsedProcessingFee}`);

    const result = await db.$transaction(async (tx) => {
      // Find mirror mapping and mirror loan BEFORE updating
      const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
        where: {
          OR: [
            { originalLoanId: loanId },
            { mirrorLoanId: loanId }
          ],
          isOfflineLoan: true
        },
        include: { mirrorCompany: { select: { id: true, name: true } } }
      });
      let mirrorLoan: any = null;
      if (mirrorMapping?.mirrorLoanId) {
        mirrorLoan = await tx.offlineLoan.findUnique({
          where: { id: mirrorMapping.mirrorLoanId }
        });
      }

      await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: loanId } });

      const emis = emiCalc.schedule.map((item, index) => {
        const emiDayOfMonth = loan.disbursementDate ? new Date(loan.disbursementDate).getDate() : new Date().getDate();
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(emiDayOfMonth);
        dueDate.setHours(0, 0, 0, 0);
        return {
          offlineLoanId: loanId,
          installmentNumber: item.installmentNumber,
          dueDate,
          principalAmount: item.principal,
          interestAmount: item.interest,
          totalAmount: item.totalAmount,
          outstandingPrincipal: item.outstandingPrincipal,
          paymentStatus: 'PENDING'
        };
      });

      await tx.offlineLoanEMI.createMany({ data: emis as any });

      const updatedLoan = await tx.offlineLoan.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          tenure,
          interestRate,
          interestType: actualInterestType,
          emiAmount,
          isInterestOnlyLoan: false,
          partialPaymentEnabled: true,
          processingFee: parsedProcessingFee,
          ...(bankAccountId ? { bankAccountId } : {}),
          ...(secondaryPaymentPageId ? { secondaryPaymentPageId } : {}),
        }
      });

      await tx.actionLog.create({
        data: {
          userId: startedBy || 'system',
          userRole: 'SYSTEM',
          actionType: 'UPDATE',
          module: 'OFFLINE_LOAN',
          recordId: loanId,
          recordType: 'OfflineLoan',
          previousData: JSON.stringify({
            action: 'LOAN_STARTED',
            // Original loan previous details
            status: loan.status,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            interestType: loan.interestType,
            emiAmount: loan.emiAmount,
            isInterestOnlyLoan: loan.isInterestOnlyLoan,
            partialPaymentEnabled: loan.partialPaymentEnabled,
            processingFee: loan.processingFee,
            processingFeeRecorded: loan.processingFeeRecorded,
            bankAccountId: loan.bankAccountId,
            secondaryPaymentPageId: loan.secondaryPaymentPageId,
            
            // Mirror mapping previous details
            mirrorMappingId: mirrorMapping?.id || null,
            mirrorLoanId: mirrorMapping?.mirrorLoanId || null,
            mirrorTenure: mirrorMapping?.mirrorTenure || null,
            mirrorProcessingFee: mirrorMapping?.mirrorProcessingFee || null,
            mirrorProcessingFeeRecorded: mirrorMapping?.processingFeeRecorded || null,
            
            // Mirror loan previous details
            mirrorStatus: mirrorLoan?.status || null,
            mirrorLoanTenure: mirrorLoan?.tenure || null,
            mirrorInterestRate: mirrorLoan?.interestRate || null,
            mirrorInterestType: mirrorLoan?.interestType || null,
            mirrorEmiAmount: mirrorLoan?.emiAmount || null,
            mirrorIsInterestOnlyLoan: mirrorLoan?.isInterestOnlyLoan || null,
            mirrorPartialPaymentEnabled: mirrorLoan?.partialPaymentEnabled || null,
            mirrorProcessingFeeValue: mirrorLoan?.processingFee || null,
          }),
          newData: JSON.stringify({ action: 'LOAN_STARTED', tenure, interestRate, interestType: actualInterestType, emiAmount, processingFee: parsedProcessingFee }),
          description: `Offline loan ${loan.loanNumber} started (Phase 2): ${tenure}mo @ ${interestRate}% ${actualInterestType}`,
          canUndo: true
        }
      });

      // ── Record processing fee (inside transaction) ──────────────────
      const mirrorMappingForPF = await tx.mirrorLoanMapping.findFirst({
        where: {
          OR: [
            { originalLoanId: loanId },
            { mirrorLoanId: loanId }
          ],
          isOfflineLoan: true
        }
      });

      if (parsedProcessingFee > 0 && !mirrorMappingForPF) {
        const pfPaymentMode = (bankAccountId && !bankAccountId.startsWith('cash_')) ? 'BANK_TRANSFER' : 'CASH';
        const pfBankId = (bankAccountId && !bankAccountId.startsWith('cash_')) ? bankAccountId : undefined;

        // Bank credit for processing fee
        if (pfPaymentMode === 'BANK_TRANSFER' && pfBankId) {
          await recordBankTransaction({
            companyId,
            bankAccountId: pfBankId,
            transactionType: 'CREDIT',
            amount: parsedProcessingFee,
            description: `Processing Fee - ${loan.loanNumber}`,
            referenceType: 'PROCESSING_FEE',
            referenceId: loanId,
            createdById: startedBy || 'system',
            tx,
          });
        } else {
          // Cash credit
          await recordCashBookEntry({
            companyId,
            entryType: 'CREDIT',
            amount: parsedProcessingFee,
            description: `Processing Fee - ${loan.loanNumber}`,
            referenceType: 'PROCESSING_FEE',
            referenceId: loanId,
            createdById: startedBy || 'system',
            tx,
          });
        }

        // Accounting journal entry for processing fee
        const accountingService = new AccountingService(companyId);
        await accountingService.initializeChartOfAccounts();
        
        // 1. Record Accrual
        await accountingService.recordProcessingFeeAccrual({
          loanId,
          customerId: loan.customerId || loanId,
          amount: parsedProcessingFee,
          accrualDate: new Date(Date.now() - 5000),
          createdById: startedBy || 'system',
        }, tx);

        // 2. Record Collection
        await accountingService.recordProcessingFee({
          loanId,
          customerId: loan.customerId || loanId,
          amount: parsedProcessingFee,
          collectionDate: new Date(),
          createdById: startedBy || 'system',
          paymentMode: pfPaymentMode,
          bankAccountId: pfBankId,
        }, tx);

        await tx.offlineLoan.update({
          where: { id: loanId },
          data: { processingFeeRecorded: true }
        });
        console.log(`[Start Offline Loan] ✅ Processing fee ₹${parsedProcessingFee} recorded for ${loan.loanNumber} inside transaction`);
      }

      // ── CASCADE: Also start the mirror offline loan with shifted schedule ─────
      if (mirrorMapping?.mirrorLoanId) {
        if (mirrorLoan) {
          const mirrorRate  = mirrorMapping.mirrorInterestRate || interestRate;
          const mirrorType  = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';

          const mirrorCalc = calculateMirrorLoan(
            principalAmount,
            interestRate,
            tenure,
            actualInterestType,
            mirrorRate,
            mirrorType
          );

          const shiftedSchedule = mirrorCalc.shiftedSchedule;
          const autoProcessingFee = mirrorCalc.processingFee;
          const mirrorTenure = mirrorCalc.mirrorLoan.schedule.length;

          // Clear IO placeholder EMIs from mirror
          await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: mirrorLoan.id } });

          // Generate mirror's SHIFTED amortizing schedule (last EMI → first position)
          const mirrorEMIs = shiftedSchedule.map((item, index) => {
            const emiDayOfMonth = loan.disbursementDate ? new Date(loan.disbursementDate).getDate() : new Date().getDate();
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + index + 1);
            dueDate.setDate(emiDayOfMonth);
            dueDate.setHours(0, 0, 0, 0);
            return {
              offlineLoanId: mirrorLoan.id,
              installmentNumber: item.installmentNumber,
              dueDate,
              principalAmount: item.principal,
              interestAmount: item.interest,
              totalAmount: item.emi,
              outstandingPrincipal: item.outstandingPrincipal,
              paymentStatus: 'PENDING' as const,
            };
          });

          await tx.offlineLoanEMI.createMany({ data: mirrorEMIs as any });

          await tx.offlineLoan.update({
            where: { id: mirrorLoan.id },
            data: {
              status: 'ACTIVE',
              tenure: mirrorTenure,
              interestRate: mirrorRate,
              interestType: mirrorType,
              emiAmount: mirrorCalc.mirrorLoan.emiAmount,
              isInterestOnlyLoan: false,
              partialPaymentEnabled: true,
              processingFee: autoProcessingFee,
            }
          });

          // Update mirror mapping with processing fee and tenure info
          await tx.mirrorLoanMapping.update({
            where: { id: mirrorMapping.id },
            data: {
              mirrorTenure,
              originalTenure: tenure,
              mirrorProcessingFee: autoProcessingFee,
              processingFeeRecorded: false,
              extraEMIPaymentPageId: secondaryPaymentPageId || null,
            }
          });

          // Record mirror processing fee accrual in the mirror company
          const mirrorCompanyId = mirrorMapping.mirrorCompanyId;
          if (mirrorCompanyId && autoProcessingFee > 0) {
            const mirrorAccSvc = new AccountingService(mirrorCompanyId);
            await mirrorAccSvc.initializeChartOfAccounts();
            await mirrorAccSvc.recordProcessingFeeAccrual({
              loanId: mirrorLoan.id,
              customerId: mirrorLoan.customerId || mirrorLoan.id,
              amount: autoProcessingFee,
              accrualDate: new Date(Date.now() - 5000),
              createdById: startedBy || 'system',
            }, tx);
            console.log(`[Mirror Start] Recorded mirror processing fee accrual: ₹${autoProcessingFee} in company ${mirrorCompanyId} inside transaction`);
          }

          console.log(`[Mirror Start] ✅ ${mirrorLoan.loanNumber} activated | Shifted schedule | PF ₹${autoProcessingFee} inside transaction`);
        }
      }

      return { updatedLoan, emis };
    });
    // ── END MIRROR CASCADE ────────────────────────────────────────────────────

    // Broadcast real-time refresh
    setImmediate(() => {
      import('@/lib/socket-emit').then(m => m.emitDashboardRefresh({ companyId: companyId || '' })).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      loan: result.updatedLoan,
      emiDetails: {
        emiAmount,
        totalInterest: emiCalc.totalInterest,
        totalAmount: emiCalc.totalAmount,
        tenure,
        interestRate,
        interestType: actualInterestType,
        principalAmount,
        processingFee: parsedProcessingFee,
        emiCount: result.emis.length
      },
      message: `Loan started successfully! EMI: ₹${emiAmount.toFixed(2)}/month for ${tenure} months`
    });

  } catch (error) {
    console.error('Start offline loan error:', error);
    return NextResponse.json({ error: 'Failed to start loan', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// GET - Preview EMI calculation for starting offline loan (includes processing fee preview)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId          = searchParams.get('loanId');
    const tenure          = parseInt(searchParams.get('tenure') || '0');
    const interestRate    = parseFloat(searchParams.get('interestRate') || '0');
    const interestTypeParam = searchParams.get('interestType');

    if (!loanId) return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });

    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: { company: { select: { id: true, name: true, code: true } } }
    });

    if (!loan) return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });

    const principalAmount    = loan.loanAmount;
    const defaultTenure      = tenure || loan.tenure || 12;
    const defaultRate        = interestRate || loan.interestRate || 12;
    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestTypeParam === 'REDUCING' ? 'REDUCING' :
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    const emiCalc = calculateEMI(principalAmount, defaultRate, defaultTenure, actualInterestType, new Date());

    // Calculate processing fee from mirror mapping if it exists
    let processingFeePreview = 0;
    let mirrorRateUsed = 0;
    let isMirrorLoan = false;
    let extraEMICount = 0;
    try {
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: {
          OR: [
            { originalLoanId: loanId },
            { mirrorLoanId: loanId }
          ],
          isOfflineLoan: true
        }
      });
      if (mirrorMapping) {
        isMirrorLoan = (loanId === mirrorMapping.mirrorLoanId);
        const mirrorRate = mirrorMapping.mirrorInterestRate || defaultRate;
        const mirrorType = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';
        mirrorRateUsed = mirrorRate;
        const mirrorCalc = calculateMirrorLoan(
          principalAmount, defaultRate, defaultTenure, actualInterestType, mirrorRate, mirrorType
        );
        processingFeePreview = mirrorCalc.processingFee;
        extraEMICount = mirrorCalc.extraEMICount;
      }
    } catch { /* non-fatal — no mirror mapping */ }

    return NextResponse.json({
      success: true,
      loan: {
        id: loan.id,
        loanNumber: loan.loanNumber,
        status: loan.status,
        customerName: loan.customerName,
        customerPhone: loan.customerPhone,
        company: loan.company,
        principalAmount,
        isInterestOnlyLoan: loan.isInterestOnlyLoan,
        interestOnlyMonthlyAmount: loan.interestOnlyMonthlyAmount,
        interestType: actualInterestType,
      },
      preview: {
        emiAmount: emiCalc.emi,
        totalInterest: emiCalc.totalInterest,
        totalAmount: emiCalc.totalAmount,
        tenure: defaultTenure,
        interestRate: defaultRate,
        interestType: actualInterestType,
        principalAmount,
        processingFee: processingFeePreview,
        mirrorRate: mirrorRateUsed,
        isMirrorLoan,
        extraEMICount,
        schedulePreview: emiCalc.schedule.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Preview EMI calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate EMI preview', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
