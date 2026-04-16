import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Calculate foreclosure data for an offline loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    if (!loanId) return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });

    const loan = await (db.offlineLoan as any).findUnique({
      where: { id: loanId },
      include: { emis: { orderBy: { installmentNumber: 'asc' } } }
    });

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    // Query mirror mapping separately (no Prisma FK on OfflineLoan)
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany:   { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    const now     = new Date();
    const emis    = (loan.emis ?? []) as any[];
    const unpaid  = emis.filter((e: any) => e.paymentStatus !== 'PAID');
    const paidCnt = emis.length - unpaid.length;

    let totalPrincipal = 0;
    let totalInterest  = 0;
    const emiDetails = unpaid.map((emi: any) => {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      // Use paidPrincipal if available, fallback to interest-first from paidAmount
      const paidP = emi.paidPrincipal != null
        ? Number(emi.paidPrincipal)
        : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
      const paidI = emi.paidInterest != null
        ? Number(emi.paidInterest)
        : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));

      const remainingP = Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
      const remainingI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - paidI) : 0;

      totalPrincipal += remainingP;
      totalInterest  += remainingI;

      return {
        installmentNumber: emi.installmentNumber,
        dueDate:           emi.dueDate,
        totalAmount:       Number(emi.totalAmount ?? 0),
        paidAmount:        Number(emi.paidAmount  ?? 0),
        remainingAmount:   Number(emi.totalAmount ?? 0) - Number(emi.paidAmount ?? 0),
        principalToPay:    remainingP,
        interestToPay:     remainingI,
        monthHasStarted,
        amountToPay:       remainingP + remainingI,
      };
    });

    const originalRemainingAmount = unpaid.reduce(
      (s: number, e: any) => s + Number(e.totalAmount ?? 0) - Number(e.paidAmount ?? 0), 0);
    const totalForeclosureAmount = totalPrincipal + totalInterest;
    const savings = originalRemainingAmount - totalForeclosureAmount;

    return NextResponse.json({
      success: true,
      foreclosure: {
        loanId,
        applicationNo: loan.loanNumber,
        customer:      { id: loan.id, name: loan.customerName, phone: loan.customerPhone },
        unpaidEMICount: unpaid.length,
        totalEMIs:      emis.length,
        paidEMIs:       paidCnt,
        originalRemainingAmount,
        totalPrincipal,
        totalInterest,
        totalForeclosureAmount,
        savings,
        interestRate: loan.interestRate,
        emiDetails,
        mirrorLoan: mirrorMapping
          ? {
              isMirrorLoan:    true,
              mirrorCompany:   mirrorMapping.mirrorCompany,
              originalCompany: mirrorMapping.originalCompany,
            }
          : { isMirrorLoan: false },
      }
    });
  } catch (error: any) {
    console.error('[OfflineLoan/Close GET]', error);
    return NextResponse.json({ error: 'Failed to calculate foreclosure', details: error?.message }, { status: 500 });
  }
}

// POST - Close an offline loan (PAYMENT or LOSS write-off)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, userId, companyId, paymentMode, creditType, remarks, closeType } = body;

    if (!loanId || !userId) {
      return NextResponse.json({ error: 'Loan ID and User ID required' }, { status: 400 });
    }

    const loan = await (db.offlineLoan as any).findUnique({
      where: { id: loanId },
      include: { emis: { orderBy: { installmentNumber: 'asc' } } }
    });

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    const now   = new Date();
    const user  = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Find mirror mapping — we close mirror too if it exists
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });

    const effectiveCompanyId = companyId || loan.companyId || '';
    const emis               = (loan.emis ?? []) as any[];
    const unpaidEMIs         = emis.filter((e: any) => e.paymentStatus !== 'PAID');
    const accountingWarnings: string[] = [];

    // ─── Helper: close mirror loan ────────────────────────────────────────────
    const closeMirrorLoan = async () => {
      if (!mirrorMapping?.mirrorLoanId) return;
      try {
        const mirrorLoan = await (db.offlineLoan as any).findUnique({
          where:   { id: mirrorMapping.mirrorLoanId },
          include: { emis: { orderBy: { installmentNumber: 'asc' } } }
        });
        if (!mirrorLoan || mirrorLoan.status === 'CLOSED') return;
        const mirrorUnpaid = ((mirrorLoan.emis ?? []) as any[]).filter((e: any) => e.paymentStatus !== 'PAID');
        await db.$transaction(async (tx) => {
          for (const emi of mirrorUnpaid) {
            await (tx.offlineLoanEMI as any).update({
              where: { id: emi.id },
              data:  {
                paymentStatus:   'PAID',
                paidAmount:      Number(emi.totalAmount ?? 0),
                paidPrincipal:   Number(emi.principalAmount ?? 0),
                paidInterest:    Number(emi.interestAmount ?? 0),
                paidDate:        now,
                collectedById:   userId,
                collectedByName: user.name,
                collectedAt:     now,
              }
            });
          }
          await db.offlineLoan.update({ where: { id: mirrorMapping.mirrorLoanId! }, data: { status: 'CLOSED' } });
        });
        console.log(`[Close] ✅ Mirror loan ${mirrorLoan.loanNumber} also closed`);
      } catch (e: any) {
        console.error('[Close] ❌ Mirror loan close failed:', e?.message);
        accountingWarnings.push(`Mirror loan close failed: ${e?.message}`);
      }
    };

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      let totalRemainingPrincipal = 0;
      let totalRemainingInterest  = 0;
      for (const emi of unpaidEMIs) {
        const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
          : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
        const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
          : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
        totalRemainingPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
        totalRemainingInterest  += Math.max(0, Number(emi.interestAmount  ?? 0) - paidI);
      }
      const totalWriteOff = totalRemainingPrincipal + totalRemainingInterest;

      await db.$transaction(async (tx) => {
        for (const emi of unpaidEMIs) {
          await (tx.offlineLoanEMI as any).update({
            where: { id: emi.id },
            data: {
              paymentStatus:   'PAID',
              paidAmount:      Number(emi.totalAmount       ?? 0),
              paidPrincipal:   Number(emi.principalAmount   ?? 0),
              paidInterest:    Number(emi.interestAmount    ?? 0),
              paidDate:        now,
              collectedById:   userId,
              collectedByName: user.name,
              collectedAt:     now,
            }
          });
        }
        await db.offlineLoan.update({ where: { id: loanId }, data: { status: 'CLOSED' } });
        await db.actionLog.create({
          data: {
            userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
            recordId: loanId, recordType: 'OfflineLoan',
            description: `Loan ${loan.loanNumber} written off as loss. P:₹${totalRemainingPrincipal.toFixed(2)}, I:₹${totalRemainingInterest.toFixed(2)}`,
            canUndo: false,
          }
        });
      });

      // Close mirror too
      await closeMirrorLoan();

      // Irrecoverable Debts journal entry
      if (effectiveCompanyId && totalWriteOff > 0) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          (AccountingService as any).initializedCompanies?.delete(effectiveCompanyId);
          const accSvc = new AccountingService(effectiveCompanyId);
          await accSvc.initializeChartOfAccounts();
          await accSvc.createJournalEntry({
            entryDate:     now,
            referenceType: 'PRINCIPAL_ONLY_PAYMENT',
            referenceId:   `${loanId}-LOSS-WRITEOFF`,
            narration:     `Loan ${loan.loanNumber} written off (${remarks || 'irrecoverable loss'}) P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${totalRemainingInterest.toFixed(2)}`,
            lines: [
              { accountCode: '5500', debitAmount: totalWriteOff, creditAmount: 0, loanId, narration: 'Write-off to Irrecoverable Debts (P+I)' },
              { accountCode: '1200', debitAmount: 0, creditAmount: totalWriteOff, loanId, narration: `Loan ${loan.loanNumber} removed from Loans Receivable` },
            ],
            createdById: userId,
            isAutoEntry: true,
          });
          console.log(`[Close/Loss] ✅ Write-off journal: ₹${totalWriteOff} → Irrecoverable Debts (5500)`);
        } catch (e: any) {
          const msg = `Write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss] ❌', msg);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Loan ${loan.loanNumber} written off as irrecoverable loss (P:₹${totalRemainingPrincipal.toFixed(2)} + I:₹${totalRemainingInterest.toFixed(2)} = ₹${totalWriteOff.toFixed(2)})`,
        accountingOk: accountingWarnings.length === 0,
        accountingWarnings,
      });
    }

    // ─── B. FORECLOSURE (collect payment) ────────────────────────────────────
    const isOnlineMode = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'ONLINE'].includes(
      (paymentMode || '').toUpperCase()
    );

    let totalPrincipal = 0;
    let totalInterest  = 0;
    for (const emi of unpaidEMIs) {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
        : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
      totalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
      if (monthHasStarted) {
        const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
          : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
        totalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
      }
    }
    const totalForeclosureAmount = totalPrincipal + totalInterest;

    await db.$transaction(async (tx) => {
      for (const emi of unpaidEMIs) {
        const monthHasStarted = new Date(emi.dueDate) <= now;
        const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
          : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
        const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
          : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
        const collectP = Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
        const collectI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - paidI) : 0;
        await (tx.offlineLoanEMI as any).update({
          where: { id: emi.id },
          data: {
            paymentStatus:   'PAID',
            paidAmount:      Number(emi.paidAmount ?? 0) + collectP + collectI,
            paidPrincipal:   Number(emi.principalAmount ?? 0),
            paidInterest:    monthHasStarted ? Number(emi.interestAmount ?? 0) : paidI,
            paymentMode,
            paidDate:        now,
            collectedById:   userId,
            collectedByName: user.name,
            collectedAt:     now,
          }
        });
      }
      await db.offlineLoan.update({ where: { id: loanId }, data: { status: 'CLOSED' } });
      await db.actionLog.create({
        data: {
          userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
          recordId: loanId, recordType: 'OfflineLoan',
          description: `Loan ${loan.loanNumber} closed. Foreclosure: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
          canUndo: false,
        }
      });
    });

    // Close mirror too
    await closeMirrorLoan();

    // Cashbook / bank entry
    if (effectiveCompanyId && totalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const entryArgs = {
          companyId:     effectiveCompanyId,
          amount:        totalForeclosureAmount,
          description:   `Foreclosure - ${loan.loanNumber} (P:₹${totalPrincipal.toFixed(2)} + I:₹${totalInterest.toFixed(2)})`,
          referenceType: 'EMI_PAYMENT' as const,
          referenceId:   `${loanId}-FORECLOSURE`,
          createdById:   userId,
        };
        if (isOnlineMode) {
          await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
        } else {
          await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
        }
      } catch (e: any) {
        const msg = `Cashbook entry failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌', msg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.loanNumber} closed. ₹${totalForeclosureAmount.toFixed(2)} collected via ${paymentMode}.`,
      accountingOk: accountingWarnings.length === 0,
      accountingWarnings,
    });
  } catch (error: any) {
    console.error('[OfflineLoan/Close POST]', error);
    return NextResponse.json({ error: 'Failed to close loan', details: error?.message }, { status: 500 });
  }
}
