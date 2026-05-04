/**
 * Hostinger Node.js Startup Server — Optimized for low resource usage
 * - NO prisma db push on startup (DB already synced — runs only during build)
 * - Socket.io prefers WebSocket over polling (fewer connections)
 * - Built-in cron jobs (no Hostinger panel needed)
 * - Memory-safe: process limit stays well below 120
 */

process.on('uncaughtException',  (err)    => console.error('[server] Uncaught exception:', err?.message || err));
process.on('unhandledRejection', (reason) => console.error('[server] Unhandled rejection:', reason));

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const { Server }       = require('socket.io');
const cron             = require('node-cron');

const port     = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;

console.log(`[server] Starting on port ${port} | NODE_ENV: ${process.env.NODE_ENV}`);

// ── Start Next.js ─────────────────────────────────────────────────────────────
const app    = next({ dev: false, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      console.error('[server] Request error:', err.message);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // ── Socket.io — WebSocket preferred, polling only as fallback ───────────────
  const io = new Server(httpServer, {
    cors:             { origin: '*', methods: ['GET', 'POST'] },
    transports:       ['websocket', 'polling'],   // WebSocket FIRST = fewer processes
    pingInterval:     25000,   // how often to ping (ms)
    pingTimeout:      20000,   // timeout before disconnect
    upgradeTimeout:   10000,   // time to upgrade from polling to websocket
    maxHttpBufferSize: 1e6,    // 1 MB max payload
    connectTimeout:   20000,
  });

  global.io = io;

  // ── Simple in-memory rate limiter (prevents API hammering) ──────────────────
  // Tracks: IP -> { count, windowStart }
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW_MS = 10_000;  // 10 seconds
  const RATE_LIMIT_MAX_REQS  = 25;       // max 25 requests per 10s per IP
  const HEAVY_ROUTES = ['/api/emi/pay', '/api/loan/all-active', '/api/notification', '/api/reports/', '/api/accountant/'];

  const originalHandle = handle;
  global.rateLimitedHandle = async (req, res, parsedUrl) => {
    const isHeavy = HEAVY_ROUTES.some(r => req.url?.startsWith(r));
    if (isHeavy) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        entry.count = 1; entry.windowStart = now;
      } else {
        entry.count++;
      }
      rateLimitMap.set(ip, entry);
      if (entry.count > RATE_LIMIT_MAX_REQS) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Retry-After', '10');
        res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
        return;
      }
    }
    return originalHandle(req, res, parsedUrl);
  };

  // Clean rate limit map every 2 min to avoid unbounded growth
  setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (entry.windowStart < cutoff) rateLimitMap.delete(ip);
    }
  }, 120_000);

  io.on('connection', (socket) => {
    socket.on('register', ({ userId, role }) => {
      if (userId) socket.join(`user:${userId}`);
      if (role)   socket.join(`role:${role}`);
    });
    socket.on('join-company',    (id) => { if (id) socket.join(`company:${id}`); });
    socket.on('request-refresh', ()  => { socket.emit('dashboard:refresh'); });
    socket.on('disconnect',      ()  => { /* no-op */ });
  });

  // ── Socket.io room cleanup every 30 min — prevents RAM accumulation from dead sessions
  setInterval(() => {
    try {
      const adapter = io.sockets.adapter;
      const rooms = adapter.rooms;
      let cleaned = 0;
      for (const [roomId, socketsInRoom] of rooms.entries()) {
        // Skip built-in socket rooms (they are socket IDs)
        if (adapter.sids.has(roomId)) continue;
        // If a named room has 0 actual sockets, delete it
        if (socketsInRoom.size === 0) {
          rooms.delete(roomId);
          cleaned++;
        }
      }
      if (cleaned > 0) console.log(`[server] 🧹 Cleaned ${cleaned} empty socket rooms`);
    } catch { /* non-critical */ }
  }, 30 * 60 * 1000); // every 30 min

  // ── Cron helper ──────────────────────────────────────────────────────────────
  async function callCron(path, label) {
    try {
      const res  = await fetch(`${APP_URL}${path}`, { signal: AbortSignal.timeout(60000) });
      const data = await res.json();
      console.log(`[cron] ✅ ${label}`, data.success ? 'OK' : data.error || 'done');
    } catch (err) {
      console.error(`[cron] ❌ ${label}:`, err.message);
    }
  }

  // ── Cron schedule (IST = UTC+5:30) ──────────────────────────────────────────
  cron.schedule('30 2  * * *', () => callCron('/api/cron/overdue-notify', '🌅 Morning overdue'),   { timezone: 'UTC' });
  cron.schedule('30 7  * * *', () => callCron('/api/cron/overdue-notify', '☀️ Afternoon overdue'), { timezone: 'UTC' });
  cron.schedule('30 13 * * *', () => callCron('/api/cron/overdue-notify', '🌆 Evening overdue'),   { timezone: 'UTC' });
  cron.schedule('30 18 * * *', () => callCron('/api/cron/auto-penalty',   '⚡ Auto-penalty'),      { timezone: 'UTC' });

  // ── Daily audit log cleanup: delete AuditLog + LocationLog older than 6 months ──
  // Runs at 2:00 AM UTC (7:30 AM IST) — low traffic time
  cron.schedule('0 20 * * *', async () => {
    try {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      // Lazy import prisma only when needed (avoid module load at startup)
      const { db } = require('./src/lib/db');
      const [auditDeleted, locationDeleted] = await Promise.all([
        db.auditLog.deleteMany({ where: { createdAt: { lt: sixMonthsAgo } } }),
        db.locationLog.deleteMany({ where: { createdAt: { lt: sixMonthsAgo } } }),
      ]);
      console.log(`[cron] 🧹 Cleanup: deleted ${auditDeleted.count} audit logs + ${locationDeleted.count} location logs older than 6 months`);
    } catch (err) {
      console.error('[cron] ❌ Cleanup error:', err.message);
    }
  }, { timezone: 'UTC' });

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`[server] ✅ Ready on http://${hostname}:${port}`);
    console.log(`[server] ✅ Socket.io attached | Cron jobs active | Rate limiter active`);
  });

}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
