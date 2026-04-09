import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload Document] Request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || 'other';
    const loanId = formData.get('loanId') as string | null;
    const uploadedBy = formData.get('uploadedBy') as string | null;

    console.log('[Upload Document] Form data:', { 
      hasFile: !!file,
      fileName: file?.name, 
      documentType, 
      loanId, 
      uploadedBy,
      fileSize: file?.size,
      fileType: file?.type
    });

    // Handle missing or empty file - RETURN SUCCESS (don't block EMI payments)
    if (!file || file.size === 0) {
      console.log('[Upload Document] No file or empty file, returning success');
      return NextResponse.json({ 
        success: true, 
        url: null,
        filename: null,
        id: null,
        message: 'No file uploaded'
      });
    }

    // Create upload directory with full permissions
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    
    try {
      await mkdir(uploadDir, { recursive: true, mode: 0o777 });
      console.log('[Upload Document] Directory created/verified:', uploadDir);
    } catch (mkdirError: any) {
      console.log('[Upload Document] Mkdir result:', mkdirError?.message || 'success');
    }

    // Verify directory exists
    try {
      await access(uploadDir);
      console.log('[Upload Document] Directory accessible');
    } catch (accessError) {
      console.error('[Upload Document] Directory not accessible:', accessError);
      // Return success anyway - don't block EMI payment
      return NextResponse.json({ 
        success: true, 
        url: null,
        filename: null,
        id: null,
        message: 'Upload directory not available, proceeding without proof'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name?.split('.')?.pop() || 'jpg';
    const filename = `doc-${documentType}-${timestamp}-${randomStr}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      console.log('[Upload Document] Writing file:', filepath, 'Size:', buffer.length);
      
      await writeFile(filepath, buffer, { mode: 0o644 });
      console.log('[Upload Document] File written successfully');
    } catch (writeError: any) {
      console.error('[Upload Document] File write error:', writeError?.message || writeError);
      // Return success anyway - don't block EMI payment
      return NextResponse.json({ 
        success: true, 
        url: null,
        filename: null,
        id: null,
        message: 'File write failed, proceeding without proof'
      });
    }

    const url = `/uploads/documents/${filename}`;
    console.log('[Upload Document] Upload successful:', url);

    return NextResponse.json({ 
      success: true, 
      url,
      filename,
      id: `uf${Date.now().toString(36)}`
    });
  } catch (error: any) {
    console.error('[Upload Document] Unexpected error:', error?.message || error);
    // ALWAYS return success to not block EMI payments
    return NextResponse.json({ 
      success: true, 
      url: null,
      filename: null,
      id: null,
      message: 'Upload failed but proceeding'
    });
  }
}
