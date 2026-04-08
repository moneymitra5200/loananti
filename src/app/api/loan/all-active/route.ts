import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';
import { OfflineLoanStatus } from '@prisma/client';

// GET all active loans (both online and offline) with complete passbook data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'online', 'offline'
    const includePassbook = searchParams.get('passbook') === 'true';

    // Generate cache key
    const cacheKey = `active-loans:${filter}:${includePassbook}`;
    
    // Check cache first (for non-passbook requests)
    if (!includePassbook) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true });
      }
    }

    let onlineLoans: any[] = [];
    let offlineLoans: any[] = [];

    console.log('[all-active] Fetching active loans with filter:', filter);

    // Define allowed statuses for offline loans
    const activeOfflineStatuses: OfflineLoanStatus[] = [
      OfflineLoanStatus.ACTIVE,
      OfflineLoanStatus.INTEREST_ONLY
    ];

    // Fetch online loans (from LoanApplication)
    if (filter === 'all' || filter === 'online') {
      const includeOptions: any = {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        company: {
          select: { id: true, name: true, code: true }
        },
        sessionForm: {
          select: {
            approvedAmount: true,
            interestRate: true,
            tenure: true,
            emiAmount: true,
            totalAmount: true,
            totalInterest: true
          }
        }
      };

      // Include EMI schedules for passbook
      if (includePassbook) {
        includeOptions.emiSchedules = {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            originalDueDate: true,
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            paidPrincipal: true,
            paidInterest: true,
            paymentStatus: true,
            paidDate: true,
            paymentMode: true,
            penaltyAmount: true,
            daysOverdue: true
          }
        };
        includeOptions.payments = {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            paymentMode: true,
            createdAt: true,
            status: true,
            receiptNumber: true
          }
        };
      } else {
        // Always include all EMI schedules for the expandable view
        includeOptions.emiSchedules = {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            originalDueDate: true,
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            paidPrincipal: true,
            paidInterest: true,
            paymentStatus: true,
            paidDate: true,
            paymentMode: true,
            penaltyAmount: true,
            daysOverdue: true,
            isPartialPayment: true,
            isInterestOnly: true,
            nextPaymentDate: true
          }
        };
      }

      onlineLoans = await db.loanApplication.findMany({
        where: {
          status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] }
        },
        orderBy: { createdAt: 'desc' },
        include: includeOptions
      });
    }

    // Fetch offline loans
    if (filter === 'all' || filter === 'offline') {
      const includeOptions: any = {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        company: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, name: true, role: true }
        }
      };

      // Include EMI schedules for passbook
      if (includePassbook) {
        includeOptions.emis = {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
            paidDate: true,
            paymentMode: true,
            penaltyAmount: true
          }
        };
      } else {
        // Always include all EMI schedules for the expandable view
        includeOptions.emis = {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            paidPrincipal: true,
            paidInterest: true,
            paymentStatus: true,
            paidDate: true,
            paymentMode: true,
            penaltyAmount: true,
            daysOverdue: true
          }
        };
      }

      offlineLoans = await db.offlineLoan.findMany({
        where: {
          status: { in: activeOfflineStatuses }
        },
        orderBy: { createdAt: 'desc' },
        include: includeOptions
      });
    }

    // Get all mirror loan mappings to identify mirror loans
    let mirrorLoanMappings: any[] = [];
    const allLoanIds = [
      ...onlineLoans.map(l => l.id),
      ...offlineLoans.map(l => l.id)
    ];
    
    if (allLoanIds.length > 0) {
      mirrorLoanMappings = await db.mirrorLoanMapping.findMany({
        where: {
          OR: [
            { mirrorLoanId: { in: allLoanIds } },
            { originalLoanId: { in: allLoanIds } }
          ]
        },
        select: {
          id: true,
          originalLoanId: true,
          mirrorLoanId: true,
          mirrorCompanyId: true,
          originalCompanyId: true,
          mirrorTenure: true,
          originalTenure: true,
          displayColor: true,
          isOfflineLoan: true
        }
      });
    }

    // Create lookup maps
    const mirrorLoanIds = new Set(mirrorLoanMappings.map(m => m.mirrorLoanId).filter(Boolean) as string[]);
    const originalLoanMappings = new Map(mirrorLoanMappings.map(m => [m.originalLoanId, m]));
    const mirrorLoanMappingsByMirrorId = new Map(
      mirrorLoanMappings
        .filter(m => m.mirrorLoanId !== null)
        .map(m => [m.mirrorLoanId!, m] as [string, typeof m])
    );

    // Format online loans
    const formattedOnlineLoans = onlineLoans.map(loan => {
      // Find the next pending/overdue EMI
      const pendingEmis = (loan.emiSchedules || []).filter(
        (e: any) => ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(e.paymentStatus)
      );
      const nextEmi = pendingEmis[0];

      // Check if this is a mirror loan
      const isMirrorLoan = mirrorLoanIds.has(loan.id);
      const mirrorMapping = isMirrorLoan ? mirrorLoanMappingsByMirrorId.get(loan.id) : originalLoanMappings.get(loan.id);

      return {
        id: loan.id,
        identifier: loan.applicationNo,
        applicationNo: loan.applicationNo,
        loanType: 'ONLINE',
        status: loan.status,
        isMirrorLoan,
        isOriginalMirrorLoan: !isMirrorLoan && mirrorMapping !== undefined,
        // Mirror pair color - same for both original and mirror
        displayColor: mirrorMapping?.displayColor || null,
        // Interest-only loan fields
        isInterestOnlyLoan: loan.isInterestOnlyLoan || false,
        interestOnlyStartDate: loan.interestOnlyStartDate,
        interestOnlyMonthlyAmount: loan.interestOnlyMonthlyAmount,
        loanStartedAt: loan.loanStartedAt,
        totalInterestOnlyPaid: loan.totalInterestOnlyPaid,
        mirrorMapping: mirrorMapping ? {
          id: mirrorMapping.id,
          originalLoanId: mirrorMapping.originalLoanId,
          mirrorLoanId: mirrorMapping.mirrorLoanId,
          mirrorTenure: mirrorMapping.mirrorTenure,
          originalTenure: mirrorMapping.originalTenure,
          displayColor: mirrorMapping.displayColor
        } : null,
        requestedAmount: loan.requestedAmount,
        approvedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
        interestRate: loan.sessionForm?.interestRate || 0,
        tenure: loan.sessionForm?.tenure || 0,
        emiAmount: loan.sessionForm?.emiAmount || 0,
        totalAmount: loan.sessionForm?.totalAmount || 0,
        totalInterest: loan.sessionForm?.totalInterest || 0,
        disbursementDate: loan.disbursedAt,
        createdAt: loan.createdAt,
        customer: loan.customer,
        company: loan.company,
        sessionForm: loan.sessionForm,
        emiSchedules: loan.emiSchedules,
        payments: loan.payments || [],
        nextEmi: nextEmi ? {
          id: nextEmi.id,
          dueDate: nextEmi.dueDate,
          amount: nextEmi.totalAmount,
          status: nextEmi.paymentStatus,
          installmentNumber: nextEmi.installmentNumber
        } : null
      };
    });

    // Format offline loans
    const formattedOfflineLoans = offlineLoans.map(loan => {
      // Find the next pending/overdue EMI
      const pendingEmis = (loan.emis || []).filter(
        (e: any) => ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(e.paymentStatus)
      );
      const nextEmi = pendingEmis[0];
      
      // Check if this is an interest-only loan
      const isInterestOnlyLoan = loan.isInterestOnlyLoan || loan.status === 'INTEREST_ONLY';

      // Check if this is a mirror loan (for offline loans)
      const isMirrorLoan = mirrorLoanIds.has(loan.id) || loan.isMirrorLoan === true;
      const mirrorMapping = isMirrorLoan ? mirrorLoanMappingsByMirrorId.get(loan.id) : originalLoanMappings.get(loan.id);

      return {
        id: loan.id,
        identifier: loan.loanNumber,
        applicationNo: loan.loanNumber,
        loanType: 'OFFLINE',
        status: loan.status,
        isMirrorLoan,
        isOriginalMirrorLoan: !isMirrorLoan && mirrorMapping !== undefined,
        // Mirror pair color - same for both original and mirror
        displayColor: mirrorMapping?.displayColor || loan.displayColor || null,
        isInterestOnlyLoan,
        interestOnlyMonthlyAmount: loan.interestOnlyMonthlyAmount,
        totalInterestOnlyPaid: loan.totalInterestPaid,
        mirrorMapping: mirrorMapping ? {
          id: mirrorMapping.id,
          originalLoanId: mirrorMapping.originalLoanId,
          mirrorLoanId: mirrorMapping.mirrorLoanId,
          mirrorTenure: mirrorMapping.mirrorTenure,
          originalTenure: mirrorMapping.originalTenure,
          displayColor: mirrorMapping.displayColor,
          isOfflineLoan: mirrorMapping.isOfflineLoan
        } : null,
        requestedAmount: loan.loanAmount,
        approvedAmount: loan.loanAmount,
        interestRate: loan.interestRate,
        tenure: loan.tenure,
        emiAmount: loan.emiAmount,
        totalAmount: (loan.loanAmount || 0) + (loan.loanAmount * (loan.interestRate / 100) * (loan.tenure / 12)),
        totalInterest: (loan.loanAmount || 0) * (loan.interestRate / 100) * (loan.tenure / 12),
        disbursementDate: loan.disbursementDate,
        createdAt: loan.createdAt,
        customer: loan.customer || {
          id: null,
          name: loan.customerName,
          email: loan.customerEmail,
          phone: loan.customerPhone
        },
        company: loan.company,
        createdBy: loan.createdBy,
        emiSchedules: loan.emis?.map((emi: any) => ({
          id: emi.id,
          installmentNumber: emi.installmentNumber,
          dueDate: emi.dueDate,
          totalAmount: emi.totalAmount,
          principalAmount: emi.principalAmount,
          interestAmount: emi.interestAmount,
          paidAmount: emi.paidAmount,
          paymentStatus: emi.paymentStatus,
          paidDate: emi.paidDate,
          paymentMode: emi.paymentMode,
          penaltyAmount: emi.penaltyAmount,
          daysOverdue: emi.daysOverdue
        })) || [],
        payments: [],
        nextEmi: nextEmi ? {
          id: nextEmi.id,
          dueDate: nextEmi.dueDate,
          amount: nextEmi.totalAmount,
          status: nextEmi.paymentStatus,
          installmentNumber: nextEmi.installmentNumber
        } : null
      };
    });

    // Combine and sort by creation date
    const allLoans = [...formattedOnlineLoans, ...formattedOfflineLoans]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate statistics
    const stats = {
      totalOnline: formattedOnlineLoans.length,
      totalOffline: formattedOfflineLoans.length,
      totalLoans: allLoans.length,
      totalOnlineAmount: formattedOnlineLoans.reduce((sum, l) => sum + l.approvedAmount, 0),
      totalOfflineAmount: formattedOfflineLoans.reduce((sum, l) => sum + l.approvedAmount, 0),
      totalAmount: allLoans.reduce((sum, l) => sum + l.approvedAmount, 0)
    };

    const response = {
      loans: allLoans,
      onlineLoans: formattedOnlineLoans,
      offlineLoans: formattedOfflineLoans,
      stats
    };

    // Cache the result for non-passbook requests
    if (!includePassbook) {
      cache.set(cacheKey, response, CacheTTL.SHORT);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching all active loans:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Failed to fetch active loans', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
