import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateUserCache } from '@/lib/cache';

// GET - Fetch a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isLocked: true,
        createdAt: true,
        companyId: true,
        agentId: true,
        agentCode: true,
        staffCode: true,
        cashierCode: true,
        accountantCode: true,
        companyCredit: true,
        personalCredit: true,
        credit: true,
        profilePicture: true,
        company: {
          select: { id: true, name: true, code: true }
        },
        agent: {
          select: { id: true, name: true, agentCode: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT - Update a single user by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, isActive, agentId, companyCredit, personalCredit } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (agentId !== undefined) updateData.agentId = agentId;
    if (companyCredit !== undefined) updateData.companyCredit = companyCredit;
    if (personalCredit !== undefined) updateData.personalCredit = personalCredit;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { company: true, agent: true }
    });

    // Invalidate user cache
    invalidateUserCache(id);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete a user by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect permanent super admin from deletion
    const PERMANENT_SUPER_ADMIN_EMAIL = 'moneymitra@gmail.com';
    if (user.email === PERMANENT_SUPER_ADMIN_EMAIL) {
      return NextResponse.json({
        error: 'Cannot delete the permanent Super Admin account',
        isProtected: true
      }, { status: 403 });
    }

    // Delete the user
    await db.user.delete({ where: { id } });

    // Invalidate user cache
    invalidateUserCache(id);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
