/**
 * /api/system/reset  →  proxy to /api/reset-system
 *
 * The frontend calls /api/system/reset but the actual implementation
 * lives at /api/reset-system. This file re-exports that handler so
 * both URLs work without duplicating logic.
 */
export { POST } from '@/app/api/reset-system/route';
