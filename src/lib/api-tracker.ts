/**
 * Live API call tracker — collects real runtime stats on every API request.
 * Used by /api/system/diagnostics to show which endpoints are being hit most.
 *
 * Zero dependencies. Runs as a server-side module singleton.
 */

interface ApiCallStat {
  count: number;
  totalMs: number;
  errors: number;
  lastCalledAt: number;
  minMs: number;
  maxMs: number;
}

interface ApiTracker {
  calls: Map<string, ApiCallStat>;
  totalRequests: number;
  startedAt: number;
}

// Singleton on globalThis so it persists across Next.js hot-reloads and API routes
const g = globalThis as any;
if (!g.__apiTracker) {
  g.__apiTracker = {
    calls: new Map<string, ApiCallStat>(),
    totalRequests: 0,
    startedAt: Date.now(),
  } as ApiTracker;
}

const tracker: ApiTracker = g.__apiTracker;

/**
 * Record an API call. Call this at the start of each route handler.
 * Returns a `done(statusCode)` function to call when the request completes.
 */
export function trackApiCall(path: string): (statusCode?: number) => void {
  const start = Date.now();
  tracker.totalRequests++;

  return (statusCode = 200) => {
    const ms = Date.now() - start;
    const isError = statusCode >= 400;
    const existing = tracker.calls.get(path);

    if (existing) {
      existing.count++;
      existing.totalMs += ms;
      existing.errors += isError ? 1 : 0;
      existing.lastCalledAt = Date.now();
      existing.minMs = Math.min(existing.minMs, ms);
      existing.maxMs = Math.max(existing.maxMs, ms);
    } else {
      tracker.calls.set(path, {
        count: 1,
        totalMs: ms,
        errors: isError ? 1 : 0,
        lastCalledAt: Date.now(),
        minMs: ms,
        maxMs: ms,
      });
    }
  };
}

/** Get snapshot of all tracked API calls sorted by call count desc */
export function getApiStats() {
  const entries: Array<{
    path: string;
    count: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    errors: number;
    errorRate: string;
    lastCalledAt: string;
    callsPerMin: number;
  }> = [];

  const uptimeMs = Date.now() - tracker.startedAt;
  const uptimeMin = uptimeMs / 60_000;

  for (const [path, stat] of tracker.calls.entries()) {
    entries.push({
      path,
      count: stat.count,
      avgMs: Math.round(stat.totalMs / stat.count),
      minMs: stat.minMs,
      maxMs: stat.maxMs,
      errors: stat.errors,
      errorRate: stat.count > 0 ? ((stat.errors / stat.count) * 100).toFixed(1) + '%' : '0%',
      lastCalledAt: new Date(stat.lastCalledAt).toISOString(),
      callsPerMin: Math.round((stat.count / uptimeMin) * 100) / 100,
    });
  }

  entries.sort((a, b) => b.count - a.count);

  return {
    totalRequests: tracker.totalRequests,
    uptimeMinutes: Math.round(uptimeMin),
    trackedSince: new Date(tracker.startedAt).toISOString(),
    topEndpoints: entries.slice(0, 30),
    allEndpoints: entries,
  };
}

/** Reset the tracker stats */
export function resetApiStats() {
  tracker.calls.clear();
  tracker.totalRequests = 0;
  tracker.startedAt = Date.now();
}
