'use client';

/**
 * ZERO-QUERY prefetch — all data is now loaded ON DEMAND only.
 *
 * Previous pattern (resource killer):
 *   Login → 2-3 prefetch queries fired immediately (settings, companies, loans)
 *   Plus each dashboard component fires its own queries on mount
 *   = 10-15 simultaneous DB queries on every login
 *
 * New pattern (resource safe):
 *   Login → 0 queries fired
 *   User opens a section → only THAT section's data loads
 *   = DB used only when user is actually looking at something
 *
 * SettingsContext fetches /api/settings on first render (1 query, cached 5 min).
 * Every other API call happens lazily inside the component that needs it.
 */
export default function PrefetchDataProvider() {
  return null;
}
