import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateUserCache, cache } from '@/lib/cache';
import bcrypt from 'bcryptjs';

// GET - Fetch a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includePassword = searchParams.get('includePassword') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id },
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
        // Only include plainPassword for Super Admin view
        plainPassword: includePassword,
        company: {
          select: { id: true, name: true, code: true }
        },
        agent: {
          select: { id: true, name: true, agentCode: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
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
    const { name, phone, isActive, agentId, companyCredit, personalCredit, password } = body;

    console.log('[User PUT] Updating user:', id, { name, phone, isActive, agentId });

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (agentId !== undefined) updateData.agentId = agentId || null;
    if (companyCredit !== undefined) updateData.companyCredit = companyCredit;
    if (personalCredit !== undefined) updateData.personalCredit = personalCredit;
    
    // Handle password update
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      updateData.plainPassword = password;
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { company: true, agent: true }
    });

    // Invalidate user cache
    invalidateUserCache(id);
    cache.deletePattern('users:');

    console.log('[User PUT] User updated successfully:', user.id);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete a user by ID (PERMANENT DELETE with cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[User DELETE] Starting cascade delete for user:', id);

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ 
      where: { id },
      include: {
        company: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect permanent super admin from deletion
    const PERMANENT_SUPER_ADMIN_EMAIL = 'moneymitra@gmail.com';
    if (user.email === PERMANENT_SUPER_ADMIN_EMAIL) {
      return NextResponse.json({
        error: 'Cannot delete the permanent Super Admin account',
        isProtected: true
      }, { status: 403 });
    }

    // ============================================
    // CASCADE DELETE - Remove all related records
    // ============================================
    
    // 1. Delete audit logs
    await db.auditLog.deleteMany({ where: { userId: id } });
    
    // 2. Delete notifications
    await db.notification.deleteMany({ where: { userId: id } });
    
    // 3. Delete workflow logs
    await db.workflowLog.deleteMany({ where: { actionById: id } });
    
    // 4. Delete location logs
    await db.locationLog.deleteMany({ where: { userId: id } });
    
    // 5. Delete reminders
    await db.reminder.deleteMany({ where: { userId: id } });
    
    // 6. Delete notification settings
    await db.notificationSetting.deleteMany({ where: { userId: id } });
    
    // 7. Delete device fingerprints
    await db.deviceFingerprint.deleteMany({ where: { userId: id } });
    
    // 8. Delete blacklist entries
    await db.blacklist.deleteMany({ where: { userId: id } });

    // 9. For COMPANY role - also delete the company
    if (user.role === 'COMPANY' && user.companyId) {
      console.log('[User DELETE] Deleting company:', user.companyId);
      
      // Delete company-related records first
      await db.ledgerBalance.deleteMany({ where: { account: { companyId: user.companyId } } });
      await db.journalEntryLine.deleteMany({ where: { account: { companyId: user.companyId } } });
      await db.chartOfAccount.deleteMany({ where: { companyId: user.companyId } });
      await db.journalEntry.deleteMany({ where: { companyId: user.companyId } });
      await db.ledgerBalance.deleteMany({ where: { financialYear: { companyId: user.companyId } } });
      await db.financialYear.deleteMany({ where: { companyId: user.companyId } });
      await db.bankAccount.deleteMany({ where: { companyId: user.companyId } });
      await db.ledger.deleteMany({ where: { companyId: user.companyId } });
      
      // Delete the company
      await db.company.delete({ where: { id: user.companyId } });
      console.log('[User DELETE] Company deleted');
    }

    // 10. FINALLY - Delete the user permanently
    await db.user.delete({ where: { id } });
    console.log('[User DELETE] User permanently deleted');

    // Clear all caches
    invalidateUserCache(id);
    cache.deletePattern('users:');
    cache.deletePattern('companies:');

    return NextResponse.json({ 
      success: true, 
      message: 'User and all related records permanently deleted from database',
      deletedUserId: id 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Handle Prisma foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
      return NextResponse.json({ 
        error: 'Cannot delete user. They have related records in the system. Please contact support.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
