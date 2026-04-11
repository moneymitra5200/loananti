'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, DollarSign, CheckCircle, Wallet, BarChart3,
  PieChart, Activity, FileText, Users, Calendar, ArrowUpRight, ArrowDownRight,
  Target, Zap, Building2, AlertTriangle, Shield, IndianRupee, Percent, Clock,
  UserCheck, Star, Medal, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, RadialBarChart, RadialBar, ComposedChart, ScatterChart,
  Scatter, FunnelChart, Funnel, LabelList
} from 'recharts';
import { motion } from 'framer-motion';

interface Loan {
  id: string;
  status: string;
  createdAt: string;
  loanType?: string;
  requestedAmount: number;
  sessionForm?: any;
  disbursedAt?: string;
  disbursedAmount?: number;
  customer?: { id?: string; name?: string };
  company?: { id?: string; name?: string };
}

interface Props {
  loans: Loan[];
  activeLoans: Loan[];
  inProgressLoans: Loan[];
  pendingForSA: Loan[];
  pendingForFinal: Loan[];
  rejectedLoans: Loan[];
  highRiskLoans: Loan[];
  totalRequested: number;
  totalDisbursed: number;
}

// ─── Palette ───────────────────────────────────────────────
const P = {
  blue:   '#3b82f6',
  green:  '#10b981',
  violet: '#8b5cf6',
  amber:  '#f59e0b',
  red:    '#ef4444',
  cyan:   '#06b6d4',
  pink:   '#ec4899',
  indigo: '#6366f1',
  orange: '#f97316',
  teal:   '#14b8a6',
};
const COLORS = Object.values(P);

// ─── Helpers ───────────────────────────────────────────────
const fmt = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
};

const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0');

// ─── Custom Tooltip ────────────────────────────────────────
const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs min-w-[140px]">
      <p className="font-bold text-gray-700 mb-2 border-b pb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-gray-500">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-800">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, color, bg, change, changeUp
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; bg: string; change?: string; changeUp?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shadow-sm`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            {change && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                changeUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
              }`}>
                {changeUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {change}
              </div>
            )}
          </div>
          <p className={`text-2xl font-bold ${color} leading-none`}>{value}</p>
          <p className="text-xs text-gray-500 mt-1.5 font-medium">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Section Header ────────────────────────────────────────
function SectionHeader({ icon: Icon, title, desc, color = 'text-indigo-600' }: any) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
function AnalyticsSection({
  loans, activeLoans, inProgressLoans, pendingForSA, pendingForFinal,
  rejectedLoans, highRiskLoans, totalRequested, totalDisbursed
}: Props) {
  const [tab, setTab] = useState('overview');
  const [comparisonMode, setComparisonMode] = useState<'1M' | '3M' | '6M'>('1M');

  // ── Live EMI Collection Data (fetched from API) ───────────
  const [emiCollection, setEmiCollection] = useState<any[]>([]);
  const [emiLoading, setEmiLoading] = useState(false);
  const [emiSummary, setEmiSummary] = useState<any>(null);

  // ── Agent Performance Data ────────────────────────────────
  const [agentData, setAgentData] = useState<any>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentSort, setAgentSort] = useState<'disbursed' | 'apps' | 'amount' | 'growth'>('disbursed');

  useEffect(() => {
    const fetchAgents = async () => {
      if (tab !== 'agents') return;
      setAgentLoading(true);
      try {
        const res = await fetch('/api/analytics/agent-performance');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setAgentData(data);
        }
      } catch { /* non-critical */ } finally {
        setAgentLoading(false);
      }
    };
    fetchAgents();
  }, [tab]);

  useEffect(() => {
    const fetchEmiCollection = async () => {
      setEmiLoading(true);
      try {
        const res = await fetch('/api/analytics/emi-collection');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setEmiCollection(data.monthly || []);
            setEmiSummary(data.summary || null);
          }
        }
      } catch { /* non-critical */ } finally {
        setEmiLoading(false);
      }
    };
    fetchEmiCollection();
  }, []);

  // ── Global KPIs ──────────────────────────────────────────
  const conversionRate  = parseFloat(pct(activeLoans.length, loans.length));
  const approvalRate    = parseFloat(pct(activeLoans.length + inProgressLoans.length, loans.length));
  const rejectionRate   = parseFloat(pct(rejectedLoans.length, loans.length));
  const avgLoanAmount   = loans.length > 0 ? Math.round(totalRequested / loans.length) : 0;
  const pendingCount    = pendingForSA.length + pendingForFinal.length;

  // ── Monthly data — last 12 months ───────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      const ml = loans.filter(l => { const c = new Date(l.createdAt); return c >= d && c < next; });
      const disb = ml.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
      const rej = ml.filter(l => l.status.includes('REJECTED'));
      const amount = disb.reduce((s, l) =>
        s + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount || 0), 0);
      const pending = ml.filter(l => ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(l.status));

      return {
        month: label,
        applications: ml.length,
        disbursed: disb.length,
        rejected: rej.length,
        pending: pending.length,
        amount,
        requested: ml.reduce((s, l) => s + (l.requestedAmount || 0), 0),
        customers: new Set(ml.map(l => l.customer?.id).filter(Boolean)).size,
        convRate: disb.length > 0 && ml.length > 0 ? parseFloat(((disb.length / ml.length) * 100).toFixed(1)) : 0,
      };
    });
  }, [loans]);

  // ── Yearly data ──────────────────────────────────────────
  const yearlyData = useMemo(() => {
    const years = [...new Set(loans.map(l => new Date(l.createdAt).getFullYear()))].sort();
    if (!years.length) years.push(new Date().getFullYear());
    return years.map(year => {
      const yl = loans.filter(l => new Date(l.createdAt).getFullYear() === year);
      const disb = yl.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
      const amount = disb.reduce((s, l) =>
        s + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount || 0), 0);
      return {
        year: String(year),
        applications: yl.length,
        disbursed: disb.length,
        rejected: yl.filter(l => l.status.includes('REJECTED')).length,
        customers: new Set(yl.map(l => l.customer?.id).filter(Boolean)).size,
        amount,
        convRate: (disb.length / Math.max(yl.length, 1) * 100).toFixed(1),
      };
    });
  }, [loans]);

  // ── Loan type distribution ───────────────────────────────
  const loanTypeData = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    loans.forEach(l => {
      const t = l.loanType || 'Personal';
      if (!map[t]) map[t] = { count: 0, amount: 0 };
      map[t].count++;
      map[t].amount += l.requestedAmount || 0;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, v]) => ({ name, value: v.count, amount: v.amount }));
  }, [loans]);

  // ── Company distribution ─────────────────────────────────
  const companyData = useMemo(() => {
    const map: Record<string, number> = {};
    loans.forEach(l => {
      const c = l.company?.name || l.sessionForm?.company?.name || (l as any).companyName || 'Default';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [loans]);

  // ── Status funnel ────────────────────────────────────────
  const funnelData = [
    { name: 'Applications', value: loans.length,          fill: P.blue },
    { name: 'In Progress',  value: inProgressLoans.length, fill: P.amber },
    { name: 'Pending',      value: pendingCount,            fill: P.cyan },
    { name: 'Active/Disbursed', value: activeLoans.length, fill: P.green },
    { name: 'Rejected',     value: rejectedLoans.length,   fill: P.red },
  ];

  // ── MoM growth ───────────────────────────────────────────
  const mom = monthlyData.length >= 2
    ? (monthlyData[11].applications - monthlyData[10].applications)
    : 0;
  const momPct = monthlyData[10]?.applications > 0
    ? ((mom / monthlyData[10].applications) * 100).toFixed(1)
    : '0';

  // ── Best month ────────────────────────────────────────────
  const bestMonth = [...monthlyData].sort((a, b) => b.applications - a.applications)[0];

  // ── Overview summary table ────────────────────────────────
  const summaryRows = [
    { label: 'Total Requested',  value: formatCurrency(totalRequested),         color: 'text-blue-600' },
    { label: 'Total Disbursed',  value: formatCurrency(totalDisbursed),          color: 'text-green-600' },
    { label: 'Total Pending',    value: `${pendingCount} loans`,                 color: 'text-amber-600' },
    { label: 'Avg Loan Size',    value: formatCurrency(avgLoanAmount),            color: 'text-violet-600' },
    { label: 'Approval Rate',    value: `${approvalRate.toFixed(1)}%`,           color: 'text-emerald-600' },
    { label: 'Rejection Rate',   value: `${rejectionRate.toFixed(1)}%`,          color: 'text-red-500' },
    { label: 'High Risk Loans',  value: `${highRiskLoans.length} loans`,          color: 'text-orange-600' },
    { label: 'Best Month',       value: `${bestMonth?.month} (${bestMonth?.applications} apps)`, color: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      {/* ── KPI Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard label="Total Applications" value={loans.length} sub={`${pct(mom > 0 ? mom : 0, monthlyData[10]?.applications || 1)}% vs last month`}
          icon={FileText} color="text-blue-600" bg="bg-blue-50"
          change={`${Math.abs(parseFloat(momPct))}% MoM`} changeUp={parseFloat(momPct) >= 0} />
        <KPICard label="Active Loans" value={activeLoans.length} sub="Currently running"
          icon={CheckCircle} color="text-green-600" bg="bg-green-50"
          change={`${conversionRate.toFixed(1)}% conv.`} changeUp={conversionRate > 50} />
        <KPICard label="Total Disbursed" value={fmt(totalDisbursed)} sub="All-time"
          icon={Wallet} color="text-violet-600" bg="bg-violet-50" />
        <KPICard label="Avg Loan Size" value={fmt(avgLoanAmount)} sub="Per application"
          icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
        <KPICard label="Pending Action" value={pendingCount} sub="Needs attention"
          icon={Clock} color="text-cyan-600" bg="bg-cyan-50"
          change={pendingCount > 5 ? 'High queue' : 'Normal'} changeUp={pendingCount <= 5} />
        <KPICard label="High Risk" value={highRiskLoans.length} sub="Needs monitoring"
          icon={AlertTriangle} color="text-red-600" bg="bg-red-50"
          change={`${pct(highRiskLoans.length, loans.length)}% of total`} changeUp={highRiskLoans.length === 0} />
      </div>

      {/* ── Main Tabs ────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1.5 bg-gray-100 rounded-xl w-full">
          {[
          { v: 'overview',     label: '📊 Overview' },
            { v: 'monthly',      label: '📅 Monthly Drill' },
            { v: 'emi',          label: '💰 EMI Collection' },
            { v: 'yearly',       label: '📈 Yearly' },
            { v: 'distribution', label: '🥧 Distribution' },
            { v: 'risk',         label: '⚠️ Risk & Health' },
            { v: 'comparison',   label: '🔄 Month Comparison' },
            { v: 'agents',       label: '👤 Agent Analytics' },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="rounded-lg text-xs sm:text-sm flex-1 min-w-fit">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ══════════════════════════════════════════════════════════
            TAB 1 — OVERVIEW
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Applications trend — Area */}
            <Card className="lg:col-span-2 border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  12-Month Application & Disbursement Trend
                </CardTitle>
                <CardDescription>Applications received vs loans disbursed over last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={P.blue} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={P.blue} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDisb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={P.green} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={P.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="applications" name="Applications" stroke={P.blue}  fill="url(#gApp)"  strokeWidth={2.5} />
                    <Area type="monotone" dataKey="disbursed"    name="Disbursed"    stroke={P.green} fill="url(#gDisb)" strokeWidth={2.5} />
                    <Bar  dataKey="rejected" name="Rejected" fill={P.red} opacity={0.5} radius={[3,3,0,0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary table */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Business Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summaryRows.map(r => (
                    <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-500">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amount disbursed bar + Conversion line */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  Monthly Disbursement Volume (₹)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="amount" name="Disbursed Amount" radius={[4,4,0,0]}>
                      {monthlyData.map((_, i) => (
                        <Cell key={i} fill={i === 11 ? P.green : `${P.green}99`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="h-4 w-4 text-violet-600" />
                  Monthly Conversion Rate (%)
                </CardTitle>
                <CardDescription>% of applications that got disbursed</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip content={<CT />} />
                    <Line type="monotone" dataKey="convRate" name="Conversion %" stroke={P.violet}
                      strokeWidth={2.5} dot={{ r: 3, fill: P.violet }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Funnel */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                Application Pipeline Funnel
              </CardTitle>
              <CardDescription>Current status distribution across all loan stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {funnelData.map((f, i) => (
                  <div key={f.name} className="flex-1 min-w-[120px]">
                    <div className="rounded-xl p-4 text-center border" style={{ borderColor: f.fill + '40', background: f.fill + '10' }}>
                      <div className="text-2xl font-bold" style={{ color: f.fill }}>{f.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{f.name}</div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: f.fill }}>
                        {pct(f.value, loans.length)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 2 — MONTHLY DRILL-DOWN
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="monthly" className="space-y-5 mt-4">
          {/* Stacked bar - all categories */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Monthly Application Breakdown — Stacked
              </CardTitle>
              <CardDescription>Disbursed, Pending, and Rejected split per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CT />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="disbursed" name="Disbursed" stackId="a" fill={P.green} />
                  <Bar dataKey="pending"   name="Pending"   stackId="a" fill={P.amber} />
                  <Bar dataKey="rejected"  name="Rejected"  stackId="a" fill={P.red} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly detail table */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                Month-wise Performance Table
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-2 px-3 text-left font-semibold text-gray-600">Month</th>
                    <th className="py-2 px-3 text-right font-semibold text-blue-600">Apps</th>
                    <th className="py-2 px-3 text-right font-semibold text-green-600">Disbursed</th>
                    <th className="py-2 px-3 text-right font-semibold text-red-500">Rejected</th>
                    <th className="py-2 px-3 text-right font-semibold text-amber-600">Pending</th>
                    <th className="py-2 px-3 text-right font-semibold text-purple-600">Customers</th>
                    <th className="py-2 px-3 text-right font-semibold text-emerald-600">Volume</th>
                    <th className="py-2 px-3 text-right font-semibold text-indigo-600">Conv.%</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyData].reverse().map((r, i) => (
                    <tr key={r.month} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${i === 0 ? 'bg-indigo-50/30' : ''}`}>
                      <td className="py-2 px-3 font-semibold text-gray-700">
                        {r.month} {i === 0 && <Badge className="ml-1 text-[9px] bg-indigo-100 text-indigo-600">Current</Badge>}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-blue-600">{r.applications}</td>
                      <td className="py-2 px-3 text-right font-medium text-green-600">{r.disbursed}</td>
                      <td className="py-2 px-3 text-right text-red-500">{r.rejected}</td>
                      <td className="py-2 px-3 text-right text-amber-600">{r.pending}</td>
                      <td className="py-2 px-3 text-right text-purple-600">{r.customers}</td>
                      <td className="py-2 px-3 text-right font-medium text-gray-700">{fmt(r.amount)}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-semibold ${r.convRate >= 50 ? 'text-emerald-600' : r.convRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                          {r.convRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Customer growth + Pending trend */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />New Customer Acquisition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCust" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={P.violet} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={P.violet} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CT />} />
                    <Area type="monotone" dataKey="customers" name="New Customers" stroke={P.violet} fill="url(#gCust)" strokeWidth={2.5} dot={{ r: 3, fill: P.violet }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />Pending Loans per Month
                </CardTitle>
                <CardDescription>Backlog buildup over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="pending" name="Pending" fill={P.amber} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB — EMI COLLECTION (LIVE DATA)
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="emi" className="space-y-5 mt-4">
          {emiLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-500">Loading collection data...</span>
            </div>
          ) : (
          <>
            {/* EMI Summary KPIs */}
            {emiSummary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Collected', value: fmt(emiSummary.totalCollected || 0), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wallet },
                  { label: 'Cash Collections', value: fmt(emiSummary.totalCash || 0), color: 'text-blue-600', bg: 'bg-blue-50', icon: Activity },
                  { label: 'Online Collections', value: fmt(emiSummary.totalOnline || 0), color: 'text-violet-600', bg: 'bg-violet-50', icon: Zap },
                  { label: 'Cheque Collections', value: fmt(emiSummary.totalCheque || 0), color: 'text-amber-600', bg: 'bg-amber-50', icon: FileText },
                ].map(k => (
                  <KPICard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} bg={k.bg} />
                ))}
              </div>
            )}

            {/* Month-wise Collection Bar Chart — Cash / Online / Cheque */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  Month-wise EMI Collection — By Payment Mode (₹)
                </CardTitle>
                <CardDescription>Cash vs Online vs Cheque collections over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {emiCollection.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={emiCollection} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                      <Tooltip content={<CT />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="cash" name="Cash" stackId="a" fill={P.green} />
                      <Bar dataKey="online" name="Online" stackId="a" fill={P.blue} />
                      <Bar dataKey="cheque" name="Cheque" stackId="a" fill={P.amber} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No EMI payment data yet. Collections will appear here once payments are recorded.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collection Trend — Area Chart */}
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Monthly Collection Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={emiCollection} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gEmiTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={P.green} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={P.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                      <Tooltip content={<CT />} />
                      <Area type="monotone" dataKey="total" name="Total Collected" stroke={P.green}
                        fill="url(#gEmiTotal)" strokeWidth={2.5} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Percent className="h-4 w-4 text-violet-600" />
                    Collection by Mode (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={emiCollection} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
                      <YAxis dataKey="month" type="category" tick={{ fontSize: 10 }} width={50} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="cash" name="Cash" fill={P.green} stackId="b" />
                      <Bar dataKey="online" name="Online" fill={P.blue} stackId="b" />
                      <Bar dataKey="cheque" name="Cheque" fill={P.amber} stackId="b" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* EMI Collection Detail Table */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  Month-wise EMI Collection Table
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {emiCollection.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="py-2 px-3 text-left font-semibold text-gray-600">Month</th>
                        <th className="py-2 px-3 text-right font-semibold text-blue-600">EMIs Paid</th>
                        <th className="py-2 px-3 text-right font-semibold text-green-600">Cash (₹)</th>
                        <th className="py-2 px-3 text-right font-semibold text-violet-600">Online (₹)</th>
                        <th className="py-2 px-3 text-right font-semibold text-amber-600">Cheque (₹)</th>
                        <th className="py-2 px-3 text-right font-semibold text-emerald-600">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...emiCollection].reverse().map((r, i) => (
                        <tr key={r.month} className={`border-b last:border-0 hover:bg-gray-50 ${i === 0 ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-2 px-3 font-semibold text-gray-700">
                            {r.month} {i === 0 && <Badge className="ml-1 text-[9px] bg-indigo-100 text-indigo-600">Current</Badge>}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-blue-600">{r.count || 0}</td>
                          <td className="py-2 px-3 text-right text-green-600">{fmt(r.cash || 0)}</td>
                          <td className="py-2 px-3 text-right text-violet-600">{fmt(r.online || 0)}</td>
                          <td className="py-2 px-3 text-right text-amber-600">{fmt(r.cheque || 0)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{fmt(r.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-gray-400 py-8 text-sm">No payment records found yet.</p>
                )}
              </CardContent>
            </Card>
          </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 3 — YEARLY
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="yearly" className="space-y-5 mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Year-wise Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="applications" name="Applications" fill={P.blue}  radius={[4,4,0,0]} />
                    <Bar dataKey="disbursed"    name="Disbursed"    fill={P.green} radius={[4,4,0,0]} />
                    <Bar dataKey="rejected"     name="Rejected"     fill={P.red}   radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Year-wise Business Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gYear" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={P.violet} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={P.violet} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                    <Tooltip content={<CT />} />
                    <Area type="monotone" dataKey="amount" name="Disbursement (₹)" stroke={P.violet} fill="url(#gYear)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Yearly summary table */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Year-wise Growth Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {['Year','Applications','Disbursed','Rejected','Customers','Volume','Conv.%','YoY Growth'].map(h => (
                      <th key={h} className="py-2 px-3 text-right first:text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((row, i) => {
                    const prev = yearlyData[i - 1];
                    const yoy = prev
                      ? ((row.applications - prev.applications) / Math.max(prev.applications, 1) * 100).toFixed(1)
                      : null;
                    return (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3 font-bold text-gray-800">{row.year}</td>
                        <td className="py-2 px-3 text-right text-blue-600 font-semibold">{row.applications}</td>
                        <td className="py-2 px-3 text-right text-green-600 font-semibold">{row.disbursed}</td>
                        <td className="py-2 px-3 text-right text-red-500">{row.rejected}</td>
                        <td className="py-2 px-3 text-right text-purple-600">{row.customers}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(row.amount)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{row.convRate}%</td>
                        <td className="py-2 px-3 text-right">
                          {yoy ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${parseFloat(yoy) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                              {parseFloat(yoy) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(yoy))}%
                            </span>
                          ) : <span className="text-gray-400 text-xs">Base</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Marketing Insights */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-indigo-600 to-blue-700 text-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="h-5 w-5" />
                Marketing Insights — Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: Users, title: 'Referral Engine', desc: `Leverage your ${activeLoans.length} active customers. Offer ₹500 EMI cashback for every referred loan that gets approved.` },
                  { icon: BarChart3, title: 'Seasonal Campaigns', desc: `Your peak month is ${bestMonth?.month} (${bestMonth?.applications} apps). Plan digital campaigns 4 weeks before to maximise pipeline.` },
                  { icon: TrendingUp, title: 'Reduce Rejections', desc: `${rejectedLoans.length} loans rejected (${rejectionRate.toFixed(1)}%). Targeted pre-screening tools can cut this by 30%.` },
                ].map(tip => (
                  <div key={tip.title} className="bg-white/10 border border-white/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <tip.icon className="h-4 w-4" />
                      <h4 className="font-bold text-sm">{tip.title}</h4>
                    </div>
                    <p className="text-xs text-blue-100">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 4 — DISTRIBUTION
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="distribution" className="space-y-5 mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Loan Type Donut */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-purple-600" />
                  Loan Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <RePieChart>
                    <Pie data={loanTypeData} cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {loanTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
                {/* Loan type detail rows */}
                <div className="mt-3 space-y-1.5">
                  {loanTypeData.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600">{t.name}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-semibold text-gray-700">{t.value} loans</span>
                        <span className="text-gray-400">{fmt(t.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Company Distribution */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Company-wise Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={companyData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="value" name="Loans" radius={[0,4,4,0]}>
                      {companyData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status breakdown grid */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Application Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Total Applied',    count: loans.length,              fill: P.blue,   bg: 'bg-blue-50' },
                  { label: 'In Progress',      count: inProgressLoans.length,    fill: P.amber,  bg: 'bg-amber-50' },
                  { label: 'Pending SA',       count: pendingForSA.length,       fill: P.cyan,   bg: 'bg-cyan-50' },
                  { label: 'Pending Final',    count: pendingForFinal.length,     fill: P.indigo, bg: 'bg-indigo-50' },
                  { label: 'Active / Live',    count: activeLoans.length,        fill: P.green,  bg: 'bg-green-50' },
                  { label: 'Rejected',         count: rejectedLoans.length,      fill: P.red,    bg: 'bg-red-50' },
                ].map(s => (
                  <div key={s.label} className={`p-4 rounded-xl ${s.bg} border`} style={{ borderColor: s.fill + '30' }}>
                    <div className="text-2xl font-bold" style={{ color: s.fill }}>{s.count}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    <div className="text-xs font-medium mt-0.5" style={{ color: s.fill }}>
                      {pct(s.count, loans.length)}% of all
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-white/60 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${pct(s.count, loans.length)}%`,
                        background: s.fill
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Months */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Top 5 Performing Months
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[...monthlyData].sort((a, b) => b.applications - a.applications).slice(0, 5).map((m, i) => (
                  <div key={m.month} className={`flex-1 min-w-[130px] p-4 rounded-xl border transition-all ${
                    i === 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300' : 'bg-gray-50 border-gray-100'
                  }`}>
                    {i === 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 mb-1">🏆 Best</Badge>}
                    <p className="font-bold text-gray-800 text-lg">{m.month}</p>
                    <p className="text-xs text-blue-600 font-semibold">{m.applications} Applications</p>
                    <p className="text-xs text-green-600">{m.disbursed} Disbursed</p>
                    <p className="text-xs text-gray-500">{fmt(m.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 5 — RISK & HEALTH
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="risk" className="space-y-5 mt-4">
          {/* Risk KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'High Risk Loans',   value: highRiskLoans.length,    color: 'text-red-600',    bg: 'bg-red-50',    icon: AlertTriangle, sub: `${pct(highRiskLoans.length, loans.length)}% of portfolio` },
              { label: 'Rejection Rate',    value: `${rejectionRate.toFixed(1)}%`, color: 'text-orange-600', bg: 'bg-orange-50', icon: TrendingDown, sub: `${rejectedLoans.length} total rejections` },
              { label: 'Pending SA Review', value: pendingForSA.length,     color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Clock, sub: 'Awaiting super admin' },
              { label: 'Active Portfolio',  value: fmt(activeLoans.reduce((s,l)=>s+(l.disbursedAmount||l.requestedAmount||0),0)), color: 'text-green-600', bg: 'bg-green-50', icon: Shield, sub: 'Performing assets' },
            ].map(k => (
              <KPICard key={k.label} label={k.label} value={k.value} sub={k.sub}
                icon={k.icon} color={k.color} bg={k.bg} />
            ))}
          </div>

          {/* Rejection reasons pie placeholder + Risk by loan type */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Risk Distribution by Loan Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loanTypeData.map((t, i) => {
                    const typeLoans = loans.filter(l => (l.loanType || 'Personal') === t.name);
                    const typeRejected = typeLoans.filter(l => l.status.includes('REJECTED'));
                    const riskPct = parseFloat(pct(typeRejected.length, typeLoans.length));
                    return (
                      <div key={t.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{t.name}</span>
                          <span className={riskPct > 30 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                            {riskPct}% rejection
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${riskPct > 30 ? 'bg-red-400' : riskPct > 15 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${riskPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Monthly rejection trend */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Monthly Rejection Trend
                </CardTitle>
                <CardDescription>Rejections over last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="rejected" name="Rejected" fill={P.red} opacity={0.7} radius={[4,4,0,0]} />
                    <Line type="monotone" dataKey="applications" name="Applications" stroke={P.blue} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio health summary */}
          <Card className="border border-blue-100 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-700" />
                Portfolio Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                {[
                  {
                    label: 'Approval Health',
                    score: approvalRate,
                    color: approvalRate > 70 ? 'text-green-600' : approvalRate > 40 ? 'text-amber-600' : 'text-red-500',
                    status: approvalRate > 70 ? '✅ Excellent' : approvalRate > 40 ? '⚠️ Moderate' : '🔴 Poor',
                  },
                  {
                    label: 'Rejection Control',
                    score: 100 - rejectionRate,
                    color: rejectionRate < 20 ? 'text-green-600' : rejectionRate < 40 ? 'text-amber-600' : 'text-red-500',
                    status: rejectionRate < 20 ? '✅ Excellent' : rejectionRate < 40 ? '⚠️ Moderate' : '🔴 High',
                  },
                  {
                    label: 'Portfolio Risk',
                    score: 100 - parseFloat(pct(highRiskLoans.length, Math.max(loans.length, 1))),
                    color: highRiskLoans.length < 3 ? 'text-green-600' : highRiskLoans.length < 10 ? 'text-amber-600' : 'text-red-500',
                    status: highRiskLoans.length < 3 ? '✅ Low Risk' : highRiskLoans.length < 10 ? '⚠️ Moderate' : '🔴 High Risk',
                  },
                ].map(s => (
                  <div key={s.label} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className={`text-3xl font-bold ${s.color}`}>{s.score.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
                    <div className="text-xs mt-1">{s.status}</div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.score > 70 ? 'bg-green-400' : s.score > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══ MONTH COMPARISON TAB CONTENT (outside Tabs to avoid nested Tabs issues) ══ */}
      {tab === 'comparison' && (() => {
        const monthsCount = comparisonMode === '1M' ? 1 : comparisonMode === '3M' ? 3 : 6;
        const now = new Date();

        // Current period: last N months ending this month
        const currentPeriod = Array.from({ length: monthsCount }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - i), 1);
          const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          const ml = loans.filter(l => { const c = new Date(l.createdAt); return c >= d && c < next; });
          const disb = ml.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
          return {
            month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            applications: ml.length,
            disbursed: disb.length,
            amount: disb.reduce((s, l) => s + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount || 0), 0),
            convRate: ml.length > 0 ? parseFloat(((disb.length / ml.length) * 100).toFixed(1)) : 0,
          };
        });

        // Previous period: N months before current period
        const prevPeriod = Array.from({ length: monthsCount }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (monthsCount * 2 - 1 - i), 1);
          const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          const ml = loans.filter(l => { const c = new Date(l.createdAt); return c >= d && c < next; });
          const disb = ml.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
          return {
            month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            applications: ml.length,
            disbursed: disb.length,
            amount: disb.reduce((s, l) => s + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount || 0), 0),
            convRate: ml.length > 0 ? parseFloat(((disb.length / ml.length) * 100).toFixed(1)) : 0,
          };
        });

        // Aggregate totals for KPI comparison
        const curTotals = { apps: currentPeriod.reduce((s,m) => s+m.applications,0), disb: currentPeriod.reduce((s,m) => s+m.disbursed,0), amount: currentPeriod.reduce((s,m) => s+m.amount,0) };
        const prevTotals = { apps: prevPeriod.reduce((s,m) => s+m.applications,0), disb: prevPeriod.reduce((s,m) => s+m.disbursed,0), amount: prevPeriod.reduce((s,m) => s+m.amount,0) };

        const delta = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(1) : cur > 0 ? '+∞' : '0';
        const isUp = (cur: number, prev: number) => cur >= prev;

        // Merge data for side-by-side chart
        const chartData = Array.from({ length: monthsCount }, (_, i) => ({
          index: `#${i + 1}`,
          'Current Apps': currentPeriod[i].applications,
          'Prev Apps': prevPeriod[i].applications,
          'Current Disb': currentPeriod[i].disbursed,
          'Prev Disb': prevPeriod[i].disbursed,
          'Current Amt': currentPeriod[i].amount,
          'Prev Amt': prevPeriod[i].amount,
        }));

        return (
          <div className="space-y-5 mt-4">
            {/* Period Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">📊 Compare Period:</span>
              {(['1M', '3M', '6M'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setComparisonMode(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    comparisonMode === m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {m === '1M' ? 'Last Month vs This Month' : m === '3M' ? 'Last 3M vs This 3M' : 'Last 6M vs This 6M'}
                </button>
              ))}
            </div>

            {/* KPI Delta Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Applications', cur: curTotals.apps, prev: prevTotals.apps, fmt: (v: number) => v.toString() },
                { label: 'Disbursed Loans', cur: curTotals.disb, prev: prevTotals.disb, fmt: (v: number) => v.toString() },
                { label: 'Disbursement Volume', cur: curTotals.amount, prev: prevTotals.amount, fmt },
              ].map(k => {
                const up = isUp(k.cur, k.prev);
                const d = delta(k.cur, k.prev);
                return (
                  <Card key={k.label} className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-bold text-gray-800">{k.fmt(k.cur)}</span>
                        <span className={`text-xs font-semibold mb-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
                          {up ? '▲' : '▼'} {d}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">vs {k.fmt(k.prev)} prev period</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Side-by-side Applications + Disbursed Comparison */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Applications & Disbursements — Current vs Previous
                </CardTitle>
                <CardDescription>
                  Current period ({currentPeriod.map(m => m.month).join(', ')}) vs Previous ({prevPeriod.map(m => m.month).join(', ')})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Current Apps" fill={P.blue} radius={[4,4,0,0]} />
                    <Bar dataKey="Prev Apps" fill={`${P.blue}60`} radius={[4,4,0,0]} />
                    <Bar dataKey="Current Disb" fill={P.green} radius={[4,4,0,0]} />
                    <Bar dataKey="Prev Disb" fill={`${P.green}60`} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Disbursement Volume Comparison */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  Disbursement Volume (₹) — Current vs Previous
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Current Amt" name="Current Volume" fill={P.violet} radius={[4,4,0,0]} />
                    <Bar dataKey="Prev Amt" name="Previous Volume" fill={`${P.violet}60`} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detail Table */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  Month-by-Month Detail Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">Metric</th>
                      {currentPeriod.map(m => <th key={`c-${m.month}`} className="py-2 px-3 text-right font-semibold text-indigo-600">Current: {m.month}</th>)}
                      {prevPeriod.map(m => <th key={`p-${m.month}`} className="py-2 px-3 text-right font-semibold text-gray-400">Prev: {m.month}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {['Applications', 'Disbursed', 'Volume (₹)', 'Conv %'].map(metric => (
                      <tr key={metric} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3 font-semibold text-gray-700">{metric}</td>
                        {currentPeriod.map((m, i) => (
                          <td key={`c${i}`} className="py-2 px-3 text-right font-medium text-indigo-700">
                            {metric === 'Applications' ? m.applications : metric === 'Disbursed' ? m.disbursed : metric === 'Volume (₹)' ? fmt(m.amount) : `${m.convRate}%`}
                          </td>
                        ))}
                        {prevPeriod.map((m, i) => (
                          <td key={`p${i}`} className="py-2 px-3 text-right text-gray-500">
                            {metric === 'Applications' ? m.applications : metric === 'Disbursed' ? m.disbursed : metric === 'Volume (₹)' ? fmt(m.amount) : `${m.convRate}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════
          TAB — AGENT ANALYTICS (rendered outside <Tabs>, same pattern as comparison)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'agents' && (<div className="space-y-5">
          {agentLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-500">Loading agent analytics...</span>
            </div>
          ) : !agentData ? (
            <Card><CardContent className="p-10 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No agent data found. Switch to this tab to load.</p>
            </CardContent></Card>
          ) : (() => {
            const agents: any[] = agentData.agents || [];
            const labels = agentData.summary?.periodLabels || {};

            // Sort agents
            const sorted = [...agents].sort((a, b) => {
              if (agentSort === 'disbursed') return b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed;
              if (agentSort === 'apps')      return b.periods.lastMonth.apps - a.periods.lastMonth.apps;
              if (agentSort === 'amount')    return b.periods.lastMonth.amount - a.periods.lastMonth.amount;
              if (agentSort === 'growth')    return b.growthScore - a.growthScore;
              return 0;
            });

            const sel = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

            // Period columns definition
            const cols = [
              { key: 'threeMonthsAgo', label: labels.threeMonthsAgo || '-3M',  bg: 'bg-gray-50',    text: 'text-gray-600' },
              { key: 'twoMonthsAgo',   label: labels.twoMonthsAgo   || '-2M',  bg: 'bg-orange-50',  text: 'text-orange-600' },
              { key: 'lastMonth',      label: labels.lastMonth      || 'Last',  bg: 'bg-blue-50',    text: 'text-blue-700' },
              { key: 'current',        label: labels.current        || 'Now',   bg: 'bg-emerald-50', text: 'text-emerald-700' },
            ];

            return (
              <div className="space-y-5">
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Total Agents"  value={agentData.summary.totalAgents}  icon={Users}     color="text-indigo-600" bg="bg-indigo-50" />
                  <KPICard label="Active Agents" value={agentData.summary.activeAgents} icon={UserCheck}  color="text-emerald-600" bg="bg-emerald-50" />
                  <KPICard label="Top This Month"
                    value={agentData.summary.topPerformers?.[0]?.name?.split(' ')?.[0] || '—'}
                    sub={`${agentData.summary.topPerformers?.[0]?.periods?.lastMonth?.disbursed || 0} disbursed`}
                    icon={Medal} color="text-amber-600" bg="bg-amber-50" />
                  <KPICard label="Growing Agents"
                    value={agents.filter(a => a.isGrowing).length}
                    sub={`of ${agents.length} agents`}
                    icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                </div>

                {/* Sort Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Sort by last month:</span>
                  {(['disbursed', 'apps', 'amount', 'growth'] as const).map(s => (
                    <button key={s} onClick={() => setAgentSort(s)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                        agentSort === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}>
                      {s === 'disbursed' ? '🏆 Disbursed' : s === 'apps' ? '📋 Applications' : s === 'amount' ? '💰 Volume' : '📈 Growth'}
                    </button>
                  ))}
                </div>

                {/* Agent Leaderboard Table with 4-period comparison */}
                <Card className="border border-gray-100 shadow-sm overflow-hidden">
                  <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                      Agent Performance — 4-Month Comparison
                    </CardTitle>
                    <CardDescription>Click any agent row to see detailed trend analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs min-w-[900px]">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="py-3 px-3 text-left font-semibold text-gray-600 w-8">#</th>
                          <th className="py-3 px-3 text-left font-semibold text-gray-600">Agent</th>
                          {cols.map(c => (
                            <th key={c.key} className={`py-3 px-2 text-center font-semibold ${c.text} border-l border-gray-100`} colSpan={3}>
                              {c.label}
                            </th>
                          ))}
                          <th className="py-3 px-3 text-center font-semibold text-purple-600 border-l border-gray-100">Growth</th>
                          <th className="py-3 px-3 text-center font-semibold text-teal-600 border-l border-gray-100">Trend</th>
                        </tr>
                        <tr className="border-b bg-gray-50/50 text-[10px]">
                          <th /><th />
                          {cols.map(c => (
                            <>
                              <th key={`${c.key}-a`} className="py-1 px-2 text-center text-blue-500 border-l border-gray-100">Apps</th>
                              <th key={`${c.key}-d`} className="py-1 px-2 text-center text-green-600">Disb</th>
                              <th key={`${c.key}-v`} className="py-1 px-2 text-center text-violet-500">Vol</th>
                            </>
                          ))}
                          <th className="border-l border-gray-100" />
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.length === 0 ? (
                          <tr><td colSpan={15} className="text-center py-10 text-gray-400">No agents found</td></tr>
                        ) : sorted.map((agent, idx) => {
                          const isSelected = selectedAgent === agent.id;
                          const momPct = agent.momentum;
                          const growing = agent.isGrowing;
                          return (
                            <>
                              <tr key={agent.id}
                                className={`border-b hover:bg-indigo-50/30 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : idx < 3 ? 'bg-amber-50/20' : ''
                                }`}
                                onClick={() => setSelectedAgent(isSelected ? '' : agent.id)}>
                                <td className="py-2.5 px-3 font-bold text-gray-400">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-gray-800">{agent.name}</div>
                                  <div className="text-gray-400 text-[10px]">{agent.phone}</div>
                                </td>
                                {cols.map(c => {
                                  const p = agent.periods[c.key];
                                  return (
                                    <>
                                      <td key={`${agent.id}-${c.key}-a`} className={`py-2.5 px-2 text-center font-medium text-blue-600 border-l border-gray-100 ${c.bg}`}>{p.apps}</td>
                                      <td key={`${agent.id}-${c.key}-d`} className={`py-2.5 px-2 text-center font-bold text-green-700 ${c.bg}`}>{p.disbursed}</td>
                                      <td key={`${agent.id}-${c.key}-v`} className={`py-2.5 px-2 text-center text-violet-600 ${c.bg}`}>{fmt(p.amount)}</td>
                                    </>
                                  );
                                })}
                                <td className="py-2.5 px-3 text-center border-l border-gray-100">
                                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                                    growing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                  }`}>
                                    {growing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    {Math.abs(momPct)}%
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 border-l border-gray-100">
                                  {/* Mini bar sparkline */}
                                  <div className="flex items-end gap-0.5 h-6 justify-center">
                                    {agent.trend.map((t: any, ti: number) => {
                                      const maxD = Math.max(...agent.trend.map((x: any) => x.disbursed), 1);
                                      const h = Math.max(2, Math.round((t.disbursed / maxD) * 22));
                                      return (
                                        <div key={ti} title={`${t.label}: ${t.disbursed} disbursed`}
                                          style={{ height: `${h}px`, width: '8px' }}
                                          className={`rounded-t transition-all ${
                                            ti === 3 ? 'bg-indigo-500' :
                                            ti === 2 ? 'bg-blue-400' :
                                            ti === 1 ? 'bg-blue-300' : 'bg-gray-300'
                                          }`} />
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded detail row */}
                              {isSelected && (
                                <tr key={`${agent.id}-detail`} className="bg-indigo-50/40 border-b border-indigo-100">
                                  <td colSpan={15} className="px-4 py-4">
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <UserCheck className="h-4 w-4 text-indigo-600" />
                                        <span className="font-bold text-indigo-700">{agent.name} — Detailed Growth Analysis</span>
                                        {agent.isGrowing
                                          ? <Badge className="bg-green-100 text-green-700 text-[10px]">📈 Growing</Badge>
                                          : <Badge className="bg-red-100 text-red-600 text-[10px]">📉 Declining</Badge>}
                                      </div>

                                      {/* 4-period visual bars */}
                                      <div className="grid grid-cols-4 gap-3">
                                        {cols.map((c, ci) => {
                                          const p = agent.periods[c.key];
                                          return (
                                            <div key={c.key} className={`rounded-xl p-3 border ${c.bg} border-gray-100`}>
                                              <div className={`text-[10px] font-bold ${c.text} mb-2`}>{c.label}</div>
                                              <div className="space-y-1">
                                                <div className="flex justify-between">
                                                  <span className="text-[10px] text-gray-500">Applications</span>
                                                  <span className="font-bold text-blue-700">{p.apps}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[10px] text-gray-500">Disbursed</span>
                                                  <span className="font-bold text-green-700">{p.disbursed}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[10px] text-gray-500">Rejected</span>
                                                  <span className="font-medium text-red-500">{p.rejected}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[10px] text-gray-500">Volume</span>
                                                  <span className="font-bold text-violet-700">{fmt(p.amount)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[10px] text-gray-500">Conv. Rate</span>
                                                  <span className={`font-bold ${p.convRate >= 60 ? 'text-emerald-600' : p.convRate >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
                                                    {p.convRate}%
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Growth insight */}
                                      <div className={`rounded-xl p-3 border text-xs ${
                                        agent.isGrowing ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                                      }`}>
                                        {agent.isGrowing
                                          ? `✅ ${agent.name} is on a growth trajectory. Last month: ${agent.periods.lastMonth.disbursed} disbursed. Projected this month: ~${agent.currentProjected} (${agent.momentum > 0 ? '+' : ''}${agent.momentum}% vs last month).`
                                          : `⚠️ ${agent.name} showing decline. Last month: ${agent.periods.lastMonth.disbursed} disbursed vs ${agent.periods.twoMonthsAgo.disbursed} two months ago. Needs coaching or support.`
                                        }
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Bar-chart: Last month comparison across all agents */}
                {agents.length > 0 && (
                  <Card className="border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        Agent Head-to-Head — Last Month Disbursements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={Math.max(180, agents.length * 38)}>
                        <BarChart
                          data={[...agents]
                            .sort((a, b) => b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed)
                            .map(a => ({
                              name: a.name.split(' ')[0],
                              Disbursed: a.periods.lastMonth.disbursed,
                              Applications: a.periods.lastMonth.apps,
                              Volume: a.periods.lastMonth.amount,
                            }))}
                          layout="vertical"
                          margin={{ top: 5, right: 40, left: 60, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
                          <Tooltip content={<CT />} />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Applications" fill={P.blue}  radius={[0, 3, 3, 0]} />
                          <Bar dataKey="Disbursed"    fill={P.green} radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Growth trend chart: top 5 agents, 4 periods */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Top 5 Agents — 4-Month Disbursement Growth
                    </CardTitle>
                    <CardDescription>How each top agent has grown (or declined) across periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const top5 = [...agents]
                        .sort((a, b) => b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed)
                        .slice(0, 5);
                      const chartData = cols.map((c, ci) => {
                        const row: any = { period: c.label };
                        top5.forEach(a => { row[a.name.split(' ')[0]] = a.periods[c.key].disbursed; });
                        return row;
                      });
                      const agentColors = [P.blue, P.green, P.violet, P.amber, P.pink];
                      return (
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip content={<CT />} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            {top5.map((a, i) => (
                              <Line key={a.id}
                                type="monotone"
                                dataKey={a.name.split(' ')[0]}
                                stroke={agentColors[i]}
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: agentColors[i] }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
      </div>)}

    </div>
  );
}

export default memo(AnalyticsSection);
