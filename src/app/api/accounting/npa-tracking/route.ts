import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch NPA data based on company filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'all';

    console.log(`[NPA Tracking] Fetching NPA data for company: ${companyId}`);

    // Get all active loans with their EMI schedules
    const loans = await db.loanApplication.findMany({
      where: {
        status: { in: ['ACTIVE', 'DISBURSED'] },
        ...(companyId !== 'all' && { companyId })
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true }
        },
        company: {
          select: { id: true, name: true, code: true }
        },
        emiSchedules: {
          where: {
            paymentStatus: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] }
          },
          orderBy: { dueDate: 'asc' }
        },
        sessionForm: true
      }
    });

    const npaLoans: any[] = [];
    const stats = {
      totalNPA: 0,
      totalSMA0: 0,
      totalSMA1: 0,
      totalSMA2: 0,
      npaAmount: 0,
      sma0Amount: 0,
      sma1Amount: 0,
      sma2Amount: 0,
      totalOverdue: 0,
      provisioningRequired: 0,
      collectionEfficiency: 0
    };

    const today = new Date();

    for (const loan of loans) {
      const overdueEMIs = loan.emiSchedules.filter(emi => {
        const dueDate = new Date(emi.dueDate);
        return dueDate < today && emi.paymentStatus !== 'PAID';
      });

      if (overdueEMIs.length === 0) continue;

      // Calculate days overdue (from first unpaid EMI)
      const firstOverdueEMI = overdueEMIs[0];
      const firstDueDate = new Date(firstOverdueEMI.dueDate);
      const daysOverdue = Math.floor((today.getTime() - firstDueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine NPA status based on days overdue (RBI norms)
      let npaStatus: 'SMA0' | 'SMA1' | 'SMA2' | 'NPA';
      if (daysOverdue <= 30) {
        npaStatus = 'SMA0';
        stats.totalSMA0++;
        stats.sma0Amount += loan.sessionForm?.approvedAmount || loan.requestedAmount;
      } else if (daysOverdue <= 60) {
        npaStatus = 'SMA1';
        stats.totalSMA1++;
        stats.sma1Amount += loan.sessionForm?.approvedAmount || loan.requestedAmount;
      } else if (daysOverdue <= 90) {
        npaStatus = 'SMA2';
        stats.totalSMA2++;
        stats.sma2Amount += loan.sessionForm?.approvedAmount || loan.requestedAmount;
      } else {
        npaStatus = 'NPA';
        stats.totalNPA++;
        stats.npaAmount += loan.sessionForm?.approvedAmount || loan.requestedAmount;
      }

      // Calculate total overdue amount
      const totalOverdue = overdueEMIs.reduce((sum, emi) => sum + emi.totalAmount - emi.paidAmount, 0);
      stats.totalOverdue += totalOverdue;

      // Calculate outstanding amount
      const outstandingAmount = loan.emiSchedules.reduce((sum, emi) => {
        if (emi.paymentStatus === 'PAID') return sum;
        return sum + (emi.totalAmount - emi.paidAmount);
      }, 0);

      // Calculate principal and interest overdue
      const principalOverdue = overdueEMIs.reduce((sum, emi) => sum + (emi.principalAmount - emi.paidPrincipal), 0);
      const interestOverdue = overdueEMIs.reduce((sum, emi) => sum + (emi.interestAmount - emi.paidInterest), 0);

      // Get last payment date
      const lastPayment = await db.payment.findFirst({
        where: { loanApplicationId: loan.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      npaLoans.push({
        id: loan.id,
        loanApplicationId: loan.id,
        applicationNo: loan.applicationNo,
        customerName: loan.customer?.name || 'Unknown',
        customerPhone: loan.customer?.phone || 'N/A',
        customerEmail: loan.customer?.email || 'N/A',
        approvedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
        outstandingAmount,
        emiAmount: loan.sessionForm?.emiAmount || 0,
        overdueEMIs: overdueEMIs.length,
        daysOverdue,
        npaStatus,
        lastPaymentDate: lastPayment?.createdAt || null,
        companyId: loan.companyId,
        companyName: loan.company?.name || 'Unknown',
        totalOverdue,
        interestOverdue,
        principalOverdue,
        penaltyAmount: overdueEMIs.reduce((sum, emi) => sum + emi.penaltyAmount, 0)
      });
    }

    // Calculate provisioning as per RBI norms
    for (const loan of npaLoans) {
      let provisionPercent = 0;
      if (loan.npaStatus === 'NPA') {
        provisionPercent = 0.15; // 15% for substandard
        if (loan.daysOverdue > 365) provisionPercent = 0.25; // Doubtful
        if (loan.daysOverdue > 730) provisionPercent = 1.0; // Loss asset
      }
      stats.provisioningRequired += loan.outstandingAmount * provisionPercent;
    }

    // Sort by days overdue (most overdue first)
    npaLoans.sort((a, b) => b.daysOverdue - a.daysOverdue);

    console.log(`[NPA Tracking] Found ${npaLoans.length} NPA/SMA accounts`);

    return NextResponse.json({
      success: true,
      npaLoans,
      stats
    });

  } catch (error) {
    console.error('[NPA Tracking] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch NPA data',
      details: (error as Error).message
    }, { status: 500 });
  }
}
