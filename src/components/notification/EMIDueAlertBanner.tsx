'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EMIDueList from '@/components/emi/EMIDueList';

interface EMISummary {
  today: { count: number; amount: number };
  tomorrow: { count: number; amount: number };
  overdue: { count: number; amount: number };
}

interface EMIDueAlertBannerProps {
  userId: string;
  userRole: string;
  onOpenLoanDetail?: (loanId: string, loanType: 'online' | 'offline') => void;
  onOpenEmiList?: (type?: 'overdue' | 'today' | 'tomorrow') => void;
}

export default function EMIDueAlertBanner({ userId, userRole, onOpenLoanDetail, onOpenEmiList }: EMIDueAlertBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');
  const [summary, setSummary] = useState<EMISummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'overdue' | 'today' | 'tomorrow' | 'all'>('all');
  const [emis, setEmis] = useState<{
    today: { online: any[]; offline: any[] };
    tomorrow: { online: any[]; offline: any[] };
    overdue: { online: any[]; offline: any[] };
  } | null>(null);

  const fetchBannerSummary = () => {
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
  };

  useEffect(() => {
    setMounted(true);
    setFormattedDate(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }));
    fetchBannerSummary();
  }, [userId, userRole]);

  if (!mounted || !summary || dismissed) return null;
  const { today, tomorrow, overdue } = summary;
  const hasAlert = today.count > 0 || tomorrow.count > 0 || overdue.count > 0;
  if (!hasAlert) return null;

  const handleClick = (type: 'overdue' | 'today' | 'tomorrow' | 'all') => {
    setSelectedFilter(type);
    setListDialogOpen(true);
  };

  return (
    <>
      <div className="mx-4 mt-3 mb-1 rounded-xl overflow-hidden shadow-md border border-amber-200">
        {/* Header */}
        <div 
          onClick={() => handleClick('all')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center justify-between text-white cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Bell className="h-4 w-4 animate-pulse" />
            EMI Due Alert — {formattedDate}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">Click to view list</span>
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded bg-white/20 hover:bg-white/30"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
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

      {/* EMI Due List Modal Dialog */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Bell className="h-6 w-6 text-amber-600 animate-pulse" />
              EMI Due List
            </DialogTitle>
            <DialogDescription>
              View and collect payments for overdue, today, and tomorrow EMIs
            </DialogDescription>
          </DialogHeader>

          <EMIDueList
            userId={userId}
            userRole={userRole}
            initialFilter={selectedFilter}
            onPaymentComplete={() => {
              fetchBannerSummary();
            }}
            onSelectLoan={(loanId, loanType) => {
              if (onOpenLoanDetail) {
                onOpenLoanDetail(loanId, loanType);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
