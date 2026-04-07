import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateCode } from '@/utils/helpers';
import { cache, CacheKeys, CacheTTL, invalidateUserCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');

    // Generate cache key
    const cacheKey = roleParam ? CacheKeys.usersByRole(roleParam) : CacheKeys.usersList();

    // Check cache first
    const cachedUsers = cache.get(cacheKey);
    if (cachedUsers) {
      return NextResponse.json({ users: cachedUsers, cached: true });
    }

    // Build where clause properly with Prisma types
    let where: { role?: UserRole | { in: UserRole[] } } = {};
    
    if (roleParam) {
      const roles = roleParam.split(',').map(r => r.trim() as UserRole).filter(Boolean);
      if (roles.length === 1) {
        where = { role: roles[0] };
      } else if (roles.length > 1) {
        where = { role: { in: roles } };
      }
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isLocked: true,
        createdAt: true,
        companyId: true,
        agentId: true,
        agentCode: true,
        staffCode: true,
        cashierCode: true,
        accountantCode: true,
        companyCredit: true,
        personalCredit: true,
        credit: true,
        profilePicture: true,
        company: { 
          select: { id: true, name: true, code: true } 
        },
        agent: { 
          select: { id: true, name: true, agentCode: true } 
        }
      }
    });

    // Cache the result
    cache.set(cacheKey, users, CacheTTL.MEDIUM);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, email, phone, password, role, companyId, agentId,
      // Extended company fields
      code, address, city, state, pincode, gstNumber, panNumber, website,
      ownerName, ownerPhone, ownerEmail, ownerPan, ownerAadhaar, logoUrl,
      isMirrorCompany, mirrorInterestRate, mirrorInterestType,
      accountingType, defaultInterestRate, defaultInterestType
    } = body;

    // Convert empty strings to null for foreign key fields
    // AGENT, CASHIER, and ACCOUNTANT are common for all companies - no company selection needed
    const rolesWithoutCompany = ['AGENT', 'CASHIER', 'ACCOUNTANT'];
    const cleanCompanyId = rolesWithoutCompany.includes(role) ? null : (companyId && companyId.trim() !== '' ? companyId : null);
    const cleanAgentId = agentId && agentId.trim() !== '' ? agentId : null;

    console.log('[User API] Creating user:', { name, email, role, companyId: cleanCompanyId, agentId: cleanAgentId });

    if (!name || !email || !password || !role) {
      console.log('[User API] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields: name, email, password, role' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('[User API] User already exists:', email);
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const firebaseUid = `email-${Date.now()}`;

    let userCompanyId = cleanCompanyId;
    let createdCompany: Awaited<ReturnType<typeof db.company.create>> | null = null;

    // Create company if role is COMPANY and no company specified
    if (role === 'COMPANY' && !cleanCompanyId) {
      const companyCode = code || generateCode('COMP');
      console.log('[User API] Creating company with code:', companyCode);
      console.log('[User API] Company data:', {
        name,
        code: companyCode,
        email,
        isMirrorCompany,
        mirrorInterestRate,
        mirrorInterestType
      });
      
      try {
        createdCompany = await db.company.create({
          data: {
            name,
            code: companyCode,
            contactEmail: email,
            contactPhone: phone || null,
            address: address || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,
            gstNumber: gstNumber || null,
            panNumber: panNumber || null,
            website: website || null,
            ownerName: ownerName || null,
            ownerPhone: ownerPhone || null,
            ownerEmail: ownerEmail || null,
            ownerPan: ownerPan || null,
            ownerAadhaar: ownerAadhaar || null,
            logoUrl: logoUrl || null,
            isMirrorCompany: isMirrorCompany !== undefined ? isMirrorCompany : true,
            mirrorInterestRate: mirrorInterestRate ?? null,
            mirrorInterestType: mirrorInterestType || 'REDUCING',
            accountingType: accountingType || 'FULL',
            defaultInterestRate: defaultInterestRate || 12,
            defaultInterestType: defaultInterestType || 'FLAT',
            isActive: true
          }
        });
        userCompanyId = createdCompany.id;
        console.log('[User API] Company created successfully:', createdCompany.id);
      } catch (companyError) {
        console.error('[User API] Error creating company:', companyError);
        if (companyError instanceof Error) {
          console.error('[User API] Company error message:', companyError.message);
          // Check for unique constraint violation
          if (companyError.message.includes('Unique constraint') || companyError.message.includes('code')) {
            return NextResponse.json({ 
              error: 'Company code already exists. Please try again or use a different code.',
              details: companyError.message 
            }, { status: 400 });
          }
        }
        throw companyError;
      }
    }

    // Validate that company exists if companyId is provided (not for roles that are ecosystem-wide)
    const ecosystemWideRoles = ['AGENT', 'CASHIER', 'ACCOUNTANT'];
    if (userCompanyId && role !== 'COMPANY' && !ecosystemWideRoles.includes(role)) {
      const companyExists = await db.company.findUnique({
        where: { id: userCompanyId }
      });
      if (!companyExists) {
        return NextResponse.json({ error: 'Selected company does not exist' }, { status: 400 });
      }
    }

    // Validate that agent exists if agentId is provided
    if (cleanAgentId && role === 'STAFF') {
      const agentExists = await db.user.findUnique({
        where: { id: cleanAgentId, role: 'AGENT' }
      });
      if (!agentExists) {
        return NextResponse.json({ error: 'Selected agent does not exist' }, { status: 400 });
      }
    }

    const roleCodes: Record<string, string> = {
      AGENT: generateCode('AG'),
      STAFF: generateCode('ST'),
      CASHIER: generateCode('CS'),
      ACCOUNTANT: generateCode('ACC')
    };

    console.log('[User API] Creating user record with role:', role);
    console.log('[User API] User data:', {
      name,
      email,
      role,
      companyId: userCompanyId,
      agentId: role === 'STAFF' ? cleanAgentId : null
    });
    
    let user;
    try {
      user = await db.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          password: hashedPassword,
          plainPassword: password,
          firebaseUid,
          role: role as UserRole,
          companyId: userCompanyId,
          agentId: role === 'STAFF' ? cleanAgentId : null,
          agentCode: role === 'AGENT' ? roleCodes.AGENT : null,
          staffCode: role === 'STAFF' ? roleCodes.STAFF : null,
          cashierCode: role === 'CASHIER' ? roleCodes.CASHIER : null,
          accountantCode: role === 'ACCOUNTANT' ? roleCodes.ACCOUNTANT : null,
          // Commission removed - no one takes commission in this system
          commissionRate: 0,
          lastLoginAt: new Date()
        },
        include: {
          company: true,
          agent: true
        }
      });
    } catch (userCreateError) {
      console.error('[User API] Error creating user record:', userCreateError);
      if (userCreateError instanceof Error) {
        console.error('[User API] User create error message:', userCreateError.message);
        // Check for common errors
        if (userCreateError.message.includes('Unique constraint')) {
          return NextResponse.json({ 
            error: 'Email or code already exists. Please use a different email.',
            details: userCreateError.message 
          }, { status: 400 });
        }
        if (userCreateError.message.includes('foreign key')) {
          return NextResponse.json({ 
            error: 'Invalid company or agent reference.',
            details: userCreateError.message 
          }, { status: 400 });
        }
      }
      throw userCreateError;
    }

    console.log('[User API] User created successfully:', user.id);

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        module: 'USER',
        description: `User created with role ${role}`,
        recordId: user.id,
        recordType: 'User',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    // Invalidate user cache
    invalidateUserCache();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
        agentCode: user.agentCode,
        staffCode: user.staffCode,
        cashierCode: user.cashierCode,
        accountantCode: user.accountantCode
      }
    });
  } catch (error) {
    console.error('[User API] Error creating user:', error);
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('[User API] Error name:', error.name);
      console.error('[User API] Error message:', error.message);
      console.error('[User API] Error stack:', error.stack);
    }
    return NextResponse.json({ 
      error: 'Failed to create user', 
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : 'Unknown'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, isActive, agentId } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Protect permanent super admin from being deactivated
    const PERMANENT_SUPER_ADMIN_EMAILS = ['moneymitra@gmail.com'];
    if (isActive === false) {
      const user = await db.user.findUnique({ where: { id } });
      if (user && PERMANENT_SUPER_ADMIN_EMAILS.includes(user.email)) {
        return NextResponse.json({ 
          error: 'Cannot deactivate the permanent Super Admin account. This account is protected.',
          isProtected: true 
        }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (agentId !== undefined) updateData.agentId = agentId;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { company: true, agent: true }
    });

    // Invalidate user cache
    invalidateUserCache(id);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect permanent super admin from deletion
    const PERMANENT_SUPER_ADMIN_EMAILS = ['moneymitra@gmail.com'];
    if (PERMANENT_SUPER_ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ 
        error: 'Cannot delete the permanent Super Admin account. This account is protected.',
        isProtected: true 
      }, { status: 403 });
    }

    // Check for critical related records that prevent deletion
    const [loanApplications, sessionForms, payments] = await Promise.all([
      db.loanApplication.count({ where: { customerId: id } }),
      db.sessionForm.count({ where: { agentId: id } }),
      db.payment.count({ where: { customerId: id } }),
    ]);

    // These are critical - cannot delete if user has these
    if (loanApplications > 0 || sessionForms > 0 || payments > 0) {
      const relatedInfo: string[] = [];
      if (loanApplications > 0) relatedInfo.push(`${loanApplications} loan application(s)`);
      if (sessionForms > 0) relatedInfo.push(`${sessionForms} session form(s)`);
      if (payments > 0) relatedInfo.push(`${payments} payment(s)`);

      return NextResponse.json({ 
        error: `Cannot delete user. They have related records: ${relatedInfo.join(', ')}. Please remove or reassign these records first.`,
        hasRelations: true 
      }, { status: 400 });
    }

    // Delete non-critical related records (audit logs, notifications, etc.)
    await Promise.all([
      db.auditLog.deleteMany({ where: { userId: id } }),
      db.notification.deleteMany({ where: { userId: id } }),
      db.workflowLog.deleteMany({ where: { actionById: id } }),
      db.locationLog.deleteMany({ where: { userId: id } }),
      db.reminder.deleteMany({ where: { userId: id } }),
      db.notificationSetting.deleteMany({ where: { userId: id } }),
      db.deviceFingerprint.deleteMany({ where: { userId: id } }),
      db.blacklist.deleteMany({ where: { userId: id } }),
    ]);

    // Create deleted user record for email reuse tracking
    await db.deletedUser.create({
      data: {
        email: user.email,
        firebaseUid: user.firebaseUid,
        originalRole: user.role
      }
    });

    // Delete the user
    await db.user.delete({ where: { id } });

    // Invalidate user cache
    invalidateUserCache(id);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Handle Prisma foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
      return NextResponse.json({ 
        error: 'Cannot delete user. They have related records in the system. Please remove or reassign these records first.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
