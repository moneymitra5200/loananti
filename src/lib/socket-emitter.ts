/**
 * Utility to broadcast real-time updates to all connected clients.
 * This MUST be called from backend API routes after any data mutation.
 */
export function broadcastRefresh() {
  try {
    // Attempt to use the global io instance exposed by server.js
    if ((global as any).io) {
      (global as any).io.emit('dashboard:refresh');
      console.log('[Socket] Broadcasted dashboard:refresh to all clients');
    }
  } catch (error) {
    console.error('[Socket] Failed to broadcast refresh:', error);
  }
}
