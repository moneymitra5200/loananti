import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Local type definition - Prisma schema uses strings, not enums
type OfflineLoanStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'INTEREST_ONLY';

// GET all closed loans (both online and offline) with mirror pair grouping
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter         = searchParams.get('filter') || 'all'; // 'all', 'online', 'offline'
    const companyId      = searchParams.get('companyId') || null;   // for COMPANY role
    const agentId        = searchParams.get('agentId') || null;     // for AGENT role
    const createdById    = searchParams.get('createdById') || null; // for STAFF / CASHIER
    const mirrorEnabled  = searchParams.get('mirrorEnabled') !== 'false'; // default true

    let onlineLoans: any[] = [];
    let offlineLoans: any[] = [];

    // ── Online closed loans ─────────────────────────────────────────────────
    if (filter === 'all' || filter === 'online') {
      const onlineWhere: any = { status: 'CLOSED' };
      if (companyId)   onlineWhere.companyId = companyId;
      if (agentId)     onlineWhere.agentId   = agentId;
      if (createdById) onlineWhere.createdById = createdById;
      onlineLoans = await db.loanApplication.findMany({
        where: onlineWhere,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          company:  { select: { id: true, name: true, code: true } },
          sessionForm: {
            select: { approvedAmount: true, interestRate: true, tenure: true, emiAmount: true, totalAmount: true, totalInterest: true }
          },
          emiSchedules: {
            orderBy: { installmentNumber: 'asc' },
            select: { id: true, installmentNumber: true, dueDate: true, totalAmount: true, paidAmount: true, paymentStatus: true, paidDate: true }
          }
        }
      });
    }

    // ── Offline closed loans (include ALL — mirror included — for pair matching) ──
    if (filter === 'all' || filter === 'offline') {
      // Fetch without isMirrorLoan filter so mirror loans are available for pairing
      const offlineWhere: any = { status: 'CLOSED' };
      if (companyId)   offlineWhere.companyId   = companyId;
      if (agentId)     offlineWhere.agentId      = agentId;
      if (createdById) offlineWhere.createdById  = createdById;
      offlineLoans = await db.offlineLoan.findMany({
        where: offlineWhere,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer:  { select: { id: true, name: true, email: true, phone: true } },
          company:   { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          emis: {
            orderBy: { installmentNumber: 'asc' },
            select: { id: true, installmentNumber: true, dueDate: true, totalAmount: true, paidAmount: true, paymentStatus: true, paidDate: true, paymentMode: true }
          }
        }
      });
    }

    // ── Fetch mirror mappings for all closed offline loans ──────────────────
    const offlineLoanIds = offlineLoans.map((l: any) => l.id);
    const mirrorMappings = offlineLoanIds.length > 0
      ? await db.mirrorLoanMapping.findMany({
          where: {
            isOfflineLoan: true,
            OR: [
              { originalLoanId: { in: offlineLoanIds } },
              { mirrorLoanId: { in: offlineLoanIds } }
            ]
          },
          include: {
            mirrorCompany: { select: { id: true, name: true, code: true } }
          }
        })
      : [];

    // ── Format helpers ──────────────────────────────────────────────────────
    const formatOfflineLoan = (loan: any, role: 'ORIGINAL' | 'MIRROR' = 'ORIGINAL') => {
      const emis = loan.emis || [];
      const totalEMIs = emis.length;
      const paidEMIs  = emis.filter((e: any) => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length;
      return {
        id: loan.id,
        identifier: loan.loanNumber,
        applicationNo: loan.loanNumber,
        loanType: 'OFFLINE',
        mirrorRole: role,
        isMirrorLoan: loan.isMirrorLoan || false,
        status: loan.status,
        closedAt: loan.closedAt || loan.updatedAt,
        requestedAmount: loan.loanAmount,
        approvedAmount: loan.loanAmount,
        interestRate: loan.interestRate,
        tenure: loan.tenure,
        emiAmount: loan.emiAmount,
        totalAmount: (loan.loanAmount || 0) + (loan.loanAmount * (loan.interestRate / 100) * (loan.tenure / 12)),
        totalInterest: (loan.loanAmount || 0) * (loan.interestRate / 100) * (loan.tenure / 12),
        disbursementDate: loan.disbursementDate,
        createdAt: loan.createdAt,
        customer: loan.customer || { id: null, name: loan.customerName, email: loan.customerEmail, phone: loan.customerPhone },
        company: loan.company,
        createdBy: loan.createdBy,
        emiSchedules: emis,
        summary: {
          totalEMIs,
          paidEMIs,
          totalPaid:   emis.reduce((s: number, e: any) => s + (e.paidAmount || 0), 0),
          totalAmount: emis.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0)
        }
      };
    };

    // ── Group offline loans as mirror pairs ─────────────────────────────────
    const pairedOfflineIds = new Set<string>(); // IDs already in a pair
    const mirrorPairs: any[] = [];
    const standaloneOffline: any[] = [];

    for (const mapping of mirrorMappings) {
      const originalLoan = offlineLoans.find((l: any) => l.id === mapping.originalLoanId);
      const mirrorLoan   = offlineLoans.find((l: any) => l.id === mapping.mirrorLoanId);

      if (originalLoan && !pairedOfflineIds.has(originalLoan.id)) {
        pairedOfflineIds.add(originalLoan.id);
        if (mirrorLoan) pairedOfflineIds.add(mirrorLoan.id);

        mirrorPairs.push({
          pairId: mapping.id,
          isPair: true,
          mirrorInterestRate: mapping.mirrorInterestRate,
          mirrorCompany: mapping.mirrorCompany,
          original: formatOfflineLoan(originalLoan, 'ORIGINAL'),
          mirror:   mirrorLoan ? formatOfflineLoan(mirrorLoan, 'MIRROR') : null,
          closedAt: originalLoan.closedAt || originalLoan.updatedAt,
        });
      }
    }

    // Standalone offline loans (no mirror, and not a mirror loan itself)
    for (const loan of offlineLoans) {
      if (!pairedOfflineIds.has(loan.id) && !loan.isMirrorLoan) {
        standaloneOffline.push({ isPair: false, ...formatOfflineLoan(loan, 'ORIGINAL') });
      }
    }

    // ── Format online loans ─────────────────────────────────────────────────
    const formattedOnlineLoans = onlineLoans.map((loan: any) => {
      const totalEMIs = loan.emiSchedules?.length || 0;
      const paidEMIs  = loan.emiSchedules?.filter((e: any) => e.paymentStatus === 'PAID').length || 0;
      return {
        isPair: false,
        id: loan.id,
        identifier: loan.applicationNo,
        applicationNo: loan.applicationNo,
        loanType: 'ONLINE',
        mirrorRole: 'ORIGINAL',
        status: loan.status,
        closedAt: loan.updatedAt,
        approvedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
        interestRate: loan.sessionForm?.interestRate || 0,
        tenure: loan.sessionForm?.tenure || 0,
        emiAmount: loan.sessionForm?.emiAmount || 0,
        totalInterest: loan.sessionForm?.totalInterest || 0,
        disbursementDate: loan.disbursedAt,
        createdAt: loan.createdAt,
        customer: loan.customer,
        company: loan.company,
        emiSchedules: loan.emiSchedules,
        summary: {
          totalEMIs,
          paidEMIs,
          totalPaid:   loan.emiSchedules?.reduce((s: number, e: any) => s + (e.paidAmount || 0), 0) || 0,
          totalAmount: loan.emiSchedules?.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0) || 0
        }
      };
    });

    // ── Combine all for stats ──────────────────────────────────────────────
    const allOfflineFormatted = [
      ...mirrorPairs.map(p => p.original),
      ...standaloneOffline
    ];

    const stats = {
      totalOnline:  formattedOnlineLoans.length,
      totalOffline: allOfflineFormatted.length,
      totalPairs:   mirrorPairs.length,
      totalLoans:   formattedOnlineLoans.length + allOfflineFormatted.length,
      totalOnlineAmount:  formattedOnlineLoans.reduce((s, l) => s + l.approvedAmount, 0),
      totalOfflineAmount: allOfflineFormatted.reduce((s, l) => s + l.approvedAmount, 0),
      totalAmount:        [...formattedOnlineLoans, ...allOfflineFormatted].reduce((s, l) => s + l.approvedAmount, 0),
      totalInterestCollected: [...formattedOnlineLoans, ...allOfflineFormatted].reduce((s, l) => s + (l.totalInterest || 0), 0)
    };

    return NextResponse.json({
      // Legacy flat list (for backward compat)
      loans: [
        ...formattedOnlineLoans,
        ...standaloneOffline,
        ...mirrorPairs.map(p => p.original)
      ].sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()),
      // Grouped for parallel view
      mirrorPairs,
      standaloneOffline,
      onlineLoans: formattedOnlineLoans,
      mirrorEnabled, // let UI decide parallel vs list view
      stats
    });

  } catch (error) {
    console.error('Error fetching closed loans:', error);
    return NextResponse.json({
      error: 'Failed to fetch closed loans',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
