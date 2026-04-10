import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/enquiry — Submit a contact us enquiry (public, no auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
    }

    const enquiry = await (db as any).enquiry.create({
      data: { name, email, phone: phone || '', subject: subject || 'General Enquiry', message }
    });

    return NextResponse.json({ success: true, enquiry });
  } catch (error) {
    console.error('[Enquiry] POST error:', error);
    return NextResponse.json({ error: 'Failed to submit enquiry' }, { status: 500 });
  }
}

// GET /api/enquiry — Fetch enquiries (cashier/SA only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = {};
    if (status) where.status = status;

    const enquiries = await (db as any).enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take
    });

    const pendingCount = await (db as any).enquiry.count({ where: { status: 'PENDING' } });

    return NextResponse.json({ success: true, enquiries, pendingCount });
  } catch (error) {
    console.error('[Enquiry] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch enquiries' }, { status: 500 });
  }
}

// PATCH /api/enquiry — Update status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, seenByCashier, seenBySA, resolvedNote, resolvedBy } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updateData: any = {};
    if (status) { updateData.status = status; }
    if (seenByCashier !== undefined) updateData.seenByCashier = seenByCashier;
    if (seenBySA !== undefined) updateData.seenBySA = seenBySA;
    if (resolvedNote) {
      updateData.resolvedNote = resolvedNote;
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = new Date();
      updateData.status = 'RESOLVED';
    }

    const enquiry = await (db as any).enquiry.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, enquiry });
  } catch (error) {
    console.error('[Enquiry] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 });
  }
}
