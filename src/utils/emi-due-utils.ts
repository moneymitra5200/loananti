/**
 * EMI Due Date Utilities
 * Returns blink classes and status for any loan's upcoming EMI
 */

export type EMIDueStatus = 'overdue' | 'due_today' | 'due_tomorrow' | 'due_in_2_days' | 'normal';

/**
 * Given a dueDate string (ISO), compute the EMI urgency status
 */
export function getEMIDueStatus(dueDateStr: string | null | undefined): EMIDueStatus {
  if (!dueDateStr) return 'normal';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDateStr);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays === 1) return 'due_tomorrow';
  if (diffDays === 2) return 'due_in_2_days';
  return 'normal';
}

/**
 * Get Tailwind classes for the loan row based on EMI status
 */
export function getEMIRowClass(status: EMIDueStatus): string {
  switch (status) {
    case 'overdue':
      return 'animate-pulse-red bg-red-50 border-l-4 border-l-red-500';
    case 'due_today':
      return 'animate-pulse-red bg-red-50 border-l-4 border-l-red-400';
    case 'due_tomorrow':
      return 'animate-pulse-yellow bg-yellow-50 border-l-4 border-l-yellow-500';
    case 'due_in_2_days':
      return 'animate-pulse-green bg-green-50 border-l-4 border-l-green-400';
    default:
      return '';
  }
}

/**
 * Get badge color/label for EMI status indicator
 */
export function getEMIBadgeConfig(status: EMIDueStatus): { label: string; className: string } | null {
  switch (status) {
    case 'overdue':
      return { label: '🔴 EMI OVERDUE', className: 'bg-red-100 text-red-700 animate-pulse border border-red-300' };
    case 'due_today':
      return { label: '🔴 EMI DUE TODAY', className: 'bg-red-100 text-red-700 animate-pulse border border-red-300' };
    case 'due_tomorrow':
      return { label: '🟡 EMI DUE TOMORROW', className: 'bg-yellow-100 text-yellow-700 animate-pulse border border-yellow-300' };
    case 'due_in_2_days':
      return { label: '🟢 EMI in 2 Days', className: 'bg-green-100 text-green-700 animate-pulse border border-green-300' };
    default:
      return null;
  }
}
