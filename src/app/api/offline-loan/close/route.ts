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

    // Mirror mapping (no Prisma FK — query separately)
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany:   { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    const now = new Date();
    const emis = (loan.emis ?? []) as any[];
    const unpaidEMIs = emis.filter((e: any) => e.paymentStatus !== 'PAID');
    const paidCount  = emis.length - unpaidEMIs.length;

    let totalPrincipal = 0;
    let totalInterest  = 0;
    const emiDetails = unpaidEMIs.map((emi: any) => {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      const remainingP = Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
      const remainingI = monthHasStarted
        ? Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0))
        : 0;

      totalPrincipal += remainingP;
      totalInterest  += remainingI;

      return {
        installmentNumber: emi.installmentNumber,
        dueDate:           emi.dueDate,
        totalAmount:       Number(emi.totalAmount ?? 0),
        paidAmount:        Number(emi.paidAmount ?? 0),
        remainingAmount:   Number(emi.totalAmount ?? 0) - Number(emi.paidAmount ?? 0),
        principalToPay:    remainingP,
        interestToPay:     remainingI,
        monthHasStarted,
        amountToPay:       remainingP + remainingI,
      };
    });

    const originalRemainingAmount = unpaidEMIs.reduce(
      (s: number, e: any) => s + Number(e.totalAmount ?? 0) - Number(e.paidAmount ?? 0), 0);
    const totalForeclosureAmount = totalPrincipal + totalInterest;
    const savings = originalRemainingAmount - totalForeclosureAmount;

    return NextResponse.json({
      success: true,
      foreclosure: {
        loanId:                   loan.id,
        applicationNo:            loan.loanNumber,
        customer:                 { id: loan.id, name: loan.customerName, phone: loan.customerPhone },
        unpaidEMICount:           unpaidEMIs.length,
        totalEMIs:                emis.length,
        paidEMIs:                 paidCount,
        originalRemainingAmount,
        totalPrincipal,
        totalInterest,
        totalForeclosureAmount,
        savings,
        interestRate:             loan.interestRate,
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
  } catch (error) {
    console.error('[OfflineLoan/Close GET]', error);
    return NextResponse.json({ error: 'Failed to calculate foreclosure' }, { status: 500 });
  }
}

// POST - Close an offline loan (with payment or write-off as loss)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, userId, paymentMode, remarks, closeType } = body;

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

    const companyId  = loan.companyId || '';
    const emis       = (loan.emis ?? []) as any[];
    const unpaidEMIs = emis.filter((e: any) => e.paymentStatus !== 'PAID');

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      const totalRemainingPrincipal = unpaidEMIs.reduce(
        (s: number, e: any) => s + Math.max(0, Number(e.principalAmount ?? 0) - Number(e.paidPrincipal ?? 0)), 0);
      const totalRemainingInterest = unpaidEMIs.reduce(
        (s: number, e: any) => s + Math.max(0, Number(e.interestAmount ?? 0) - Number(e.paidInterest ?? 0)), 0);
      const totalWriteOff = totalRemainingPrincipal + totalRemainingInterest;

      await db.$transaction(async (tx) => {
        for (const emi of unpaidEMIs) {
          await (tx.offlineLoanEMI as any).update({
            where: { id: emi.id },
            data: {
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
        await db.offlineLoan.update({ where: { id: loanId }, data: { status: 'CLOSED' } });
        await db.actionLog.create({
          data: {
            userId,
            userRole:    user.role,
            actionType:  'CLOSE',
            module:      'OFFLINE_LOAN',
            recordId:    loanId,
            recordType:  'OfflineLoan',
            description: `Offline loan ${loan.loanNumber} written off as irrecoverable loss. P:₹${totalRemainingPrincipal.toFixed(2)}, I:₹${totalRemainingInterest.toFixed(2)}`,
            canUndo:     false,
          }
        });
      });

      // Irrecoverable Debts journal entry
      if (companyId && totalWriteOff > 0) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          (AccountingService as any).initializedCompanies?.delete(companyId);
          const accSvc = new AccountingService(companyId);
          await accSvc.initializeChartOfAccounts();
          await accSvc.createJournalEntry({
            entryDate:     now,
            referenceType: 'PRINCIPAL_ONLY_PAYMENT',
            referenceId:   `${loanId}-LOSS-WRITEOFF`,
            narration:     `Loan ${loan.loanNumber} written off (${remarks || 'irrecoverable loss'}) P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${totalRemainingInterest.toFixed(2)}`,
            lines: [
              { accountCode: '5500', debitAmount: totalWriteOff, creditAmount: 0, loanId, narration: 'Write-off to Irrecoverable Debts' },
              { accountCode: '1210', debitAmount: 0, creditAmount: totalWriteOff, loanId, narration: `Loan ${loan.loanNumber} removed from receivables` },
            ],
            createdById: userId,
            isAutoEntry: true,
          });
          console.log(`[OfflineLoan/Close] ✅ Write-off journal: ₹${totalWriteOff} → Irrecoverable Debts`);
        } catch (e: any) {
          console.error('[OfflineLoan/Close] ❌ Write-off journal failed:', e?.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Loan ${loan.loanNumber} written off as irrecoverable loss (₹${totalWriteOff.toFixed(2)})`,
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
      totalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
      if (monthHasStarted) totalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
    }
    const totalForeclosureAmount = totalPrincipal + totalInterest;

    await db.$transaction(async (tx) => {
      for (const emi of unpaidEMIs) {
        const monthHasStarted = new Date(emi.dueDate) <= now;
        const paidP = Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
        const paidI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0)) : 0;
        await (tx.offlineLoanEMI as any).update({
          where: { id: emi.id },
          data: {
            paymentStatus:   'PAID',
            paidAmount:      Number(emi.paidAmount ?? 0) + paidP + paidI,
            paidPrincipal:   Number(emi.principalAmount ?? 0),
            paidInterest:    monthHasStarted ? Number(emi.interestAmount ?? 0) : Number(emi.paidInterest ?? 0),
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
          userId,
          userRole:    user.role,
          actionType:  'CLOSE',
          module:      'OFFLINE_LOAN',
          recordId:    loanId,
          recordType:  'OfflineLoan',
          description: `Offline loan ${loan.loanNumber} closed. Foreclosure: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
          canUndo:     false,
        }
      });
    });

    // Cashbook / bank entry
    if (companyId && totalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        if (isOnlineMode) {
          await recordBankTransaction({
            companyId,
            transactionType: 'CREDIT',
            amount:          totalForeclosureAmount,
            description:     `Foreclosure - ${loan.loanNumber} (P:₹${totalPrincipal} + I:₹${totalInterest})`,
            referenceType:   'EMI_PAYMENT',
            referenceId:     `${loanId}-FORECLOSURE`,
            createdById:     userId,
          });
        } else {
          await recordCashBookEntry({
            companyId,
            entryType:    'CREDIT',
            amount:       totalForeclosureAmount,
            description:  `Foreclosure - ${loan.loanNumber} (P:₹${totalPrincipal} + I:₹${totalInterest})`,
            referenceType:'EMI_PAYMENT',
            referenceId:  `${loanId}-FORECLOSURE`,
            createdById:  userId,
          });
        }
      } catch (e: any) {
        console.error('[OfflineLoan/Close] Cashbook error:', e?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.loanNumber} closed. ₹${totalForeclosureAmount.toFixed(2)} collected via ${paymentMode}.`,
    });
  } catch (error: any) {
    console.error('[OfflineLoan/Close POST]', error);
    return NextResponse.json({ error: 'Failed to close loan', details: error?.message }, { status: 500 });
  }
}
