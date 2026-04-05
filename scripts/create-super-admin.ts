import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// PERMANENT SUPER ADMIN CREDENTIALS - DO NOT CHANGE
const PERMANENT_SUPER_ADMIN = {
  email: 'moneymitra@test.com',
  password: '1122334455',
  name: 'Money Mitra Admin',
  firebaseUid: 'super-admin-permanent'
};

async function createSuperAdmin() {
  console.log('Creating permanent super admin...');
  
  const hashedPassword = await bcrypt.hash(PERMANENT_SUPER_ADMIN.password, 10);
  
  try {
    const user = await prisma.user.upsert({
      where: { email: PERMANENT_SUPER_ADMIN.email },
      update: {
        password: hashedPassword,
        plainPassword: PERMANENT_SUPER_ADMIN.password,
        name: PERMANENT_SUPER_ADMIN.name,
        role: 'SUPER_ADMIN',
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0
      },
      create: {
        email: PERMANENT_SUPER_ADMIN.email,
        password: hashedPassword,
        plainPassword: PERMANENT_SUPER_ADMIN.password,
        name: PERMANENT_SUPER_ADMIN.name,
        firebaseUid: PERMANENT_SUPER_ADMIN.firebaseUid,
        role: 'SUPER_ADMIN',
        isActive: true,
        isLocked: false
      }
    });
    
    console.log('✅ Super Admin Created/Updated Successfully!');
    console.log('-------------------------------------------');
    console.log('Email:', PERMANENT_SUPER_ADMIN.email);
    console.log('Password:', PERMANENT_SUPER_ADMIN.password);
    console.log('Role: SUPER_ADMIN');
    console.log('ID:', user.id);
    console.log('-------------------------------------------');
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
  
  await prisma.$disconnect();
}

createSuperAdmin();
