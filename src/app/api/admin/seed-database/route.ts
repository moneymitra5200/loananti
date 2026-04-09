import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// This endpoint seeds the database with initial super admin only
// Companies should be created through the proper UI flow

export async function POST() {
  try {
    console.log('[seed] Starting database seed...');

    const hashedPassword = await bcrypt.hash('1122334455', 10);

    // Create/Update Super Admin only
    const superAdmin = await db.user.upsert({
      where: { email: 'moneymitra@gmail.com' },
      update: {
        password: hashedPassword,
        plainPassword: '1122334455',
        isActive: true,
        isLocked: false,
        role: 'SUPER_ADMIN',
        name: 'Money Mitra Admin'
      },
      create: {
        email: 'moneymitra@gmail.com',
        name: 'Money Mitra Admin',
        password: hashedPassword,
        plainPassword: '1122334455',
        role: 'SUPER_ADMIN',
        isActive: true,
        firebaseUid: 'super-admin-main',
      }
    });

    console.log('[seed] Created/Updated super admin:', superAdmin.email);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully! Super Admin created.',
      logins: {
        superAdmin: 'moneymitra@gmail.com',
        password: '1122334455'
      }
    });
  } catch (error) {
    console.error('[seed] Error:', error);
    return NextResponse.json({
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
