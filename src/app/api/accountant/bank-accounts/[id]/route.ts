import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get single bank account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const account = await db.bankAccount.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    return NextResponse.json({ bankAccount: account });
  } catch (error) {
    console.error('Error fetching bank account:', error);
    return NextResponse.json({ error: 'Failed to fetch bank account' }, { status: 500 });
  }
}

// PUT - Update bank account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      bankName,
      accountNumber,
      accountName,
      ownerName,
      ifscCode,
      branchName,
      accountType,
      upiId,
      qrCodeUrl,
      isDefault,
      companyId
    } = body;

    // If setting as default, unset any existing default for this company
    if (isDefault && companyId) {
      await db.bankAccount.updateMany({
        where: {
          companyId,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const updateData: Record<string, unknown> = {};
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (accountName !== undefined) updateData.accountName = accountName;
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (ifscCode !== undefined) updateData.ifscCode = ifscCode;
    if (branchName !== undefined) updateData.branchName = branchName;
    if (accountType !== undefined) updateData.accountType = accountType;
    if (upiId !== undefined) updateData.upiId = upiId;
    if (qrCodeUrl !== undefined) updateData.qrCodeUrl = qrCodeUrl;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const account = await db.bankAccount.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      bankAccount: account
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}

// DELETE - Soft delete bank account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if this is the default account
    const account = await db.bankAccount.findUnique({
      where: { id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    if (account.isDefault) {
      return NextResponse.json({
        error: 'Cannot delete default bank account. Set another account as default first.'
      }, { status: 400 });
    }

    // Soft delete
    await db.bankAccount.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Bank account deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}
