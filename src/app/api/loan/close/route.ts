import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Calculate foreclosure amount for an online loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    if (!loanId) return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: true,
        customer:    { select: { id: true, name: true, phone: true } },
        emiSchedules: { orderBy: { installmentNumber: 'asc' } }
      }
    });

    if (!loan || !loan.sessionForm) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    const now = new Date();
    // INTEREST_ONLY_PAID = interest paid, principal deferred to new EMI — already accounted for
    const isCloseable = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs  = loan.emiSchedules.filter(isCloseable);
    const paidCnt     = loan.emiSchedules.length - unpaidEMIs.length;

    if (unpaidEMIs.length === 0) {
      return NextResponse.json({ error: 'No pending EMIs. Loan is already fully paid.' }, { status: 400 });
    }

    let totalPrincipal = 0;
    let totalInterest  = 0;
    const emiDetails = unpaidEMIs.map((emi) => {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      const paidP = Number(emi.paidPrincipal ?? 0);
      const paidI = Number(emi.paidInterest  ?? 0);
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
        principalToPay:   remainingP,
        interestToPay:    remainingI,
        monthHasStarted,
        amountToPay:      remainingP + remainingI,
      };
    });

    const originalRemainingAmount = unpaidEMIs.reduce(
      (s, e) => s + Number(e.totalAmount ?? 0) - Number(e.paidAmount ?? 0), 0);
    const totalForeclosureAmount = totalPrincipal + totalInterest;
    const savings = originalRemainingAmount - totalForeclosureAmount;

    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany:   { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    return NextResponse.json({
      success: true,
      foreclosure: {
        loanId,
        applicationNo:          loan.applicationNo,
        customer:               loan.customer,
        unpaidEMICount:         unpaidEMIs.length,
        totalEMIs:              loan.sessionForm.tenure,
        paidEMIs:               paidCnt,
        originalRemainingAmount,
        totalPrincipal,
        totalInterest,
        totalForeclosureAmount,
        savings,
        interestRate:           loan.sessionForm.interestRate,
        emiDetails,
        mirrorLoan: mirrorMapping
          ? { isMirrorLoan: true, mirrorCompany: mirrorMapping.mirrorCompany, originalCompany: mirrorMapping.originalCompany }
          : { isMirrorLoan: false },
      }
    });

  } catch (error: any) {
    console.error('[OnlineLoan/Close GET]', error);
    return NextResponse.json({ error: 'Failed to calculate foreclosure', details: error?.message }, { status: 500 });
  }
}

// POST - Close an online loan (PAYMENT foreclosure OR LOSS write-off)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // closeType: 'PAYMENT' | 'LOSS'
    // lossType:  'PRINCIPAL_AND_INTEREST' | 'PRINCIPAL_ONLY'
    const { loanId, userId, companyId, paymentMode, creditType, remarks, closeType, lossType } = body;

    if (!loanId || !userId) {
      return NextResponse.json({ error: 'Loan ID and User ID required' }, { status: 400 });
    }

    const loan = await db.loanApplication.findUnique({
      where:   { id: loanId },
      include: {
        sessionForm:  true,
        customer:     { select: { id: true, name: true, phone: true } },
        emiSchedules: { orderBy: { installmentNumber: 'asc' } },
        company:      true,
      }
    });

    if (!loan)               return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });

    const now  = new Date();
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });

    const effectiveCompanyId = companyId || loan.companyId || '';
    const isCloseable        = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs         = loan.emiSchedules.filter(isCloseable);
    const accountingWarnings: string[] = [];

    // ─── Helper: close online mirror loan ────────────────────────────────────
    const closeMirrorLoan = async () => {
      if (!mirrorMapping?.mirrorLoanId) return;
      try {
        const mirrorLoan = await db.loanApplication.findUnique({
          where:   { id: mirrorMapping.mirrorLoanId },
          include: { emiSchedules: true }
        });
        if (!mirrorLoan || mirrorLoan.status === 'CLOSED') return;
        const mirrorUnpaid = mirrorLoan.emiSchedules.filter(isCloseable);
        for (const emi of mirrorUnpaid) {
          await db.eMISchedule.update({
            where: { id: emi.id },
            data:  {
              paymentStatus: 'PAID',
              paidAmount:    Number(emi.totalAmount    ?? 0),
              paidPrincipal: Number(emi.principalAmount ?? 0),
              paidInterest:  Number(emi.interestAmount   ?? 0),
              paidDate:      now,
              paymentMode:   paymentMode || 'CASH',
            }
          });
        }
        await db.loanApplication.update({
          where: { id: mirrorMapping.mirrorLoanId! },
          data:  { status: 'CLOSED', closedAt: now }
        });
        console.log(`[Close] ✅ Mirror loan ${mirrorLoan.applicationNo} also closed`);
      } catch (e: any) {
        console.error('[Close] ❌ Mirror loan close failed:', e?.message);
        accountingWarnings.push(`Mirror loan close failed: ${e?.message}`);
      }
    };

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      const writeOffInterestOnly = lossType === 'PRINCIPAL_ONLY'; // true = only write off principal
      let totalRemainingPrincipal = 0;
      let totalRemainingInterest  = 0;

      for (const emi of unpaidEMIs) {
        totalRemainingPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
        totalRemainingInterest  += Math.max(0, Number(emi.interestAmount  ?? 0) - Number(emi.paidInterest  ?? 0));
      }

      const totalWriteOff = writeOffInterestOnly
        ? totalRemainingPrincipal
        : totalRemainingPrincipal + totalRemainingInterest;

      // ── Core DB ops — atomic ─────────────────────────────────────────────
      await db.$transaction(async (tx) => {
        for (const emi of unpaidEMIs) {
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data:  {
              paymentStatus: 'PAID',
              paidAmount:    Number(emi.totalAmount    ?? 0),
              paidPrincipal: Number(emi.principalAmount ?? 0),
              paidInterest:  Number(emi.interestAmount   ?? 0),
              paidDate:      now,
              notes:         `Written off as loss (${writeOffInterestOnly ? 'Principal Only' : 'P+I'})`,
            }
          });
        }
        await tx.loanApplication.update({
          where: { id: loanId },
          data:  {
            status:          'CLOSED',
            closedAt:        now,
            rejectionReason: `Loan written off as irrecoverable loss (${writeOffInterestOnly ? 'Principal Only' : 'P+I'}). ₹${totalWriteOff.toFixed(2)} written off. ${remarks || ''}`
          }
        });
      }, { maxWait: 15000, timeout: 30000 });

      // ActionLog — fire-and-forget
      db.actionLog.create({
        data: {
          userId, userRole: user.role, actionType: 'CLOSE', module: 'ONLINE_LOAN',
          recordId: loanId, recordType: 'LoanApplication',
          description: `Loan ${loan.applicationNo} written off as loss (${writeOffInterestOnly ? 'P-only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)}, I:₹${writeOffInterestOnly ? 0 : totalRemainingInterest.toFixed(2)}`,
          canUndo: false,
        }
      }).catch(e => console.error('[Close/Loss] ActionLog failed:', e));

      // Close mirror too
      await closeMirrorLoan();

      // ── Accounting: Irrecoverable Debt write-off journal — ORIGINAL COMPANY
      if (effectiveCompanyId && totalWriteOff > 0) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          const accSvc = new AccountingService(effectiveCompanyId);
          await accSvc.initializeChartOfAccounts();
          await accSvc.createJournalEntry({
            entryDate:     now,
            referenceType: 'PRINCIPAL_ONLY_PAYMENT',
            referenceId:   `${loanId}-LOSS-WRITEOFF`,
            narration:     `Loan ${loan.applicationNo} written off (${writeOffInterestOnly ? 'P-only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${writeOffInterestOnly ? 0 : totalRemainingInterest.toFixed(2)}. ${remarks || ''}`,
            lines: [
              // Dr Irrecoverable Debt (expense) — the loss
              { accountCode: '5500', debitAmount: totalWriteOff,  creditAmount: 0,             narration: `Write-off to Irrecoverable Debt (${writeOffInterestOnly ? 'P-only' : 'P+I'})` },
              // Cr Loans Receivable — remove from books
              { accountCode: '1200', debitAmount: 0,              creditAmount: totalWriteOff, narration: `Loan ${loan.applicationNo} removed from Loans Receivable` },
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

      // ── Accounting: Irrecoverable Debt write-off journal — MIRROR COMPANY ──
      if (mirrorMapping?.mirrorLoanId && mirrorMapping?.mirrorCompanyId) {
        try {
          const mirrorLoan = await db.loanApplication.findUnique({
            where: { id: mirrorMapping.mirrorLoanId }, include: { emiSchedules: true }
          });
          if (mirrorLoan) {
            const mirrorUnpaid = mirrorLoan.emiSchedules.filter(isCloseable);
            let mirrorP = 0, mirrorI = 0;
            for (const e of mirrorUnpaid) {
              mirrorP += Math.max(0, Number(e.principalAmount ?? 0) - Number(e.paidPrincipal ?? 0));
              mirrorI += Math.max(0, Number(e.interestAmount  ?? 0) - Number(e.paidInterest  ?? 0));
            }
            const mirrorWriteOff = writeOffInterestOnly ? mirrorP : mirrorP + mirrorI;
            if (mirrorWriteOff > 0) {
              const { AccountingService } = await import('@/lib/accounting-service');
              const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
              await mirrorAccSvc.initializeChartOfAccounts();
              await mirrorAccSvc.createJournalEntry({
                entryDate:     now,
                referenceType: 'PRINCIPAL_ONLY_PAYMENT',
                referenceId:   `${mirrorMapping.mirrorLoanId}-LOSS-WRITEOFF`,
                narration:     `[MIRROR] Loan ${mirrorLoan.applicationNo} written off (${writeOffInterestOnly ? 'P-only' : 'P+I'}) P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)}`,
                lines: [
                  { accountCode: '5500', debitAmount: mirrorWriteOff, creditAmount: 0,            narration: `[MIRROR] Write-off to Irrecoverable Debt` },
                  { accountCode: '1200', debitAmount: 0,              creditAmount: mirrorWriteOff, narration: `[MIRROR] Loan ${mirrorLoan.applicationNo} removed from Loans Receivable` },
                ],
                createdById: userId,
                isAutoEntry: true,
              });
              console.log(`[Close/Loss] ✅ Mirror write-off journal: ₹${mirrorWriteOff} in co. ${mirrorMapping.mirrorCompanyId}`);
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
        message: `Loan ${loan.applicationNo} written off as irrecoverable loss (${writeOffInterestOnly ? 'Principal Only' : 'P+I'}: ₹${totalWriteOff.toFixed(2)})`,
        accountingOk: accountingWarnings.length === 0,
        accountingWarnings,
      });
    }

    // ─── B. FORECLOSURE — COLLECT PAYMENT ────────────────────────────────────
    const isOnlineMode = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'ONLINE'].includes(
      (paymentMode || '').toUpperCase()
    );

    let totalPrincipal = 0;
    let totalInterest  = 0;
    for (const emi of unpaidEMIs) {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      totalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
      if (monthHasStarted) {
        totalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
      }
    }
    const totalForeclosureAmount = totalPrincipal + totalInterest;

    // ── Core DB ops — atomic ─────────────────────────────────────────────────
    const paymentRecord = await db.$transaction(async (tx) => {
      for (const emi of unpaidEMIs) {
        const monthHasStarted = new Date(emi.dueDate) <= now;
        const collectP = Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
        const collectI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0)) : 0;
        await tx.eMISchedule.update({
          where: { id: emi.id },
          data:  {
            paymentStatus: 'PAID',
            paidAmount:    Number(emi.paidAmount    ?? 0) + collectP + collectI,
            paidPrincipal: Number(emi.principalAmount ?? 0),
            paidInterest:  monthHasStarted ? Number(emi.interestAmount ?? 0) : Number(emi.paidInterest ?? 0),
            paidDate:      now,
            paymentMode,
            notes:         `Foreclosure payment — Loan closed`,
          }
        });
      }

      await tx.loanApplication.update({
        where: { id: loanId },
        data:  {
          status:          'CLOSED',
          closedAt:        now,
          rejectionReason: `Loan closed via foreclosure. Amount: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}. ${remarks || ''}`
        }
      });

      // Create payment record
      const pmt = await tx.payment.create({
        data: {
          loanApplicationId: loanId,
          customerId:        loan.customerId,
          amount:            totalForeclosureAmount,
          principalComponent: totalPrincipal,
          interestComponent:  totalInterest,
          paymentType:       'FORECLOSURE' as any,
          paymentMode:       paymentMode,
          status:            'COMPLETED',
          paidById:          userId,
          remarks:           remarks || `Foreclosure — Loan ${loan.applicationNo}`,
          receiptGenerated:  false,
        }
      });

      // Credit update
      const effectiveCreditType = creditType === 'PERSONAL' ? 'PERSONAL' : 'COMPANY';
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data:  {
          credit:         { increment: totalForeclosureAmount },
          personalCredit: effectiveCreditType === 'PERSONAL' ? { increment: totalForeclosureAmount } : undefined,
          companyCredit:  effectiveCreditType === 'COMPANY'  ? { increment: totalForeclosureAmount } : undefined,
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          transactionType:       effectiveCreditType === 'PERSONAL' ? 'PERSONAL_COLLECTION' : 'CREDIT_INCREASE',
          amount:                totalForeclosureAmount,
          paymentMode:           (paymentMode || 'CASH') as any,
          creditType:            effectiveCreditType as any,
          sourceType:            'FORECLOSURE',
          loanApplicationId:     loanId,
          customerName:          loan.customer?.name,
          loanApplicationNo:     loan.applicationNo,
          companyBalanceAfter:   updatedUser.companyCredit,
          personalBalanceAfter:  updatedUser.personalCredit,
          balanceAfter:          updatedUser.credit,
          description:           `Foreclosure — ${loan.applicationNo} (P:₹${totalPrincipal.toFixed(2)} I:₹${totalInterest.toFixed(2)})`,
          transactionDate:       now,
        }
      });

      return pmt;
    }, { maxWait: 15000, timeout: 30000 });

    // ActionLog — fire-and-forget
    db.actionLog.create({
      data: {
        userId, userRole: user.role, actionType: 'CLOSE', module: 'ONLINE_LOAN',
        recordId: loanId, recordType: 'LoanApplication',
        description: `Loan ${loan.applicationNo} closed via foreclosure. ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
        canUndo: false,
      }
    }).catch(e => console.error('[Close/Payment] ActionLog failed:', e));

    // Close mirror too
    await closeMirrorLoan();

    // ── Accounting: Cash/Bank entry — ORIGINAL COMPANY ───────────────────────
    if (effectiveCompanyId && totalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const entryArgs = {
          companyId:     effectiveCompanyId,
          amount:        totalForeclosureAmount,
          description:   `Foreclosure - ${loan.applicationNo} (P:₹${totalPrincipal.toFixed(2)} + I:₹${totalInterest.toFixed(2)})`,
          referenceType: 'EMI_PAYMENT' as const,
          referenceId:   `${loanId}-FORECLOSURE`,
          createdById:   userId,
        };
        if (isOnlineMode) {
          await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Bank entry: ₹${totalForeclosureAmount}`);
        } else {
          await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Cashbook entry: ₹${totalForeclosureAmount}`);
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
          narration:     `Foreclosure - ${loan.applicationNo} — P:₹${totalPrincipal.toFixed(2)} I:₹${totalInterest.toFixed(2)} via ${paymentMode}`,
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

    // ── Accounting: Cash/Bank + Journal — MIRROR COMPANY ─────────────────────
    if (mirrorMapping?.mirrorLoanId && mirrorMapping?.mirrorCompanyId) {
      try {
        const mirrorLoan = await db.loanApplication.findUnique({
          where: { id: mirrorMapping.mirrorLoanId }, include: { emiSchedules: true }
        });
        if (mirrorLoan) {
          const mirrorUnpaid = mirrorLoan.emiSchedules.filter(isCloseable);
          let mirrorP = 0, mirrorI = 0;
          for (const e of mirrorUnpaid) {
            const monthHasStarted = new Date(e.dueDate) <= now;
            mirrorP += Math.max(0, Number(e.principalAmount ?? 0) - Number(e.paidPrincipal ?? 0));
            if (monthHasStarted) mirrorI += Math.max(0, Number(e.interestAmount ?? 0) - Number(e.paidInterest ?? 0));
          }
          const mirrorTotal = mirrorP + mirrorI;
          if (mirrorTotal > 0) {
            const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
            const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
            const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
            await mirrorAccSvc.initializeChartOfAccounts();
            // Cash/bank in mirror company
            if (isOnlineMode) {
              await recordBankTransaction({ companyId: mirrorMapping.mirrorCompanyId, transactionType: 'CREDIT', amount: mirrorTotal,
                description: `[MIRROR] Foreclosure - ${mirrorLoan.applicationNo} P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)}`,
                referenceType: 'EMI_PAYMENT', referenceId: `${mirrorMapping.mirrorLoanId}-FORECLOSURE`, createdById: userId });
            } else {
              await recordCashBookEntry({ companyId: mirrorMapping.mirrorCompanyId, entryType: 'CREDIT', amount: mirrorTotal,
                description: `[MIRROR] Foreclosure - ${mirrorLoan.applicationNo} P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)}`,
                referenceType: 'EMI_PAYMENT', referenceId: `${mirrorMapping.mirrorLoanId}-FORECLOSURE`, createdById: userId });
            }
            // Double-entry journal in mirror company
            await mirrorAccSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'EMI_PAYMENT',
              referenceId:   `${mirrorMapping.mirrorLoanId}-FORECLOSURE-JE`,
              narration:     `[MIRROR] Foreclosure - ${mirrorLoan.applicationNo} P:₹${mirrorP.toFixed(2)} I:₹${mirrorI.toFixed(2)} via ${paymentMode}`,
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
      message: `Loan ${loan.applicationNo} closed. ₹${totalForeclosureAmount.toFixed(2)} collected via ${paymentMode}.`,
      accountingOk: accountingWarnings.length === 0,
      accountingWarnings,
    });

  } catch (error: any) {
    console.error('[OnlineLoan/Close POST]', error);
    return NextResponse.json({ error: 'Failed to close loan', details: error?.message }, { status: 500 });
  }
}
