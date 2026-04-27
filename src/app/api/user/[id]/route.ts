import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateUserCache, cache } from '@/lib/cache';
import bcrypt from 'bcryptjs';

const PROTECTED_EMAIL = 'moneymitra@gmail.com';

// GET - Fetch a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includePassword = searchParams.get('includePassword') === 'true';

    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isActive: true, isLocked: true, createdAt: true,
        companyId: true, agentId: true, agentCode: true,
        staffCode: true, cashierCode: true, accountantCode: true,
        companyCredit: true, personalCredit: true, credit: true,
        profilePicture: true,
        plainPassword: includePassword,
        company: { select: { id: true, name: true, code: true } },
        agent:   { select: { id: true, name: true, agentCode: true } },
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[GET /api/user/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT - Update a single user by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, isActive, agentId, companyCredit, personalCredit, password } = body;

    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // Prevent disabling the permanent super admin
    if (isActive === false) {
      const existing = await db.user.findUnique({ where: { id }, select: { email: true } });
      if (existing?.email === PROTECTED_EMAIL) {
        return NextResponse.json({ error: 'Cannot deactivate the permanent Super Admin.', isProtected: true }, { status: 403 });
      }
    }

    // If email is being changed, check uniqueness
    if (email) {
      const conflict = await db.user.findFirst({ where: { email, NOT: { id } } });
      if (conflict) {
        return NextResponse.json({ error: 'This email is already in use by another account.' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name        !== undefined) updateData.name        = name;
    if (email       !== undefined) updateData.email       = email;
    if (phone       !== undefined) updateData.phone       = phone;
    if (isActive    !== undefined) updateData.isActive    = isActive;
    if (agentId     !== undefined) updateData.agentId     = agentId || null;
    if (companyCredit   !== undefined) updateData.companyCredit   = companyCredit;
    if (personalCredit  !== undefined) updateData.personalCredit  = personalCredit;

    if (password?.trim()) {
      updateData.password      = await bcrypt.hash(password, 10);
      updateData.plainPassword = password;
    }

    const user = await db.user.update({
      where: { id },
      data:  updateData,
      include: {
        company: { select: { id: true, name: true, code: true } },
        agent:   { select: { id: true, name: true } }
      }
    });

    invalidateUserCache(id);
    cache.deletePattern('users:');

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('[PUT /api/user/[id]]', error);
    if (error?.code === 'P2025') return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Permanent cascade delete (uses PARALLEL deletes for max speed)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, companyId: true }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.email === PROTECTED_EMAIL) {
      return NextResponse.json({
        error: 'Cannot delete the permanent Super Admin account.',
        isProtected: true
      }, { status: 403 });
    }

    console.log(`[DELETE /api/user/[id]] Cascade deleting user ${id} (${user.role})`);

    // ── Step 1: ALL non-critical records deleted IN PARALLEL (10x faster than sequential) ──
    await Promise.allSettled([
      db.auditLog.deleteMany({ where: { userId: id } }),
      db.notification.deleteMany({ where: { userId: id } }),
      db.workflowLog.deleteMany({ where: { actionById: id } }),
      db.locationLog.deleteMany({ where: { userId: id } }),
      db.reminder.deleteMany({ where: { userId: id } }),
      db.notificationSetting.deleteMany({ where: { userId: id } }),
      db.deviceFingerprint.deleteMany({ where: { userId: id } }),
      db.blacklist.deleteMany({ where: { userId: id } }),
      db.creditTransaction.deleteMany({ where: { userId: id } }),
      db.message.deleteMany({ where: { fromUserId: id } }),
      db.message.deleteMany({ where: { toUserId: id } }),
    ]);

    // ── Step 2: If COMPANY role — delete company accounting records in parallel ──
    if (user.role === 'COMPANY' && user.companyId) {
      const cid = user.companyId;
      await Promise.allSettled([
        db.ledgerBalance.deleteMany({ where: { account: { companyId: cid } } }),
        db.journalEntryLine.deleteMany({ where: { account: { companyId: cid } } }),
        db.journalEntry.deleteMany({ where: { companyId: cid } }),
        db.financialYear.deleteMany({ where: { companyId: cid } }),
        db.bankAccount.deleteMany({ where: { companyId: cid } }),
        db.ledger.deleteMany({ where: { companyId: cid } }),
      ]);
      await db.chartOfAccount.deleteMany({ where: { companyId: cid } });
      await db.company.delete({ where: { id: cid } }).catch(() => null);
    }

    // ── Step 3: Delete the user ──
    await db.user.delete({ where: { id } });

    // ── Step 4: Invalidate all related caches ──
    invalidateUserCache(id);
    cache.deletePattern('users:');
    cache.deletePattern('companies:');
    cache.deletePattern('dashboard:stats:');

    console.log(`[DELETE /api/user/[id]] User ${id} permanently deleted.`);
    return NextResponse.json({
      success: true,
      message: 'User permanently deleted.',
      deletedUserId: id
    });

  } catch (error: any) {
    console.error('[DELETE /api/user/[id]]', error);
    if (error?.message?.includes('Foreign key constraint')) {
      return NextResponse.json({ error: 'User has related records. Reassign them before deleting.' }, { status: 400 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete user.', details: error?.message }, { status: 500 });
  }
}
