import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// PERMANENT SUPER ADMIN - This email is reserved and cannot be deleted
const PERMANENT_SUPER_ADMIN_EMAIL = 'moneymitra@gmail.com';
const PERMANENT_SUPER_ADMIN_PASSWORD = '1122334455';

export async function GET(request: NextRequest) {
  try {
    const hashedPassword = await bcrypt.hash(PERMANENT_SUPER_ADMIN_PASSWORD, 10);
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: PERMANENT_SUPER_ADMIN_EMAIL }
    });

    let admin;
    
    if (existingUser) {
      // Update existing user
      admin = await db.user.update({
        where: { email: PERMANENT_SUPER_ADMIN_EMAIL },
        data: {
          password: hashedPassword,
          plainPassword: PERMANENT_SUPER_ADMIN_PASSWORD,
          isActive: true,
          isLocked: false,
          role: 'SUPER_ADMIN',
          name: 'Money Mitra Admin'
        }
      });
    } else {
      // Create new user
      admin = await db.user.create({
        data: {
          email: PERMANENT_SUPER_ADMIN_EMAIL,
          password: hashedPassword,
          plainPassword: PERMANENT_SUPER_ADMIN_PASSWORD,
          name: 'Money Mitra Admin',
          firebaseUid: `super-admin-${Date.now()}`,
          role: 'SUPER_ADMIN',
          isActive: true,
          isLocked: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin ensured',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error ensuring super admin:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to ensure super admin',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
