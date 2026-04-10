'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, DollarSign, CheckCircle, Wallet, BarChart3,
  PieChart, Activity, FileText, Users, Calendar, ArrowUpRight, ArrowDownRight, Target, Zap
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar
} from 'recharts';

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

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-medium">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function AnalyticsSection({
  loans, activeLoans, inProgressLoans, pendingForSA, pendingForFinal,
  rejectedLoans, highRiskLoans, totalRequested, totalDisbursed
}: Props) {
  const [analyticsTab, setAnalyticsTab] = useState('overview');

  const conversionRate = loans.length > 0 ? ((activeLoans.length / loans.length) * 100).toFixed(1) : '0';
  const avgLoanAmount = loans.length > 0 ? Math.round(totalRequested / loans.length) : 0;
  const approvalRate = loans.length > 0 ? (((activeLoans.length + inProgressLoans.length) / loans.length) * 100).toFixed(1) : '0';
  const rejectionRate = loans.length > 0 ? ((rejectedLoans.length / loans.length) * 100).toFixed(1) : '0';

  // Monthly trend data — last 12 months
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; fullDate: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        fullDate: d
      });
    }

    return months.map(({ month, fullDate }) => {
      const nextMonth = new Date(fullDate.getFullYear(), fullDate.getMonth() + 1, 1);
      const monthLoans = loans.filter(l => {
        const d = new Date(l.createdAt);
        return d >= fullDate && d < nextMonth;
      });
      const disbursed = monthLoans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
      const rejected = monthLoans.filter(l => l.status.includes('REJECTED'));
      const disbursedAmount = disbursed.reduce((s, l) => s + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount || 0), 0);
      return {
        month,
        applications: monthLoans.length,
        disbursed: disbursed.length,
        rejected: rejected.length,
        amount: disbursedAmount,
        customers: new Set(monthLoans.map(l => l.customer?.id).filter(Boolean)).size
      };
    });
  }, [loans]);

  // Yearly data
  const yearlyData = useMemo(() => {
    const years = new Set(loans.map(l => new Date(l.createdAt).getFullYear()));
    return Array.from(years).sort().map(year => {
      const yearLoans = loans.filter(l => new Date(l.createdAt).getFullYear() === year);
      const disbursed = yearLoans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
      const amount = disbursed.reduce((s, l) => s + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount || 0), 0);
      return {
        year: String(year),
        applications: yearLoans.length,
        disbursed: disbursed.length,
        rejected: yearLoans.filter(l => l.status.includes('REJECTED')).length,
        amount,
        customers: new Set(yearLoans.map(l => l.customer?.id).filter(Boolean)).size
      };
    });
  }, [loans]);

  // Loan type pie data
  const loanTypeData = useMemo(() => {
    const byType: Record<string, number> = {};
    loans.forEach(l => { const t = l.loanType || 'Other'; byType[t] = (byType[t] || 0) + 1; });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [loans]);

  // Status funnel
  const statusData = [
    { name: 'Applied', value: loans.length, fill: '#3b82f6' },
    { name: 'In Progress', value: inProgressLoans.length, fill: '#f59e0b' },
    { name: 'Pending Final', value: pendingForFinal.length, fill: '#06b6d4' },
    { name: 'Active', value: activeLoans.length, fill: '#10b981' },
    { name: 'Rejected', value: rejectedLoans.length, fill: '#ef4444' },
  ];

  // Growth trend (month-over-month)
  const currentMonthApps = monthlyData[monthlyData.length - 1]?.applications || 0;
  const lastMonthApps = monthlyData[monthlyData.length - 2]?.applications || 0;
  const growth = lastMonthApps > 0 ? (((currentMonthApps - lastMonthApps) / lastMonthApps) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: loans.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', change: `+${growth}% MoM` },
          { label: 'Approval Rate', value: `${approvalRate}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', change: `${rejectionRate}% rejected` },
          { label: 'Total Disbursed', value: formatCurrency(totalDisbursed), icon: Wallet, color: 'text-violet-600', bg: 'bg-violet-50', change: `${activeLoans.length} active` },
          { label: 'Avg Loan Size', value: formatCurrency(avgLoanAmount), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', change: `${conversionRate}% conversion` },
        ].map(item => (
          <Card key={item.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <Badge variant="outline" className="text-xs font-normal text-gray-500">{item.change}</Badge>
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview">📊 Monthly</TabsTrigger>
          <TabsTrigger value="yearly">📅 Yearly</TabsTrigger>
          <TabsTrigger value="distribution">🥧 Distribution</TabsTrigger>
        </TabsList>

        {/* Monthly Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Applications Area Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Monthly Applications vs Disbursements
                </CardTitle>
                <CardDescription>12-month rolling view</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="disbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="applications" name="Applications" stroke="#3b82f6" fill="url(#appGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="disbursed" name="Disbursed" stroke="#10b981" fill="url(#disbGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Amount Bar Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Monthly Disbursement Amount
                </CardTitle>
                <CardDescription>Amount disbursed per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Amount Disbursed" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {monthlyData.map((_, i) => (
                        <Cell key={i} fill={i === monthlyData.length - 1 ? '#059669' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Growth Line */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Customer Growth
                </CardTitle>
                <CardDescription>New customers per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="customers" name="New Customers" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Application Pipeline */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  Current Pipeline Status
                </CardTitle>
                <CardDescription>Live application funnel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                      {statusData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Yearly Tab */}
        <TabsContent value="yearly" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Year-wise Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="applications" name="Applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="disbursed" name="Disbursed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Year-wise Business Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 10000000 ? `${(v/10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v/100000).toFixed(1)}L` : `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" name="Disbursement Amount" stroke="#8b5cf6" fill="url(#yearGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Yearly summary table */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Year-wise Growth Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium">Year</th>
                        <th className="pb-2 font-medium text-right">Applications</th>
                        <th className="pb-2 font-medium text-right">Disbursed</th>
                        <th className="pb-2 font-medium text-right">Rejected</th>
                        <th className="pb-2 font-medium text-right">Customers</th>
                        <th className="pb-2 font-medium text-right">Volume</th>
                        <th className="pb-2 font-medium text-right">Conv. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.map((row, i) => {
                        const prevRow = yearlyData[i - 1];
                        const growth = prevRow ? ((row.applications - prevRow.applications) / Math.max(prevRow.applications, 1) * 100).toFixed(1) : null;
                        return (
                          <tr key={row.year} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 font-semibold flex items-center gap-2">
                              {row.year}
                              {growth && (<span className={`text-xs px-1.5 py-0.5 rounded-full ${parseFloat(growth) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {parseFloat(growth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growth))}%
                              </span>)}
                            </td>
                            <td className="py-2 text-right text-blue-600 font-medium">{row.applications}</td>
                            <td className="py-2 text-right text-green-600 font-medium">{row.disbursed}</td>
                            <td className="py-2 text-right text-red-500">{row.rejected}</td>
                            <td className="py-2 text-right text-purple-600">{row.customers}</td>
                            <td className="py-2 text-right font-medium">{formatCurrency(row.amount)}</td>
                            <td className="py-2 text-right text-emerald-600">{row.applications > 0 ? ((row.disbursed / row.applications) * 100).toFixed(1) : 0}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Loan Type Pie */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-purple-600" />
                  Loan Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RePieChart>
                    <Pie data={loanTypeData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {loanTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Radial */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Application Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Applied', count: loans.length, color: 'bg-blue-500', text: 'text-blue-600' },
                    { label: 'In Progress', count: inProgressLoans.length, color: 'bg-amber-500', text: 'text-amber-600' },
                    { label: 'Awaiting Final', count: pendingForFinal.length, color: 'bg-cyan-500', text: 'text-cyan-600' },
                    { label: 'Active Loans', count: activeLoans.length, color: 'bg-green-500', text: 'text-green-600' },
                    { label: 'Rejected', count: rejectedLoans.length, color: 'bg-red-500', text: 'text-red-600' },
                    { label: 'High Risk', count: highRiskLoans.length, color: 'bg-orange-500', text: 'text-orange-600' },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-xs text-gray-500">{item.label}</span>
                      </div>
                      <p className={`text-2xl font-bold ${item.text}`}>{item.count}</p>
                      <p className="text-xs text-gray-400">{loans.length > 0 ? ((item.count / loans.length) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Peak month analysis */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Best Performing Months (by Applications)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...monthlyData]
                    .sort((a, b) => b.applications - a.applications)
                    .slice(0, 4)
                    .map((m, i) => (
                      <div key={m.month} className={`p-3 rounded-xl border ${i === 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                        {i === 0 && <Badge className="bg-emerald-100 text-emerald-700 text-xs mb-1">🏆 Best Month</Badge>}
                        <p className="font-bold text-lg text-gray-800">{m.month}</p>
                        <p className="text-sm text-blue-600 font-medium">{m.applications} Apps</p>
                        <p className="text-xs text-green-600">{m.disbursed} Disbursed</p>
                        <p className="text-xs text-gray-500">{formatCurrency(m.amount)}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(AnalyticsSection);
