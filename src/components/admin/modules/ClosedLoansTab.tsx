'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wallet, RefreshCw, Eye, FileText, Receipt, DollarSign, CheckCircle,
  Calendar, User, Building2, ArrowLeftRight, Banknote, TrendingUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';

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
  customer?: { name: string; phone: string; email?: string };
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
  // Role-based filter: only pass ONE of these
  companyId?: string;
  agentId?: string;
  createdById?: string;     // for Staff / Cashier
  mirrorEnabled?: boolean;  // if false → simple list, if true → parallel view
}

export default function ClosedLoansTab({
  setSelectedLoanId,
  setShowLoanDetailPanel,
  companyId,
  agentId,
  createdById,
  mirrorEnabled: mirrorEnabledProp,
}: Props) {
  const [loading, setLoading]     = useState(true);
  const [mirrorPairs, setMirrorPairs]       = useState<MirrorPair[]>([]);
  const [standaloneOffline, setStandaloneOffline] = useState<ClosedLoan[]>([]);
  const [onlineLoans, setOnlineLoans]       = useState<ClosedLoan[]>([]);
  const [stats, setStats] = useState({ totalOnline: 0, totalOffline: 0, totalPairs: 0, totalLoans: 0, totalAmount: 0, totalInterestCollected: 0, totalOnlineAmount: 0, totalOfflineAmount: 0 });
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // mirrorEnabled: from prop OR from API response (API is source of truth if prop not supplied)
  const [mirrorEnabledFromAPI, setMirrorEnabledFromAPI] = useState(true);
  const showParallel = mirrorEnabledProp !== undefined ? mirrorEnabledProp : mirrorEnabledFromAPI;

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

  // ── Loan card (single side) ───────────────────────────────────────────────
  const LoanCard = ({ loan, side }: { loan: ClosedLoan; side: 'original' | 'mirror' | 'standalone' }) => {
    const isMirror   = side === 'mirror';
    const borderCol  = isMirror ? 'border-l-orange-500' : 'border-l-emerald-500';
    const bgGradient = isMirror
      ? 'from-orange-50 to-amber-50'
      : 'from-emerald-50 to-green-50';
    const badgeCls   = isMirror
      ? 'bg-orange-100 text-orange-700 border-orange-300'
      : 'bg-emerald-100 text-emerald-700 border-emerald-300';

    return (
      <div className={`flex-1 min-w-0 rounded-xl border border-l-4 ${borderCol} bg-gradient-to-br ${bgGradient} p-4`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <Avatar className={`h-10 w-10 ${isMirror ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-emerald-400 to-green-500'}`}>
              <AvatarFallback className="bg-transparent text-white font-bold text-sm">
                {isMirror ? 'M' : 'O'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{loan.identifier}</span>
                <Badge className={`text-xs px-1.5 py-0 ${badgeCls}`}>
                  {isMirror ? 'MIRROR' : 'ORIGINAL'}
                </Badge>
                <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300">CLOSED</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{loan.customer?.name}</p>
              {loan.company && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />{loan.company.name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-base text-gray-900">{formatCurrency(loan.approvedAmount)}</p>
            <p className="text-xs text-gray-400">{loan.interestRate}% · {loan.tenure}m</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">EMI</p>
            <p className="text-sm font-bold">{formatCurrency(loan.emiAmount)}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">Interest</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(loan.totalInterest)}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">EMIs</p>
            <p className="text-sm font-bold text-emerald-600">{loan.summary.paidEMIs}/{loan.summary.totalEMIs}</p>
          </div>
        </div>

        {/* Closed date */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>Closed: {formatDate(loan.closedAt)}</span>
        </div>

        {/* EMI Schedule preview */}
        {loan.emiSchedules && loan.emiSchedules.length > 0 && expandedId === (loan.id + side) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 bg-white/80 rounded-lg p-3 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-gray-600 mb-2">EMI Payment History</p>
            <div className="space-y-1">
              {loan.emiSchedules.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">EMI #{e.installmentNumber}</span>
                  <span className={`font-medium ${e.paymentStatus === 'PAID' ? 'text-green-600' : 'text-gray-400'}`}>
                    {formatCurrency(e.paidAmount || e.totalAmount)}
                  </span>
                  <span className="text-gray-400">{e.paidDate ? formatDate(e.paidDate) : '—'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="w-full mt-2 text-xs h-7"
          onClick={() => setExpandedId(expandedId === (loan.id + side) ? null : (loan.id + side))}
        >
          <Eye className="h-3 w-3 mr-1" />
          {expandedId === (loan.id + side) ? 'Hide EMIs' : 'View EMIs'}
        </Button>
      </div>
    );
  };

  // ── Mirror Pair Row ───────────────────────────────────────────────────────
  const MirrorPairRow = ({ pair, index }: { pair: MirrorPair; index: number }) => (
    <motion.div
      key={pair.pairId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Pair header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-white/80" />
          <span className="text-white font-semibold text-sm">Mirror Pair — CLOSED</span>
          <Badge className="bg-white/20 text-white border-white/30 text-xs">
            Original {pair.original.interestRate}% ↔ Mirror {pair.mirrorInterestRate}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <Calendar className="h-3 w-3" />
          {formatDate(pair.closedAt)}
        </div>
      </div>

      {/* Side-by-side cards */}
      <div className="p-4 flex flex-col md:flex-row gap-4">
        <LoanCard loan={pair.original} side="original" />
        {/* Divider */}
        <div className="hidden md:flex flex-col items-center justify-center gap-1 text-gray-300 px-1">
          <div className="h-8 w-px bg-gray-200" />
          <ArrowLeftRight className="h-4 w-4 text-gray-400" />
          <div className="h-8 w-px bg-gray-200" />
        </div>
        {pair.mirror
          ? <LoanCard loan={pair.mirror} side="mirror" />
          : (
            <div className="flex-1 rounded-xl border border-dashed border-orange-200 bg-orange-50/50 flex items-center justify-center p-6 text-sm text-orange-400">
              Mirror loan not found in closed loans
            </div>
          )
        }
      </div>

      {pair.mirrorCompany && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Mirror Company: <span className="font-medium text-gray-600 ml-1">{pair.mirrorCompany.name}</span>
          </p>
        </div>
      )}
    </motion.div>
  );

  // ── Standalone loan row ───────────────────────────────────────────────────
  const StandaloneRow = ({ loan, index }: { loan: ClosedLoan; index: number }) => (
    <motion.div
      key={loan.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <LoanCard loan={loan} side="standalone" />
    </motion.div>
  );

  const showPairs    = filter === 'all' || filter === 'offline';
  const showOnline   = filter === 'all' || filter === 'online';
  const showStandalone = filter === 'all' || filter === 'offline';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-700 to-green-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Closed Loans</h2>
                <p className="text-sm text-emerald-200">Completed & fully repaid — with mirror pair view</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={fetchClosedLoans}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            {(['all', 'online', 'offline'] as const).map(f => (
              <Button key={f} size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className={filter === f ? (f === 'online' ? 'bg-blue-600' : f === 'offline' ? 'bg-purple-600' : 'bg-emerald-700') : ''}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${stats.totalLoans})` : f === 'online' ? `Online (${stats.totalOnline})` : `Offline (${stats.totalOffline})`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Closed', value: stats.totalLoans, icon: CheckCircle, color: 'green' },
          { label: 'Mirror Pairs', value: stats.totalPairs, icon: ArrowLeftRight, color: 'blue' },
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

      {/* Main list */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Closed Loans — {showParallel ? 'Parallel View' : 'List View'}
          </CardTitle>
          <CardDescription>
            {showParallel
              ? 'Mirror loan pairs shown side by side. Standalone loans below.'
              : 'All closed loans. Enable Mirror Loans in settings for parallel view.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (mirrorPairs.length === 0 && standaloneOffline.length === 0 && onlineLoans.length === 0) ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="h-14 w-14 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No closed loans yet</p>
              <p className="text-sm mt-1">Loans will appear here once all EMIs are paid</p>
            </div>
          ) : showParallel ? (
            /* ── PARALLEL VIEW (mirror enabled) ──────────────────── */
            <div className="space-y-4">
              {showPairs && mirrorPairs.map((pair, i) => <MirrorPairRow key={pair.pairId} pair={pair} index={i} />)}
              {showStandalone && standaloneOffline.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-500 pt-2">Offline Loans (No Mirror)</p>
                  {standaloneOffline.map((loan, i) => <StandaloneRow key={loan.id} loan={loan} index={i} />)}
                </div>
              )}
              {showOnline && onlineLoans.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-500 pt-2">Online Loans</p>
                  {onlineLoans.map((loan, i) => <StandaloneRow key={loan.id} loan={loan} index={i} />)}
                </div>
              )}
            </div>
          ) : (
            /* ── SIMPLE LIST VIEW (mirror disabled) ──────────────── */
            <div className="space-y-3">
              {[
                ...onlineLoans,
                ...standaloneOffline,
                ...mirrorPairs.map(p => p.original),
              ].map((loan, i) => (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold">
                      {loan.customer?.name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{loan.identifier}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">CLOSED</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${loan.loanType === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{loan.loanType}</span>
                      </div>
                      <p className="text-xs text-gray-500">{loan.customer?.name} • {loan.customer?.phone}</p>
                      <p className="text-xs text-gray-400">Closed: {formatDate(loan.closedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="font-bold text-gray-900">{formatCurrency(loan.approvedAmount)}</p>
                      <p className="text-xs text-gray-500">{loan.summary.paidEMIs}/{loan.summary.totalEMIs} EMIs</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => {
                        setSelectedLoanId(loan.id);
                        setShowLoanDetailPanel(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
