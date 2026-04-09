import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch Aging Analysis data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'all';

    console.log(`[Aging Analysis] Fetching aging data for company: ${companyId}`);

    // Define aging buckets
    const buckets = [
      { bucket: '0-30', min: 0, max: 30 },
      { bucket: '31-60', min: 31, max: 60 },
      { bucket: '61-90', min: 61, max: 90 },
      { bucket: '91-180', min: 91, max: 180 },
      { bucket: '181-365', min: 181, max: 365 },
      { bucket: '365+', min: 366, max: 99999 }
    ];

    // Get all active loans with overdue EMIs
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

    const today = new Date();
    const bucketData: Record<string, any[]> = {};
    buckets.forEach(b => bucketData[b.bucket] = []);

    let totalOverdue = 0;
    let totalLoans = 0;

    for (const loan of loans) {
      const overdueEMIs = loan.emiSchedules.filter(emi => {
        const dueDate = new Date(emi.dueDate);
        return dueDate < today && emi.paymentStatus !== 'PAID';
      });

      if (overdueEMIs.length === 0) continue;

      totalLoans++;

      // Calculate days overdue (from first unpaid EMI)
      const firstOverdueEMI = overdueEMIs[0];
      const firstDueDate = new Date(firstOverdueEMI.dueDate);
      const daysOverdue = Math.floor((today.getTime() - firstDueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate overdue amount
      const overdueAmount = overdueEMIs.reduce((sum, emi) => sum + emi.totalAmount - emi.paidAmount, 0);
      totalOverdue += overdueAmount;

      // Calculate outstanding amount
      const outstandingAmount = loan.emiSchedules.reduce((sum, emi) => {
        if (emi.paymentStatus === 'PAID') return sum;
        return sum + (emi.totalAmount - emi.paidAmount);
      }, 0);

      // Get last payment date
      const lastPayment = await db.payment.findFirst({
        where: { loanApplicationId: loan.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      // Find appropriate bucket
      let bucketKey = '365+';
      for (const bucket of buckets) {
        if (daysOverdue >= bucket.min && daysOverdue <= bucket.max) {
          bucketKey = bucket.bucket;
          break;
        }
      }

      bucketData[bucketKey].push({
        id: loan.id,
        applicationNo: loan.applicationNo,
        customerName: loan.customer?.name || 'Unknown',
        customerPhone: loan.customer?.phone || 'N/A',
        customerEmail: loan.customer?.email || 'N/A',
        outstandingAmount,
        overdueAmount,
        daysOverdue,
        bucket: bucketKey,
        companyId: loan.companyId,
        companyName: loan.company?.name || 'Unknown',
        emiAmount: loan.sessionForm?.emiAmount || 0,
        lastPaymentDate: lastPayment?.createdAt || null
      });
    }

    // Calculate bucket statistics
    const bucketStats = buckets.map(bucket => {
      const loans = bucketData[bucket.bucket] || [];
      const amount = loans.reduce((sum, l) => sum + l.overdueAmount, 0);
      return {
        bucket: bucket.bucket,
        label: bucket.bucket,
        count: loans.length,
        amount,
        percentage: totalOverdue > 0 ? (amount / totalOverdue) * 100 : 0,
        color: getBucketColor(bucket.bucket),
        loans: loans.sort((a, b) => b.daysOverdue - a.daysOverdue)
      };
    });

    console.log(`[Aging Analysis] Found ${totalLoans} overdue accounts`);

    return NextResponse.json({
      success: true,
      buckets: bucketStats,
      totalOverdue,
      totalLoans
    });

  } catch (error) {
    console.error('[Aging Analysis] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch aging data',
      details: (error as Error).message
    }, { status: 500 });
  }
}

function getBucketColor(bucket: string): string {
  const colors: Record<string, string> = {
    '0-30': 'bg-green-500',
    '31-60': 'bg-yellow-500',
    '61-90': 'bg-orange-500',
    '91-180': 'bg-red-400',
    '181-365': 'bg-red-500',
    '365+': 'bg-red-700'
  };
  return colors[bucket] || 'bg-gray-500';
}
