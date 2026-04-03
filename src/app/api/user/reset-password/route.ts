import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';

// POST - Reset user password (supports both admin reset and user-initiated change)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword, currentPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, password: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If currentPassword is provided, verify it (user-initiated password change)
    if (currentPassword) {
      if (!user.password) {
        return NextResponse.json({ error: 'No current password set. Please contact admin.' }, { status: 400 });
      }

      const isValidPassword = await compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update user password
    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        plainPassword: newPassword, // Store plain password for admin reference
        isLocked: false,
        failedLoginAttempts: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: `Password has been ${currentPassword ? 'changed' : 'reset'} for ${user.name}`
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
