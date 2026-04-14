/**
 * Cashier LoanDetailPanel — re-exports the shared, canonical LoanDetailPanel.
 *
 * The old cashier-specific panel was missing all EMI payment capability,
 * "Select All" multi-EMI logic, auto-closure triggers, mirror sync, and
 * processing fee recording. By delegating to the shared component we get
 * all of those features for free and avoid dual-maintenance.
 *
 * The shared LoanDetailPanel now uses POST /api/emi/pay exclusively, which
 * handles: auto-closure, mirror sync, push notifications, paidPrincipal tracking
 * and processing fee journaling on EMI #1.
 */
export { default } from '@/components/loan/LoanDetailPanel';
