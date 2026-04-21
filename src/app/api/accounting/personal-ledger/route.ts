import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Personal Ledger (Khata) API — Mirror-Aware (Corrected)
 *
 * MIRROR RULE (Real Accounting):
 *   • If a loan has a MirrorLoanMapping → the MIRROR company "owns" that receivable.
 *     Show the loan ONLY from the mirror company's perspective. The original company
 *     does NOT carry this receivable — it has been transferred to the mirror company.
 *   • If a loan has NO mirror → the original company owns the receivable. Show normally.
 *
 * This means:
 *   - listCustomersForCompany: exclude original loans that are mirrored to another company.
 *     Include those loans only when viewing the mirror company.
 *   - getPersonalLedger (single customer): same — exclude mirrored original loans from
 *     the online loans list; the mirror loan data IS the correct receivable.
 *
 * Loans Receivable (Control Account) =
 *   SUM of all individual customer outstanding balances (mirror-aware).
 *   This is the subsidiary-to-control reconciliation.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const loanId     = searchParams.get('loanId');
    const companyId  = searchParams.get('companyId');

    // ── LIST customers for a company ─────────────────────────────────────────
    if (!customerId && !loanId) {
      return await listCustomersForCompany(companyId);
    }

    // ── Full ledger for one customer ──────────────────────────────────────────
    if (customerId) {
      return await getPersonalLedger(customerId, companyId);
    }

    // ── Single loan ledger ────────────────────────────────────────────────────
    if (loanId) {
      return await getSingleLoanLedger(loanId);
    }

    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });

  } catch (error: any) {
    console.error('[Personal Ledger] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch personal ledger', details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: get ALL mirrored original loan IDs (globally, or filtered to company)
// ─────────────────────────────────────────────────────────────────────────────
async function getMirroredLoanIds(mirrorCompanyId?: string | null): Promise<Set<string>> {
  const where: any = { isOfflineLoan: false };
  if (mirrorCompanyId) where.mirrorCompanyId = mirrorCompanyId;
  const mappings = await db.mirrorLoanMapping.findMany({ where, select: { originalLoanId: true } });
  return new Set(mappings.map(m => m.originalLoanId));
}

// ─────────────────────────────────────────────────────────────────────────────
// List customers for a company (mirror-aware)
// ─────────────────────────────────────────────────────────────────────────────
async function listCustomersForCompany(companyId: string | null) {
  const result: any[] = [];
  const seenCustomers = new Map<string, any>();

  const addOrMerge = (customerId: string, entry: any) => {
    const existing = seenCustomers.get(customerId);
    if (existing) {
      existing.totalLoans       += entry.totalLoans;
      existing.totalOutstanding += entry.totalOutstanding;
      existing.totalPaid        += entry.totalPaid;
    } else {
      seenCustomers.set(customerId, entry);
      result.push(entry);
    }
  };

  // ── 1. Mirror-mapped loans — show from mirror company perspective ──────────
  if (companyId) {
    // Only include mirror loans when viewing from the MIRROR company's dashboard
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { mirrorCompanyId: companyId, isOfflineLoan: false },
    });

    for (const mapping of mirrorMappings) {
      const loan = await db.loanApplication.findUnique({
        where: { id: mapping.originalLoanId },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          emiSchedules: { select: { paymentStatus: true, totalAmount: true, paidAmount: true } }
        }
      });
      if (!loan?.customer) continue;

      // Outstanding = unpaid EMI amounts
      const outstanding = loan.emiSchedules.reduce((s, e) =>
        e.paymentStatus === 'PAID' ? s : s + (e.totalAmount - (e.paidAmount || 0)), 0);
      const totalPaid = loan.emiSchedules.reduce((s, e) => s + (e.paidAmount || 0), 0);

      addOrMerge(loan.customer.id, {
        id: loan.customer.id,
        name: loan.customer.name || 'Unknown',
        phone: loan.customer.phone || 'N/A',
        email: loan.customer.email,
        totalLoans: 1,
        totalOutstanding: outstanding,
        totalPaid,
        isMirror: true,
      });
    }
  }

  // ── 2. Non-mirrored ONLINE loans ──────────────────────────────────────────
  // MIRROR RULE: Exclude any loan that has a mirror mapping (globally)
  // because the receivable belongs to the mirror company, not the original.
  const allMirroredLoanIds = companyId
    // If viewing a specific company, exclude loans mirrored to ANY company
    ? (await db.mirrorLoanMapping.findMany({ where: { isOfflineLoan: false }, select: { originalLoanId: true } }))
        .map(m => m.originalLoanId)
    : [];

  const onlineWhere: any = {
    status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED', 'ACTIVE_INTEREST_ONLY'] },
  };
  if (companyId) onlineWhere.companyId = companyId;
  // Always exclude loans that have a mirror mapping
  if (allMirroredLoanIds.length > 0) {
    onlineWhere.id = { notIn: allMirroredLoanIds };
  }

  const onlineLoans = await db.loanApplication.findMany({
    where: onlineWhere,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      emiSchedules: { select: { paymentStatus: true, totalAmount: true, paidAmount: true } }
    }
  });

  for (const loan of onlineLoans) {
    if (!loan.customer) continue;
    const outstanding = loan.emiSchedules.reduce((s, e) =>
      e.paymentStatus === 'PAID' ? s : s + (e.totalAmount - (e.paidAmount || 0)), 0);
    const totalPaid = loan.emiSchedules.reduce((s, e) => s + (e.paidAmount || 0), 0);

    addOrMerge(loan.customer.id, {
      id: loan.customer.id,
      name: loan.customer.name || 'Unknown',
      phone: loan.customer.phone || 'N/A',
      email: loan.customer.email,
      totalLoans: 1,
      totalOutstanding: outstanding,
      totalPaid,
      isMirror: false,
    });
  }

  // ── 3. OFFLINE loans ──────────────────────────────────────────────────────
  const offlineWhere: any = { status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] } };
  if (companyId) offlineWhere.companyId = companyId;

  const offlineLoans = await db.offlineLoan.findMany({
    where: offlineWhere,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      emis: { select: { paymentStatus: true, totalAmount: true, paidAmount: true } }
    }
  });

  for (const loan of offlineLoans) {
    if (!loan.customer) continue;
    const outstanding = loan.emis.reduce((s, e) =>
      e.paymentStatus === 'PAID' ? s : s + (e.totalAmount - (e.paidAmount || 0)), 0);
    const totalPaid = loan.emis.reduce((s, e) => s + (e.paidAmount || 0), 0);

    addOrMerge(loan.customer.id, {
      id: loan.customer.id,
      name: loan.customer.name || 'Unknown',
      phone: loan.customer.phone || 'N/A',
      email: loan.customer.email,
      totalLoans: 1,
      totalOutstanding: outstanding,
      totalPaid,
      isMirror: false,
    });
  }

  result.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  // ── Control Account Total (Loans Receivable) ──────────────────────────────
  // This is the SUM of all individual outstanding balances = Control A/c balance
  const totalLoansReceivable = result.reduce((s, c) => s + c.totalOutstanding, 0);

  return NextResponse.json({
    success: true,
    borrowers: result,
    // Control account total — matches "Loans Receivable" in Trial Balance / Balance Sheet
    totalLoansReceivable,
    debtorCount: result.filter(c => c.totalOutstanding > 0).length,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Full personal ledger for a customer (mirror-aware)
// ─────────────────────────────────────────────────────────────────────────────
async function getPersonalLedger(customerId: string, companyId: string | null) {
  const customer = await db.user.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, email: true, address: true }
  });

  // Fetch ALL online loans for this customer
  const allOnlineLoans = await db.loanApplication.findMany({
    where: {
      customerId,
      status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED', 'ACTIVE_INTEREST_ONLY'] }
    },
    include: {
      company:      { select: { id: true, name: true } },
      sessionForm:  { select: { approvedAmount: true, interestRate: true, tenure: true, emiAmount: true, processingFee: true } },
      emiSchedules: { orderBy: { installmentNumber: 'asc' } },
    }
  });

  // MIRROR RULE: Find which of this customer's loans have a mirror mapping
  const loanIds = allOnlineLoans.map(l => l.id);
  const mirrorMappings = loanIds.length > 0
    ? await db.mirrorLoanMapping.findMany({
        where: { originalLoanId: { in: loanIds }, isOfflineLoan: false },
        select: { originalLoanId: true, mirrorCompanyId: true }
      })
    : [];
  const mirroredOriginalIds = new Set(mirrorMappings.map(m => m.originalLoanId));

  // Apply mirror rule:
  // - If loan has mirror AND we are viewing without company filter → exclude original, include as mirror
  // - If loan has mirror AND we are viewing from MIRROR company → include as mirror
  // - If loan has mirror AND we are viewing from ORIGINAL company → EXCLUDE (mirror company owns it)
  // - If loan has no mirror → include as-is
  const onlineLoans = allOnlineLoans.filter(l => {
    const hasMirror = mirroredOriginalIds.has(l.id);
    if (!hasMirror) return true; // No mirror → include normally

    if (!companyId) {
      // No company filter: show from mirror company perspective (mark as mirror)
      return true;
    }

    // Has mirror:
    // If this loan's original company is the selected company → EXCLUDE
    // If the mirror company is the selected company → INCLUDE (handled via mirror section above, but include here too)
    const mapping = mirrorMappings.find(m => m.originalLoanId === l.id);
    return mapping?.mirrorCompanyId === companyId;
  });

  const offlineLoans = await db.offlineLoan.findMany({
    where: {
      customerId,
      status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] }
    },
    include: {
      company: { select: { id: true, name: true } },
      emis:    { orderBy: { dueDate: 'asc' } }
    }
  });

  // Filter offline loans by company if specified
  const filteredOfflineLoans = companyId
    ? offlineLoans.filter(l => l.companyId === companyId)
    : offlineLoans;

  // Build loan summaries
  const onlineLoansSummary = onlineLoans.map(l => ({
    id: l.id,
    loanNumber: l.applicationNo,
    type: 'ONLINE',
    status: l.status,
    amount: l.sessionForm?.approvedAmount || l.requestedAmount || 0,
    disbursementDate: l.disbursedAt,
    interestRate: l.sessionForm?.interestRate || 0,
    tenure: l.sessionForm?.tenure || 0,
    isMirror: mirroredOriginalIds.has(l.id),
    companyName: l.company?.name || '',
  }));

  const offlineLoansSummary = filteredOfflineLoans.map(l => ({
    id: l.id,
    loanNumber: l.loanNumber,
    type: 'OFFLINE',
    status: l.status,
    amount: l.loanAmount,
    disbursementDate: l.disbursementDate,
    interestRate: l.interestRate || 0,
    tenure: l.tenure || 0,
    isMirror: false,
    companyName: l.company?.name || '',
  }));

  // Build real accounting entries per loan
  const allEntries: any[] = [];

  for (const loan of onlineLoans) {
    const loanEntries = await buildEntriesForOnlineLoan(loan, mirroredOriginalIds.has(loan.id));
    allEntries.push(...loanEntries);
  }

  for (const loan of filteredOfflineLoans) {
    const loanEntries = buildEntriesForOfflineLoan(loan);
    allEntries.push(...loanEntries);
  }

  allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute outstanding per loan for the control account total
  const totalOutstanding = [
    ...onlineLoans.map(l => {
      const paid = l.emiSchedules.reduce((s, e) => e.paymentStatus === 'PAID' ? s : 0, 0);
      const total = l.sessionForm?.approvedAmount || l.requestedAmount || 0;
      const collected = l.emiSchedules.filter(e => e.paymentStatus === 'PAID').reduce((s, e) => s + (e.paidAmount || 0), 0);
      return Math.max(0, total - collected);
    }),
    ...filteredOfflineLoans.map(l => {
      const collected = l.emis.filter(e => e.paymentStatus === 'PAID').reduce((s, e) => s + (e.paidAmount || 0), 0);
      return Math.max(0, l.loanAmount - collected);
    })
  ].reduce((s, v) => s + v, 0);

  return NextResponse.json({
    success: true,
    customerSummary: {
      ...customer,
      onlineLoans: onlineLoansSummary,
      offlineLoans: offlineLoansSummary,
      totalOutstanding, // Loans Receivable balance for this customer
    },
    entries: allEntries
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Build entries for one online loan from real EMI data
// ─────────────────────────────────────────────────────────────────────────────
async function buildEntriesForOnlineLoan(loan: any, isMirror = false) {
  const entries: any[] = [];
  const loanId     = loan.id;
  const loanNumber = loan.applicationNo;
  const loanAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
  const processingFee = loan.sessionForm?.processingFee || 0;
  const customerName = loan.customer?.name || '';

  // Loans Receivable account label includes customer name (subsidiary ledger style)
  const receivableLabel = customerName
    ? `Loans Receivable — ${customerName}`
    : 'Loans Receivable';

  // 1. Disbursement
  if (loan.disbursedAt) {
    entries.push({
      id: `disb-${loanId}`,
      date: loan.disbursedAt,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: loanId, loanId, loanNumber,
      narration: `Loan Disbursed — ${loanNumber}${customerName ? ` [${customerName}]` : ''}`,
      lines: [
        { accountCode: '1200', accountName: receivableLabel, debitAmount: loanAmount, creditAmount: 0 },
        { accountCode: '1102', accountName: 'Bank Account',  debitAmount: 0, creditAmount: loanAmount }
      ]
    });
  }

  // 2. Processing Fee
  if (processingFee > 0) {
    const pfJournal = await db.journalEntry.findFirst({
      where: { referenceType: 'PROCESSING_FEE_COLLECTION', referenceId: loanId, isReversed: false },
      select: { entryDate: true }
    });
    entries.push({
      id: `pf-${loanId}`,
      date: pfJournal?.entryDate || loan.disbursedAt || new Date(),
      referenceType: 'PROCESSING_FEE_COLLECTION',
      referenceId: loanId, loanId, loanNumber,
      narration: `Processing Fee — ${loanNumber}${customerName ? ` [${customerName}]` : ''}`,
      lines: [
        { accountCode: '1102', accountName: 'Bank Account',          debitAmount: processingFee, creditAmount: 0 },
        { accountCode: '4121', accountName: 'Processing Fee Income', debitAmount: 0, creditAmount: processingFee }
      ]
    });
  }

  // 3. EMI payments
  for (const emi of (loan.emiSchedules || [])) {
    if (!emi.paidDate || emi.paidAmount <= 0) continue;

    const paidPrincipal = emi.paidPrincipal || 0;
    const paidInterest  = emi.paidInterest  || 0;
    const paidTotal     = emi.paidAmount    || 0;

    entries.push({
      id: `emi-${emi.id}`,
      date: emi.paidDate,
      referenceType: emi.isInterestOnly ? 'INTEREST_ONLY_PAYMENT' : emi.isPartialPayment ? 'PARTIAL_EMI_PAYMENT' : 'EMI_PAYMENT',
      referenceId: emi.id, loanId, loanNumber,
      narration: `EMI #${emi.installmentNumber} — ${loanNumber}${customerName ? ` [${customerName}]` : ''}${emi.isInterestOnly ? ' [Interest Only]' : emi.isPartialPayment ? ' [Partial]' : ''}`,
      emiNumber: emi.installmentNumber,
      lines: [
        { accountCode: '1102', accountName: 'Bank/Cash',        debitAmount: paidTotal,     creditAmount: 0 },
        ...(paidPrincipal > 0 ? [{ accountCode: '1200', accountName: receivableLabel, debitAmount: 0, creditAmount: paidPrincipal }] : []),
        ...(paidInterest  > 0 ? [{ accountCode: '4110', accountName: 'Interest Income',  debitAmount: 0, creditAmount: paidInterest  }] : []),
      ]
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build entries for one offline loan from EMI records
// ─────────────────────────────────────────────────────────────────────────────
function buildEntriesForOfflineLoan(loan: any) {
  const entries: any[] = [];
  const loanId     = loan.id;
  const loanNumber = loan.loanNumber;
  const customerName = loan.customer?.name || '';

  const receivableLabel = customerName
    ? `Loans Receivable — ${customerName}`
    : 'Loans Receivable';

  if (loan.disbursementDate) {
    entries.push({
      id: `offline-disb-${loanId}`,
      date: loan.disbursementDate,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: loanId, loanId, loanNumber,
      narration: `Loan Disbursed — ${loanNumber}${customerName ? ` [${customerName}]` : ''}`,
      lines: [
        { accountCode: '1200', accountName: receivableLabel, debitAmount: loan.loanAmount, creditAmount: 0 },
        { accountCode: '1101', accountName: 'Cash/Bank',     debitAmount: 0, creditAmount: loan.loanAmount }
      ]
    });
  }

  for (const emi of (loan.emis || [])) {
    if (!emi.paidDate || emi.paidAmount <= 0) continue;

    const paidPrincipal = emi.paidPrincipal || 0;
    const paidInterest  = emi.paidInterest  || 0;
    const paidTotal     = emi.paidAmount    || 0;

    entries.push({
      id: `offline-emi-${emi.id}`,
      date: emi.paidDate,
      referenceType: 'EMI_PAYMENT',
      referenceId: emi.id, loanId, loanNumber,
      narration: `EMI #${emi.installmentNumber} — ${loanNumber}${customerName ? ` [${customerName}]` : ''}`,
      emiNumber: emi.installmentNumber,
      lines: [
        { accountCode: '1101', accountName: 'Cash/Bank',        debitAmount: paidTotal,     creditAmount: 0 },
        ...(paidPrincipal > 0 ? [{ accountCode: '1200', accountName: receivableLabel, debitAmount: 0, creditAmount: paidPrincipal }] : []),
        ...(paidInterest  > 0 ? [{ accountCode: '4110', accountName: 'Interest Income',  debitAmount: 0, creditAmount: paidInterest  }] : []),
      ]
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single loan ledger
// ─────────────────────────────────────────────────────────────────────────────
async function getSingleLoanLedger(loanId: string) {
  const loan = await db.loanApplication.findUnique({
    where: { id: loanId },
    include: {
      customer:     { select: { id: true, name: true, phone: true } },
      company:      { select: { id: true, name: true } },
      sessionForm:  true,
      emiSchedules: { orderBy: { installmentNumber: 'asc' } },
    }
  });

  if (!loan) {
    return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
  }

  const entries = await buildEntriesForOnlineLoan(loan, false);
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({
    success: true,
    loanSummary: { id: loan.id, loanNumber: loan.applicationNo, customer: loan.customer, company: loan.company },
    entries
  });
}
