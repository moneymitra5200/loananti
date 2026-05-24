import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { loanId, documentField, documentUrl } = await request.json();

    if (!loanId || !documentField || !documentUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Allowed document fields on LoanApplication
    const allowedFields = [
      'panCardDoc',
      'aadhaarFrontDoc',
      'aadhaarBackDoc',
      'incomeProofDoc',
      'addressProofDoc',
      'photoDoc',
      'bankStatementDoc',
      'passbookDoc',
      'salarySlipDoc',
      'electionCardDoc',
      'housePhotoDoc',
      'otherDocs',
      'disbursementProof'
    ];

    if (!allowedFields.includes(documentField)) {
      return NextResponse.json({ error: 'Invalid document field' }, { status: 400 });
    }

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

  } catch (error: any) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { error: 'Failed to update document: ' + error.message },
      { status: 500 }
    );
  }
}
