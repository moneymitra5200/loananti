/**
 * Live API call tracker — records every API hit with timing in server memory.
 * Zero dependencies. Persists across requests on the singleton Node.js process.
 *
 * Usage in any route:
 *   import { trackApiCall } from '@/lib/api-tracker';
 *
 *   export async function GET(request) {
 *     const done = trackApiCall('/api/your-route');
 *     try {
 *       // ... handler logic ...
 *       const res = NextResponse.json(data);
 *       done(200);
 *       return res;
 *     } catch (e) {
 *       done(500);
 *       throw e;
 *     }
 *   }
 */

interface ApiCallStat {
  count: number;
  totalMs: number;
  errors: number;
  lastCalledAt: number;
  minMs: number;
  maxMs: number;
  recentMs: number[]; // last 10 response times for spark-line
}

interface ApiTracker {
  calls: Map<string, ApiCallStat>;
  totalRequests: number;
  startedAt: number;
  totalErrors: number;
}

// Singleton on globalThis so it persists across Next.js route modules
const g = globalThis as any;
if (!g.__apiTracker) {
  g.__apiTracker = {
    calls: new Map<string, ApiCallStat>(),
    totalRequests: 0,
    totalErrors: 0,
    startedAt: Date.now(),
  } as ApiTracker;
}
const tracker: ApiTracker = g.__apiTracker;

/**
 * Call at the start of a route handler.
 * Returns done(statusCode) — call it before returning the response.
 * If you never call done(), the request is still counted (without timing).
 */
export function trackApiCall(path: string): (statusCode?: number) => void {
  const start = Date.now();
  tracker.totalRequests++;

  // Record the call immediately (so even if done() is never called, count is right)
  if (!tracker.calls.has(path)) {
    tracker.calls.set(path, {
      count: 1, totalMs: 0, errors: 0,
      lastCalledAt: Date.now(), minMs: 0, maxMs: 0, recentMs: [],
    });
  } else {
    const s = tracker.calls.get(path)!;
    s.count++;
    s.lastCalledAt = Date.now();
  }

  return (statusCode = 200) => {
    const ms = Date.now() - start;
    const isError = statusCode >= 400;
    const stat = tracker.calls.get(path)!;

    stat.totalMs += ms;
    if (isError) { stat.errors++; tracker.totalErrors++; }
    stat.minMs = stat.minMs === 0 ? ms : Math.min(stat.minMs, ms);
    stat.maxMs = Math.max(stat.maxMs, ms);
    // Keep last 10 response times
    stat.recentMs.push(ms);
    if (stat.recentMs.length > 10) stat.recentMs.shift();
  };
}

/** Get all tracked API stats sorted by call count desc */
export function getApiStats() {
  const uptimeMs = Date.now() - tracker.startedAt;
  const uptimeMin = Math.max(1, uptimeMs / 60_000);

  const entries = Array.from(tracker.calls.entries()).map(([path, stat]) => {
    const avg = stat.totalMs > 0 && stat.count > 0 ? Math.round(stat.totalMs / stat.count) : 0;
    const errRate = stat.count > 0 ? ((stat.errors / stat.count) * 100).toFixed(1) : '0.0';
    const callsPerMin = Math.round((stat.count / uptimeMin) * 10) / 10;

    // Resource score: higher = more resource intensive
    // Formula: calls/min × avg_response_time × (1 + error_rate)
    const resourceScore = Math.round(callsPerMin * (avg || 1) * (1 + parseFloat(errRate) / 100));

    return {
      path,
      count: stat.count,
      avgMs: avg,
      minMs: stat.minMs,
      maxMs: stat.maxMs,
      errors: stat.errors,
      errorRate: errRate + '%',
      callsPerMin,
      resourceScore,
      recentMs: stat.recentMs,
      lastCalledAt: new Date(stat.lastCalledAt).toISOString(),
      warning: resourceScore > 500 ? '🔴 HIGH LOAD'
        : resourceScore > 100 ? '🟡 MODERATE'
        : '🟢 OK',
    };
  });

  // Sort by resource score (most expensive first)
  entries.sort((a, b) => b.resourceScore - a.resourceScore);

  return {
    totalRequests: tracker.totalRequests,
    totalErrors: tracker.totalErrors,
    uptimeMinutes: Math.round(uptimeMin),
    trackedSince: new Date(tracker.startedAt).toISOString(),
    topEndpoints: entries,
  };
}

/** Reset all stats (useful to get a clean reading) */
export function resetApiStats() {
  tracker.calls.clear();
  tracker.totalRequests = 0;
  tracker.totalErrors = 0;
  tracker.startedAt = Date.now();
}
