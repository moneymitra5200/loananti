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

  io.on('connection', (socket) => {
    socket.on('register', ({ userId, role }) => {
      if (userId) socket.join(`user:${userId}`);
      if (role)   socket.join(`role:${role}`);
    });
    socket.on('join-company',    (id) => { if (id) socket.join(`company:${id}`); });
    socket.on('request-refresh', ()  => { socket.emit('dashboard:refresh'); });
    socket.on('disconnect',      ()  => { /* no-op */ });
  });

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

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`[server] ✅ Ready on http://${hostname}:${port}`);
    console.log(`[server] ✅ Socket.io attached | Cron jobs active`);
  });

}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
