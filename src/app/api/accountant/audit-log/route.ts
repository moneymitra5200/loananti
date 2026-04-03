import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Audit logs for a company (accountant-related only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Accountant-related modules
    const accountantModules = [
      'BANK', 'EXPENSE', 'INCOME', 'LOAN', 'EMI', 
      'REPORT', 'JOURNAL', 'ACCOUNTING', 'AUDIT',
      'PAYMENT', 'COLLECTION', 'DISBURSEMENT'
    ];

    const logs = await db.auditLog.findMany({
      where: {
        OR: [
          { module: { in: accountantModules } },
          { recordType: { in: ['BANK_ACCOUNT', 'BANK_TRANSACTION', 'EXPENSE', 'LOAN', 'EMI_PAYMENT'] } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        module: true,
        description: true,
        recordId: true,
        recordType: true,
        createdAt: true,
        userId: true
      }
    });

    // Get user names for the logs
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const users = await db.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true }
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      module: log.module || 'SYSTEM',
      description: log.description,
      recordId: log.recordId,
      recordType: log.recordType,
      createdAt: log.createdAt,
      user: log.userId ? userMap[log.userId] || null : null
    }));

    return NextResponse.json({ logs: formattedLogs });

  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ 
      error: 'Failed to get audit logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
