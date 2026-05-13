// @ts-check
const withPWAInit = require("next-pwa");

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Include our Firebase push event handler in the generated sw.js
  importScripts: ['/firebase-push-handler.js'],
  runtimeCaching: [
    // ── CRITICAL: Never let the SW intercept Next.js chunk requests ──────────
    // Next.js chunks have content hashes in their filenames — browser HTTP
    // cache + immutable headers handle them. SW interference causes 404s after
    // new deployments when old chunk hashes are cached but the files are gone.
    {
      urlPattern: /\/_next\//i,
      handler: 'NetworkOnly',
    },
    // Images – Cache First, 30 days
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // Settings + CMS APIs – long-lived StaleWhileRevalidate
    {
      urlPattern: /\/api\/(settings|cms|company)/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-static-cache",
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 5 },
      },
    },
    // All other API calls – NetworkFirst, 8-second timeout, 2-min cache
    {
      urlPattern: /\/api\//i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 2 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: false,     // disable source maps to save RAM
  turbopack: {},                          // silences Next.js 16 warning for next-pwa
  images: {
    unoptimized: true,
  },
  // HTTP response headers
  async headers() {
    return [
      // ── CRITICAL: HTML pages must NEVER be cached ──────────────────────────
      // If the browser/SW caches HTML, it serves old chunk references after a
      // new deployment → ChunkLoadError 404 → "Something went wrong" screen.
      {
        source: '/((?!_next/static|_next/image|favicon|logo|manifest|icon|apple|mm-logo|sw.js|workbox|firebase-push-handler).)*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // ── Next.js static chunks: browser caches by hash (safe, immutable) ───
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // ── API: settings/CMS cacheable ────────────────────────────────────────
      {
        source: "/api/settings",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
      },
      {
        source: "/api/company",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
      },
      {
        source: "/api/cms/:path*",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }],
      },
      {
        source: "/api/loan/all-active",
        headers: [{ key: "Cache-Control", value: "private, s-maxage=30, stale-while-revalidate=60" }],
      },
      {
        source: "/api/stats",
        headers: [{ key: "Cache-Control", value: "private, s-maxage=30, stale-while-revalidate=60" }],
      },
      {
        source: "/api/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  // Reduce JS bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-dropdown-menu",
      "framer-motion",
    ],
  },
  // Exclude heavy packages from server bundle to save RAM on Hostinger
  serverExternalPackages: ['socket.io', 'socket.io-client'],
};

module.exports = withPWA(nextConfig);
