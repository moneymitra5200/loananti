import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Create a new contact enquiry (sent to cashiers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !phone || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Create enquiry record
    const enquiry = await db.contactEnquiry.create({
      data: {
        name,
        email,
        phone,
        message,
        status: 'PENDING'
      }
    });

    // Get all cashiers to notify
    const cashiers = await db.user.findMany({
      where: { role: 'CASHIER', isActive: true },
      select: { id: true }
    });

    // Create notifications for all cashiers
    if (cashiers.length > 0) {
      await db.notification.createMany({
        data: cashiers.map(cashier => ({
          userId: cashier.id,
          type: 'NEW_ENQUIRY',
          title: 'New Customer Enquiry',
          message: `${name} (${phone}) sent an enquiry: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
          data: JSON.stringify({ enquiryId: enquiry.id, email, phone })
        }))
      });
    }

    return NextResponse.json({ 
      success: true, 
      enquiry,
      message: 'Enquiry submitted successfully'
    });
  } catch (error) {
    console.error('Contact enquiry error:', error);
    return NextResponse.json({ error: 'Failed to submit enquiry' }, { status: 500 });
  }
}

// GET - Fetch all enquiries (cashier only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const enquiries = await db.contactEnquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, enquiries });
  } catch (error) {
    console.error('Fetch enquiries error:', error);
    return NextResponse.json({ error: 'Failed to fetch enquiries' }, { status: 500 });
  }
}
