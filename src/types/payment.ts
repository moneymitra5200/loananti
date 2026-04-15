/**
 * ============================================================
 *  CANONICAL PAYMENT TYPE DEFINITIONS — Money Mitra
 * ============================================================
 *
 * Single source of truth for all payment type strings used
 * across the application (API routes, dialogs, UI components).
 *
 * ONLINE loans (EMISchedule / LoanApplication):
 *   API /api/emi/pay  →  uses OnlineLoanPaymentType
 *
 * OFFLINE loans (OfflineLoanEMI / OfflineLoan):
 *   API /api/offline-loan (PUT)  →  uses OfflineLoanPaymentType
 *
 * UI dialog internal state:
 *   EMIPaymentDialog / OfflineEMIPaymentDialog  →  uses UIPaymentType
 *   LoanDetailPanel maps UIPaymentType → OnlineLoanPaymentType via ONLINE_PAY_TYPE_MAP
 */

// ─── ONLINE LOAN (eMISchedule) ────────────────────────────────────────────────
/** Payment types accepted by POST /api/emi/pay */
export type OnlineLoanPaymentType =
  | 'FULL_EMI'        // Full principal + interest
  | 'PARTIAL_PAYMENT' // Partial amount; interest-first allocation
  | 'INTEREST_ONLY'   // Interest collected; principal deferred (new EMI created)
  | 'PRINCIPAL_ONLY'  // Principal collected; interest written off as Irrecoverable Debt
  | 'ADVANCE';        // Advance payment before due month (principal only, no interest)

// ─── OFFLINE LOAN (OfflineLoanEMI) ───────────────────────────────────────────
/** Payment types accepted by PUT /api/offline-loan with action: 'pay-emi' */
export type OfflineLoanPaymentType =
  | 'FULL'           // Full principal + interest
  | 'PARTIAL'        // Partial amount; interest-first allocation
  | 'INTEREST_ONLY'  // Interest collected; principal deferred (next EMI created)
  | 'PRINCIPAL_ONLY'; // Principal collected; interest written off as Irrecoverable Debt

// ─── UI INTERNAL STATE ────────────────────────────────────────────────────────
/** Types used INTERNALLY inside payment dialog components */
export type UIPaymentType =
  | 'FULL'
  | 'FULL_EMI'
  | 'PARTIAL'
  | 'PARTIAL_PAYMENT'
  | 'INTEREST_ONLY'
  | 'INTEREST'
  | 'PRINCIPAL_ONLY';

// ─── MAPPING HELPERS ──────────────────────────────────────────────────────────

/**
 * Maps UI dialog internal payment type → OnlineLoanPaymentType (for /api/emi/pay)
 * Used in LoanDetailPanel and EMIPaymentDialog when submitting online loan payments.
 */
export const ONLINE_PAY_TYPE_MAP: Record<string, OnlineLoanPaymentType> = {
  FULL:           'FULL_EMI',
  FULL_EMI:       'FULL_EMI',
  PARTIAL:        'PARTIAL_PAYMENT',
  PARTIAL_PAYMENT: 'PARTIAL_PAYMENT',
  INTEREST:       'INTEREST_ONLY',
  INTEREST_ONLY:  'INTEREST_ONLY',
  PRINCIPAL_ONLY: 'PRINCIPAL_ONLY',
  ADVANCE:        'ADVANCE',
};

/**
 * Maps UI dialog internal payment type → OfflineLoanPaymentType (for /api/offline-loan PUT)
 * Used in OfflineEMIPaymentDialog when submitting offline loan payments.
 */
export const OFFLINE_PAY_TYPE_MAP: Record<string, OfflineLoanPaymentType> = {
  FULL:           'FULL',
  FULL_EMI:       'FULL',
  PARTIAL:        'PARTIAL',
  PARTIAL_PAYMENT: 'PARTIAL',
  INTEREST:       'INTEREST_ONLY',
  INTEREST_ONLY:  'INTEREST_ONLY',
  PRINCIPAL_ONLY: 'PRINCIPAL_ONLY',
};

// ─── DISPLAY HELPERS ──────────────────────────────────────────────────────────

/** Human-readable label for any payment type string */
export function getPaymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FULL_EMI:        'Full EMI',
    FULL:            'Full EMI',
    PARTIAL_PAYMENT: 'Partial Payment',
    PARTIAL:         'Partial Payment',
    INTEREST_ONLY:   'Interest Only',
    INTEREST:        'Interest Only',
    PRINCIPAL_ONLY:  'Principal Only',
    ADVANCE:         'Advance Payment',
  };
  return labels[type] ?? type;
}

/** 
 * Success message after payment, analogous to the inline function
 * in /api/emi/pay/route.ts — now shared.
 */
export function getPaymentSuccessMessage(
  paymentType: string,
  paidAmount: number,
  remainingPrincipal: number
): string {
  switch (paymentType) {
    case 'PARTIAL_PAYMENT':
    case 'PARTIAL':
      return `Partial payment of ₹${paidAmount.toFixed(2)} received. Remaining balance rescheduled.`;
    case 'INTEREST_ONLY':
    case 'INTEREST':
      return `Interest payment of ₹${paidAmount.toFixed(2)} received. Principal ₹${remainingPrincipal.toFixed(2)} deferred to next EMI.`;
    case 'PRINCIPAL_ONLY':
      return `Principal ₹${paidAmount.toFixed(2)} collected. Unpaid interest written off as Irrecoverable Debt.`;
    case 'ADVANCE':
      return `Advance principal payment ₹${paidAmount.toFixed(2)} received. Interest will be collected next month.`;
    default:
      return 'EMI paid successfully.';
  }
}
