'use client';
/**
 * DashboardAlertPopup
 * ─────────────────────────────────────────────────────────────────────────
 * Shows once per session when any role opens the dashboard.
 * Displays role-specific important alerts:
 *   SUPER_ADMIN / STAFF / AGENT / CASHIER / COMPANY:
 *     - Today's EMI collections due
 *     - Overdue EMIs count
 *     - New loan applications
 *     - Pending disbursements
 *   CUSTOMER:
 *     - Their upcoming / overdue EMIs
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, TrendingUp, Calendar, CheckCircle, Clock, CreditCard, FileText, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AlertItem {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  value: string | number;
  urgent?: boolean;
}

interface DashboardAlerts {
  todayDueEMIs: number;
  todayDueAmount: number;
  overdueEMIs: number;
  overdueAmount: number;
  newApplications: number;
  pendingDisbursements: number;
  // Customer specific
  myUpcomingEMIs: number;
  myOverdueEMIs: number;
  myOverdueAmount: number;
}

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const SESSION_KEY = 'dashboard_alert_shown';

export default function DashboardAlertPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (user.role === 'CUSTOMER') {
        // Customer: fetch their EMI schedule
        const res = await fetch(`/api/emi/customer-upcoming?userId=${user.id}`);
        const data = res.ok ? await res.json() : {};
        setAlerts({
          todayDueEMIs: 0, todayDueAmount: 0,
          overdueEMIs: 0, overdueAmount: 0,
          newApplications: 0, pendingDisbursements: 0,
          myUpcomingEMIs: data.upcomingCount || 0,
          myOverdueEMIs: data.overdueCount || 0,
          myOverdueAmount: data.overdueAmount || 0,
        });
      } else {
        // Staff roles: fetch global dashboard stats
        const params = new URLSearchParams({ date: todayStr });
        if (user.role === 'AGENT') params.set('agentId', user.id);
        if (user.role === 'CASHIER') params.set('cashierId', user.id);

        const res = await fetch(`/api/dashboard-alerts?${params}`);
        const data = res.ok ? await res.json() : {};
        setAlerts({
          todayDueEMIs:        data.todayDueEMIs        || 0,
          todayDueAmount:      data.todayDueAmount       || 0,
          overdueEMIs:         data.overdueEMIs          || 0,
          overdueAmount:       data.overdueAmount        || 0,
          newApplications:     data.newApplications      || 0,
          pendingDisbursements: data.pendingDisbursements || 0,
          myUpcomingEMIs: 0, myOverdueEMIs: 0, myOverdueAmount: 0,
        });
      }
    } catch (e) {
      console.error('[DashboardAlert] Failed to fetch alerts', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id) return;

    // Show once per browser session
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (alreadyShown === user.id) return;

    fetchAlerts();
    // Open after a short delay so the dashboard renders first
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [user?.id, fetchAlerts]);

  const handleClose = () => {
    setOpen(false);
    if (user?.id) sessionStorage.setItem(SESSION_KEY, user.id);
  };

  // Build alert items based on role
  const buildItems = (): AlertItem[] => {
    if (!alerts) return [];

    if (user?.role === 'CUSTOMER') {
      return [
        alerts.myOverdueEMIs > 0 && {
          icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100',
          label: 'Overdue EMIs', value: `${alerts.myOverdueEMIs} EMI${alerts.myOverdueEMIs > 1 ? 's' : ''} — ${INR(alerts.myOverdueAmount)}`, urgent: true,
        },
        alerts.myUpcomingEMIs > 0 && {
          icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100',
          label: 'Upcoming EMIs', value: `${alerts.myUpcomingEMIs} due this month`,
        },
      ].filter(Boolean) as AlertItem[];
    }

    return [
      alerts.overdueEMIs > 0 && {
        icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100',
        label: 'Overdue EMIs', value: `${alerts.overdueEMIs} customers — ${INR(alerts.overdueAmount)}`, urgent: true,
      },
      alerts.todayDueEMIs > 0 && {
        icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100',
        label: "Today's EMIs Due", value: `${alerts.todayDueEMIs} EMI${alerts.todayDueEMIs > 1 ? 's' : ''} — ${INR(alerts.todayDueAmount)}`,
      },
      alerts.newApplications > 0 && {
        icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100',
        label: 'New Applications', value: `${alerts.newApplications} pending review`,
      },
      alerts.pendingDisbursements > 0 && {
        icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100',
        label: 'Pending Disbursements', value: `${alerts.pendingDisbursements} ready to disburse`,
      },
    ].filter(Boolean) as AlertItem[];
  };

  const items = buildItems();
  const hasUrgent = items.some(i => i.urgent);
  const hasAlerts = items.length > 0;

  // Don't show if nothing to report
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className={`px-5 py-4 flex items-center justify-between ${
                hasUrgent
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    {hasUrgent
                      ? <AlertTriangle className="h-5 w-5 text-white" />
                      : <Bell className="h-5 w-5 text-white" />
                    }
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">
                      {hasAlerts ? (hasUrgent ? '⚠️ Action Required' : '📋 Daily Briefing') : '✅ All Clear!'}
                    </h3>
                    <p className="text-white/80 text-xs">
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading your briefing...</span>
                  </div>
                ) : !hasAlerts ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-2" />
                    <p className="text-gray-700 font-medium">Everything looks great!</p>
                    <p className="text-gray-400 text-sm mt-1">No pending items for today.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-4">
                      {items.length} item{items.length > 1 ? 's' : ''} need your attention
                    </p>
                    {items.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className={`flex items-center gap-4 p-3.5 rounded-xl border ${
                            item.urgent
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-5 w-5 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                            <p className={`text-sm font-bold truncate ${item.urgent ? 'text-red-700' : 'text-gray-800'}`}>
                              {item.value}
                            </p>
                          </div>
                          {item.urgent && (
                            <Badge className="bg-red-500 text-white text-xs flex-shrink-0">Urgent</Badge>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-4">
                <Button
                  onClick={handleClose}
                  className={`w-full h-10 font-semibold rounded-xl text-sm ${
                    hasUrgent
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  Got it — Let&apos;s Go!
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
