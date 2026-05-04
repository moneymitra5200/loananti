/**
 * Hostinger Node.js Startup Server
 * - Auto-runs prisma db push before starting (from localhost, works on Hostinger)
 * - Starts Next.js on the PORT provided by Hostinger
 * - Attaches Socket.io to the same HTTP server (no extra port needed)
 */

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

const { createServer } = require('http');
const { parse } = require('url');
const { execSync } = require('child_process');
const next = require('next');
const { Server } = require('socket.io');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

console.log(`[server] Starting Next.js + Socket.io on port ${port}...`);
console.log(`[server] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[server] DATABASE_URL host: ${(process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0] || 'unknown'}`);

// ── Auto-migrate: push schema to DB before starting ─────────────────────────
function runDbPush() {
  try {
    console.log('[server] Running prisma db push...');
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'pipe',
      cwd: __dirname,
      env: process.env,
      timeout: 120_000, // 2 min max
    });
    console.log('[server] ✅ prisma db push completed');
  } catch (err) {
    const out = err.stdout?.toString() || '';
    const errOut = err.stderr?.toString() || '';
    // If tables already exist / no changes needed, it's fine
    if (out.includes('Your database is now in sync') || out.includes('already in sync') || out.includes('No changes')) {
      console.log('[server] ✅ Database already in sync');
    } else {
      console.warn('[server] ⚠️ prisma db push warning (app will still start):', errOut || out);
    }
  }
}

runDbPush();

// ── Start Next.js ─────────────────────────────────────────────────────────────
const app = next({
  dev: false,
  hostname,
  port,
  dir: __dirname,
});

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
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['polling', 'websocket'],
  });

  // Store io globally so API routes can emit events
  global.io = io;

  io.on('connection', (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`);

    socket.on('register', ({ userId, role }) => {
      if (userId) socket.join(`user:${userId}`);
      if (role)   socket.join(`role:${role}`);
      console.log(`[socket.io] Registered user ${userId} as ${role}`);
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
  });
}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
