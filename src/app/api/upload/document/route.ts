import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json({ error: 'Invalid request content type. Document upload requires multipart/form-data.' }, { status: 400 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError: any) {
      return NextResponse.json({ error: 'Invalid form data. Upload requires multipart/form-data.' }, { status: 400 });
    }
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const docType = formData.get('docType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
      return NextResponse.json({ error: 'File must be an image or PDF' }, { status: 400 });
    }

    // Validate file size (max 3MB for documents)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 3MB. Please compress the image and try again.' }, { status: 400 });
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
