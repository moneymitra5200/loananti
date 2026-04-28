/**
 * Hostinger Node.js Startup Server
 * 
 * Hostinger Business Plan Node.js hosting:
 * - Sets PORT from Hostinger's environment (or defaults to 3000)
 * - Sets HOSTNAME to 0.0.0.0 so it's reachable externally
 * - Loads the standalone Next.js build
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('./.next/standalone/node_modules/next/dist/server/next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

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
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`> DB: ${(process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0] || 'not set'}`);
  });
});
