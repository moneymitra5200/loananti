import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // cap at 100
    const userId = searchParams.get('userId');
    const actionFilter = searchParams.get('action');
    const moduleFilter = searchParams.get('module');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (actionFilter) where.action = { contains: actionFilter, mode: 'insensitive' };
    if (moduleFilter) where.module = { contains: moduleFilter, mode: 'insensitive' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          },
          loanApplication: {
            select: { id: true, applicationNo: true }
          }
        }
      }),
      db.auditLog.count({ where })
    ]);

    // ── Cache the distinct filter lists (expensive full-table scans) ──────────
    // These don't change often — cache for 5 minutes
    const distinctCacheKey = 'audit:distinct-filters';
    let filterLists = cache.get<{ modules: string[]; actions: string[] }>(distinctCacheKey);

    if (!filterLists) {
      const [moduleList, actionList] = await Promise.all([
        db.auditLog.findMany({
          select: { module: true },
          distinct: ['module'],
          take: 50,
        }),
        db.auditLog.findMany({
          select: { action: true },
          distinct: ['action'],
          take: 100,
        }),
      ]);
      filterLists = {
        modules: moduleList.map((m: { module: string }) => m.module),
        actions: actionList.map((a: { action: string }) => a.action),
      };
      cache.set(distinctCacheKey, filterLists, CacheTTL.LONG); // 5 min
    }

    return NextResponse.json({
      logs,
      modules: filterLists.modules,
      actions: filterLists.actions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
