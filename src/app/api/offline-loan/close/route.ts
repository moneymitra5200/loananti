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
    // INTEREST_ONLY_PAID: interest collected, principal deferred to a new EMI record.
    // That deferred EMI is already in the schedule — DO NOT double-count the original.
    const isCloseable = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaid  = emis.filter(isCloseable);
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
    // lossType: 'PRINCIPAL_AND_INTEREST' (default) | 'PRINCIPAL_ONLY'
    const { loanId, userId, companyId, paymentMode, creditType, remarks, closeType, lossType } = body;

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

    let effectiveCompanyId = companyId || loan.companyId || '';
    // If still empty, resolve to first available company (OfflineLoan.companyId is nullable)
    if (!effectiveCompanyId) {
      const firstCompany = await db.company.findFirst({ select: { id: true } });
      if (firstCompany) effectiveCompanyId = firstCompany.id;
    }
    const emis               = (loan.emis ?? []) as any[];
    // INTEREST_ONLY_PAID: interest collected, principal deferred to a new EMI — skip.
    const isCloseable         = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs          = emis.filter(isCloseable);
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

        // Use batch updates — no interactive transaction needed for simple status updates
        for (const emi of mirrorUnpaid) {
          await (db.offlineLoanEMI as any).update({
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
        await db.offlineLoan.update({ where: { id: mirrorMapping.mirrorLoanId! }, data: { status: 'CLOSED', closedAt: now } });
        console.log(`[Close] ✅ Mirror loan ${mirrorLoan.loanNumber} also closed`);
      } catch (e: any) {
        console.error('[Close] ❌ Mirror loan close failed:', e?.message);
        accountingWarnings.push(`Mirror loan close failed: ${e?.message}`);
      }
    };

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      const writeOffInterest = lossType === 'PRINCIPAL_ONLY'; // true = only write off principal
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

      // If PRINCIPAL_ONLY, we only write off principal; interest is waived silently
      const totalWriteOff = writeOffInterest
        ? totalRemainingPrincipal
        : totalRemainingPrincipal + totalRemainingInterest;

      // ── Core DB ops (fast — just status updates + loan close) ──────────────
      // actionLog is OUTSIDE the transaction to prevent P2028 timeout
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
        await db.offlineLoan.update({ where: { id: loanId }, data: { status: 'CLOSED', closedAt: now } });
      }, { maxWait: 15000, timeout: 30000 });

      // ── ActionLog OUTSIDE transaction (fire-and-forget to avoid P2028) ─────
      db.actionLog.create({
        data: {
          userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
          recordId: loanId, recordType: 'OfflineLoan',
          description: `Loan ${loan.loanNumber} written off as loss (${writeOffInterest ? 'Principal Only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)}, I written off:₹${writeOffInterest ? 0 : totalRemainingInterest.toFixed(2)}`,
          canUndo: false,
        }
      }).catch(e => console.error('[Close/Loss] ActionLog failed (non-critical):', e));

      // Close mirror too
      await closeMirrorLoan();

      // ── Accounting: Irrecoverable Debt journal — ORIGINAL COMPANY ────────────
      if (effectiveCompanyId && totalWriteOff > 0) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          const accSvc = new AccountingService(effectiveCompanyId);
          await accSvc.initializeChartOfAccounts();
          await accSvc.createJournalEntry({
            entryDate:     now,
            referenceType: 'PRINCIPAL_ONLY_PAYMENT',
            referenceId:   `${loanId}-LOSS-WRITEOFF`,
            narration:     `Loan ${loan.loanNumber} written off (${remarks || (writeOffInterest ? 'principal-only irrecoverable loss' : 'irrecoverable loss')}) P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${writeOffInterest ? 0 : totalRemainingInterest.toFixed(2)}`,
            lines: [
              { accountCode: '5500', debitAmount: totalWriteOff, creditAmount: 0, narration: `Write-off to Irrecoverable Debt (${writeOffInterest ? 'P-only' : 'P+I'})` },
              { accountCode: '1200', debitAmount: 0, creditAmount: totalWriteOff, narration: `Loan ${loan.loanNumber} removed from Loans Receivable` },
            ],
            createdById: userId,
            isAutoEntry: true,
          });
          console.log(`[Close/Loss] ✅ Write-off journal (original co.): ₹${totalWriteOff}`);
        } catch (e: any) {
          const msg = `Write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss] ❌', msg);
        }
      }

      // ── Accounting: Irrecoverable Debt journal — MIRROR COMPANY ──────────────
      if (mirrorMapping?.mirrorLoanId && mirrorMapping?.mirrorCompanyId) {
        try {
          // Fetch mirror loan EMIs to get mirror-specific figures
          const mirrorLoan = await (db.offlineLoan as any).findUnique({
            where: { id: mirrorMapping.mirrorLoanId },
            include: { emis: true }
          });
          if (mirrorLoan) {
            const mirrorUnpaid = ((mirrorLoan.emis ?? []) as any[]).filter((e: any) =>
              !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus)
            );
            let mirrorP = 0, mirrorI = 0;
            for (const e of mirrorUnpaid) {
              const pP = e.paidPrincipal != null ? Number(e.paidPrincipal) : Math.max(0, Number(e.paidAmount ?? 0) - Number(e.interestAmount ?? 0));
              const pI = e.paidInterest != null ? Number(e.paidInterest) : Math.min(Number(e.paidAmount ?? 0), Number(e.interestAmount ?? 0));
              mirrorP += Math.max(0, Number(e.principalAmount ?? 0) - pP);
              mirrorI += Math.max(0, Number(e.interestAmount  ?? 0) - pI);
            }
            const mirrorWriteOff = writeOffInterest ? mirrorP : mirrorP + mirrorI;
            if (mirrorWriteOff > 0) {
              const { AccountingService } = await import('@/lib/accounting-service');
              const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
              await mirrorAccSvc.initializeChartOfAccounts();
              await mirrorAccSvc.createJournalEntry({
                entryDate:     now,
                referenceType: 'PRINCIPAL_ONLY_PAYMENT',
                referenceId:   `${mirrorMapping.mirrorLoanId}-LOSS-WRITEOFF`,
                narration:     `[MIRROR] Loan ${mirrorLoan.loanNumber} written off (${writeOffInterest ? 'P-only' : 'P+I'}) P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)}`,
                lines: [
                  { accountCode: '5500', debitAmount: mirrorWriteOff, creditAmount: 0, narration: `[MIRROR] Write-off to Irrecoverable Debt` },
                  { accountCode: '1200', debitAmount: 0, creditAmount: mirrorWriteOff, narration: `[MIRROR] Loan ${mirrorLoan.loanNumber} removed from Loans Receivable` },
                ],
                createdById: userId,
                isAutoEntry: true,
              });
              console.log(`[Close/Loss] ✅ Mirror write-off journal: ₹${mirrorWriteOff} in mirror co. ${mirrorMapping.mirrorCompanyId}`);
            }
          }
        } catch (e: any) {
          const msg = `Mirror write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss Mirror] ❌', msg);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Loan ${loan.loanNumber} written off as irrecoverable loss (${writeOffInterest ? 'Principal Only' : 'P+I'}: ₹${totalWriteOff.toFixed(2)})`,
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

    // ── Core DB ops (fast — just status + loan close) ─────────────────────
    // actionLog is OUTSIDE the transaction to prevent P2028 timeout
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
      await db.offlineLoan.update({ where: { id: loanId }, data: { status: 'CLOSED', closedAt: now } });
    }, { maxWait: 15000, timeout: 30000 });

    // ── ActionLog OUTSIDE transaction (fire-and-forget to avoid P2028) ─────
    db.actionLog.create({
      data: {
        userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
        recordId: loanId, recordType: 'OfflineLoan',
        description: `Loan ${loan.loanNumber} closed. Foreclosure: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
        canUndo: false,
      }
    }).catch(e => console.error('[Close/Payment] ActionLog failed (non-critical):', e));

    // Close mirror too
    await closeMirrorLoan();

    // ── Accounting: Cash or Bank entry ────────────────────────────────────────
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
          console.log(`[Close/Payment] ✅ Bank entry: ₹${totalForeclosureAmount} CREDIT`);
        } else {
          await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Cashbook entry: ₹${totalForeclosureAmount} CREDIT`);
        }
      } catch (e: any) {
        const msg = `Cashbook/Bank entry failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌', msg);
      }
    }

    // ── Accounting: Double-entry journal — ORIGINAL COMPANY ──────────────────
    if (effectiveCompanyId && totalForeclosureAmount > 0) {
      try {
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        const accSvc = new AccountingService(effectiveCompanyId);
        await accSvc.initializeChartOfAccounts();
        await accSvc.createJournalEntry({
          entryDate:     now,
          referenceType: 'EMI_PAYMENT',
          referenceId:   `${loanId}-FORECLOSURE-JE`,
          narration:     `Foreclosure - ${loan.loanNumber} — P:₹${totalPrincipal.toFixed(2)} I:₹${totalInterest.toFixed(2)} via ${paymentMode}`,
          lines: [
            { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: totalForeclosureAmount, creditAmount: 0, narration: `Foreclosure collected (${paymentMode})` },
            { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalPrincipal, narration: `Loan principal recovered` },
            ...(totalInterest > 0 ? [{ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalInterest, narration: `Interest income on foreclosure` }] : []),
          ],
          createdById: userId,
          isAutoEntry: true,
        });
        console.log(`[Close/Payment] ✅ Foreclosure journal (original co.) created`);
      } catch (e: any) {
        const msg = `Foreclosure journal failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌ Journal', msg);
      }
    }

    // ── Accounting: Double-entry journal + cash/bank — MIRROR COMPANY ─────────
    if (mirrorMapping?.mirrorLoanId && mirrorMapping?.mirrorCompanyId) {
      try {
        const mirrorLoan = await (db.offlineLoan as any).findUnique({
          where: { id: mirrorMapping.mirrorLoanId },
          include: { emis: { orderBy: { installmentNumber: 'asc' } } }
        });
        if (mirrorLoan) {
          const mirrorUnpaid = ((mirrorLoan.emis ?? []) as any[]).filter((e: any) =>
            !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus)
          );
          let mirrorP = 0, mirrorI = 0;
          for (const e of mirrorUnpaid) {
            const monthHasStarted = new Date(e.dueDate) <= now;
            const pP = e.paidPrincipal != null ? Number(e.paidPrincipal) : Math.max(0, Number(e.paidAmount ?? 0) - Number(e.interestAmount ?? 0));
            const pI = e.paidInterest != null ? Number(e.paidInterest) : Math.min(Number(e.paidAmount ?? 0), Number(e.interestAmount ?? 0));
            mirrorP += Math.max(0, Number(e.principalAmount ?? 0) - pP);
            if (monthHasStarted) mirrorI += Math.max(0, Number(e.interestAmount ?? 0) - pI);
          }
          const mirrorTotal = mirrorP + mirrorI;
          if (mirrorTotal > 0) {
            const { AccountingService, ACCOUNT_CODES, recordCashBookEntry, recordBankTransaction } = await import('@/lib/accounting-service').then(async (m) => ({ ...m, ...(await import('@/lib/simple-accounting')) }));
            const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
            await mirrorAccSvc.initializeChartOfAccounts();
            // Cash/bank entry in mirror company
            if (isOnlineMode) {
              const { recordBankTransaction: rbt } = await import('@/lib/simple-accounting');
              await rbt({ companyId: mirrorMapping.mirrorCompanyId, transactionType: 'CREDIT', amount: mirrorTotal, description: `[MIRROR] Foreclosure - ${mirrorLoan.loanNumber} P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)}`, referenceType: 'EMI_PAYMENT', referenceId: `${mirrorMapping.mirrorLoanId}-FORECLOSURE`, createdById: userId });
            } else {
              const { recordCashBookEntry: rce } = await import('@/lib/simple-accounting');
              await rce({ companyId: mirrorMapping.mirrorCompanyId, entryType: 'CREDIT', amount: mirrorTotal, description: `[MIRROR] Foreclosure - ${mirrorLoan.loanNumber} P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)}`, referenceType: 'EMI_PAYMENT', referenceId: `${mirrorMapping.mirrorLoanId}-FORECLOSURE`, createdById: userId });
            }
            // Double-entry journal in mirror company
            await mirrorAccSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'EMI_PAYMENT',
              referenceId:   `${mirrorMapping.mirrorLoanId}-FORECLOSURE-JE`,
              narration:     `[MIRROR] Foreclosure - ${mirrorLoan.loanNumber} P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)} via ${paymentMode}`,
              lines: [
                { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: mirrorTotal, creditAmount: 0, narration: `[MIRROR] Foreclosure collected (${paymentMode})` },
                { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: mirrorP, narration: `[MIRROR] Principal recovered` },
                ...(mirrorI > 0 ? [{ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: mirrorI, narration: `[MIRROR] Interest income on foreclosure` }] : []),
              ],
              createdById: userId,
              isAutoEntry: true,
            });
            console.log(`[Close/Payment] ✅ Mirror foreclosure journal: ₹${mirrorTotal} in co. ${mirrorMapping.mirrorCompanyId}`);
          }
        }
      } catch (e: any) {
        const msg = `Mirror foreclosure accounting failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment Mirror] ❌', msg);
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
