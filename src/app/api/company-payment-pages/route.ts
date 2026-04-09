import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch company payment pages
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const paymentPages = await db.companyPaymentPage.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, code: true }
        },
        secondaryPaymentRole: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, paymentPages });
  } catch (error) {
    console.error('Error fetching company payment pages:', error);
    return NextResponse.json({ error: 'Failed to fetch company payment pages' }, { status: 500 });
  }
}

// POST - Create a new company payment page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      upiId,
      qrCodeUrl,
      bankAccountId,
      bankName,
      accountNumber,
      accountName,
      ifscCode,
      secondaryPaymentRoleId
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check if payment page already exists for this company
    const existing = await db.companyPaymentPage.findUnique({
      where: { companyId }
    });

    if (existing) {
      // Update existing payment page
      const updated = await db.companyPaymentPage.update({
        where: { id: existing.id },
        data: {
          upiId,
          qrCodeUrl,
          bankAccountId,
          bankName,
          accountNumber,
          accountName,
          ifscCode,
          secondaryPaymentRoleId,
          isActive: true
        },
        include: {
          company: {
            select: { id: true, name: true, code: true }
          },
          secondaryPaymentRole: {
            select: { id: true, name: true, role: true }
          }
        }
      });
      return NextResponse.json({ success: true, paymentPage: updated, message: 'Payment page updated' });
    }

    // Create new payment page
    const paymentPage = await db.companyPaymentPage.create({
      data: {
        companyId,
        upiId,
        qrCodeUrl,
        bankAccountId,
        bankName,
        accountNumber,
        accountName,
        ifscCode,
        secondaryPaymentRoleId,
        isActive: true
      },
      include: {
        company: {
          select: { id: true, name: true, code: true }
        },
        secondaryPaymentRole: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return NextResponse.json({ success: true, paymentPage });
  } catch (error) {
    console.error('Error creating company payment page:', error);
    return NextResponse.json({ error: 'Failed to create company payment page' }, { status: 500 });
  }
}

// PUT - Update company payment page
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Payment page ID is required' }, { status: 400 });
    }

    const paymentPage = await db.companyPaymentPage.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, code: true }
        },
        secondaryPaymentRole: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return NextResponse.json({ success: true, paymentPage });
  } catch (error) {
    console.error('Error updating company payment page:', error);
    return NextResponse.json({ error: 'Failed to update company payment page' }, { status: 500 });
  }
}

// DELETE - Deactivate company payment page
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment page ID is required' }, { status: 400 });
    }

    await db.companyPaymentPage.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: 'Company payment page deactivated' });
  } catch (error) {
    console.error('Error deactivating company payment page:', error);
    return NextResponse.json({ error: 'Failed to deactivate company payment page' }, { status: 500 });
  }
}
