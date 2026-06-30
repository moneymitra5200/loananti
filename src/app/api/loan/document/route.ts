import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { loanId, documentField, documentUrl } = await request.json();

    if (!loanId || !documentField || !documentUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Allowed document fields on both LoanApplication and OfflineLoan
    const allowedFields = [
      'panCardDoc',
      'aadhaarFrontDoc',
      'aadhaarBackDoc',
      'incomeProofDoc',
      'addressProofDoc',
      'photoDoc',
      'bankStatementDoc',
      'passbookDoc',
      'passbookPhotoDoc',
      'salarySlipDoc',
      'electionCardDoc',
      'housePhotoDoc',
      'guarantorPhotoDoc',
      'otherDocs',
      'disbursementProof'
    ];

    if (!allowedFields.includes(documentField)) {
      return NextResponse.json({ error: 'Invalid document field' }, { status: 400 });
    }

    // Check if the loan exists in loanApplication first
    const onlineLoanExists = await db.loanApplication.findUnique({
      where: { id: loanId },
      select: { id: true }
    });

    if (onlineLoanExists) {
      const updatedLoan = await db.loanApplication.update({
        where: { id: loanId },
        data: {
          [documentField]: documentUrl
        }
      });
      return NextResponse.json({
        success: true,
        message: 'Document updated successfully',
        loan: updatedLoan
      });
    }

    // Otherwise, check if the loan exists in offlineLoan
    const offlineLoanExists = await db.offlineLoan.findUnique({
      where: { id: loanId },
      select: { id: true }
    });

    if (offlineLoanExists) {
      // Map passbookDoc to passbookPhotoDoc for OfflineLoan model schema compatibility
      let fieldToUpdate = documentField;
      if (fieldToUpdate === 'passbookDoc') {
        fieldToUpdate = 'passbookPhotoDoc';
      }

      const updatedLoan = await db.offlineLoan.update({
        where: { id: loanId },
        data: {
          [fieldToUpdate]: documentUrl
        }
      });
      return NextResponse.json({
        success: true,
        message: 'Document updated successfully',
        loan: updatedLoan
      });
    }

    return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  } catch (error: any) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { error: 'Failed to update document: ' + error.message },
      { status: 500 }
    );
  }
}
