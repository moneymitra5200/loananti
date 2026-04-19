'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/utils/helpers';
import EMIDueList from '@/components/emi/EMIDueList';

interface EMISummary {
  today: { count: number; amount: number };
  tomorrow: { count: number; amount: number };
  overdue: { count: number; amount: number };
}

interface EMIDueAlertBannerProps {
  userId: string;
  userRole: string;
}

export default function EMIDueAlertBanner({ userId, userRole }: EMIDueAlertBannerProps) {
  const [summary, setSummary] = useState<EMISummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'overdue' | 'today' | 'tomorrow' | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setSummary(data.summary);
      })
      .catch(() => {});
  }, [userId, userRole]);

  if (!summary || dismissed) return null;
  const { today, tomorrow, overdue } = summary;
  const hasAlert = today.count > 0 || tomorrow.count > 0 || overdue.count > 0;
  if (!hasAlert) return null;

  const handleClick = (type: 'overdue' | 'today' | 'tomorrow') => {
    setSelectedType(type);
    setSheetOpen(true);
  };

  return (
    <>
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
              className="p-2 bg-red-50 rounded-lg border border-red-200 animate-pulse hover:bg-red-100 transition-colors cursor-pointer group relative"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-red-700 font-semibold text-xs">OVERDUE</span>
                <ChevronRight className="h-3 w-3 text-red-400 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-red-800 font-bold text-base">{overdue.count}</p>
              <p className="text-red-600 text-xs">{formatCurrency(overdue.amount)}</p>
            </button>
          )}
          {today.count > 0 && (
            <button
              onClick={() => handleClick('today')}
              className="p-2 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer group relative"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-orange-700 font-semibold text-xs">TODAY</span>
                <ChevronRight className="h-3 w-3 text-orange-400 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-orange-800 font-bold text-base">{today.count}</p>
              <p className="text-orange-600 text-xs">{formatCurrency(today.amount)}</p>
            </button>
          )}
          {tomorrow.count > 0 && (
            <button
              onClick={() => handleClick('tomorrow')}
              className="p-2 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer group relative"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-3.5 w-3.5 text-yellow-600" />
                <span className="text-yellow-700 font-semibold text-xs">TOMORROW</span>
                <ChevronRight className="h-3 w-3 text-yellow-400 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-yellow-800 font-bold text-base">{tomorrow.count}</p>
              <p className="text-yellow-600 text-xs">{formatCurrency(tomorrow.amount)}</p>
            </button>
          )}
        </div>
      </div>

      {/* EMI Due List Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <div className="p-4">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                EMI Due List
              </SheetTitle>
              <SheetDescription>
                Click on any EMI to collect payment
              </SheetDescription>
            </SheetHeader>
            <EMIDueList 
              userId={userId} 
              userRole={userRole} 
              onPaymentComplete={() => {
                // Refresh the summary after payment
                fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`)
                  .then(r => r.json())
                  .then(data => {
                    if (data.success) setSummary(data.summary);
                  })
                  .catch(() => {});
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
