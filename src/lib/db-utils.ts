/**
 * db-utils.ts — ACID Compliance Utilities
 * =========================================
 * Provides:
 *  - withRetry:              Retry on Prisma deadlock (P2034)
 *  - guardOfflineEMIPayment: Prevents duplicate offline EMI payments inside a transaction
 *  - guardOnlineEMIPayment:  Prevents duplicate online EMI payments inside a transaction
 *  - withAccountingSaga:     Runs payment tx, then accounting; compensates if accounting fails
 *  - logActionTx:            Transaction-bound ActionLog create (ACID-safe)
 *
 * Usage pattern:
 *   const result = await withRetry(() => db.$transaction(async (tx) => {
 *     await guardOfflineEMIPayment(tx, emiId);
 *     // ... your payment logic ...
 *   }));
 *
 *   await withAccountingSaga(
 *     paymentId,
 *     () => recordAccounting(...),
 *     () => compensatePayment(...) // rollback if accounting fails
 *   );
 */

import { db } from '@/lib/db';
// Prisma.TransactionClient is incompatible with client extensions — use any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

// ─────────────────────────────────────────────────────────────
// SECTION 1: Deadlock Retry
// ─────────────────────────────────────────────────────────────

/**
 * Retries a function up to `maxRetries` times on Prisma deadlock (P2034).
 * Adds exponential backoff: 100ms, 200ms, 300ms, ...
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isDeadlock =
        err?.code === 'P2034' ||
        err?.message?.includes('deadlock') ||
        err?.message?.includes('Deadlock');

      if (isDeadlock && attempt < maxRetries) {
        const delay = baseDelayMs * attempt;
        console.warn(`[withRetry] Deadlock detected (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
  // TypeScript: unreachable, but required
  throw new Error('[withRetry] Exhausted all retries');
}

// ─────────────────────────────────────────────────────────────
// SECTION 2: EMI Duplicate Payment Guards (inside transaction)
// ─────────────────────────────────────────────────────────────

/**
 * Offline EMI payment guard.
 * Re-reads the EMI status INSIDE the transaction to prevent race conditions.
 * Must be called at the top of the db.$transaction callback before any writes.
 *
 * Throws 'DUPLICATE_PAYMENT' if the EMI is already PAID.
 */
export async function guardOfflineEMIPayment(
  tx: TxClient,
  emiId: string
): Promise<void> {
  const freshEmi = await tx.offlineLoanEMI.findUnique({
    where: { id: emiId },
    select: { paymentStatus: true },
  });

  if (!freshEmi) {
    throw Object.assign(new Error('EMI not found'), { code: 'EMI_NOT_FOUND' });
  }

  if (freshEmi.paymentStatus === 'PAID') {
    throw Object.assign(
      new Error('This EMI has already been paid. Duplicate payment prevented.'),
      { code: 'DUPLICATE_PAYMENT' }
    );
  }
}

/**
 * Online EMI (EMISchedule) payment guard.
 * Re-reads the EMI status INSIDE the transaction.
 * Throws 'DUPLICATE_PAYMENT' if the EMI is already PAID.
 */
export async function guardOnlineEMIPayment(
  tx: TxClient,
  emiId: string
): Promise<void> {
  const freshEmi = await tx.eMISchedule.findUnique({
    where: { id: emiId },
    select: { paymentStatus: true },
  });

  if (!freshEmi) {
    throw Object.assign(new Error('EMI not found'), { code: 'EMI_NOT_FOUND' });
  }

  if (freshEmi.paymentStatus === 'PAID') {
    throw Object.assign(
      new Error('This EMI has already been paid. Duplicate payment prevented.'),
      { code: 'DUPLICATE_PAYMENT' }
    );
  }
}

/**
 * Credit balance guard — re-reads user balance inside the transaction.
 * Prevents overdraft from race conditions (two concurrent withdrawals).
 */
export async function guardCreditBalance(
  tx: TxClient,
  userId: string,
  amount: number,
  creditType: 'COMPANY' | 'PERSONAL' | 'TOTAL' = 'TOTAL'
): Promise<void> {
  const freshUser = await tx.user.findUnique({
    where: { id: userId },
    select: { credit: true, companyCredit: true, personalCredit: true },
  });

  if (!freshUser) {
    throw Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND' });
  }

  const available =
    creditType === 'COMPANY'
      ? (freshUser.companyCredit ?? 0)
      : creditType === 'PERSONAL'
      ? (freshUser.personalCredit ?? 0)
      : (freshUser.credit ?? 0);

  if (available < amount) {
    throw Object.assign(
      new Error(`Insufficient ${creditType} credit. Available: ₹${available.toFixed(2)}, Required: ₹${amount.toFixed(2)}`),
      { code: 'INSUFFICIENT_CREDIT', available, required: amount }
    );
  }
}

/**
 * Settlement duplicate guard — prevents completing an already-completed settlement.
 */
export async function guardSettlementStatus(
  tx: TxClient,
  settlementId: string,
  expectedStatus: string
): Promise<void> {
  const fresh = await tx.cashierSettlement.findUnique({
    where: { id: settlementId },
    select: { status: true },
  });

  if (!fresh) {
    throw Object.assign(new Error('Settlement not found'), { code: 'SETTLEMENT_NOT_FOUND' });
  }

  if (fresh.status !== expectedStatus) {
    throw Object.assign(
      new Error(`Settlement is already in status '${fresh.status}'. Expected '${expectedStatus}'.`),
      { code: 'SETTLEMENT_ALREADY_PROCESSED' }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 3: Accounting Saga (A+B→C pattern)
// ─────────────────────────────────────────────────────────────

interface SagaOptions {
  /** Identifier for logging (e.g. emiId, loanId) */
  contextId: string;
  /** The main payment transaction — already committed before this is called */
  accountingFn: () => Promise<void>;
  /**
   * Called if accountingFn throws. Should reverse the main transaction.
   * If compensationFn also throws, a CRITICAL alert is logged.
   */
  compensationFn: () => Promise<void>;
  /** Module name for logging */
  module?: string;
}

/**
 * withAccountingSaga — implements the "Action A + Action B → Action C" pattern.
 *
 * Flow:
 *  1. Payment transaction (A) — assumed already committed
 *  2. Accounting (B) — runs after A
 *  3. If B fails → compensation (reverse A)
 *  4. C (auto-close / notification) only fires if B succeeds
 *
 * Returns true if accounting succeeded, false if it failed and was compensated.
 */
export async function withAccountingSaga(opts: SagaOptions): Promise<boolean> {
  const { contextId, accountingFn, compensationFn, module = 'UNKNOWN' } = opts;

  try {
    await accountingFn();
    return true; // B succeeded — safe to trigger C
  } catch (accountingErr: any) {
    const errMsg = accountingErr?.message ?? 'Unknown accounting error';
    console.error(`[SAGA][${module}] Accounting failed for ${contextId}: ${errMsg}`);

    // Attempt compensation (reverse the payment)
    try {
      await compensationFn();
      console.warn(`[SAGA][${module}] Compensation successful for ${contextId}. Payment reversed.`);
    } catch (compensationErr: any) {
      // CRITICAL: payment committed but accounting failed AND rollback failed
      // This is a data inconsistency — must be flagged for manual intervention
      console.error(
        `[SAGA][${module}] CRITICAL — Compensation FAILED for ${contextId}. ` +
        `Payment is committed but accounting is missing. Manual fix required. ` +
        `Compensation error: ${compensationErr?.message}`
      );

      // Log a CRITICAL alert to the action log (non-blocking)
      db.actionLog.create({
        data: {
          userId: 'SYSTEM',
          userRole: 'SYSTEM',
          actionType: 'ACCOUNTING_SAGA_FAILED',
          module,
          recordId: contextId,
          recordType: 'SAGA_ERROR',
          description:
            `CRITICAL: Payment ${contextId} is committed but accounting entry is MISSING and rollback FAILED. ` +
            `Accounting error: ${errMsg}. Compensation error: ${compensationErr?.message}. ` +
            `Manual intervention required to restore accounting integrity.`,
          canUndo: false,
        },
      }).catch(() => {/* non-critical — best effort */});
    }

    return false; // B failed — do NOT trigger C
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 4: Idempotency Check (referenceId dedup)
// ─────────────────────────────────────────────────────────────

/**
 * Check if a CashBookEntry with the given referenceId already exists.
 * Use this before inserting to prevent double-accounting.
 */
export async function isCashBookEntryDuplicate(referenceId: string): Promise<boolean> {
  if (!referenceId) return false;
  const existing = await db.cashBookEntry.findFirst({
    where: { referenceId },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Check if a BankTransaction with the given referenceId already exists.
 */
export async function isBankTransactionDuplicate(referenceId: string): Promise<boolean> {
  if (!referenceId) return false;
  const existing = await db.bankTransaction.findFirst({
    where: { referenceId },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Check if a JournalEntry with the given referenceId already exists for a company.
 */
export async function isJournalEntryDuplicate(companyId: string, referenceId: string): Promise<boolean> {
  if (!referenceId) return false;
  const existing = await db.journalEntry.findFirst({
    where: { companyId, referenceId },
    select: { id: true },
  });
  return !!existing;
}

// ─────────────────────────────────────────────────────────────
// SECTION 5: Transaction-bound ActionLog
// ─────────────────────────────────────────────────────────────

/**
 * Creates an ActionLog entry INSIDE a transaction (tx).
 * This ensures the log is committed atomically with the change.
 * If the transaction rolls back, the log also disappears — maintaining consistency.
 */
export async function logActionTx(
  tx: TxClient,
  data: {
    userId: string;
    userRole: string;
    actionType: string;
    module: string;
    recordId: string;
    recordType: string;
    description: string;
    previousData?: object | null;
    newData?: object | null;
    canUndo?: boolean;
    ipAddress?: string;
  }
): Promise<void> {
  await tx.actionLog.create({
    data: {
      userId: data.userId,
      userRole: data.userRole,
      actionType: data.actionType,
      module: data.module,
      recordId: data.recordId,
      recordType: data.recordType,
      description: data.description,
      previousData: data.previousData ? JSON.stringify(data.previousData) : undefined,
      newData: data.newData ? JSON.stringify(data.newData) : undefined,
      canUndo: data.canUndo ?? true,
      ipAddress: data.ipAddress,
    },
  });
}
