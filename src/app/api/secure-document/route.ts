import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch secure documents for a loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanApplicationId = searchParams.get('loanApplicationId');

    if (!loanApplicationId) {
      return NextResponse.json({ error: 'Loan application ID is required' }, { status: 400 });
    }

    const documents = await db.secureDocument.findMany({
      where: { loanApplicationId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching secure documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST - Upload a secure document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      loanApplicationId, 
      documentType, 
      documentUrl, 
      documentName, 
      documentSize, 
      mimeType, 
      remarks, 
      uploadedById, 
      uploadedByRole 
    } = body;

    if (!loanApplicationId || !documentUrl) {
      return NextResponse.json({ error: 'Loan application ID and document URL are required' }, { status: 400 });
    }

    // Save document record
    const document = await db.secureDocument.create({
      data: {
        loanApplicationId,
        documentType: documentType || 'SECURE_DOCUMENT',
        documentUrl,
        documentName: documentName || 'document',
        documentSize: documentSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        remarks: remarks || '',
        uploadedById,
        uploadedByRole,
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: uploadedById || 'system',
        action: 'CREATE',
        module: 'SECURE_DOCUMENT',
        description: `Secure document uploaded for loan ${loanApplicationId}`,
        recordId: document.id,
        recordType: 'SecureDocument',
      }
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Error uploading secure document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// PUT - Verify a secure document
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, verifiedById, verified } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const document = await db.secureDocument.update({
      where: { id: documentId },
      data: {
        verified,
        verifiedById,
        verifiedAt: verified ? new Date() : null,
      }
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Error verifying document:', error);
    return NextResponse.json({ error: 'Failed to verify document' }, { status: 500 });
  }
}

// DELETE - Delete a secure document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    await db.secureDocument.delete({
      where: { id: documentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
