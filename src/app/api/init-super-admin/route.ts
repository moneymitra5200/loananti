import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// PERMANENT SUPER ADMIN CREDENTIALS
const PERMANENT_SUPER_ADMIN_EMAIL = 'moneymitra@test.com';
const PERMANENT_SUPER_ADMIN_PASSWORD = '1122334455';

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash(PERMANENT_SUPER_ADMIN_PASSWORD, 10);
    
    const admin = await db.user.upsert({
      where: { email: PERMANENT_SUPER_ADMIN_EMAIL },
      update: {
        password: hashedPassword,
        plainPassword: PERMANENT_SUPER_ADMIN_PASSWORD,
        isActive: true,
        isLocked: false,
        role: 'SUPER_ADMIN',
        name: 'Money Mitra Admin'
      },
      create: {
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

    return NextResponse.json({
      success: true,
      message: 'Super admin initialized successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error initializing super admin:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize super admin',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
