import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
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
    // Static JS/CSS – Stale While Revalidate, 7 days
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-resources",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    // Settings + CMS APIs – long-lived StaleWhileRevalidate (they change rarely)
    {
      urlPattern: /\/api\/(settings|cms|company)/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-static-cache",
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 5 },
      },
    },
    // All other API calls – NetworkFirst, 10-second timeout, 2-min cache
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

const nextConfig: NextConfig = {
  reactStrictMode: false, // disable for prod – avoids double-fetch in dev-mode
  output: 'standalone', // Hostinger / Node.js self-contained deployment
  turbopack: {},
  images: {
    unoptimized: true,
  },
  // HTTP response headers for API caching
  async headers() {
    return [
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
      // Never cache mutation endpoints
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
};

export default withPWA(nextConfig);





