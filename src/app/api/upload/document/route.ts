import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Max file size: 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload Document] Request received');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || 'other';
    const loanId = formData.get('loanId') as string | null;

    console.log('[Upload Document]', {
      hasFile: !!file,
      fileName: file?.name,
      documentType,
      loanId,
      fileSize: file?.size,
      fileType: file?.type,
    });

    // No file supplied
    if (!file || file.size === 0) {
      return NextResponse.json({ success: true, url: null, message: 'No file uploaded' });
    }

    // File too large
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Attempt 1: write to local public/uploads (works in local dev) ──────
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
      await mkdir(uploadDir, { recursive: true });

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
      const filename = `doc-${documentType}-${timestamp}-${randomStr}.${ext}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer, { mode: 0o644 });

      const url = `/uploads/documents/${filename}`;
      console.log('[Upload Document] ✅ Filesystem write succeeded:', url);
      return NextResponse.json({ success: true, url, filename });
    } catch (fsError: any) {
      // Vercel / read-only filesystem — fall through to base64
      console.log('[Upload Document] Filesystem not writable, falling back to base64:', fsError?.message);
    }

    // ── Attempt 2: base64 data URL (works on Vercel serverless) ────────────
    const mimeType = file.type || 'image/jpeg';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('[Upload Document] ✅ Returning base64 data URL, length:', dataUrl.length);
    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename: file.name,
      isDataUrl: true,
    });
  } catch (error: any) {
    console.error('[Upload Document] Unexpected error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
