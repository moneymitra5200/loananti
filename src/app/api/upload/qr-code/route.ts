import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, WEBP, and GIF images allowed.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Attempt 1: Local filesystem write (works in local dev / self-hosted) ─
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'qr-codes');
      await mkdir(uploadDir, { recursive: true });

      const timestamp = Date.now();
      const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
      const filename = `qr-${timestamp}.${ext}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer, { mode: 0o644 });
      const url = `/uploads/qr-codes/${filename}`;
      console.log('[QR Upload] ✅ Filesystem write succeeded:', url);
      return NextResponse.json({ success: true, url, filename });
    } catch (fsError: any) {
      // Vercel / read-only filesystem — fall through to base64
      console.log('[QR Upload] Filesystem not writable, falling back to base64:', fsError?.message);
    }

    // ── Attempt 2: base64 data URL (works on Vercel serverless) ────────────
    const mimeType = file.type || 'image/png';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('[QR Upload] ✅ Returning base64 data URL, length:', dataUrl.length);
    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename: file.name,
      isDataUrl: true,
    });
  } catch (error: any) {
    console.error('[QR Upload] Unexpected error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
