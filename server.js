/**
 * Hostinger Node.js Startup Server — Production-hardened for Max Processes limit
 *
 * KEY FIXES for "Max Processes 120/120" errors:
 * 1. Global 30s request timeout  → frees process slots from slow/hung requests
 * 2. Universal rate limiter       → blocks bots flooding ANY route, not just 6
 * 3. Bot / scanner blocking       → kills WordPress probes & known bad UAs instantly
 * 4. Gzip compression             → smaller payloads = faster responses = freed slots sooner
 * 5. Inline cron (no loopback)    → cron jobs call DB directly, not their own HTTP endpoint
 * 6. Socket.io WebSocket-only     → no HTTP polling, zero recurring HTTP overhead
 */

process.on('uncaughtException', (err) => {
  const msg = err?.message || '';
  const isPanic = err?.name === 'PrismaClientRustPanicError' ||
    msg.includes('PANIC') || msg.includes('timer has gone away');
  if (isPanic) {
    console.error('[server] 🔴 Prisma panic — restarting for clean recovery:', msg);
    process.exit(1);
  }
  console.error('[server] Uncaught exception:', msg || err);
});
process.on('unhandledRejection', (reason) => {
  const msg = (reason && reason.message) ? reason.message : String(reason);
  const isPanic = (reason && reason.name === 'PrismaClientRustPanicError') ||
    msg.includes('PANIC') || msg.includes('timer has gone away');
  if (isPanic) {
    console.error('[server] 🔴 Prisma panic (rejection) — restarting:', msg);
    process.exit(1);
  }
  console.error('[server] Unhandled rejection:', msg);
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

// ── Start Next.js ─────────────────────────────────────────────────────────────
const app    = next({ dev: false, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

// Build compression middleware (gzip/deflate) — call once, reuse
const compress = compression({ threshold: 1024 }); // Only compress responses > 1KB

// Rate limit map — module-scope so it persists across requests
const rateLimitMap = new Map();


app.prepare().then(async () => {
  // ── CRITICAL: Pre-warm Prisma using @prisma/client (NOT ./src/lib/db which is TS-only) ──
  // './src/lib/db' is a TypeScript source file — it does NOT exist compiled on Hostinger.
  // @prisma/client is always available in node_modules after 'prisma generate'.

  // FIX: Random jitter 0–2000ms — when Hostinger starts multiple instances simultaneously,
  // they all try to connect to MySQL at the exact same millisecond → race condition → PANIC.
  // Staggering startup prevents this collision.
  const startupJitter = Math.floor(Math.random() * 2000);
  console.log(`[DB] Startup jitter: ${startupJitter}ms (prevents multi-instance MySQL race)`);
  await new Promise(r => setTimeout(r, startupJitter));

  let dbClient = null;
  try {
    const { PrismaClient } = require('@prisma/client');
    dbClient = new PrismaClient({ log: [] });
    await dbClient.$connect();
    console.log('[DB] ✅ Prisma engine pre-warmed');
  } catch (dbErr) {
    const msg = dbErr?.message || '';
    const isPanic =
      dbErr?.name === 'PrismaClientRustPanicError' ||
      msg.includes('PANIC') ||
      msg.includes('timer has gone away') ||
      msg.includes('non-recoverable');

    if (isPanic) {
      // FIX: PANIC = Rust engine is permanently broken. MUST exit so Hostinger
      // restarts with a clean engine. Continuing with a panicked engine causes
      // EVERY subsequent API call to also panic → cascading failure.
      console.error('[DB] 🔴 Prisma PANIC during pre-warm — exiting for clean restart:', msg);
      process.exit(1);
    }

    console.warn('[DB] ⚠️ Pre-warm failed (will retry on first query):', msg);
    await new Promise(r => setTimeout(r, 1500));
  } finally {
    // Release the pre-warm connection — each API route manages its own pool
    if (dbClient) { dbClient.$disconnect().catch(() => {}); dbClient = null; }
  }

  const httpServer = createServer(async (req, res) => {
    // ── Fix 4: Gzip compression for all responses ──────────────────────────
    compress(req, res, () => {});

    // ── Block exploit paths (bad URLs, not users) ──────────────────────────
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

    // ── Fix 2: Universal rate limiter (all routes, two tiers) ──────────────
    // Tier 1: Heavy API routes — strict limit (15 req / 10s)
    // Tier 2: All other routes  — permissive limit (60 req / 10s)
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

    // ── Fix 1: Global 30-second request timeout ───────────────────────────
    // If ANY request takes >30s it likely has a stuck DB query.
    // Aborting it frees the process slot so the next request can proceed.
    const timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Request timeout. Please retry.' }));
      }
    }, 30_000);
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

  // ── Fix 6: Socket.io — WebSocket ONLY (no HTTP polling) ──────────────────
  // HTTP polling = one HTTP request every 25s per user = process slot waste
  const io = new Server(httpServer, {
    cors:              { origin: '*', methods: ['GET', 'POST'] },
    transports:        ['websocket'],   // WebSocket ONLY — no polling fallback
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
      if (cleaned > 0) console.log(`[server] 🧹 Cleaned ${cleaned} empty socket rooms`);
    } catch { /* non-critical */ }
  }, 30 * 60 * 1000);

  // ── Memory Watchdog — restart before hitting 100% ─────────────────────────
  setInterval(() => {
    const rss   = process.memoryUsage().rss;
    const rssMb = Math.round(rss / 1024 / 1024);
    if (rssMb > 100) console.log(`[server] 💾 Memory: ${rssMb}MB RSS`);
    if (rss > 380 * 1024 * 1024) {
      console.error(`[server] 🔴 Memory ${rssMb}MB > 380MB — restarting`);
      process.exit(1);
    }
  }, 5 * 60 * 1000);

  // ── Fix 5: Inline cron (direct DB, NO loopback HTTP) ─────────────────────
  // Old pattern: cron → fetch(APP_URL/api/cron/...) → new HTTP connection → +1 process
  // New pattern: cron → import DB → query directly → 0 extra processes
  //
  // Overdue notify: 8:00 AM IST, 1:00 PM IST, 7:00 PM IST (UTC+5:30)
  // Auto penalty:   Midnight IST (18:30 UTC)
  // Cleanup:        2:30 AM IST (21:00 UTC previous day)

  async function runOverdueNotify(label) {
    try {
      const { db } = require('./src/lib/db');
      const { sendPushNotificationToRoles } = require('./src/lib/push-notification-service');
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
            title: '⚠️ Overdue EMI Alert',
            message: `You have an overdue EMI on loan ${emi.loanApplication?.applicationNo}. Please pay immediately to avoid additional penalties.`,
            actionUrl: `/customer/loan/${emi.loanApplicationId}`,
          },
        }).catch(() => {});
        notified++;
      }
      console.log(`[cron] ✅ ${label} — notified ${notified} customers`);
    } catch (err) {
      console.error(`[cron] ❌ ${label}:`, err.message);
    }
  }

  async function runAutoPenalty() {
    try {
      const { db } = require('./src/lib/db');
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
            title: '🔄 Auto-Penalty Cron Completed',
            message: `Penalty cron ran at ${new Date().toLocaleString('en-IN')}. Updated: ${updated} EMIs.`,
          })),
          skipDuplicates: true,
        });
      }
      console.log(`[cron] ✅ Auto-penalty — updated ${updated} EMIs`);
    } catch (err) {
      console.error('[cron] ❌ Auto-penalty:', err.message);
    }
  }

  async function runCleanup() {
    try {
      const { db } = require('./src/lib/db');
      const sixMonthsAgo  = new Date(Date.now() - 180 * 86400000);
      const thirtyDaysAgo = new Date(Date.now() -  30 * 86400000);

      const [auditDel, locationDel, notifDel] = await Promise.all([
        db.auditLog.deleteMany({ where: { createdAt: { lt: sixMonthsAgo } } }),
        db.locationLog.deleteMany({ where: { createdAt: { lt: sixMonthsAgo } } }),
        db.notification.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo }, isRead: true } }),
      ]);
      console.log(`[cron] 🧹 Cleanup: ${auditDel.count} audit + ${locationDel.count} location + ${notifDel.count} notifications deleted`);
    } catch (err) {
      console.error('[cron] ❌ Cleanup:', err.message);
    }
  }

  // Schedule (all UTC — IST = UTC+5:30)
  cron.schedule('30 2  * * *', () => runOverdueNotify('🌅 Morning overdue'),  { timezone: 'UTC' }); // 8:00 AM IST
  cron.schedule('30 7  * * *', () => runOverdueNotify('☀️ Afternoon overdue'), { timezone: 'UTC' }); // 1:00 PM IST
  cron.schedule('30 13 * * *', () => runOverdueNotify('🌆 Evening overdue'),   { timezone: 'UTC' }); // 7:00 PM IST
  cron.schedule('30 18 * * *', () => runAutoPenalty(),                          { timezone: 'UTC' }); // 12:00 AM IST
  cron.schedule('0  21 * * *', () => runCleanup(),                              { timezone: 'UTC' }); // 2:30 AM IST

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`[server] ✅ Ready on http://${hostname}:${port}`);
    console.log(`[server] ✅ Compression | WebSocket-only | Global timeout | Universal rate limit | Inline cron`);
  });

}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
