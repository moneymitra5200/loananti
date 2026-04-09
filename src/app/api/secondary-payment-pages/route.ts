import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all secondary payment pages (COMMON for all companies)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    const pages = await db.secondaryPaymentPage.findMany({
      where,
      include: {
        role: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, pages });
  } catch (error) {
    console.error('Error fetching secondary payment pages:', error);
    return NextResponse.json({ error: 'Failed to fetch secondary payment pages' }, { status: 500 });
  }
}

// POST - Create a new secondary payment page (COMMON for all companies)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      upiId,
      qrCodePath,
      bankName,
      accountNumber,
      accountName,
      ifscCode,
      roleId,
      roleType,
      createdById
    } = body;

    if (!name || !createdById) {
      return NextResponse.json({ error: 'Missing required fields: name and createdById' }, { status: 400 });
    }

    const page = await db.secondaryPaymentPage.create({
      data: {
        name,
        description,
        upiId,
        qrCodeUrl: qrCodePath,  // Store as qrCodeUrl in DB
        bankName,
        accountNumber,
        accountName,
        ifscCode,
        roleId,
        roleType,
        createdById,
        isActive: true
      },
      include: {
        role: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error('Error creating secondary payment page:', error);
    return NextResponse.json({ error: 'Failed to create secondary payment page' }, { status: 500 });
  }
}

// PUT - Update a secondary payment page
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Map qrCodeUrl to qrCodePath if provided
    if (updateData.qrCodePath) {
      updateData.qrCodeUrl = updateData.qrCodePath;
      delete updateData.qrCodePath;
    }

    const page = await db.secondaryPaymentPage.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error('Error updating secondary payment page:', error);
    return NextResponse.json({ error: 'Failed to update secondary payment page' }, { status: 500 });
  }
}

// DELETE - Delete a secondary payment page
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    await db.secondaryPaymentPage.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Secondary payment page deleted' });
  } catch (error) {
    console.error('Error deleting secondary payment page:', error);
    return NextResponse.json({ error: 'Failed to delete secondary payment page' }, { status: 500 });
  }
}
