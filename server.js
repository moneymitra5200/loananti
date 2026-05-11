/**
 * Hostinger Node.js Startup Server ΓÇö Production-hardened for Max Processes limit
 *
 * KEY FIXES for "Max Processes 120/120" errors:
 * 1. Global 30s request timeout  ΓåÆ frees process slots from slow/hung requests
 * 2. Universal rate limiter       ΓåÆ blocks bots flooding ANY route, not just 6
 * 3. Bot / scanner blocking       ΓåÆ kills WordPress probes & known bad UAs instantly
 * 4. Gzip compression             ΓåÆ smaller payloads = faster responses = freed slots sooner
 * 5. Inline cron (no loopback)    ΓåÆ cron jobs call DB directly, not their own HTTP endpoint
 * 6. Socket.io WebSocket-only     ΓåÆ no HTTP polling, zero recurring HTTP overhead
 */

function isPrismaEnginePanic(err) {
  const msg = (err?.message || String(err || ''));
  // ONLY true Rust panics should restart — NOT InitializationError (startup race on Hostinger)
  // InitializationError (code 101) happens when 2 instances start simultaneously — it resolves on its own
  if (err?.name === 'PrismaClientInitializationError' || msg.includes('exited with code 101')) {
    return false; // ← do NOT restart for this
  }
  return err?.name === 'PrismaClientRustPanicError' ||
    msg.includes('PANIC') ||
    msg.includes('timer has gone away') ||
    msg.includes('non-recoverable');
}
process.on('uncaughtException', (err) => {
  if (isPrismaEnginePanic(err)) {
    console.error('[server] 🔴 Prisma panic — restarting for clean recovery:', err?.message);
    process.exit(1);
  }
  console.error('[server] Uncaught exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  if (isPrismaEnginePanic(reason)) {
    console.error('[server] 🔴 Prisma panic (rejection) — restarting:', reason?.message || reason);
    process.exit(1);
  }
  console.error('[server] Unhandled rejection:', reason?.message || reason);
});

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const { Server }       = require('socket.io');
const cron             = require('node-cron');
const compression      = require('compression');

const port     = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

console.log(`[server] Starting on port ${port} | NODE_ENV: ${process.env.NODE_ENV}`);

// ΓöÇΓöÇ Start Next.js ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const app    = next({ dev: false, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

// Build compression middleware (gzip/deflate) ΓÇö call once, reuse
const compress = compression({ threshold: 1024 }); // Only compress responses > 1KB

// Rate limit map — module-scope so it persists across requests
const rateLimitMap = new Map();


app.prepare().then(async () => {
  // Prisma connects lazily on first real query — no pre-warm needed.
  // (Calling $connect() here caused PANIC: timer has gone away on Hostinger)

  const httpServer = createServer(async (req, res) => {
    // ——— Fix 4: Gzip compression for all responses ——————————————————————————
    compress(req, res, () => {});

    // ΓöÇΓöÇ Block exploit paths (bad URLs, not users) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const path  = req.url?.split('?')[0] || '/';
    const pathL = path.toLowerCase();

    const BAD_PATH = [
      '/wp-',          // /wp-admin/, /wp-login.php, /wp-content/ etc.
      '/wordpress',
      '/xmlrpc',       // WordPress XML-RPC exploit
      '/.env',         // Environment file probe
      '/.git',         // Git repo exposure
      '/phpmy',        // phpMyAdmin
      '/admin/config',
      '/actuator',     // Spring Boot actuator
      '/config.json',
      '/setup.php',
      '/install.php',
      '/shell',
      '/cgi-bin',
      '/admin.php',
      '/phpmyadmin',
      '/mysql',
      '/.well-known/security',
    ];
    if (BAD_PATH.some(b => pathL.startsWith(b))) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // ── Static asset caching — eliminates I/O spikes ─────────────────────────
    // /_next/static/* files have content hashes in their names (e.g. 1300460219810c10.js)
    // → safe to cache for 1 full year (immutable). Browser serves from local cache on
    //   all subsequent visits → ZERO disk I/O from server → fixes 19,480 KB/s I/O spike.
    if (pathL.startsWith('/_next/static/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (
      path === '/manifest.json' ||
      path === '/favicon.ico'   ||
      path === '/robots.txt'    ||
      path === '/sitemap.xml'
    ) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h for semi-static files
    }

    // ΓöÇΓöÇ Fix 2: Universal rate limiter (all routes, two tiers) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // Tier 1: Heavy API routes ΓÇö strict limit (15 req / 10s)
    // Tier 2: All other routes  ΓÇö permissive limit (60 req / 10s)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown';
    const now = Date.now();
    const HEAVY = ['/api/emi', '/api/loan/all-active', '/api/reports/', '/api/accountant/', '/api/stats', '/api/ai/'];
    const isHeavy = HEAVY.some(r => req.url?.startsWith(r));
    const WINDOW = 10_000;
    const MAX    = isHeavy ? 15 : 60;

    const mapKey = `${isHeavy ? 'H' : 'L'}:${ip}`;
    const entry  = rateLimitMap.get(mapKey) || { count: 0, windowStart: now };
    if (now - entry.windowStart > WINDOW) {
      entry.count = 1; entry.windowStart = now;
    } else {
      entry.count++;
    }
    rateLimitMap.set(mapKey, entry);
    if (entry.count > MAX) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Retry-After', '10');
      res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
      return;
    }

    // ── Global 15s request timeout ─────────────────────────────────────────
    // DB queries now fail in 8s max (dbWithTimeout). Any request still alive
    // at 15s is truly stuck — terminate it to free the process slot.
    // This is the core fix for "Max Processes 120/120" + EAGAIN exhaustion.
    const timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Request timeout. Please retry.' }));
      }
    }, 15_000); // 15s (was 30s — tightened to match 8s DB timeout)
    res.on('finish', () => clearTimeout(timeoutHandle));
    res.on('close',  () => clearTimeout(timeoutHandle));

    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      clearTimeout(timeoutHandle);
      console.error('[server] Request error:', err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('internal server error');
      }
    }
  });

  // Clean rate limit map every 2 min to avoid unbounded growth
  setInterval(() => {
    const cutoff = Date.now() - 30_000;
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.windowStart < cutoff) rateLimitMap.delete(key);
    }
  }, 120_000);

  // ΓöÇΓöÇ Fix 6: Socket.io ΓÇö WebSocket ONLY (no HTTP polling) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // HTTP polling = one HTTP request every 25s per user = process slot waste
  const io = new Server(httpServer, {
    cors:              { origin: '*', methods: ['GET', 'POST'] },
    transports:        ['websocket'],   // WebSocket ONLY ΓÇö no polling fallback
    pingInterval:      30000,
    pingTimeout:       20000,
    maxHttpBufferSize: 1e6,
    connectTimeout:    30000,
  });

  global.io = io;

  io.on('connection', (socket) => {
    socket.on('register',        ({ userId, role }) => {
      if (userId) socket.join(`user:${userId}`);
      if (role)   socket.join(`role:${role}`);
    });
    socket.on('join-company',    (id) => { if (id) socket.join(`company:${id}`); });
    socket.on('request-refresh', ()   => { socket.emit('dashboard:refresh'); });
    socket.on('disconnect',      ()   => { /* no-op */ });
  });

  // Socket.io room cleanup every 30 min
  setInterval(() => {
    try {
      const adapter = io.sockets.adapter;
      const rooms = adapter.rooms;
      let cleaned = 0;
      for (const [roomId, socketsInRoom] of rooms.entries()) {
        if (adapter.sids.has(roomId)) continue;
        if (socketsInRoom.size === 0) { rooms.delete(roomId); cleaned++; }
      }
      if (cleaned > 0) console.log(`[server] ≡ƒº╣ Cleaned ${cleaned} empty socket rooms`);
    } catch { /* non-critical */ }
  }, 30 * 60 * 1000);

  // ΓöÇΓöÇ Memory Watchdog ΓÇö restart before hitting 100% ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  setInterval(() => {
    const rss   = process.memoryUsage().rss;
    const rssMb = Math.round(rss / 1024 / 1024);
    if (rssMb > 100) console.log(`[server] ≡ƒÆ╛ Memory: ${rssMb}MB RSS`);
    if (rss > 380 * 1024 * 1024) {
      console.error(`[server] ≡ƒö┤ Memory ${rssMb}MB > 380MB ΓÇö restarting`);
      process.exit(1);
    }
  }, 5 * 60 * 1000);

  // ΓöÇΓöÇ Fix 5: Inline cron (direct DB, NO loopback HTTP) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Old pattern: cron ΓåÆ fetch(APP_URL/api/cron/...) ΓåÆ new HTTP connection ΓåÆ +1 process
  // New pattern: cron ΓåÆ import DB ΓåÆ query directly ΓåÆ 0 extra processes
  //
  // Overdue notify: 8:00 AM IST, 1:00 PM IST, 7:00 PM IST (UTC+5:30)
  // Auto penalty:   Midnight IST (18:30 UTC)
  // Cleanup:        2:30 AM IST (21:00 UTC previous day)

  // ── Cron DB helper — reuses the singleton from db.ts (with global 8s timeout extension)
  // IMPORTANT: do NOT create a raw new PrismaClient() here — it would bypass the
  // $extends global timeout wrapper and allow cron queries to hang indefinitely.
  function getCronDb() {
    if (globalThis.prisma) return globalThis.prisma;
    // Fallback (rare cold-start edge case) — import the module to get the extended client
    try {
      return require('./src/lib/db').db;
    } catch {
      // Last resort: raw client (cron jobs run rarely, risk acceptable vs hanging)
      const { PrismaClient } = require('@prisma/client');
      const client = new PrismaClient({ log: ['error'] });
      globalThis.prisma = client;
      return client;
    }
  }

  async function runOverdueNotify(label) {
    try {
      const db = getCronDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find loans with overdue EMIs
      const overdueEmis = await db.eMISchedule.findMany({
        where: { paymentStatus: 'OVERDUE', dueDate: { lt: new Date() } },
        select: { loanApplicationId: true, loanApplication: { select: { customerId: true, applicationNo: true } } },
        distinct: ['loanApplicationId'],
        take: 50,
      });

      let notified = 0;
      for (const emi of overdueEmis) {
        const cid = emi.loanApplication?.customerId;
        if (!cid) continue;
        await db.notification.create({
          data: {
            userId: cid,
            type: 'EMI_OVERDUE',
            category: 'LOAN',
            priority: 'HIGH',
            title: 'ΓÜá∩╕Å Overdue EMI Alert',
            message: `You have an overdue EMI on loan ${emi.loanApplication?.applicationNo}. Please pay immediately to avoid additional penalties.`,
            actionUrl: `/customer/loan/${emi.loanApplicationId}`,
          },
        }).catch(() => {});
        notified++;
      }
      console.log(`[cron] Γ£à ${label} ΓÇö notified ${notified} customers`);
    } catch (err) {
      console.error(`[cron] Γ¥î ${label}:`, err.message);
    }
  }

  async function runAutoPenalty() {
    try {
      const db = getCronDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Mark overdue EMIs and apply penalty
      const overdueEmis = await db.eMISchedule.findMany({
        where: {
          paymentStatus: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lt: today },
        },
        select: { id: true, totalAmount: true, paidAmount: true, penaltyAmount: true, daysOverdue: true },
        take: 200,
      });

      let updated = 0;
      for (const emi of overdueEmis) {
        const days = Math.floor((Date.now() - new Date(emi.dueDate || today).getTime()) / 86400000);
        const penaltyRate = 0.02; // 2% per month flat
        const basePenalty = Number(emi.totalAmount) * penaltyRate;
        await db.eMISchedule.update({
          where: { id: emi.id },
          data: {
            paymentStatus: 'OVERDUE',
            daysOverdue: days,
            penaltyAmount: basePenalty,
          },
        }).catch(() => {});
        updated++;
      }

      // Notify SA
      const admins = await db.user.findMany({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map(sa => ({
            userId: sa.id,
            type: 'SYSTEM',
            category: 'SYSTEM',
            priority: 'LOW',
            title: '≡ƒöä Auto-Penalty Cron Completed',
            message: `Penalty cron ran at ${new Date().toLocaleString('en-IN')}. Updated: ${updated} EMIs.`,
          })),
          skipDuplicates: true,
        });
      }
      console.log(`[cron] Γ£à Auto-penalty ΓÇö updated ${updated} EMIs`);
    } catch (err) {
      console.error('[cron] Γ¥î Auto-penalty:', err.message);
    }
  }

  async function runCleanup() {
    try {
      const db = getCronDb();
      const sixMonthsAgo  = new Date(Date.now() - 180 * 86400000);
      const thirtyDaysAgo = new Date(Date.now() -  30 * 86400000);

      const [auditDel, locationDel, notifDel] = await Promise.all([
        db.auditLog.deleteMany({ where: { createdAt: { lt: sixMonthsAgo } } }),
        db.locationLog.deleteMany({ where: { createdAt: { lt: sixMonthsAgo } } }),
        db.notification.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo }, isRead: true } }),
      ]);
      console.log(`[cron] ≡ƒº╣ Cleanup: ${auditDel.count} audit + ${locationDel.count} location + ${notifDel.count} notifications deleted`);
    } catch (err) {
      console.error('[cron] Γ¥î Cleanup:', err.message);
    }
  }

  // Schedule (all UTC ΓÇö IST = UTC+5:30)
  cron.schedule('30 2  * * *', () => runOverdueNotify('≡ƒîà Morning overdue'),  { timezone: 'UTC' }); // 8:00 AM IST
  cron.schedule('30 7  * * *', () => runOverdueNotify('ΓÿÇ∩╕Å Afternoon overdue'), { timezone: 'UTC' }); // 1:00 PM IST
  cron.schedule('30 13 * * *', () => runOverdueNotify('≡ƒîå Evening overdue'),   { timezone: 'UTC' }); // 7:00 PM IST
  cron.schedule('30 18 * * *', () => runAutoPenalty(),                          { timezone: 'UTC' }); // 12:00 AM IST
  cron.schedule('0  21 * * *', () => runCleanup(),                              { timezone: 'UTC' }); // 2:30 AM IST


  // ── Pre-listen startup jitter ──────────────────────────────────────────────
  // PROBLEM: Hostinger starts 3-4 instances simultaneously on every deploy.
  // Without this fix:
  //   T+0ms: all 4 instances become ready
  //   T+0ms: all 4 receive first HTTP request
  //   T+0ms: all 4 try to initialize Prisma's Rust library engine simultaneously
  //   T+0ms: timerfd resource contention on Hostinger's shared kernel → PANIC on ALL
  //
  // WITH this fix:
  //   Each instance binds port at a different random time (0 to 2500ms)
  //   Hostinger only routes traffic to a listening instance
  //   → Each instance gets its first request (and Prisma engine init) at a
  //     different time → zero race condition → zero startup panic
  if (process.env.NODE_ENV === 'production') {
    const jitter = Math.floor(Math.random() * 2500); // 0-2500ms per instance
    if (jitter > 0) {
      console.log(`[server] Pre-listen jitter: ${jitter}ms — staggering Prisma engine init`);
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`[server] ✓ Ready on http://${hostname}:${port}`);
    console.log(`[server] ✓ Compression | WebSocket-only | Global timeout | Universal rate limit | Inline cron`);
  });

}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
