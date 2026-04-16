'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Building2, Wallet, CreditCard, TrendingUp, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompanyRow {
  id: string; name: string; code: string;
  cashTotal: number; onlineTotal: number; total: number;
  onlineEmiCount: number; offlineEmiCount: number;
}

interface CollectorRow {
  id: string; name: string; role: string;
  total: number; personal: number; company: number;
}

interface TodayData {
  date: string;
  summary: { total: number; cash: number; online: number };
  companies: CompanyRow[];
  collectors: CollectorRow[];
  emiCounts: { online: number; offline: number; total: number };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

const ROLE_COLORS: Record<string, string> = {
  AGENT: 'bg-emerald-100 text-emerald-700',
  STAFF: 'bg-amber-100 text-amber-700',
  CASHIER: 'bg-cyan-100 text-cyan-700',
  COMPANY: 'bg-blue-100 text-blue-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
};

export default function TodayCollectionCard() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/today-collection?date=${d}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="col-span-full"
    >
      <Card className="border-0 shadow-md overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5" />
              {isToday ? "Today's Collection" : `Collection on ${date}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-8 text-xs w-36 bg-white/10 border-white/30 text-white placeholder:text-white/60 [&::-webkit-calendar-picker-indicator]:invert"
              />
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 p-0"
                onClick={() => fetchData(date)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Summary Chips */}
          {data && (
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-xs text-white/70">Total Collected</p>
                  <p className="font-bold text-white">{fmt(data.summary.total)}</p>
                </div>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-xs text-white/70">Cash</p>
                  <p className="font-bold text-white">{fmt(data.summary.cash)}</p>
                </div>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-xs text-white/70">Online</p>
                  <p className="font-bold text-white">{fmt(data.summary.online)}</p>
                </div>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-xs text-white/70">EMIs Collected</p>
                  <p className="font-bold text-white">{data.emiCounts.total}</p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {loading && !data ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : !data || data.summary.total === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No collections recorded for this date</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 divide-x divide-gray-100">

              {/* Company-wise breakdown */}
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Company-wise
                </h4>
                <div className="space-y-2">
                  {data.companies.map((c, i) => (
                    <div key={c.id} className={`rounded-lg p-3 ${i % 2 === 0 ? 'bg-emerald-50' : 'bg-teal-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-800">{c.name}</span>
                        <span className="font-bold text-emerald-700">{fmt(c.total)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3 text-emerald-500" /> Cash: {fmt(c.cashTotal)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-blue-500" /> Online: {fmt(c.onlineTotal)}
                        </span>
                        <span className="text-gray-400">
                          {c.onlineEmiCount + c.offlineEmiCount} EMI{c.onlineEmiCount + c.offlineEmiCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Grand Total row */}
                  <div className="rounded-lg p-3 bg-gray-800 text-white mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Grand Total</span>
                      <span className="font-bold text-lg">{fmt(data.summary.total)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-300 mt-0.5">
                      <span>Cash: {fmt(data.summary.cash)}</span>
                      <span>Online: {fmt(data.summary.online)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collector breakdown */}
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Collected by Role
                </h4>
                {data.collectors.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Credit transaction data not available</p>
                ) : (
                  <div className="space-y-2">
                    {data.collectors.map(col => (
                      <div key={col.id} className="rounded-lg p-3 bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${ROLE_COLORS[col.role] || 'bg-gray-100 text-gray-700'}`}>
                              {col.role}
                            </Badge>
                            <span className="font-medium text-sm text-gray-800">{col.name}</span>
                          </div>
                          <span className="font-bold text-gray-800">{fmt(col.total)}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span className="text-amber-600">Personal: {fmt(col.personal)}</span>
                          <span className="text-emerald-600">Company: {fmt(col.company)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
