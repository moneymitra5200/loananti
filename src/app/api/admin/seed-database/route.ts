import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// This endpoint seeds the database with initial data
// Call it once after database reset

export async function POST() {
  try {
    console.log('[seed] Starting database seed...');

    const hashedPassword = await bcrypt.hash('Test@123', 10);

    // Create Companies
    const company1 = await db.company.upsert({
      where: { code: 'COMP1' },
      update: {},
      create: {
        name: 'Company 1',
        code: 'COMP1',
        contactEmail: 'company1@test.com',
        isActive: true,
      }
    });

    const company2 = await db.company.upsert({
      where: { code: 'COMP2' },
      update: {},
      create: {
        name: 'Company 2',
        code: 'COMP2',
        contactEmail: 'company2@test.com',
        isActive: true,
      }
    });

    const company3 = await db.company.upsert({
      where: { code: 'COMP3' },
      update: {},
      create: {
        name: 'Company 3',
        code: 'COMP3',
        contactEmail: 'company3@test.com',
        isActive: true,
      }
    });

    console.log('[seed] Created 3 companies');

    // Create Super Admin
    const superAdmin = await db.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        firebaseUid: 'seed-super-admin',
      }
    });

    console.log('[seed] Created super admin:', superAdmin.email);

    // Create Company Users
    await db.user.upsert({
      where: { email: 'company1@test.com' },
      update: {},
      create: {
        email: 'company1@test.com',
        name: 'Company 1 Admin',
        password: hashedPassword,
        role: 'COMPANY',
        companyId: company1.id,
        isActive: true,
        firebaseUid: 'seed-company1',
      }
    });

    await db.user.upsert({
      where: { email: 'company2@test.com' },
      update: {},
      create: {
        email: 'company2@test.com',
        name: 'Company 2 Admin',
        password: hashedPassword,
        role: 'COMPANY',
        companyId: company2.id,
        isActive: true,
        firebaseUid: 'seed-company2',
      }
    });

    await db.user.upsert({
      where: { email: 'company3@test.com' },
      update: {},
      create: {
        email: 'company3@test.com',
        name: 'Company 3 Admin',
        password: hashedPassword,
        role: 'COMPANY',
        companyId: company3.id,
        isActive: true,
        firebaseUid: 'seed-company3',
      }
    });

    console.log('[seed] Created 3 company users');

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully! All passwords are: Test@123',
      logins: {
        superAdmin: 'admin@test.com',
        company1: 'company1@test.com',
        company2: 'company2@test.com',
        company3: 'company3@test.com',
        password: 'Test@123'
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
