import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists and is not SUPER_ADMIN
    const existingUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent locking SUPER_ADMIN accounts
    if (existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot lock a Super Admin account' },
        { status: 403 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        isLocked: true
      }
    });

    await db.auditLog.create({
      data: {
        userId: userId,
        action: 'LOCK',
        module: 'USER',
        description: reason ? `Account locked: ${reason}` : 'Account locked by admin',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Account locked successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isLocked: user.isLocked
      }
    });
  } catch (error) {
    console.error('Lock user error:', error);
    return NextResponse.json(
      { error: 'Failed to lock user' },
      { status: 500 }
    );
  }
}
