'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Wallet, RefreshCw, Eye, FileText, Receipt, CheckCircle, Calendar,
  Building2, ArrowLeftRight, TrendingUp, BarChart3, PieChart, X,
  Banknote, CreditCard, Smartphone, IndianRupee, Users, Award, Info,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';

/* ─────────────────────────────────── types ─── */
interface ClosedLoan {
  id: string;
  identifier: string;
  applicationNo: string;
  loanType: string;
  mirrorRole?: 'ORIGINAL' | 'MIRROR';
  isMirrorLoan?: boolean;
  isPair?: boolean;
  status: string;
  closedAt: string;
  customer?: { id?: string; name: string; phone: string; email?: string };
  company?: { id: string; name: string; code: string };
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  totalInterest: number;
  disbursementDate?: string;
  createdAt: string;
  summary: { totalEMIs: number; paidEMIs: number; totalPaid: number; totalAmount: number };
  emiSchedules?: any[];
}

interface MirrorPair {
  pairId: string;
  isPair: true;
  mirrorInterestRate: number;
  mirrorCompany?: { id: string; name: string; code: string };
  original: ClosedLoan;
  mirror: ClosedLoan | null;
  closedAt: string;
}

interface Props {
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
  companyId?: string;
  agentId?: string;
  createdById?: string;
  mirrorEnabled?: boolean;
}

/* ─── Payment mode breakdown helper ─── */
function getPaymentModeBreakdown(emis: any[]) {
  const breakdown: Record<string, { count: number; amount: number }> = {};
  for (const e of emis) {
    if (!e.paidAmount || e.paidAmount <= 0) continue;
    const mode = (e.paymentMode || 'CASH').toUpperCase();
    const label =
      mode === 'CASH' ? 'Cash' :
      ['UPI', 'ONLINE', 'NEFT', 'RTGS', 'IMPS'].some(m => mode.includes(m)) ? 'Online' :
      mode === 'BANK_TRANSFER' ? 'Bank Transfer' :
      mode === 'CHEQUE' ? 'Cheque' : mode;
    if (!breakdown[label]) breakdown[label] = { count: 0, amount: 0 };
    breakdown[label].count++;
    breakdown[label].amount += e.paidAmount;
  }
  return breakdown;
}

const PAYMENT_COLORS: Record<string, string> = {
  Cash: 'bg-amber-500',
  Online: 'bg-blue-500',
  'Bank Transfer': 'bg-emerald-500',
  Cheque: 'bg-purple-500',
};

/* ─── Per-loan analytics dialog ─── */
function LoanAnalyticsDialog({ loan, open, onClose }: { loan: ClosedLoan | null; open: boolean; onClose: () => void }) {
  if (!loan) return null;
  const emis = loan.emiSchedules || [];
  const paidEMIs = emis.filter((e: any) => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID');
  const totalPaid = paidEMIs.reduce((s: number, e: any) => s + (e.paidAmount || 0), 0);
  const totalInterest = loan.totalInterest || 0;
  const principalPaid = Math.max(0, totalPaid - totalInterest);
  const payBreakdown = getPaymentModeBreakdown(emis);
  const totalBreakdownAmt = Object.values(payBreakdown).reduce((s, v) => s + v.amount, 0);
  const completionPct = loan.summary.totalEMIs > 0 ? Math.round((loan.summary.paidEMIs / loan.summary.totalEMIs) * 100) : 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <BarChart3 className="h-5 w-5" />
            Loan Analytics — {loan.identifier}
          </DialogTitle>
        </DialogHeader>

        {/* Customer & Loan Info */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
              {loan.customer?.name?.charAt(0) || 'L'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{loan.customer?.name}</p>
              <p className="text-xs text-gray-500">{loan.customer?.phone} • {loan.identifier}</p>
            </div>
            <Badge className="ml-auto bg-green-100 text-green-700 border-green-300">CLOSED</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">Principal</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrency(loan.approvedAmount)}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">Interest</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(totalInterest)}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">Rate / Tenure</p>
              <p className="text-sm font-bold text-gray-800">{loan.interestRate}% · {loan.tenure}m</p>
            </div>
          </div>
        </div>

        {/* EMI Completion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">EMI Completion</span>
            <span className="text-emerald-700 font-bold">{loan.summary.paidEMIs}/{loan.summary.totalEMIs} ({completionPct}%)</span>
          </div>
          <Progress value={completionPct} className="h-3 bg-gray-100" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Total Collected: <strong className="text-gray-800">{formatCurrency(totalPaid)}</strong></span>
            <span>Closed: <strong>{formatDate(loan.closedAt)}</strong></span>
          </div>
        </div>

        {/* Payment Mode Breakdown */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-600" /> Payment Mode Breakdown
          </p>
          {Object.keys(payBreakdown).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No payment mode data available</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(payBreakdown).map(([mode, data]) => {
                const pct = totalBreakdownAmt > 0 ? Math.round((data.amount / totalBreakdownAmt) * 100) : 0;
                const color = PAYMENT_COLORS[mode] || 'bg-gray-400';
                return (
                  <div key={mode}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="font-medium text-gray-700">{mode}</span>
                        <span className="text-gray-400 text-xs">({data.count} EMIs)</span>
                      </div>
                      <span className="font-bold text-gray-800">{formatCurrency(data.amount)} <span className="text-gray-400 font-normal text-xs">{pct}%</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* EMI Timeline */}
        {emis.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">EMI Payment History</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {emis.map((e: any, idx: number) => (
                <div key={e.id || idx} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500 w-12">EMI #{e.installmentNumber}</span>
                  <span className={`font-medium ${e.paymentStatus === 'PAID' ? 'text-green-600' : 'text-gray-400'}`}>
                    {formatCurrency(e.paidAmount || e.totalAmount)}
                  </span>
                  <span className="text-gray-400">{e.paidDate ? formatDate(e.paidDate) : '—'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${e.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {e.paymentMode?.replace('_', ' ') || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Global analytics dialog ─── */
function GlobalAnalyticsDialog({
  open, onClose, mirrorPairs, standaloneOffline, onlineLoans
}: {
  open: boolean; onClose: () => void;
  mirrorPairs: MirrorPair[]; standaloneOffline: ClosedLoan[]; onlineLoans: ClosedLoan[];
}) {
  const allLoans: ClosedLoan[] = [
    ...onlineLoans,
    ...standaloneOffline,
    ...mirrorPairs.map(p => p.original),
    ...mirrorPairs.filter(p => p.mirror).map(p => p.mirror as ClosedLoan),
  ];
  const allEMIs = allLoans.flatMap(l => l.emiSchedules || []);
  const totalLoans = allLoans.length;
  const totalPrincipal = allLoans.reduce((s, l) => s + l.approvedAmount, 0);
  const totalInterest = allLoans.reduce((s, l) => s + (l.totalInterest || 0), 0);
  const totalCollected = allLoans.reduce((s, l) => s + (l.summary.totalPaid || 0), 0);
  const totalEMIs = allEMIs.length;
  const paidEMIs = allEMIs.filter((e: any) => e.paymentStatus === 'PAID').length;
  const payBreakdown = getPaymentModeBreakdown(allEMIs);
  const totalBreakdownAmt = Object.values(payBreakdown).reduce((s, v) => s + v.amount, 0);

  const onlineCount = onlineLoans.length;
  const offlineCount = standaloneOffline.length + mirrorPairs.length;
  const pairedCount = mirrorPairs.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <BarChart3 className="h-5 w-5" />
            Full Closed Loans Analytics
          </DialogTitle>
        </DialogHeader>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Closed', value: totalLoans, icon: CheckCircle, color: 'emerald' },
            { label: 'Paired Loans', value: pairedCount, icon: ArrowLeftRight, color: 'blue' },
            { label: 'Online / Offline', value: `${onlineCount} / ${offlineCount}`, icon: FileText, color: 'purple' },
            { label: 'EMI Completion', value: `${totalEMIs > 0 ? Math.round(paidEMIs / totalEMIs * 100) : 100}%`, icon: Award, color: 'amber' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3 text-center`}>
              <Icon className={`h-5 w-5 text-${color}-600 mx-auto mb-1`} />
              <p className={`text-xl font-bold text-${color}-700`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <IndianRupee className="h-4 w-4" /> Financial Summary
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Principal', value: totalPrincipal, color: 'text-gray-900' },
              { label: 'Total Interest Earned', value: totalInterest, color: 'text-green-700' },
              { label: 'Total Collected', value: totalCollected, color: 'text-emerald-700' },
              { label: 'Recovery Rate', value: `${totalPrincipal > 0 ? Math.min(100, Math.round((totalCollected / (totalPrincipal + totalInterest)) * 100)) : 0}%`, color: 'text-blue-700', isText: true },
            ].map(({ label, value, color, isText }) => (
              <div key={label} className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{isText ? value : formatCurrency(value as number)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Mode Breakdown */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-600" /> Repayment Mode Breakdown (All Loans)
          </p>
          {Object.keys(payBreakdown).length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No payment mode data available</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(payBreakdown)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([mode, data]) => {
                  const pct = totalBreakdownAmt > 0 ? Math.round((data.amount / totalBreakdownAmt) * 100) : 0;
                  const color = PAYMENT_COLORS[mode] || 'bg-gray-400';
                  return (
                    <div key={mode}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color}`} />
                          <span className="font-medium text-gray-700">{mode}</span>
                          <span className="text-gray-400 text-xs">({data.count} EMIs)</span>
                        </div>
                        <span className="font-bold text-gray-800">
                          {formatCurrency(data.amount)} <span className="text-gray-400 font-normal text-xs">{pct}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-2.5 ${color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          {Object.entries(PAYMENT_COLORS).map(([mode, color]) => (
            <div key={mode} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span>{mode}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function ClosedLoansTab({
  setSelectedLoanId,
  setShowLoanDetailPanel,
  companyId,
  agentId,
  createdById,
  mirrorEnabled: mirrorEnabledProp,
}: Props) {
  const [loading, setLoading]                   = useState(true);
  const [mirrorPairs, setMirrorPairs]           = useState<MirrorPair[]>([]);
  const [onlinePairs, setOnlinePairs]           = useState<MirrorPair[]>([]);
  const [standaloneOffline, setStandaloneOffline] = useState<ClosedLoan[]>([]);
  const [onlineLoans, setOnlineLoans]           = useState<ClosedLoan[]>([]);
  const [stats, setStats] = useState({ totalOnline: 0, totalOffline: 0, totalPairs: 0, totalLoans: 0, totalAmount: 0, totalInterestCollected: 0, totalOnlineAmount: 0, totalOfflineAmount: 0 });
  const [filter, setFilter]                     = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery]           = useState('');
  const [expandedId, setExpandedId]             = useState<string | null>(null);
  const [mirrorEnabledFromAPI, setMirrorEnabledFromAPI] = useState(true);
  const showParallel = mirrorEnabledProp !== undefined ? mirrorEnabledProp : mirrorEnabledFromAPI;

  // Analytics dialogs
  const [analyticsLoan, setAnalyticsLoan]       = useState<ClosedLoan | null>(null);
  const [showLoanAnalytics, setShowLoanAnalytics] = useState(false);
  const [showGlobalAnalytics, setShowGlobalAnalytics] = useState(false);

  const fetchClosedLoans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (companyId)   params.set('companyId',   companyId);
      if (agentId)     params.set('agentId',     agentId);
      if (createdById) params.set('createdById', createdById);
      if (mirrorEnabledProp === false) params.set('mirrorEnabled', 'false');
      const res  = await fetch(`/api/loan/closed?${params}`);
      const data = await res.json();
      setMirrorPairs(data.mirrorPairs || []);
      setOnlinePairs(data.onlinePairs || []);
      setStandaloneOffline(data.standaloneOffline || []);
      setOnlineLoans(data.onlineLoans || []);
      setMirrorEnabledFromAPI(data.mirrorEnabled !== false);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error('Error fetching closed loans:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClosedLoans(); }, [filter, companyId, agentId, createdById]);

  /* ── search filter ── */
  const matchesSearch = (loan: ClosedLoan) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      loan.identifier?.toLowerCase().includes(q) ||
      loan.customer?.name?.toLowerCase().includes(q) ||
      loan.customer?.phone?.includes(q) ||
      loan.applicationNo?.toLowerCase().includes(q)
    );
  };

  /* ─── Loan Card (single side) ─── */
  const LoanCard = ({ loan, side }: { loan: ClosedLoan; side: 'original' | 'mirror' | 'standalone' }) => {
    const isMirror = side === 'mirror';
    const emis = loan.emiSchedules || [];
    const totalPaid = loan.summary.totalPaid;
    const completionPct = loan.summary.totalEMIs > 0
      ? Math.round((loan.summary.paidEMIs / loan.summary.totalEMIs) * 100) : 100;

    return (
      <div className={`flex-1 min-w-0 rounded-xl border ${isMirror ? 'border-l-4 border-l-orange-400 bg-gradient-to-br from-orange-50 to-amber-50' : 'border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50'}`}>
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className={`h-10 w-10 ${isMirror ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-emerald-400 to-green-600'}`}>
                <AvatarFallback className="bg-transparent text-white font-bold text-sm">
                  {loan.customer?.name?.charAt(0) || (isMirror ? 'M' : 'O')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{loan.identifier}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${isMirror ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isMirror ? 'LOAN' : 'ORIGINAL'}
                  </Badge>
                  <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700">CLOSED</Badge>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-0.5">{loan.customer?.name}</p>
                <p className="text-xs text-gray-400">{loan.customer?.phone}</p>
                {loan.company && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />{loan.company.name}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-base text-gray-900">{formatCurrency(loan.approvedAmount)}</p>
              <p className="text-xs text-gray-400">{loan.interestRate}% · {loan.tenure}m</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">+{formatCurrency(loan.totalInterest)}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>EMIs {loan.summary.paidEMIs}/{loan.summary.totalEMIs}</span>
              <span className="font-medium text-emerald-600">{completionPct}% complete</span>
            </div>
            <Progress value={completionPct} className="h-2 bg-gray-100" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 px-4 py-2">
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">EMI</p>
            <p className="text-xs font-bold text-gray-800">{formatCurrency(loan.emiAmount)}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Collected</p>
            <p className="text-xs font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Closed</p>
            <p className="text-xs font-bold text-gray-700">{formatDate(loan.closedAt)}</p>
          </div>
        </div>

        {/* EMI history (expanded) */}
        <AnimatePresence>
          {expandedId === (loan.id + side) && emis.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-3 bg-white/80 rounded-lg p-3 max-h-44 overflow-y-auto"
            >
              <p className="text-xs font-semibold text-gray-600 mb-2">EMI Payment History</p>
              <div className="space-y-1">
                {emis.map((e: any, i: number) => (
                  <div key={e.id || i} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-gray-400 w-10">#{e.installmentNumber}</span>
                    <span className={`font-medium flex-1 ${e.paymentStatus === 'PAID' ? 'text-green-600' : 'text-gray-400'}`}>
                      {formatCurrency(e.paidAmount || e.totalAmount)}
                    </span>
                    <span className="text-gray-400 text-[10px]">{e.paymentMode?.replace('_', ' ') || '—'}</span>
                    <span className="text-gray-400 ml-2">{e.paidDate ? formatDate(e.paidDate) : '—'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
          <Button size="sm" variant="outline"
            className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
          >
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          <Button size="sm" variant="ghost"
            className="text-xs h-8 text-gray-600 hover:bg-white/80"
            onClick={() => setExpandedId(expandedId === (loan.id + side) ? null : (loan.id + side))}
          >
            {expandedId === (loan.id + side)
              ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide EMIs</>
              : <><ChevronDown className="h-3 w-3 mr-1" /> EMIs</>
            }
          </Button>
          <Button size="sm" variant="ghost"
            className="text-xs h-8 text-blue-600 hover:bg-blue-50"
            onClick={() => { setAnalyticsLoan(loan); setShowLoanAnalytics(true); }}
          >
            <BarChart3 className="h-3 w-3 mr-1" /> Analytics
          </Button>
        </div>
      </div>
    );
  };

  /* ─── Mirror Pair Row ─── */
  const MirrorPairRow = ({ pair, index }: { pair: MirrorPair; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-white/80" />
          <span className="text-white font-semibold text-sm">Loan Pair — CLOSED</span>
          <Badge className="bg-white/20 text-white border-white/30 text-xs">
            Original {pair.original.interestRate}% ↔ Loan {pair.mirrorInterestRate}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <Calendar className="h-3 w-3" /> {formatDate(pair.closedAt)}
        </div>
      </div>

      <div className="p-4 flex flex-col md:flex-row gap-4">
        <LoanCard loan={pair.original} side="original" />
        <div className="hidden md:flex flex-col items-center justify-center gap-1 text-gray-300 px-1">
          <div className="h-8 w-px bg-gray-200" />
          <ArrowLeftRight className="h-4 w-4 text-gray-400" />
          <div className="h-8 w-px bg-gray-200" />
        </div>
        {pair.mirror
          ? <LoanCard loan={pair.mirror} side="mirror" />
          : (
            <div className="flex-1 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center p-6 text-sm text-gray-400">
              <div className="text-center">
                <Info className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                <p>Loan data loading…</p>
              </div>
            </div>
          )
        }
      </div>

      {pair.mirrorCompany && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Loan Company: <span className="font-medium text-gray-600 ml-1">{pair.mirrorCompany.name}</span>
          </p>
        </div>
      )}
    </motion.div>
  );

  /* ─── Standalone / Online loan row ─── */
  const LoanRow = ({ loan, index }: { loan: ClosedLoan; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {loan.customer?.name?.charAt(0) || 'L'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{loan.identifier}</span>
              <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">CLOSED</Badge>
              <Badge className={`text-[10px] ${loan.loanType === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {loan.loanType}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">{loan.customer?.name}</p>
            <p className="text-xs text-gray-400">{loan.customer?.phone} · Closed: {formatDate(loan.closedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-bold text-gray-900">{formatCurrency(loan.approvedAmount)}</p>
            <p className="text-xs text-green-600">+{formatCurrency(loan.totalInterest)}</p>
            <p className="text-xs text-gray-500">{loan.summary.paidEMIs}/{loan.summary.totalEMIs} EMIs</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}>
              <Eye className="h-3 w-3 mr-1" /> View
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => { setAnalyticsLoan(loan); setShowLoanAnalytics(true); }}>
              <BarChart3 className="h-3 w-3 mr-1" /> Analytics
            </Button>
          </div>
        </div>
      </div>
      {/* mini progress */}
      <div className="px-4 pb-3">
        <Progress
          value={loan.summary.totalEMIs > 0 ? Math.round((loan.summary.paidEMIs / loan.summary.totalEMIs) * 100) : 100}
          className="h-1.5 bg-gray-100"
        />
      </div>
    </motion.div>
  );

  const showPairs     = filter === 'all' || filter === 'offline';
  const showOnline    = filter === 'all' || filter === 'online';
  const showStandalone = filter === 'all' || filter === 'offline';

  const filteredOnlinePairs    = onlinePairs.filter(p => matchesSearch(p.original) || (p.mirror && matchesSearch(p.mirror)));
  const filteredPairs          = mirrorPairs.filter(p => matchesSearch(p.original) || (p.mirror && matchesSearch(p.mirror)));
  const filteredStandalone     = standaloneOffline.filter(matchesSearch);
  const filteredOnline         = onlineLoans.filter(matchesSearch);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-700 to-green-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Closed Loans</h2>
                <p className="text-sm text-emerald-200">Completed & fully repaid — with pair view</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowGlobalAnalytics(true)}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" /> Full Analytics
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={fetchClosedLoans}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Closed', value: stats.totalLoans, icon: CheckCircle, color: 'green' },
          { label: 'Loan Pairs', value: stats.totalPairs, icon: ArrowLeftRight, color: 'blue' },
          { label: 'Total Principal', value: formatCurrency(stats.totalAmount), icon: Wallet, color: 'amber' },
          { label: 'Interest Earned', value: formatCurrency(stats.totalInterestCollected), icon: TrendingUp, color: 'purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`border-0 shadow-sm border-l-4 border-l-${color}-500`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-xl font-bold text-${color}-600`}>{value}</p>
                </div>
                <div className={`p-2 bg-${color}-50 rounded-lg`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-10 h-9" placeholder="Search by name, loan#…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {/* Type filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                {(['all', 'online', 'offline'] as const).map(f => (
                  <Button key={f} size="sm"
                    variant={filter === f ? 'default' : 'outline'}
                    className={filter === f
                      ? (f === 'online' ? 'bg-blue-600 hover:bg-blue-700' : f === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-700 hover:bg-emerald-800')
                      : ''}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? `All (${stats.totalLoans})` : f === 'online' ? `Online (${stats.totalOnline})` : `Offline (${stats.totalOffline})`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Closed Loans — {showParallel ? 'Parallel View' : 'List View'}
          </CardTitle>
          <CardDescription>
            {showParallel
              ? 'Loan pairs shown side by side. Standalone loans below.'
              : 'All closed loans.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (filteredPairs.length === 0 && filteredStandalone.length === 0 && filteredOnline.length === 0) ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="h-14 w-14 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No closed loans found</p>
              <p className="text-sm mt-1">Loans appear here once all EMIs are paid</p>
            </div>
          ) : showParallel ? (
            /* PARALLEL VIEW */
            <div className="space-y-4">
              {/* Online Loan Pairs */}
              {(filter === 'all' || filter === 'online') && filteredOnlinePairs.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4" /> Online Loan Pairs
                  </p>
                  {filteredOnlinePairs.map((pair, i) => <MirrorPairRow key={pair.pairId} pair={pair} index={i} />)}
                </div>
              )}
              {/* Offline Loan Pairs */}
              {showPairs && filteredPairs.length > 0 && (
                <div className="space-y-3">
                  {filteredOnlinePairs.length > 0 && <p className="text-sm font-semibold text-purple-600 flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> Offline Loan Pairs</p>}
                  {filteredPairs.map((pair, i) => <MirrorPairRow key={pair.pairId} pair={pair} index={i} />)}
                </div>
              )}
              {showStandalone && filteredStandalone.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-500 pt-2">Offline Loans (No Pair)</p>
                  {filteredStandalone.map((loan, i) => <LoanRow key={loan.id} loan={loan} index={i} />)}
                </div>
              )}
              {showOnline && filteredOnline.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-500 pt-2">Online Loans (No Pair)</p>
                  {filteredOnline.map((loan, i) => <LoanRow key={loan.id} loan={loan} index={i} />)}
                </div>
              )}
            </div>
          ) : (
            /* SIMPLE LIST VIEW */
            <div className="space-y-3">
              {[...filteredOnline, ...filteredStandalone, ...filteredPairs.map(p => p.original)]
                .map((loan, i) => <LoanRow key={loan.id} loan={loan} index={i} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-loan analytics dialog */}
      <LoanAnalyticsDialog
        loan={analyticsLoan}
        open={showLoanAnalytics}
        onClose={() => setShowLoanAnalytics(false)}
      />

      {/* Global analytics dialog */}
      <GlobalAnalyticsDialog
        open={showGlobalAnalytics}
        onClose={() => setShowGlobalAnalytics(false)}
        mirrorPairs={mirrorPairs}
        standaloneOffline={standaloneOffline}
        onlineLoans={onlineLoans}
      />
    </div>
  );
}
