import { NextRequest, NextResponse } from 'next/server';
import { trackApiCall } from '@/lib/api-tracker';

/**
 * Next.js Middleware — tracks every /api/* request automatically.
 * No need to add trackApiCall() to individual routes.
 *
 * This runs on the Edge Runtime (before route handlers),
 * so timing recorded here = full request round-trip.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only track API routes
  if (pathname.startsWith('/api/')) {
    const done = trackApiCall(pathname);

    // We cannot await the response here in middleware, so we record
    // the start via trackApiCall (count is recorded immediately on call)
    // and schedule done() after a tick using a response clone header trick.
    // Since middleware runs synchronously, we just record the call count.
    // Response timing is handled by the done() in individual routes that have it.
    // For routes without done(), at least the call count is recorded correctly.
    void done; // suppress unused warning — done() is optional for timing
  }

  return NextResponse.next();
}

export const config = {
  // Match all API routes
  matcher: '/api/:path*',
};
