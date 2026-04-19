'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface EMISummary {
  today: { count: number; amount: number };
  tomorrow: { count: number; amount: number };
  overdue: { count: number; amount: number };
}

interface EMIDueAlertBannerProps {
  userId: string;
  userRole: string;
  onOpenLoanDetail?: (loanId: string, loanType: 'online' | 'offline') => void;
}

export default function EMIDueAlertBanner({ userId, userRole, onOpenLoanDetail }: EMIDueAlertBannerProps) {
  const [summary, setSummary] = useState<EMISummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [emis, setEmis] = useState<{
    today: { online: any[]; offline: any[] };
    tomorrow: { online: any[]; offline: any[] };
    overdue: { online: any[]; offline: any[] };
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSummary(data.summary);
          setEmis({
            today: data.todayEmis || { online: [], offline: [] },
            tomorrow: data.tomorrowEmis || { online: [], offline: [] },
            overdue: data.overdueEmis || { online: [], offline: [] }
          });
        }
      })
      .catch(() => {});
  }, [userId, userRole]);

  if (!summary || dismissed) return null;
  const { today, tomorrow, overdue } = summary;
  const hasAlert = today.count > 0 || tomorrow.count > 0 || overdue.count > 0;
  if (!hasAlert) return null;

  // Get the first loan to open when clicking the alert
  const getFirstLoan = (type: 'overdue' | 'today' | 'tomorrow') => {
    if (!emis) return null;
    const typeEmis = emis[type];
    // Prefer offline loans first, then online
    if (typeEmis.offline.length > 0) {
      return { loanId: typeEmis.offline[0].offlineLoanId, loanType: 'offline' as const };
    }
    if (typeEmis.online.length > 0) {
      return { loanId: typeEmis.online[0].loanApplicationId, loanType: 'online' as const };
    }
    return null;
  };

  const handleClick = (type: 'overdue' | 'today' | 'tomorrow') => {
    if (!onOpenLoanDetail) return;
    const firstLoan = getFirstLoan(type);
    if (firstLoan) {
      onOpenLoanDetail(firstLoan.loanId, firstLoan.loanType);
    }
  };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl overflow-hidden shadow-md border border-amber-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Bell className="h-4 w-4 animate-pulse" />
          EMI Due Alert — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded bg-white/20 hover:bg-white/30"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="bg-white px-4 py-3 grid grid-cols-3 gap-3 text-center text-sm">
        {overdue.count > 0 && (
          <button
            onClick={() => handleClick('overdue')}
            className="p-2 bg-red-50 rounded-lg border border-red-300 animate-pulse hover:bg-red-100 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-red-700 font-semibold text-xs">OVERDUE</span>
            </div>
            <p className="text-red-800 font-bold text-base">{overdue.count}</p>
            <p className="text-red-600 text-xs">{formatCurrency(overdue.amount)}</p>
          </button>
        )}
        {today.count > 0 && (
          <button
            onClick={() => handleClick('today')}
            className="p-2 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-orange-700 font-semibold text-xs">TODAY</span>
            </div>
            <p className="text-orange-800 font-bold text-base">{today.count}</p>
            <p className="text-orange-600 text-xs">{formatCurrency(today.amount)}</p>
          </button>
        )}
        {tomorrow.count > 0 && (
          <button
            onClick={() => handleClick('tomorrow')}
            className="p-2 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-yellow-700 font-semibold text-xs">TOMORROW</span>
            </div>
            <p className="text-yellow-800 font-bold text-base">{tomorrow.count}</p>
            <p className="text-yellow-600 text-xs">{formatCurrency(tomorrow.amount)}</p>
          </button>
        )}
      </div>
    </div>
  );
}
