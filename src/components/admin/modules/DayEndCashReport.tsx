'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Printer, Calendar, IndianRupee, Banknote, CreditCard, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AgentRow {
  agentId: string;
  agentName: string;
  agentRole: string;
  emisCollected: number;
  principal: number;
  interest: number;
  penaltyCharged: number;
  penaltyWaived: number;
  netPenalty: number;
  cashAmount: number;
  onlineAmount: number;
  total: number;
}

interface ReportData {
  date: string;
  summary: {
    totalCash: number;
    totalOnline: number;
    totalPenalty: number;
    totalWaived: number;
    grandTotal: number;
  };
  agents: AgentRow[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function DayEndCashReport({ userId, userRole }: { userId: string; userRole: string }) {
  if (userRole !== 'SUPER_ADMIN') return null;

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/day-end-cash?date=${selectedDate}&userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;
    const headers = ['Agent', 'Role', 'EMIs', 'Principal', 'Interest', 'Penalty Charged', 'Penalty Waived', 'Net Penalty', 'Cash', 'Online', 'Total'];
    const rows = report.agents.map(a => [
      a.agentName, a.agentRole, a.emisCollected,
      a.principal, a.interest, a.penaltyCharged,
      a.penaltyWaived, a.netPenalty, a.cashAmount, a.onlineAmount, a.total
    ]);
    const totals = ['TOTAL', '', report.agents.reduce((s, a) => s + a.emisCollected, 0),
      report.summary.grandTotal - report.summary.totalOnline - report.summary.totalPenalty,
      '', report.summary.totalPenalty, report.summary.totalWaived,
      report.summary.totalPenalty - report.summary.totalWaived,
      report.summary.totalCash, report.summary.totalOnline, report.summary.grandTotal];
    const csv = [headers, ...rows, totals].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-end-report-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden border border-teal-100 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Day End Cash Report
          </CardTitle>
          {report && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30" onClick={downloadCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Date Picker */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Report Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 w-44"
              />
            </div>
          </div>
          <Button onClick={generateReport} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
            {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</> : 'Generate Report'}
          </Button>
        </div>

        {/* Report */}
        {report && (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center py-2 border-b">
              <p className="text-lg font-bold text-gray-800">Day End Collection Report</p>
              <p className="text-sm text-gray-500">{formatDate(report.date)}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">Total Cash</p>
                </div>
                <p className="text-lg font-bold text-emerald-800">{formatCurrency(report.summary.totalCash)}</p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <p className="text-xs text-purple-700 font-medium">Total Online</p>
                </div>
                <p className="text-lg font-bold text-purple-800">{formatCurrency(report.summary.totalOnline)}</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <IndianRupee className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-red-700 font-medium">Net Penalty</p>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency(report.summary.totalPenalty - report.summary.totalWaived)}
                </p>
                {report.summary.totalWaived > 0 && (
                  <p className="text-xs text-red-500">Waived: {formatCurrency(report.summary.totalWaived)}</p>
                )}
              </div>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-teal-600" />
                  <p className="text-xs text-teal-700 font-medium">Grand Total</p>
                </div>
                <p className="text-lg font-bold text-teal-800">{formatCurrency(report.summary.grandTotal)}</p>
              </div>
            </div>

            {/* Agent Table */}
            {report.agents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <IndianRupee className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No collections recorded on {formatDate(report.date)}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Agent</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Role</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">EMIs</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Principal</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Interest</th>
                      <th className="text-right py-3 px-2 font-semibold text-red-700">Penalty+</th>
                      <th className="text-right py-3 px-2 font-semibold text-orange-700">Waived−</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Net Penalty</th>
                      <th className="text-right py-3 px-2 font-semibold text-emerald-700">Cash</th>
                      <th className="text-right py-3 px-2 font-semibold text-purple-700">Online</th>
                      <th className="text-right py-3 px-3 font-semibold text-teal-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.agents.map((agent, i) => (
                      <tr key={agent.agentId} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50/30 transition-colors`}>
                        <td className="py-3 px-3 font-medium text-gray-900">{agent.agentName}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="text-xs">{agent.agentRole}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-700">{agent.emisCollected}</td>
                        <td className="py-3 px-2 text-right text-gray-700">{formatCurrency(agent.principal)}</td>
                        <td className="py-3 px-2 text-right text-blue-700">{formatCurrency(agent.interest)}</td>
                        <td className="py-3 px-2 text-right text-red-600">{agent.penaltyCharged > 0 ? formatCurrency(agent.penaltyCharged) : '—'}</td>
                        <td className="py-3 px-2 text-right text-orange-600">{agent.penaltyWaived > 0 ? formatCurrency(agent.penaltyWaived) : '—'}</td>
                        <td className="py-3 px-2 text-right text-gray-700">{agent.netPenalty > 0 ? formatCurrency(agent.netPenalty) : '—'}</td>
                        <td className="py-3 px-2 text-right font-medium text-emerald-700">{formatCurrency(agent.cashAmount)}</td>
                        <td className="py-3 px-2 text-right font-medium text-purple-700">{formatCurrency(agent.onlineAmount)}</td>
                        <td className="py-3 px-3 text-right font-bold text-teal-700">{formatCurrency(agent.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-50 border-t-2 border-teal-300">
                      <td className="py-3 px-3 font-bold text-gray-900" colSpan={2}>TOTAL</td>
                      <td className="py-3 px-2 text-right font-bold">{report.agents.reduce((s, a) => s + a.emisCollected, 0)}</td>
                      <td className="py-3 px-2 text-right font-bold">{formatCurrency(report.agents.reduce((s, a) => s + a.principal, 0))}</td>
                      <td className="py-3 px-2 text-right font-bold text-blue-800">{formatCurrency(report.agents.reduce((s, a) => s + a.interest, 0))}</td>
                      <td className="py-3 px-2 text-right font-bold text-red-700">{formatCurrency(report.summary.totalPenalty)}</td>
                      <td className="py-3 px-2 text-right font-bold text-orange-700">{formatCurrency(report.summary.totalWaived)}</td>
                      <td className="py-3 px-2 text-right font-bold">{formatCurrency(report.summary.totalPenalty - report.summary.totalWaived)}</td>
                      <td className="py-3 px-2 text-right font-bold text-emerald-800">{formatCurrency(report.summary.totalCash)}</td>
                      <td className="py-3 px-2 text-right font-bold text-purple-800">{formatCurrency(report.summary.totalOnline)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-teal-800 text-base">{formatCurrency(report.summary.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <p className="text-xs text-gray-400 text-right">
              Generated on {new Date().toLocaleString('en-IN')} • Money Mitra Day End Report
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
