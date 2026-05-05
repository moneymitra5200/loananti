/**
 * /api/system/diagnostics
 * ─────────────────────────────────────────────────────────────────
 * Real-time server health endpoint. Visit /audit in the browser for
 * the visual dashboard, or call this directly for raw JSON.
 *
 * Usage: GET /api/system/diagnostics?secret=YOUR_ADMIN_SECRET
 *        GET /api/system/diagnostics?secret=...&reset=true  (reset API stats)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiStats, resetApiStats } from '@/lib/api-tracker';

const REQUIRED_SECRET = process.env.DIAGNOSTIC_SECRET || 'diag-secret-2024';

function mb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== REQUIRED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized. Pass ?secret=YOUR_SECRET' }, { status: 401 });
  }

  // Optional: reset stats
  if (request.nextUrl.searchParams.get('reset') === 'true') {
    resetApiStats();
    return NextResponse.json({ success: true, message: 'API stats reset' });
  }

  // ── 1. Node.js Memory ─────────────────────────────────────────────────────
  const mem = process.memoryUsage();
  const rssMb = mb(mem.rss);
  const memReport = {
    rss_mb:           rssMb,
    heap_used_mb:     mb(mem.heapUsed),
    heap_total_mb:    mb(mem.heapTotal),
    external_mb:      mb(mem.external),
    array_buffers_mb: mb(mem.arrayBuffers || 0),
    heap_used_pct:    Math.round((mem.heapUsed / mem.heapTotal) * 100),
    status: rssMb > 420 ? '🔴 CRITICAL' : rssMb > 320 ? '🟡 WARNING' : '🟢 OK',
    limit_mb: 512,
    used_pct_of_limit: Math.round((rssMb / 512) * 100),
  };

  // ── 2. Socket.io Connections ──────────────────────────────────────────────
  const io = (global as any).io;
  let socketReport: Record<string, unknown> = { status: '⚠️ Socket.io not initialised' };
  if (io) {
    try {
      const sockets = await io.fetchSockets();
      const rooms = io.sockets.adapter.rooms;
      const namedRooms: { name: string; size: number }[] = [];
      rooms.forEach((room: Set<string>, name: string) => {
        if (!io.sockets.sockets.has(name)) {
          namedRooms.push({ name, size: room.size });
        }
      });
      namedRooms.sort((a, b) => b.size - a.size);

      const clientCount = sockets.length;
      socketReport = {
        connected_clients: clientCount,
        named_rooms: namedRooms.length,
        top_rooms: namedRooms.slice(0, 15),
        status: clientCount > 200 ? '🔴 Possible leak' : clientCount > 100 ? '🟡 High' : `🟢 OK (${clientCount})`,
        transport_breakdown: sockets.reduce((acc: Record<string, number>, s: any) => {
          const t = s.conn?.transport?.name || 'unknown';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {}),
      };
    } catch (e: any) {
      socketReport = { error: e.message };
    }
  }

  // ── 3. Database — table counts + response time (CACHED 60s) ─────────────────
  // The audit page refreshes every 5s — without caching this runs 11 DB queries
  // per refresh = ~130 DB queries/minute → connection exhaustion.
  let dbReport: Record<string, unknown> = {};
  const DB_CACHE_TTL = 60_000; // 60 seconds
  const g = globalThis as any;

  if (g._diagDbCache && Date.now() - g._diagDbCache.ts < DB_CACHE_TTL) {
    // Serve from cache — no DB hit
    dbReport = g._diagDbCache.data;
  } else {
    try {
      const dbStart = Date.now();
      await db.$queryRaw`SELECT 1 as test`;
      const dbPingMs = Date.now() - dbStart;

      const notifications  = await db.notification.count().catch(() => -1);
      const auditLogs      = await db.auditLog.count().catch(() => -1);
      const locationLogs   = await db.locationLog.count().catch(() => -1);
      const loanApps       = await db.loanApplication.count().catch(() => -1);
      const offlineLoans   = await db.offlineLoan.count().catch(() => -1);
      const emiSchedules   = await db.eMISchedule.count().catch(() => -1);
      const offlineEmis    = await db.offlineLoanEMI.count().catch(() => -1);
      const payments       = await db.payment.count().catch(() => -1);
      const usersTotal     = await db.user.count().catch(() => -1);
      const usersWithFcm   = await db.user.count({ where: { fcmToken: { not: null } } }).catch(() => -1);
      const workflowLogs   = await db.workflowLog.count().catch(() => -1);

      const warnings: string[] = [];
      if (notifications > 5000) warnings.push(`🔴 ${notifications} notifications — run cleanup`);
      if (auditLogs > 10000)    warnings.push(`🔴 ${auditLogs} audit logs — cron may not be running`);
      if (locationLogs > 5000)  warnings.push(`🔴 ${locationLogs} location logs — cron may not be running`);
      if (usersWithFcm === 0)   warnings.push('🟡 No FCM tokens — push notifications broken');
      if (dbPingMs > 500)       warnings.push(`🟡 DB ping ${dbPingMs}ms — DB server is slow`);

      dbReport = {
        ping_ms: dbPingMs,
        ping_status: dbPingMs < 100 ? '🟢 Fast' : dbPingMs < 300 ? '🟡 OK' : '🔴 Slow',
        cached: false,
        table_counts: {
          users: usersTotal,
          users_with_fcm_token: usersWithFcm,
          notifications,
          audit_logs: auditLogs,
          location_logs: locationLogs,
          loan_applications: loanApps,
          offline_loans: offlineLoans,
          emi_schedules: emiSchedules,
          offline_loan_emis: offlineEmis,
          payments,
          workflow_logs: workflowLogs,
        },
        warnings,
      };

      // Store in cache
      g._diagDbCache = { ts: Date.now(), data: { ...dbReport, cached: true } };
    } catch (err: any) {
      dbReport = { error: err.message, ping_status: '🔴 DB connection failed' };
    }
  }


  // ── 4. Process Info ───────────────────────────────────────────────────────
  const uptimeSec = process.uptime();
  const cpuUsage  = process.cpuUsage();
  const uh = Math.floor(uptimeSec / 3600);
  const um = Math.floor((uptimeSec % 3600) / 60);
  const us = Math.floor(uptimeSec % 60);
  const processReport = {
    uptime_seconds: Math.round(uptimeSec),
    uptime_human: `${uh}h ${um}m ${us}s`,
    node_version: process.version,
    pid: process.pid,
    platform: process.platform,
    cpu_user_ms:   Math.round(cpuUsage.user / 1000),
    cpu_system_ms: Math.round(cpuUsage.system / 1000),
    env: process.env.NODE_ENV,
  };

  // ── 5. Environment sanity checks ─────────────────────────────────────────
  const fbProjectId   = process.env.FIREBASE_PROJECT_ID;
  const fbClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const fbPrivateKey  = process.env.FIREBASE_PRIVATE_KEY;
  const envReport = {
    firebase_ready: !!(fbProjectId && fbClientEmail && fbPrivateKey),
    firebase_project: fbProjectId || '(not set)',
    firebase_status: (fbProjectId && fbClientEmail && fbPrivateKey) ? '🟢 OK' : '🔴 MISSING — push notifications broken',
    has_database_url: !!(process.env.DATABASE_URL || process.env.DB_HOST),
    has_db_components: !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME),
    app_url: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    has_nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    diagnostic_secret_set: process.env.DIAGNOSTIC_SECRET ? '🟢 Custom secret configured' : '🟡 Using default secret — set DIAGNOSTIC_SECRET in .env',
  };

  // ── 6. Live API call stats ────────────────────────────────────────────────
  const apiStats = getApiStats();

  // ── 7. Cache stats (from global cache singleton) ─────────────────────────
  let cacheReport: Record<string, unknown> = { status: 'Cache module not loaded' };
  try {
    const { cache } = await import('@/lib/cache');
    const stats = (cache as any).getStats?.() || {};
    cacheReport = {
      ...stats,
      status: '🟢 Active',
    };
  } catch {
    cacheReport = { status: '⚠️ Could not read cache stats' };
  }

  // ── Final report ──────────────────────────────────────────────────────────
  const overallStatus =
    rssMb > 420 ? '🔴 CRITICAL'
    : rssMb > 320 ? '🟡 WARNING'
    : (dbReport as any).ping_status?.includes('Slow') ? '🟡 DB SLOW'
    : '🟢 HEALTHY';

  const CORS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    overall_status: overallStatus,
    memory: memReport,
    sockets: socketReport,
    database: dbReport,
    process: processReport,
    environment: envReport,
    api_call_stats: apiStats,
    cache: cacheReport,
  }, { headers: CORS });
}

// Handle CORS preflight from local audit.html
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
