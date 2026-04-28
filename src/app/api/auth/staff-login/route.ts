import { NextRequest, NextResponse } from 'next/server';
import { db, dbWithRetry } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// Local type definition
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'AGENT' | 'ACCOUNTANT' | 'CUSTOMER' | 'STAFF' | 'COMPANY';

const PERMANENT_SUPER_ADMIN_EMAIL    = 'moneymitra@gmail.com';
const PERMANENT_SUPER_ADMIN_PASSWORD = '1122334455';

const STAFF_ROLES: string[] = ['SUPER_ADMIN', 'COMPANY', 'AGENT', 'STAFF', 'CASHIER', 'ACCOUNTANT'];

// ─── helper: detect a DB connectivity error ────────────────────────────────
function isDbConnectError(err: any): boolean {
  const msg: string = err?.message || '';
  return (
    err?.code === 'P1001' ||  // Can't reach database server
    err?.code === 'P1017' ||  // Connection closed
    err?.code === 'P2024' ||  // Connection pool timeout
    msg.includes("Can't reach database") ||
    msg.includes('Too many connections') ||
    msg.includes('max_connections_per_hour') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('socket') ||
    msg.includes('connection')
  );
}

// ─── Ensure super admin exists (first-time setup) ──────────────────────────
async function ensureSuperAdmin() {
  const existing = await dbWithRetry(() =>
    db.user.findUnique({
      where:  { email: PERMANENT_SUPER_ADMIN_EMAIL },
      select: { id: true, isActive: true, isLocked: true },
    })
  );

  if (existing) {
    // Just ensure active/unlocked — no re-hashing
    if (!existing.isActive || existing.isLocked) {
      await dbWithRetry(() =>
        db.user.update({
          where: { email: PERMANENT_SUPER_ADMIN_EMAIL },
          data:  { isActive: true, isLocked: false },
        })
      );
    }
    return existing;
  }

  // First-time creation only
  const hashedPassword = await bcrypt.hash(PERMANENT_SUPER_ADMIN_PASSWORD, 8);
  return dbWithRetry(() =>
    db.user.create({
      data: {
        email:         PERMANENT_SUPER_ADMIN_EMAIL,
        password:      hashedPassword,
        plainPassword: PERMANENT_SUPER_ADMIN_PASSWORD,
        name:          'Money Mitra Admin',
        firebaseUid:   'super-admin-permanent',
        role:          'SUPER_ADMIN',
        isActive:      true,
        isLocked:      false,
      },
    })
  );
}

// ─── POST /api/auth/staff-login ─────────────────────────────────────────────
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

    const emailLower = email.toLowerCase().trim();

    // ── Ensure super admin exists (retry-safe) ──────────────────────────────
    if (emailLower === PERMANENT_SUPER_ADMIN_EMAIL) {
      try {
        await ensureSuperAdmin();
      } catch (saErr: any) {
        if (isDbConnectError(saErr)) {
          return NextResponse.json(
            { error: '⚠️ Database server is temporarily unreachable. Please wait 30 seconds and try again.', code: 'DB_UNREACHABLE' },
            { status: 503 }
          );
        }
        throw saErr;
      }
    }

    // ── Fetch user (with retry) ────────────────────────────────────────────
    let user: any;
    try {
      user = await dbWithRetry(() =>
        db.user.findUnique({
          where:   { email: emailLower },
          include: { company: true, agent: true },
        }),
        4,    // 4 attempts
        600   // 600ms base delay (600, 1200, 1800ms)
      );
    } catch (dbErr: any) {
      if (isDbConnectError(dbErr)) {
        console.error('[staff-login] DB unreachable after retries:', dbErr.message);
        return NextResponse.json(
          { error: '⚠️ Database server is temporarily unreachable. Please wait 30 seconds and try again.', code: 'DB_UNREACHABLE' },
          { status: 503 }
        );
      }
      throw dbErr;
    }

    console.log('[staff-login] User found:', user
      ? { id: user.id, role: user.role, hasPassword: !!user.password }
      : null
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!STAFF_ROLES.includes(user.role)) {
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

    // ── Password verification ───────────────────────────────────────────────
    if (!user.password) {
      return NextResponse.json(
        { error: 'No password set for this account. Please contact support.' },
        { status: 401 }
      );
    }

    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error('[staff-login] Bcrypt error:', bcryptError);
      return NextResponse.json(
        { error: 'Password verification error', details: String(bcryptError) },
        { status: 500 }
      );
    }

    if (!passwordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock  = newAttempts >= 5;

      // Fire-and-forget: non-critical, don't block login response
      dbWithRetry(() =>
        db.user.update({
          where: { id: user.id },
          data:  { failedLoginAttempts: newAttempts, ...(shouldLock ? { isLocked: true } : {}) },
        })
      ).catch(() => { /* non-critical */ });

      if (shouldLock) {
        return NextResponse.json(
          { error: 'Account locked due to too many failed attempts.' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ── Success — update last-login metadata (non-blocking) ───────────────
    dbWithRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastLoginAt:    new Date(),
          lastActivityAt: new Date(),
          lastLocation:   location ? JSON.stringify(location) : null,
          loginType:      'EMAIL',
        },
      })
    ).catch(() => { /* non-critical */ });

    // Location log (non-blocking)
    if (location?.latitude && location?.longitude) {
      dbWithRetry(() =>
        db.locationLog.create({
          data: {
            userId:    user.id,
            latitude:  location.latitude,
            longitude: location.longitude,
            accuracy:  location.accuracy,
            action:    'STAFF_LOGIN',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            deviceType: request.headers.get('sec-ch-ua-platform') || 'unknown',
            browser:   request.headers.get('user-agent')?.split(' ')[0] || 'unknown',
          },
        })
      ).catch(() => { /* non-critical */ });
    }

    // Audit log (non-blocking)
    dbWithRetry(() =>
      db.auditLog.create({
        data: {
          userId:      user.id,
          action:      'LOGIN',
          module:      'AUTH',
          description: `Staff logged in via email (${user.role})`,
          ipAddress:   request.headers.get('x-forwarded-for') || 'unknown',
          location:    location ? JSON.stringify(location) : null,
        },
      })
    ).catch(() => { /* non-critical */ });

    return NextResponse.json({
      success: true,
      user: {
        id:             user.id,
        firebaseUid:    user.firebaseUid,
        email:          user.email,
        name:           user.name,
        role:           user.role,
        phone:          user.phone,
        companyId:      user.companyId,
        agentId:        user.agentId,
        company:        user.company
          ? { id: user.company.id, name: user.company.name, code: user.company.code, isMirrorCompany: user.company.isMirrorCompany }
          : null,
        agent:          user.agent
          ? { id: user.agent.id, name: user.agent.name, agentCode: user.agent.agentCode }
          : null,
        agentCode:      user.agentCode,
        staffCode:      user.staffCode,
        cashierCode:    user.cashierCode,
        accountantCode: user.accountantCode,
        isActive:       user.isActive,
        isLocked:       user.isLocked,
      },
    });

  } catch (error: any) {
    console.error('Staff login error:', error);

    if (isDbConnectError(error)) {
      return NextResponse.json(
        { error: '⚠️ Database server is temporarily unreachable. Please wait 30 seconds and try again.', code: 'DB_UNREACHABLE' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:   'Failed to login',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
