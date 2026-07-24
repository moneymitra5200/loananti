'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar, IndianRupee, User, Phone, AlertTriangle,
  Clock, CheckCircle, RefreshCw, Loader2, Building2,
  ArrowRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UpcomingEMI {
  id: string;
  installmentNumber: number;
  dueDate: string;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  paidAmount: number;
  paymentStatus: 'PENDING' | 'OVERDUE' | 'PARTIALLY_PAID';
  offlineLoan: {
    id: string;
    loanNumber: string;
    customerName: string;
    customerPhone: string;
    loanAmount: number;
    emiAmount: number;
    status: string;
    company: { id: string; name: string; code: string } | null;
  };
}

interface UpcomingEMISummary {
  count: number;
  totalAmount: number;
  overdueCount: number;
  pendingCount: number;
}

interface UpcomingEMIPanelProps {
  userId?: string;
  userRole: string;
  companyId?: string;
  onSelectLoan?: (loanId: string, type: 'online' | 'offline') => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function UpcomingEMIPanel({ userId, userRole, companyId, onSelectLoan }: UpcomingEMIPanelProps) {
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [emis, setEmis] = useState<UpcomingEMI[]>([]);
  const [summary, setSummary] = useState<UpcomingEMISummary | null>(null);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const fetchUpcomingEMIs = useCallback(async (from: string, to: string) => {
    try {
      setLoading(true);
      let url = `/api/offline-loan?action=upcoming-emis&from=${from}&to=${to}`;
      if (userId) url += `&userId=${userId}`;
      if (userRole) url += `&userRole=${userRole}`;
      if (companyId) url += `&companyId=${companyId}`;

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setEmis(data.emis || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming EMIs:', err);
      toast({ title: 'Error', description: 'Could not load upcoming EMIs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, companyId]);

  // Load today's EMIs immediately on mount
  useEffect(() => {
    fetchUpcomingEMIs(today(), today());
  }, [fetchUpcomingEMIs]);

  // When dates change, re-fetch
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    const newFrom = field === 'from' ? value : fromDate;
    const newTo   = field === 'to'   ? value : toDate;
    if (field === 'from') setFromDate(value);
    else setToDate(value);
    // Auto-apply if both dates are set
    if (newFrom && newTo && newFrom <= newTo) {
      fetchUpcomingEMIs(newFrom, newTo);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'OVERDUE') return 'bg-red-100 text-red-700 border-red-200';
    if (s === 'PARTIALLY_PAID') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const statusIcon = (s: string) => {
    if (s === 'OVERDUE') return <AlertTriangle className="h-3 w-3" />;
    if (s === 'PARTIALLY_PAID') return <Clock className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const isToday = fromDate === toDate && fromDate === today();

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming EMIs
            {isToday && (
              <Badge className="bg-white/20 text-white border-0 text-xs">Today</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {summary && (
              <Badge className="bg-white/20 text-white border-0">
                {summary.count} EMIs · {formatCurrency(summary.totalAmount)}
              </Badge>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => fetchUpcomingEMIs(fromDate, toDate)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Date Range Picker */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Label className="text-xs text-violet-700 whitespace-nowrap font-medium">From</Label>
            <Input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="h-8 text-sm border-violet-300 focus-visible:ring-violet-400"
            />
          </div>
          <div className="flex items-center gap-1 self-center">
            <ArrowRight className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Label className="text-xs text-violet-700 whitespace-nowrap font-medium">To</Label>
            <Input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="h-8 text-sm border-violet-300 focus-visible:ring-violet-400"
            />
          </div>
          <Button
            size="sm"
            onClick={() => fetchUpcomingEMIs(fromDate, toDate)}
            disabled={loading || !fromDate || !toDate}
            className="bg-violet-600 hover:bg-violet-700 text-white self-center"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calendar className="h-3 w-3 mr-1" />}
            Show
          </Button>
          {/* Quick: today */}
          <Button
            size="sm"
            variant="outline"
            className={`border-violet-300 self-center ${fromDate === today() && toDate === today() ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-violet-700'}`}
            onClick={() => {
              const t = today();
              setFromDate(t);
              setToDate(t);
              fetchUpcomingEMIs(t, t);
            }}
          >
            Today
          </Button>
          {/* Quick: tomorrow */}
          <Button
            size="sm"
            variant="outline"
            className={`border-violet-300 self-center ${fromDate === tomorrow() && toDate === tomorrow() ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-violet-700'}`}
            onClick={() => {
              const tom = tomorrow();
              setFromDate(tom);
              setToDate(tom);
              fetchUpcomingEMIs(tom, tom);
            }}
          >
            Tomorrow
          </Button>
        </div>

        {/* Summary Chips */}
        {summary && summary.count > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <Clock className="h-3 w-3" />
              {summary.pendingCount} Pending
            </div>
            {summary.overdueCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <AlertTriangle className="h-3 w-3" />
                {summary.overdueCount} Overdue
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <IndianRupee className="h-3 w-3" />
              {formatCurrency(summary.totalAmount)} Total Due
            </div>
          </div>
        )}

        {/* EMI List */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-violet-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm">Loading EMIs…</span>
          </div>
        ) : emis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <CheckCircle className="h-10 w-10 mb-3 text-emerald-300" />
            <p className="text-sm font-medium">No EMIs due in this period</p>
            <p className="text-xs mt-1">
              {fromDate === toDate
                ? `No EMIs due on ${formatDate(fromDate)}`
                : `No EMIs due from ${formatDate(fromDate)} to ${formatDate(toDate)}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            <AnimatePresence>
              {emis.map((emi, idx) => {
                const remaining = emi.totalAmount - (emi.paidAmount || 0);
                return (
                  <motion.div
                    key={emi.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: Loan + Customer info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`flex items-center gap-2 flex-wrap ${onSelectLoan ? 'cursor-pointer hover:text-purple-700 transition-colors' : ''}`}
                          onClick={() => onSelectLoan?.(emi.offlineLoan.id, 'offline')}
                        >
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {emi.offlineLoan.loanNumber}
                          </span>
                          <Badge
                            className={`text-xs border ${statusColor(emi.paymentStatus)}`}
                            variant="outline"
                          >
                            {statusIcon(emi.paymentStatus)}
                            <span className="ml-1">{emi.paymentStatus.replace('_', ' ')}</span>
                          </Badge>
                          {emi.offlineLoan.company && (
                            <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                              <Building2 className="h-2.5 w-2.5 mr-1" />
                              {emi.offlineLoan.company.code}
                            </Badge>
                          )}
                        </div>

                        <div
                          className={`flex items-center gap-3 mt-1 text-xs text-gray-500 ${onSelectLoan ? 'cursor-pointer hover:text-purple-700 transition-colors' : ''}`}
                          onClick={() => onSelectLoan?.(emi.offlineLoan.id, 'offline')}
                        >
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {emi.offlineLoan.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {emi.offlineLoan.customerPhone}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: <strong className="text-gray-600">{formatDate(emi.dueDate)}</strong>
                          </span>
                          <span>EMI #{emi.installmentNumber}</span>
                        </div>
                      </div>

                      {/* Right: Amount + Pay/View Button */}
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-gray-900">
                          {formatCurrency(remaining)}
                        </p>
                        {emi.paidAmount > 0 && (
                          <p className="text-xs text-emerald-600">
                            Paid: {formatCurrency(emi.paidAmount)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          of {formatCurrency(emi.totalAmount)}
                        </p>
                        {onSelectLoan && (
                          <Button
                            size="sm"
                            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => onSelectLoan(emi.offlineLoan.id, 'offline')}
                          >
                            <IndianRupee className="h-3 w-3 mr-1" /> Pay Loan
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
