'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Sun, RefreshCw, IndianRupee, Building2, 
  ArrowDownRight, History, Loader2, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TodayCreditPanelProps {
  userRole?: string;
  userId?: string;
  className?: string;
}

export default function TodayCreditPanel({ userRole, userId, className = '' }: TodayCreditPanelProps) {
  const [todayCreditDate, setTodayCreditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [todayCreditData, setTodayCreditData] = useState<any>(null);
  const [todayCreditLoading, setTodayCreditLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [dateRangeMode, setDateRangeMode] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchTodayCredit = useCallback(async (date?: string, start?: string, end?: string) => {
    setTodayCreditLoading(true);
    try {
      const url = (start && end)
        ? `/api/credit/today-credit?startDate=${start}&endDate=${end}`
        : `/api/credit/today-credit?date=${date || todayCreditDate}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d.success) {
        setTodayCreditData(d);
      }
    } catch (error) {
      console.error('[TodayCreditPanel] Fetch error:', error);
    } finally {
      setTodayCreditLoading(false);
    }
  }, [todayCreditDate]);

  // Initial load
  useEffect(() => {
    fetchTodayCredit(todayCreditDate);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { className: string; label: string }> = {
      SUPER_ADMIN: { className: 'bg-purple-100 text-purple-700 border-0', label: 'Super Admin' },
      COMPANY: { className: 'bg-blue-100 text-blue-700 border-0', label: 'Company' },
      AGENT: { className: 'bg-emerald-100 text-emerald-700 border-0', label: 'Agent' },
      STAFF: { className: 'bg-amber-100 text-amber-700 border-0', label: 'Staff' },
      CASHIER: { className: 'bg-cyan-100 text-cyan-700 border-0', label: 'Cashier' },
      ACCOUNTANT: { className: 'bg-violet-100 text-violet-700 border-0', label: 'Accountant' },
      CUSTOMER: { className: 'bg-gray-100 text-gray-700 border-0', label: 'Customer' }
    };
    const { className, label } = config[role] || { className: 'bg-gray-100 text-gray-700 border-0', label: role };
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <Card className={`border shadow-sm bg-white rounded-2xl overflow-hidden ${className}`}>
      <CardHeader className="pb-4 border-b border-gray-100/80 bg-gray-50/50">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Sun className="h-5 w-5 text-amber-500 animate-pulse" />
              {dateRangeMode ? 'Credit Collection by Date Range' : 'Today Credit collections'}
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Live tracking of credit increases per user with per-company breakdowns
            </CardDescription>
          </div>
          
          {/* Date Range controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setDateRangeMode(!dateRangeMode)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                dateRangeMode 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {dateRangeMode ? '📅 Range Mode' : '📅 Single Date'}
            </button>
            
            {dateRangeMode ? (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={e => { 
                    setStartDate(e.target.value); 
                    fetchTodayCredit(undefined, e.target.value, endDate); 
                  }}
                  className="w-32 h-8 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2" 
                />
                <span className="text-gray-400 text-xs font-medium">to</span>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={e => { 
                    setEndDate(e.target.value); 
                    fetchTodayCredit(undefined, startDate, e.target.value); 
                  }}
                  className="w-32 h-8 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2" 
                />
              </div>
            ) : (
              <Input 
                type="date" 
                value={todayCreditDate}
                onChange={e => { 
                  setTodayCreditDate(e.target.value); 
                  fetchTodayCredit(e.target.value); 
                }}
                className="w-40 h-9 text-xs border-gray-200 rounded-lg" 
              />
            )}

            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-lg border-gray-200 hover:bg-gray-50 text-gray-600"
              onClick={() => dateRangeMode ? fetchTodayCredit(undefined, startDate, endDate) : fetchTodayCredit(todayCreditDate)}
              disabled={todayCreditLoading}
            >
              <RefreshCw className={`h-4 w-4 ${todayCreditLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary metric widgets */}
        {todayCreditData && (
          <div className="flex flex-col gap-4 mt-4">
            {/* Grand summary row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-xl p-3.5 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Total Collections</p>
                <p className="font-bold text-lg text-emerald-700 mt-1">{formatCurrency(todayCreditData.summary.total)}</p>
                {todayCreditData.summary.principal !== undefined && (
                  <p className="text-[9px] text-emerald-600 mt-0.5 font-medium whitespace-nowrap">
                    P: {formatCurrency(todayCreditData.summary.principal)} | I: {formatCurrency(todayCreditData.summary.interest)}
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-xl p-3.5 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600">Personal Credit</p>
                <p className="font-bold text-lg text-amber-700 mt-1">{formatCurrency(todayCreditData.summary.personal)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl p-3.5 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">Company Credit</p>
                <p className="font-bold text-lg text-blue-700 mt-1">{formatCurrency(todayCreditData.summary.company)}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200/60 rounded-xl p-3.5 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">💵 Cash mode</p>
                <p className="font-bold text-lg text-gray-700 mt-1">{formatCurrency(todayCreditData.summary.cash || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50/50 border border-cyan-100 rounded-xl p-3.5 shadow-sm col-span-2 md:col-span-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-cyan-600">🌐 Online / UPI</p>
                <p className="font-bold text-lg text-cyan-700 mt-1">{formatCurrency(todayCreditData.summary.online || 0)}</p>
              </div>
            </div>

            {/* Per-company grand breakdown */}
            {(() => {
              const companyTotals = new Map<string, { name: string; amount: number }>();
              for (const u of todayCreditData.users) {
                for (const cb of (u.companyBreakdown || [])) {
                  if (!companyTotals.has(cb.companyId)) {
                    companyTotals.set(cb.companyId, { name: cb.companyName, amount: 0 });
                  }
                  companyTotals.get(cb.companyId)!.amount += cb.amount;
                }
              }
              const entries = [...companyTotals.entries()].sort((a, b) => b[1].amount - a[1].amount);
              if (entries.length === 0) return null;
              return (
                <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-indigo-500" /> Share by Company
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entries.map(([id, co]) => (
                      <div key={id} className="flex items-center gap-1.5 bg-white border border-indigo-100 shadow-sm rounded-lg px-2.5 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700">{co.name}</span>
                        <span className="text-xs font-bold text-emerald-600 ml-1">{formatCurrency(co.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4">
        {todayCreditLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-sm text-gray-500 font-medium">Fetching transactions...</span>
          </div>
        ) : !todayCreditData ? (
          <div className="text-center py-10 text-gray-400">
            <Sun className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Click the refresh button to load credit data</p>
            <Button className="mt-3" onClick={() => fetchTodayCredit(todayCreditDate)}>Load Data</Button>
          </div>
        ) : todayCreditData.users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No collections recorded for the selected period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayCreditData.users.map((u: any) => (
              <div key={u.userId} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                {/* User header row */}
                <button
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-gray-50/50 transition-colors text-left"
                  onClick={() => setExpandedUser(expandedUser === u.userId ? null : u.userId)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                      {u.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{u.userName}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {getRoleBadge(u.userRole)}
                        {u.userCompanyName && (
                          <span className="text-xs text-gray-400 font-medium">{u.userCompanyName}</span>
                        )}
                        {/* Inline per-company chips */}
                        {u.companyBreakdown && u.companyBreakdown.length > 0 && (
                          u.companyBreakdown.map((cb: any) => (
                            <span 
                              key={cb.companyId} 
                              className="inline-flex items-center gap-1 bg-indigo-50/50 border border-indigo-100 rounded-full px-2 py-0.5 text-[10px] font-medium text-indigo-700"
                            >
                              <Building2 className="h-2.5 w-2.5 text-indigo-500" />
                              {cb.companyName}: <span className="text-emerald-600 font-bold ml-0.5">{formatCurrency(cb.amount)}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 text-right flex-shrink-0 ml-3">
                    <div>
                      <p className="font-bold text-emerald-600 text-base">{formatCurrency(u.totalIncrease)}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {u.transactionCount} transaction{u.transactionCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowDownRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedUser === u.userId ? 'rotate-180 text-gray-600' : ''}`} />
                  </div>
                </button>

                {/* Expanded: sub-breakdown */}
                <AnimatePresence>
                  {expandedUser === u.userId && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-gray-50/40 border-t border-gray-100 p-4 space-y-4"
                    >
                      {/* Personal vs Company breakdown & Principal vs Interest breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600">Personal Credit</p>
                          <p className="text-base font-bold text-amber-700 mt-1">{formatCurrency(u.personalIncrease)}</p>
                          <p className="text-[10px] text-amber-500 mt-0.5">Online payments</p>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Company Credit</p>
                          <p className="text-base font-bold text-emerald-700 mt-1">{formatCurrency(u.companyIncrease)}</p>
                          <p className="text-[10px] text-emerald-500 mt-0.5">Cash payments</p>
                        </div>
                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">Principal Repaid</p>
                          <p className="text-base font-bold text-blue-700 mt-1">{formatCurrency(u.principalIncrease || 0)}</p>
                          <p className="text-[10px] text-blue-500 mt-0.5">P Component</p>
                        </div>
                        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-600">Interest Repaid</p>
                          <p className="text-base font-bold text-purple-700 mt-1">{formatCurrency(u.interestIncrease || 0)}</p>
                          <p className="text-[10px] text-purple-500 mt-0.5">I Component</p>
                        </div>
                      </div>

                      {/* Company breakdown */}
                      {u.companyBreakdown && u.companyBreakdown.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-gray-400" /> By Company
                          </p>
                          <div className="space-y-1">
                            {u.companyBreakdown.map((cb: any) => (
                              <div key={cb.companyId} className="flex items-center justify-between bg-white border border-gray-100/60 rounded-lg px-3 py-2 text-sm shadow-xs">
                                <span className="text-gray-700 font-medium">{cb.companyName}</span>
                                <span className="font-bold text-gray-800">{formatCurrency(cb.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent transactions */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <History className="h-3 w-3 text-gray-400" /> Recent Activity
                        </p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {u.transactions.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between text-xs py-2 px-2.5 bg-white border border-gray-100/60 rounded-lg shadow-xs">
                              <div className="text-gray-600 flex-1 min-w-0 truncate">
                                {tx.customerName && <span className="font-semibold text-gray-800">{tx.customerName}</span>}
                                {tx.loanApplicationNo && <span className="text-gray-400 ml-1">({tx.loanApplicationNo})</span>}
                                {tx.installmentNumber && <span className="text-indigo-600 font-medium ml-1">EMI #{tx.installmentNumber}</span>}
                                {tx.description && <span className="text-gray-400 ml-1.5">— {tx.description}</span>}
                                {(tx.principalComponent !== undefined || tx.interestComponent !== undefined) && (
                                  <span className="text-[10px] font-semibold text-amber-700 ml-2 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded inline-flex items-center">
                                    P: {formatCurrency(tx.principalComponent || 0)} | I: {formatCurrency(tx.interestComponent || 0)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                <Badge className={`text-[10px] px-2 py-0 border-0 ${
                                  tx.paymentMode === 'CASH' 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {tx.paymentMode || 'CASH'}
                                </Badge>
                                <Badge className={`text-[9px] px-1.5 py-0 border-0 ${
                                  tx.creditType === 'PERSONAL' 
                                    ? 'bg-amber-50 text-amber-700' 
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {tx.creditType}
                                </Badge>
                                <span className="font-bold text-emerald-600">+{formatCurrency(tx.amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
