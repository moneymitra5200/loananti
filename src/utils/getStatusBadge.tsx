/**
 * FIX-36: Shared getStatusBadge utility
 * Single source-of-truth for loan/EMI status badge rendering
 * Used across all dashboards (Super Admin, Cashier, Agent, Staff, Company, Accountant, Offline)
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';

export type LoanStatus =
  | 'PENDING' | 'ACTIVE' | 'ACTIVE_INTEREST_ONLY' | 'DISBURSED'
  | 'CLOSED' | 'DEFAULTED' | 'INTEREST_ONLY' | 'REJECTED'
  | 'REJECTED_FINAL' | 'SA_APPROVED' | 'COMPANY_APPROVED'
  | 'AGENT_APPROVED' | 'STAFF_APPROVED' | string;

export type EMIStatus =
  | 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIALLY_PAID'
  | 'INTEREST_ONLY_PAID' | 'WAIVED' | string;

const LOAN_STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  PENDING:              { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  ACTIVE:               { className: 'bg-emerald-100 text-emerald-800', label: 'Active' },
  ACTIVE_INTEREST_ONLY: { className: 'bg-amber-100 text-amber-800', label: 'Interest Only' },
  DISBURSED:            { className: 'bg-blue-100 text-blue-800', label: 'Disbursed' },
  CLOSED:               { className: 'bg-gray-200 text-gray-700 font-semibold', label: 'Closed ✓' },
  DEFAULTED:            { className: 'bg-red-100 text-red-800', label: 'Defaulted' },
  INTEREST_ONLY:        { className: 'bg-purple-100 text-purple-800', label: 'Interest Only' },
  REJECTED:             { className: 'bg-red-100 text-red-700', label: 'Rejected' },
  REJECTED_FINAL:       { className: 'bg-red-200 text-red-800 font-semibold', label: 'Rejected' },
  SA_APPROVED:          { className: 'bg-teal-100 text-teal-800', label: 'SA Approved' },
  COMPANY_APPROVED:     { className: 'bg-teal-100 text-teal-700', label: 'Company Approved' },
  AGENT_APPROVED:       { className: 'bg-sky-100 text-sky-700', label: 'Agent Approved' },
  STAFF_APPROVED:       { className: 'bg-indigo-100 text-indigo-700', label: 'Staff Approved' },
};

const EMI_STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  PAID:               { className: 'bg-green-100 text-green-800', label: 'Paid' },
  PENDING:            { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  OVERDUE:            { className: 'bg-red-100 text-red-800', label: 'Overdue' },
  PARTIALLY_PAID:     { className: 'bg-orange-100 text-orange-800', label: 'Partial' },
  INTEREST_ONLY_PAID: { className: 'bg-purple-100 text-purple-800', label: 'Int. Paid' },
  WAIVED:             { className: 'bg-gray-100 text-gray-700', label: 'Waived' },
};

/** Shared loan status badge — use this across all dashboards (FIX-36) */
export function getLoanStatusBadge(status: string): React.ReactElement {
  const c = LOAN_STATUS_CONFIG[status] ?? { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
}

/** Shared EMI status badge — use this across all EMI tables (FIX-36) */
export function getEMIStatusBadge(status: string): React.ReactElement {
  const c = EMI_STATUS_CONFIG[status] ?? { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
}

/** Legacy default export for backward compatibility */
export default getLoanStatusBadge;
