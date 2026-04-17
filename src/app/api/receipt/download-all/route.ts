import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/receipt/download-all
 * Get all paid EMI receipts data for PDF generation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const loanId = searchParams.get('loanId');
    const isOffline = searchParams.get('isOffline') === 'true';

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    let receipts: any[] = [];

    if (isOffline) {
      // Get all paid EMIs for offline loan
      const emis = await db.offlineLoanEMI.findMany({
        where: {
          offlineLoanId: loanId,
          paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] }
        },
        include: {
          offlineLoan: {
            include: { company: true }
          }
        },
        orderBy: { installmentNumber: 'asc' }
      });

      const loan = emis[0]?.offlineLoan;
      if (!loan) {
        return NextResponse.json({ error: 'No paid EMIs found' }, { status: 404 });
      }

      const allEmis = await db.offlineLoanEMI.findMany({
        where: { offlineLoanId: loan.id }
      });
      const totalEmis = allEmis.length;
      const totalLoanAmount = loan.loanAmount;

      receipts = emis.map((emi, idx) => {
        const previousPaid = emis.slice(0, idx).reduce((sum, e) => sum + (e.paidAmount || 0), 0);
        const balanceDue = Math.max(0, totalLoanAmount - previousPaid - (emi.paidAmount || 0));

        return {
          receiptNo: `RCP-${loan.company?.code || 'MM'}-${emi.installmentNumber}-${Date.now().toString(36).toUpperCase()}`,
          date: emi.paidDate?.toISOString() || new Date().toISOString(),
          customerName: loan.customerName || '',
          fatherName: (loan as any).reference1Name || '',
          phone: loan.customerPhone || '',
          address: loan.customerAddress || '',
          loanAccountNo: loan.loanNumber || '',
          loanAmount: totalLoanAmount,
          interestRate: loan.interestRate || 0,
          emiNumber: emi.installmentNumber || 0,
          totalEmis: totalEmis,
          dueDate: emi.dueDate?.toISOString() || '',
          paymentDate: emi.paidDate?.toISOString() || new Date().toISOString(),
          principalAmount: emi.paidPrincipal || emi.principalAmount || 0,
          interestAmount: emi.paidInterest || emi.interestAmount || 0,
          penaltyAmount: emi.penaltyAmount || 0,
          totalAmount: emi.paidAmount || emi.totalAmount || 0,
          paymentMode: emi.paymentMode || 'CASH',
          referenceNo: loan.loanNumber || '',
          balanceDue: balanceDue,
          companyName: loan.company?.name || 'Money Mitra',
          companyCode: loan.company?.code || 'MM',
          isInterestOnly: emi.paymentStatus === 'INTEREST_ONLY_PAID',
        };
      });

    } else {
      // Get all paid EMIs for online loan
      const emis = await db.eMISchedule.findMany({
        where: {
          loanApplicationId: loanId,
          paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID'] }
        },
        include: {
          loanApplication: {
            include: {
              company: true,
              customer: {
                select: { id: true, name: true, phone: true, address: true, city: true, state: true, pincode: true }
              },
              sessionForm: { include: { agent: { select: { id: true, name: true } } } }
            }
          }
        },
        orderBy: { installmentNumber: 'asc' }
      });

      if (emis.length === 0) {
        return NextResponse.json({ error: 'No paid EMIs found' }, { status: 404 });
      }

      const loan = emis[0].loanApplication;
      const allEmis = await db.eMISchedule.findMany({
        where: { loanApplicationId: loanId }
      });
      const totalEmis = allEmis.length;
      const totalLoanAmount = (loan as any).disbursedAmount || (loan as any).approvedAmount || (loan.sessionForm as any)?.loanAmount || 0;

      receipts = emis.map((emi, idx) => {
        const previousPaid = emis.slice(0, idx).reduce((sum, e) => sum + (e.paidAmount || 0), 0);
        const balanceDue = Math.max(0, totalLoanAmount - previousPaid - (emi.paidAmount || 0));
        const customer = loan.customer;
        const sessionForm = loan.sessionForm;

        return {
          receiptNo: `RCP-${loan.company?.code || 'MM'}-${emi.installmentNumber}-${Date.now().toString(36).toUpperCase()}`,
          date: emi.paidDate?.toISOString() || new Date().toISOString(),
          customerName: (`${loan.firstName || ''} ${loan.lastName || ''}`).trim() || customer?.name || '',
          fatherName: (sessionForm as any)?.fatherName || '',
          phone: customer?.phone || loan.phone || '',
          address: [customer?.address || loan?.address, customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(', '),
          loanAccountNo: loan.applicationNo || '',
          loanAmount: totalLoanAmount,
          interestRate: (sessionForm as any)?.interestRate || 0,
          emiNumber: emi.installmentNumber || 0,
          totalEmis: totalEmis,
          dueDate: emi.dueDate?.toISOString() || '',
          paymentDate: emi.paidDate?.toISOString() || new Date().toISOString(),
          principalAmount: emi.paidPrincipal || emi.principalAmount || 0,
          interestAmount: emi.paidInterest || emi.interestAmount || 0,
          penaltyAmount: emi.penaltyAmount || 0,
          totalAmount: emi.paidAmount || emi.totalAmount || 0,
          paymentMode: emi.paymentMode || 'CASH',
          referenceNo: loan.applicationNo || '',
          balanceDue: balanceDue,
          companyName: loan.company?.name || 'Money Mitra',
          companyCode: loan.company?.code || 'MM',
          isInterestOnly: emi.paymentStatus === 'INTEREST_ONLY_PAID',
        };
      });
    }

    return NextResponse.json({
      success: true,
      receipts,
      totalReceipts: receipts.length
    });

  } catch (error) {
    console.error('[Download All Receipts API] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch receipts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
