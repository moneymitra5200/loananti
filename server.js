/**
 * Hostinger Node.js Startup Server
 * This file is executed directly by Hostinger as the startup file.
 * Set "Startup file" / "Output directory" to: server.js
 */

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

console.log(`[server] Starting Next.js on port ${port}...`);
console.log(`[server] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[server] __dirname: ${__dirname}`);

const app = next({
  dev: false,
  hostname,
  port,
  dir: __dirname,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[server] Error handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`[server] ✅ Ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
