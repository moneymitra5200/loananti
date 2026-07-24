import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle JSON payload (base64 string or image payload)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { file, filename, documentType, docType, type, fileType } = body;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const dataUrl = typeof file === 'string' && file.startsWith('data:')
        ? file
        : `data:${fileType || 'image/jpeg'};base64,${file}`;

      return NextResponse.json({
        success: true,
        url: dataUrl,
        name: filename || 'document',
        type: fileType || 'image/jpeg',
        docType: documentType || docType || type || 'document',
        message: 'Document uploaded successfully'
      });
    }

    // Handle multipart/form-data or application/x-www-form-urlencoded
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError: any) {
      return NextResponse.json({ error: 'Invalid form data. Upload requires multipart/form-data or application/json.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const docType = (formData.get('docType') || formData.get('documentType')) as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB.' }, { status: 400 });
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      docType: docType || type || 'document',
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
