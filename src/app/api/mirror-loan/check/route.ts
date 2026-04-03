import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Check if a loan is a mirror loan and if it has a mirror loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Check if this loan ID exists as a mirrorLoanId in MirrorLoanMapping (meaning it IS a mirror loan)
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { mirrorLoanId: loanId },
      select: {
        id: true,
        originalLoanId: true,
        mirrorCompanyId: true,
        originalCompanyId: true,
        mirrorCompany: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // Check if this loan has a mirror loan attached (meaning it HAS a mirror loan)
    const originalMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      select: {
        id: true,
        mirrorLoanId: true,
        mirrorCompanyId: true,
        originalCompanyId: true,
        mirrorCompany: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    const isMirrorLoan = !!mirrorMapping;
    const hasMirrorLoan = !!originalMapping;

    return NextResponse.json({
      success: true,
      isMirrorLoan,
      hasMirrorLoan,
      mirrorMapping: isMirrorLoan ? mirrorMapping : null,
      originalMapping: hasMirrorLoan ? originalMapping : null,
      // Mirror company info - the company that funds the loan
      mirrorCompany: hasMirrorLoan ? originalMapping?.mirrorCompany : null
    });

  } catch (error) {
    console.error('Error checking mirror loan:', error);
    return NextResponse.json({ error: 'Failed to check mirror loan status' }, { status: 500 });
  }
}
