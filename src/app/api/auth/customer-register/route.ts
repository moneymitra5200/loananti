import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Local type definition - Prisma schema uses strings, not enums
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'AGENT' | 'ACCOUNTANT' | 'CUSTOMER' | 'STAFF' | 'COMPANY';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        plainPassword: password,
        name: name || email.split('@')[0],
        phone,
        firebaseUid: `email-${Date.now()}`,
        role: 'CUSTOMER' as UserRole,
        loginType: 'EMAIL',
        lastLoginAt: new Date()
      }
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        module: 'USER',
        description: 'New customer registered via email/password',
        recordId: user.id,
        recordType: 'User',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
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
        company: null,
        agent: null,
        agentCode: user.agentCode,
        staffCode: user.staffCode,
        cashierCode: user.cashierCode,
        accountantCode: user.accountantCode,
        isActive: user.isActive,
        isLocked: user.isLocked
      }
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
