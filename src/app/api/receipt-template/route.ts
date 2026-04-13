import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const templates = await db.receiptTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('[ReceiptTemplate] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, name, companyName, bgColor, accentColor, fields, userId } = body;

    if (!type || !fields) {
      return NextResponse.json({ success: false, error: 'type and fields are required' }, { status: 400 });
    }

    // Upsert — one template per type (EMI or LOAN)
    const template = await db.receiptTemplate.upsert({
      where: { type },
      update: {
        name: name || `${type} Receipt`,
        companyName: companyName || 'MoneyMitra Finance',
        bgColor: bgColor || '#ffffff',
        accentColor: accentColor || '#4F46E5',
        fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
        createdById: userId,
      },
      create: {
        type,
        name: name || `${type} Receipt`,
        companyName: companyName || 'MoneyMitra Finance',
        bgColor: bgColor || '#ffffff',
        accentColor: accentColor || '#4F46E5',
        fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
        createdById: userId,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('[ReceiptTemplate] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save template' }, { status: 500 });
  }
}
