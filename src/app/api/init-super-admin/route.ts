import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// PERMANENT SUPER ADMIN CREDENTIALS - DO NOT CHANGE THESE
const PERMANENT_SUPER_ADMIN = {
  email: 'moneymitra@gmail.com',
  password: '1122334455',
  name: 'Money Mitra Admin',
  firebaseUid: 'super-admin-permanent-moneymitra'
};

export async function GET() {
  try {
    console.log('[Init Super Admin] Starting initialization...');
    
    const hashedPassword = await bcrypt.hash(PERMANENT_SUPER_ADMIN.password, 10);
    
    // Check if super admin exists
    const existingAdmin = await db.user.findUnique({
      where: { email: PERMANENT_SUPER_ADMIN.email }
    });

    let admin;
    
    if (existingAdmin) {
      // Update existing admin
      console.log('[Init Super Admin] Updating existing admin...');
      admin = await db.user.update({
        where: { email: PERMANENT_SUPER_ADMIN.email },
        data: {
          password: hashedPassword,
          plainPassword: PERMANENT_SUPER_ADMIN.password,
          isActive: true,
          isLocked: false,
          role: 'SUPER_ADMIN',
          name: PERMANENT_SUPER_ADMIN.name,
          firebaseUid: PERMANENT_SUPER_ADMIN.firebaseUid,
          failedLoginAttempts: 0,
          lastLoginAt: new Date()
        }
      });
    } else {
      // Create new admin
      console.log('[Init Super Admin] Creating new admin...');
      admin = await db.user.create({
        data: {
          email: PERMANENT_SUPER_ADMIN.email,
          password: hashedPassword,
          plainPassword: PERMANENT_SUPER_ADMIN.password,
          name: PERMANENT_SUPER_ADMIN.name,
          firebaseUid: PERMANENT_SUPER_ADMIN.firebaseUid,
          role: 'SUPER_ADMIN',
          isActive: true,
          isLocked: false,
          failedLoginAttempts: 0,
          lastLoginAt: new Date()
        }
      });
    }

    console.log('[Init Super Admin] Success:', admin.email);

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
    console.error('[Init Super Admin] Error:', error);
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
