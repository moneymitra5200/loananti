import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// PERMANENT SUPER ADMIN - This email is reserved and cannot be deleted
const PERMANENT_SUPER_ADMIN_EMAIL = 'moneymitra@test.com';
const PERMANENT_SUPER_ADMIN_PASSWORD = '1122334455';

async function ensureSuperAdmin() {
  const hashedPassword = await bcrypt.hash(PERMANENT_SUPER_ADMIN_PASSWORD, 10);
  const admin = await db.user.upsert({
    where: { email: PERMANENT_SUPER_ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      plainPassword: PERMANENT_SUPER_ADMIN_PASSWORD,
      isActive: true,
      isLocked: false,
      role: 'SUPER_ADMIN'
    },
    create: {
      email: PERMANENT_SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      plainPassword: PERMANENT_SUPER_ADMIN_PASSWORD,
      name: 'Money Mitra Admin',
      firebaseUid: 'super-admin-permanent',
      role: 'SUPER_ADMIN',
      isActive: true,
      isLocked: false
    }
  });
  return admin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, location } = body;

    console.log('[staff-login] Attempting login for:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Ensure super admin exists when trying to login with that email
    if (emailLower === PERMANENT_SUPER_ADMIN_EMAIL) {
      await ensureSuperAdmin();
    }

    const user = await db.user.findUnique({
      where: { email: emailLower },
      include: { company: true, agent: true }
    });

    console.log('[staff-login] User found:', user ? { id: user.id, role: user.role, hasPassword: !!user.password, passwordLength: user.password?.length } : null);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password - user not found' },
        { status: 401 }
      );
    }

    const staffRoles: UserRole[] = [
      UserRole.SUPER_ADMIN, 
      UserRole.COMPANY, 
      UserRole.AGENT, 
      UserRole.STAFF, 
      UserRole.CASHIER,
      UserRole.ACCOUNTANT
    ];
    
    if (!staffRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied. This login is for staff only.' },
        { status: 403 }
      );
    }

    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Account is locked. Please contact support.' },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    let passwordValid = false;
    
    if (user.password) {
      try {
        passwordValid = await bcrypt.compare(password, user.password);
        console.log('[staff-login] Password comparison result:', passwordValid, 'for password:', password.substring(0,3) + '***');
      } catch (bcryptError) {
        console.error('[staff-login] Bcrypt error:', bcryptError);
        return NextResponse.json(
          { error: 'Password verification error', details: String(bcryptError) },
          { status: 500 }
        );
      }
    } else {
      console.log('[staff-login] User has no password set');
      return NextResponse.json(
        { error: 'User has no password set. Please set a password first.' },
        { status: 401 }
      );
    }

    if (!passwordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      
      if (newAttempts >= 5) {
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            isLocked: true
          }
        });
        
        return NextResponse.json(
          { error: 'Account locked due to too many failed attempts.' },
          { status: 403 }
        );
      }
      
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts }
      });
      
      return NextResponse.json(
        { error: 'Invalid email or password - password mismatch' },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        lastLocation: location ? JSON.stringify(location) : null,
        loginType: 'EMAIL'
      }
    });

    if (location && location.latitude && location.longitude) {
      await db.locationLog.create({
        data: {
          userId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          action: 'STAFF_LOGIN',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          deviceType: request.headers.get('sec-ch-ua-platform') || 'unknown',
          browser: request.headers.get('user-agent')?.split(' ')[0] || 'unknown'
        }
      });
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        module: 'AUTH',
        description: `Staff logged in via email (${user.role})`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        location: location ? JSON.stringify(location) : null
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        companyId: user.companyId,
        agentId: user.agentId,
        company: user.company ? { id: user.company.id, name: user.company.name, code: user.company.code } : null,
        agent: user.agent ? { id: user.agent.id, name: user.agent.name, agentCode: user.agent.agentCode } : null,
        agentCode: user.agentCode,
        staffCode: user.staffCode,
        cashierCode: user.cashierCode,
        accountantCode: user.accountantCode,
        isActive: user.isActive,
        isLocked: user.isLocked
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to login', 
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
