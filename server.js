/**
 * Hostinger Node.js Startup Server
 * - Auto-runs prisma db push before starting (localhost works on Hostinger)
 * - Starts Next.js on PORT provided by Hostinger
 * - Attaches Socket.io on the same port
 * - Runs built-in cron jobs (no Hostinger cron panel needed!)
 */

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

const { createServer } = require('http');
const { parse }        = require('url');
const { execSync }     = require('child_process');
const next             = require('next');
const { Server }       = require('socket.io');
const cron             = require('node-cron');

const port     = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;

console.log(`[server] Starting Next.js + Socket.io on port ${port}...`);
console.log(`[server] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[server] APP_URL: ${APP_URL}`);

// ── Auto-migrate: push schema to DB before starting ─────────────────────────
function runDbPush() {
  try {
    console.log('[server] Running prisma db push...');
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'pipe',
      cwd: __dirname,
      env: process.env,
      timeout: 120_000,
    });
    console.log('[server] ✅ prisma db push completed');
  } catch (err) {
    const out    = err.stdout?.toString() || '';
    const errOut = err.stderr?.toString() || '';
    if (out.includes('in sync') || out.includes('No changes')) {
      console.log('[server] ✅ Database already in sync');
    } else {
      console.warn('[server] ⚠️ prisma db push warning:', errOut || out);
    }
  }
}

runDbPush();

// ── Cron helper: call an API endpoint internally ─────────────────────────────
async function callCron(path, label) {
  try {
    const url = `${APP_URL}${path}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      console.log(`[cron] ✅ ${label} — online:${data.stats?.onlineOverdue ?? data.summary?.total ?? '?'} offline:${data.stats?.offlineOverdue ?? '?'}`);
    } else {
      console.warn(`[cron] ⚠️ ${label} responded:`, JSON.stringify(data).substring(0, 200));
    }
  } catch (err) {
    console.error(`[cron] ❌ ${label} failed:`, err.message);
  }
}

// ── Register cron jobs (IST = UTC + 5:30) ───────────────────────────────────
function startCronJobs() {
  // 🌅 Morning overdue alert — 8:00 AM IST = 2:30 AM UTC
  cron.schedule('30 2 * * *', () => {
    console.log('[cron] 🌅 Morning overdue notify triggered');
    callCron('/api/cron/overdue-notify', 'Morning Overdue Alert');
  }, { timezone: 'UTC' });

  // ☀️ Afternoon overdue alert — 1:00 PM IST = 7:30 AM UTC
  cron.schedule('30 7 * * *', () => {
    console.log('[cron] ☀️ Afternoon overdue notify triggered');
    callCron('/api/cron/overdue-notify', 'Afternoon Overdue Alert');
  }, { timezone: 'UTC' });

  // 🌆 Evening overdue alert — 7:00 PM IST = 1:30 PM UTC
  cron.schedule('30 13 * * *', () => {
    console.log('[cron] 🌆 Evening overdue notify triggered');
    callCron('/api/cron/overdue-notify', 'Evening Overdue Alert');
  }, { timezone: 'UTC' });

  // ⚡ Auto-penalty — Midnight IST = 6:30 PM UTC
  cron.schedule('30 18 * * *', () => {
    console.log('[cron] ⚡ Auto-penalty triggered');
    callCron('/api/cron/auto-penalty', 'Auto Penalty');
  }, { timezone: 'UTC' });

  console.log('[server] ✅ Cron jobs scheduled:');
  console.log('[server]   🌅 Overdue notify  → 08:00 AM IST');
  console.log('[server]   ☀️  Overdue notify  → 01:00 PM IST');
  console.log('[server]   🌆 Overdue notify  → 07:00 PM IST');
  console.log('[server]   ⚡ Auto-penalty    → 12:00 AM IST');
}

// ── Start Next.js ─────────────────────────────────────────────────────────────
const app    = next({ dev: false, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[server] Error handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Socket.io to the same HTTP server
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['polling', 'websocket'],
  });

  global.io = io;

  io.on('connection', (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`);

    socket.on('register', ({ userId, role }) => {
      if (userId) socket.join(`user:${userId}`);
      if (role)   socket.join(`role:${role}`);
    });

    socket.on('join-company', (companyId) => {
      if (companyId) socket.join(`company:${companyId}`);
    });

    socket.on('request-refresh', () => {
      socket.emit('dashboard:refresh');
    });

    socket.on('disconnect', () => {
      console.log(`[socket.io] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`[server] ✅ Ready on http://${hostname}:${port}`);
    console.log(`[server] ✅ Socket.io attached on same port`);

    // Start crons AFTER server is ready (so fetch() to own endpoints works)
    startCronJobs();
  });
}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
