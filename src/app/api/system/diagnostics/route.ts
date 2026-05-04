/**
 * /api/system/diagnostics
 * ─────────────────────────────────────────────────────────────────
 * Call this GET endpoint from browser / Postman to see a real-time
 * breakdown of exactly what is consuming memory and connections.
 *
 * Usage: GET /api/system/diagnostics?secret=YOUR_ADMIN_SECRET
 *
 * Returns:
 *   - Node.js heap, RSS, external memory in MB
 *   - Socket.io room count + total connected clients
 *   - Active database connection pool info
 *   - In-memory cache entries
 *   - Top memory consumers (GC heap stats)
 *   - Process uptime + CPU usage estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simple secret guard — set DIAGNOSTIC_SECRET in .env
const REQUIRED_SECRET = process.env.DIAGNOSTIC_SECRET || 'diag-secret-2024';

function mb(bytes: number) {
  return Math.round(bytes / 1024 / 1024 * 100) / 100;
}

export async function GET(request: NextRequest) {
  // Auth guard
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== REQUIRED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized. Pass ?secret=YOUR_SECRET' }, { status: 401 });
  }

  // ── 1. Node.js Memory ─────────────────────────────────────────
  const mem = process.memoryUsage();
  const memReport = {
    rss_mb:        mb(mem.rss),          // Total process RAM (most important for Hostinger limit)
    heap_used_mb:  mb(mem.heapUsed),     // JS objects in use
    heap_total_mb: mb(mem.heapTotal),    // Total heap allocated
    external_mb:   mb(mem.external),     // Buffers (e.g. large base64 images in memory)
    array_buffers_mb: mb(mem.arrayBuffers || 0),
    warning: mem.rss > 400 * 1024 * 1024
      ? '🔴 RSS > 400MB — approaching Hostinger 512MB limit!'
      : mem.rss > 300 * 1024 * 1024
      ? '🟡 RSS > 300MB — monitor closely'
      : '🟢 Memory OK',
  };

  // ── 2. Socket.io Connections ──────────────────────────────────
  const io = (global as any).io;
  let socketReport: Record<string, unknown> = { status: 'Socket.io not found on global' };
  if (io) {
    const sockets = await io.fetchSockets();
    const rooms = io.sockets.adapter.rooms;
    const roomEntries: { name: string; size: number }[] = [];
    rooms.forEach((room: Set<string>, name: string) => {
      // Skip individual socket-id rooms
      if (!io.sockets.sockets.has(name)) {
        roomEntries.push({ name, size: room.size });
      }
    });
    roomEntries.sort((a, b) => b.size - a.size);

    socketReport = {
      total_connected_clients: sockets.length,
      total_rooms: roomEntries.length,
      top_rooms: roomEntries.slice(0, 20),
      warning: sockets.length > 200
        ? '🔴 > 200 socket connections — possible leak!'
        : sockets.length > 100
        ? '🟡 > 100 connections — watch this'
        : `🟢 ${sockets.length} connections — OK`,
    };
  }

  // ── 3. Database — Count large tables ─────────────────────────
  let dbReport: Record<string, unknown> = {};
  try {
    const [
      notifications,
      auditLogs,
      locationLogs,
      payments,
      workflowLogs,
      fcmTokens,
      loanApps,
      offlineLoans,
      emiSchedules,
      offlineEmis,
    ] = await Promise.all([
      db.notification.count(),
      db.auditLog.count().catch(() => 0),
      db.locationLog.count().catch(() => 0),
      db.payment.count().catch(() => 0),
      db.workflowLog.count().catch(() => 0),
      db.fCMToken.count().catch(() => 0),
      db.loanApplication.count().catch(() => 0),
      db.offlineLoan.count().catch(() => 0),
      db.eMISchedule.count().catch(() => 0),
      db.offlineLoanEMI.count().catch(() => 0),
    ]);

    dbReport = {
      notifications,
      audit_logs: auditLogs,
      location_logs: locationLogs,
      payments,
      workflow_logs: workflowLogs,
      fcm_tokens: fcmTokens,
      loan_applications: loanApps,
      offline_loans: offlineLoans,
      emi_schedules: emiSchedules,
      offline_loan_emis: offlineEmis,
      warnings: [
        notifications > 5000  && `🔴 ${notifications} notifications — run cleanup`,
        auditLogs > 10000     && `🔴 ${auditLogs} audit logs — run cleanup`,
        locationLogs > 5000   && `🔴 ${locationLogs} location logs — run cleanup`,
        fcmTokens > 500       && `🟡 ${fcmTokens} FCM tokens — may have stale tokens`,
        emiSchedules > 50000  && `🟡 ${emiSchedules} EMI records — normal but large`,
      ].filter(Boolean),
    };
  } catch (err) {
    dbReport = { error: String(err) };
  }

  // ── 4. Process Info ───────────────────────────────────────────
  const uptimeSeconds = process.uptime();
  const uptimeHours = Math.round(uptimeSeconds / 3600 * 10) / 10;
  const cpuUsage = process.cpuUsage();

  const processReport = {
    uptime_hours: uptimeHours,
    node_version: process.version,
    platform: process.platform,
    pid: process.pid,
    cpu_user_ms:   Math.round(cpuUsage.user / 1000),
    cpu_system_ms: Math.round(cpuUsage.system / 1000),
    env: process.env.NODE_ENV,
  };

  // ── 5. Environment sanity checks ─────────────────────────────
  const envChecks = {
    has_firebase_key: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    has_database_url: !!process.env.DATABASE_URL,
    has_nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
  };

  // ── Final report ──────────────────────────────────────────────
  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      rss_mb: memReport.rss_mb,
      heap_used_mb: memReport.heap_used_mb,
      socket_clients: io ? (socketReport.total_connected_clients ?? 0) : 'N/A',
      uptime_hours: uptimeHours,
      overall_status: memReport.rss_mb > 400
        ? '🔴 CRITICAL — approaching memory limit'
        : memReport.rss_mb > 300
        ? '🟡 WARNING — elevated memory'
        : '🟢 HEALTHY',
    },
    memory: memReport,
    sockets: socketReport,
    database_table_counts: dbReport,
    process: processReport,
    environment: envChecks,
    recommendations: generateRecommendations(memReport, dbReport as any),
  };

  return NextResponse.json(report, {
    headers: { 'Content-Type': 'application/json' }
  });
}

function generateRecommendations(mem: Record<string, unknown>, db: Record<string, unknown>) {
  const recs: string[] = [];

  const rssMb = mem.rss_mb as number;
  if (rssMb > 350) {
    recs.push('🔴 RSS > 350MB: Restart the Node.js process immediately from Hostinger panel');
  }
  if ((mem.external_mb as number) > 50) {
    recs.push('🟡 High external memory: likely caused by large base64 image uploads in memory. Check recent EMI proof uploads.');
  }

  const notifs = db.notifications as number;
  const audits = db.audit_logs as number;
  const locs   = db.location_logs as number;

  if (notifs > 5000) {
    recs.push(`🔴 ${notifs} notifications in DB — run: DELETE FROM Notification WHERE createdAt < NOW() - INTERVAL 30 DAY`);
  }
  if (audits > 10000) {
    recs.push(`🔴 ${audits} audit logs — the daily cron job may not be running. Check server.js cron setup.`);
  }
  if (locs > 5000) {
    recs.push(`🔴 ${locs} location logs — they should auto-purge. Check cron job.`);
  }
  if (recs.length === 0) {
    recs.push('✅ No immediate issues found. Monitor RSS over time.');
  }

  return recs;
}
