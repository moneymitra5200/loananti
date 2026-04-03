import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { OfflineLoanStatus } from '@prisma/client';

// GET all closed loans (both online and offline)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'online', 'offline'

    let onlineLoans: any[] = [];
    let offlineLoans: any[] = [];

    console.log('[closed-loans] Fetching closed loans with filter:', filter);

    // Fetch closed online loans (from LoanApplication)
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
        },
        emiSchedules: {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
            paidDate: true
          }
        }
      };

      onlineLoans = await db.loanApplication.findMany({
        where: {
          status: 'CLOSED'
        },
        orderBy: { updatedAt: 'desc' },
        include: includeOptions
      });
    }

    // Fetch closed offline loans
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
        },
        emis: {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
            paidDate: true
          }
        }
      };

      offlineLoans = await db.offlineLoan.findMany({
        where: {
          status: OfflineLoanStatus.CLOSED
        },
        orderBy: { updatedAt: 'desc' },
        include: includeOptions
      });
    }

    // Format online loans
    const formattedOnlineLoans = onlineLoans.map(loan => {
      const totalEMIs = loan.emiSchedules?.length || 0;
      const paidEMIs = loan.emiSchedules?.filter((e: any) => e.paymentStatus === 'PAID').length || 0;

      return {
        id: loan.id,
        identifier: loan.applicationNo,
        applicationNo: loan.applicationNo,
        loanType: 'ONLINE',
        status: loan.status,
        closedAt: loan.updatedAt,
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
        emiSchedules: loan.emiSchedules,
        summary: {
          totalEMIs,
          paidEMIs,
          totalPaid: loan.emiSchedules?.reduce((sum: number, e: any) => sum + (e.paidAmount || 0), 0) || 0,
          totalAmount: loan.emiSchedules?.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) || 0
        }
      };
    });

    // Format offline loans
    const formattedOfflineLoans = offlineLoans.map(loan => {
      const totalEMIs = loan.emis?.length || 0;
      const paidEMIs = loan.emis?.filter((e: any) => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length || 0;

      return {
        id: loan.id,
        identifier: loan.loanNumber,
        applicationNo: loan.loanNumber,
        loanType: 'OFFLINE',
        status: loan.status,
        closedAt: loan.updatedAt,
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
        emiSchedules: loan.emis,
        summary: {
          totalEMIs,
          paidEMIs,
          totalPaid: loan.emis?.reduce((sum: number, e: any) => sum + (e.paidAmount || 0), 0) || 0,
          totalAmount: loan.emis?.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) || 0
        }
      };
    });

    // Combine and sort by closed date
    const allLoans = [...formattedOnlineLoans, ...formattedOfflineLoans]
      .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

    // Calculate statistics
    const stats = {
      totalOnline: formattedOnlineLoans.length,
      totalOffline: formattedOfflineLoans.length,
      totalLoans: allLoans.length,
      totalOnlineAmount: formattedOnlineLoans.reduce((sum, l) => sum + l.approvedAmount, 0),
      totalOfflineAmount: formattedOfflineLoans.reduce((sum, l) => sum + l.approvedAmount, 0),
      totalAmount: allLoans.reduce((sum, l) => sum + l.approvedAmount, 0),
      totalInterestCollected: allLoans.reduce((sum, l) => sum + (l.totalInterest || 0), 0)
    };

    return NextResponse.json({
      loans: allLoans,
      onlineLoans: formattedOnlineLoans,
      offlineLoans: formattedOfflineLoans,
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
