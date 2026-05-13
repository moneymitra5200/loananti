import { db } from '@/lib/db';

/**
 * Central audit logger — call this from any API route to record an action.
 * It is fire-and-forget (non-blocking) so it never breaks the main flow.
 *
 * @param userId    - The user performing the action (can be 'system')
 * @param action    - Short verb: APPROVE, REJECT, DISBURSE, PAY, CREATE, UPDATE, DELETE, LOGIN, etc.
 * @param module    - Domain: LOAN, EMI_PAYMENT, COMPANY, EXPENSE, USER, SYSTEM, etc.
 * @param description - Human-readable sentence describing exactly what happened
 * @param opts      - Optional extra context
 */
export async function logAudit(
  userId: string,
  action: string,
  module: string,
  description: string,
  opts?: {
    loanApplicationId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  }
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: action.toUpperCase(),
        module: module.toUpperCase(),
        description,
        loanApplicationId: opts?.loanApplicationId ?? null,
        oldValue: opts?.oldValue !== undefined ? JSON.stringify(opts.oldValue) : null,
        newValue: opts?.newValue !== undefined ? JSON.stringify(opts.newValue) : null,
        ipAddress: opts?.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never throw — audit must never break the main operation
    console.error('[logAudit] Failed to write audit log:', err);
  }
}

/**
 * Convenience wrapper — call without await so it's truly non-blocking.
 * Use this in hot paths where latency matters.
 */
export function fireAudit(
  userId: string,
  action: string,
  module: string,
  description: string,
  opts?: {
    loanApplicationId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  }
): void {
  logAudit(userId, action, module, description, opts).catch(() => {});
}
