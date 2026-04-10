'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Download, Calendar, IndianRupee, CheckCircle2,
  XCircle, Users, Building2, Banknote, CreditCard, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const fc = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
const fd = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fdt = (s: string) => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface EmiRow {
  emiId: string; loanId: string; applicationNo: string;
  companyId: string; companyName: string; companyCode: string;
  customerName: string; customerPhone: string;
  emiNumber: number; dueDate: string; dueAmount: number;
  principalDue: number; interestDue: number; penaltyAmount: number; waivedAmount: number;
  status: string; isCollected: boolean;
  paidAmount: number; paidPrincipal: number; paidInterest: number;
  paidDate: string | null; paymentMode: string; paymentRef: string;
  collectedById: string; collectedByName: string; collectedByRole: string;
  agentId: string; agentName: string; agentCode: string;
  staffId: string; staffName: string; staffRole: string;
}

interface Summary {
  date: string; totalEmisDue: number; totalCollected: number; totalNotCollected: number;
  totalAmountDue: number; totalAmountCollected: number;
  totalPrincipalCollected: number; totalInterestCollected: number; totalPenaltyCollected: number;
  totalCash: number; totalOnline: number;
}

interface CompanyBreakdown {
  companyId: string; companyName: string; companyCode: string;
  totalDue: number; collected: number; notCollected: number;
  amountDue: number; amountCollected: number;
}

interface Company { id: string; name: string; code: string; }

interface ReportData {
  date: string; summary: Summary;
  companyBreakdown: CompanyBreakdown[]; rows: EmiRow[]; companies: Company[];
}

const PAYMENT_MODE_STYLE: Record<string, { label: string; className: string }> = {
  CASH:          { label: 'Cash',          className: 'bg-emerald-100 text-emerald-800' },
  ONLINE:        { label: 'Online',        className: 'bg-blue-100 text-blue-800' },
  UPI:           { label: 'UPI',           className: 'bg-purple-100 text-purple-800' },
  BANK_TRANSFER: { label: 'Bank Transfer', className: 'bg-indigo-100 text-indigo-800' },
  CHEQUE:        { label: 'Cheque',        className: 'bg-orange-100 text-orange-800' },
  SPLIT:         { label: 'Cash + Online', className: 'bg-teal-100 text-teal-800' },
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PAID:               { label: 'Paid',        className: 'bg-emerald-100 text-emerald-800' },
  PARTIALLY_PAID:     { label: 'Partial',     className: 'bg-yellow-100 text-yellow-800' },
  INTEREST_ONLY_PAID: { label: 'Int. Only',   className: 'bg-blue-100 text-blue-800' },
  OVERDUE:            { label: 'Overdue',     className: 'bg-red-100 text-red-800' },
  PENDING:            { label: 'Pending',     className: 'bg-gray-100 text-gray-700' },
};

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export default function EmiTodayReport({ userRole }: { userRole: string }) {
  if (userRole !== 'SUPER_ADMIN') return null;

  const todayIST = () => {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COLLECTED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (companyFilter !== 'ALL') params.set('companyId', companyFilter);
      const res = await fetch(`/api/reports/emi-today?${params}`);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, companyFilter]);

  // Filter rows
  const filteredRows = report?.rows.filter(r => {
    const matchStatus = statusFilter === 'ALL' ? true : statusFilter === 'COLLECTED' ? r.isCollected : !r.isCollected;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.customerName.toLowerCase().includes(q) ||
      r.applicationNo.toLowerCase().includes(q) || r.agentName.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) || r.collectedByName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }) || [];

  const downloadCSV = () => {
    if (!report) return;
    const headers = ['Application No', 'Company', 'Customer', 'Phone', 'EMI #', 'Due Date', 'Due Amount', 'Status',
      'Paid Amount', 'Principal', 'Interest', 'Net Penalty', 'Payment Mode', 'Paid Date', 'Collected By', 'Role', 'Agent', 'Staff'];
    const rows = filteredRows.map(r => [
      r.applicationNo, r.companyName, r.customerName, r.customerPhone,
      r.emiNumber, fd(r.dueDate), r.dueAmount, r.status,
      r.paidAmount, r.paidPrincipal, r.paidInterest,
      Math.max(0, r.penaltyAmount - r.waivedAmount),
      r.paymentMode, r.paidDate ? fd(r.paidDate) : '',
      r.collectedByName, r.collectedByRole, r.agentName, r.staffName
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-report-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-teal-600" />
            EMI Collection Report
          </h3>
          <p className="text-sm text-gray-500">Full A-Z report — due, collected, missed · any date</p>
        </div>
        {report && (
          <Button size="sm" variant="outline" onClick={downloadCSV} className="border-teal-300 text-teal-700">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border border-teal-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Date picker */}
            <div>
              <Label className="text-xs text-gray-600">Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input type="date" value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="pl-9 w-44 h-9 text-sm" />
              </div>
            </div>

            {/* Company filter */}
            <div>
              <Label className="text-xs text-gray-600">Company</Label>
              <select
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                className="mt-1 h-9 px-2 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Companies</option>
                {report?.companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <Label className="text-xs text-gray-600">Status</Label>
              <div className="flex mt-1 rounded-md border overflow-hidden">
                {(['ALL', 'COLLECTED', 'PENDING'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-gray-600">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input placeholder="Customer, loan, agent..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm" />
              </div>
            </div>

            <Button onClick={generate} disabled={loading} className="bg-teal-600 hover:bg-teal-700 h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {loading ? 'Loading...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'EMIs Due', value: report.summary.totalEmisDue, cls: 'text-gray-800', icon: <Users className="h-4 w-4 text-gray-500" /> },
              { label: 'Collected', value: report.summary.totalCollected, cls: 'text-emerald-700', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
              { label: 'Pending', value: report.summary.totalNotCollected, cls: 'text-red-700', icon: <XCircle className="h-4 w-4 text-red-500" /> },
              { label: 'Amount Due', value: fc(report.summary.totalAmountDue), cls: 'text-gray-800', icon: <IndianRupee className="h-4 w-4 text-gray-500" /> },
              { label: 'Collected ₹', value: fc(report.summary.totalAmountCollected), cls: 'text-emerald-700', icon: <IndianRupee className="h-4 w-4 text-emerald-500" /> },
              { label: 'Cash', value: fc(report.summary.totalCash), cls: 'text-teal-700', icon: <Banknote className="h-4 w-4 text-teal-500" /> },
              { label: 'Online', value: fc(report.summary.totalOnline), cls: 'text-purple-700', icon: <CreditCard className="h-4 w-4 text-purple-500" /> },
            ].map((s, i) => (
              <div key={i} className="bg-white border rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1 mb-1">{s.icon}<p className="text-xs text-gray-500">{s.label}</p></div>
                <p className={`text-base font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Breakdown income */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600">Principal Collected</p>
              <p className="text-lg font-bold text-blue-800">{fc(report.summary.totalPrincipalCollected)}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-600">Interest Collected</p>
              <p className="text-lg font-bold text-indigo-800">{fc(report.summary.totalInterestCollected)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-xs text-red-600">Net Penalty Collected</p>
              <p className="text-lg font-bold text-red-800">{fc(report.summary.totalPenaltyCollected)}</p>
            </div>
          </div>

          {/* Company Breakdown */}
          {report.companyBreakdown.length > 1 && (
            <Card className="border border-gray-200">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" /> Company-wise Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 text-xs">
                        <th className="py-2 pr-3">Company</th>
                        <th className="py-2 px-2 text-right">Due EMIs</th>
                        <th className="py-2 px-2 text-right text-emerald-700">Collected</th>
                        <th className="py-2 px-2 text-right text-red-700">Pending</th>
                        <th className="py-2 px-2 text-right">Amount Due</th>
                        <th className="py-2 px-2 text-right text-emerald-700">Amount Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.companyBreakdown.map(cb => (
                        <tr key={cb.companyId} className="border-b hover:bg-gray-50">
                          <td className="py-2 pr-3 font-medium">{cb.companyName} <span className="text-xs text-gray-400">({cb.companyCode})</span></td>
                          <td className="py-2 px-2 text-right">{cb.totalDue}</td>
                          <td className="py-2 px-2 text-right text-emerald-700 font-medium">{cb.collected}</td>
                          <td className="py-2 px-2 text-right text-red-700 font-medium">{cb.notCollected}</td>
                          <td className="py-2 px-2 text-right">{fc(cb.amountDue)}</td>
                          <td className="py-2 px-2 text-right text-emerald-700 font-bold">{fc(cb.amountCollected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main EMI Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">
                EMI Detail ({filteredRows.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {filteredRows.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No EMIs found for selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-t text-left text-xs text-gray-500">
                        <th className="py-2 pl-4 pr-2 w-6"></th>
                        <th className="py-2 px-2">Loan / Customer</th>
                        <th className="py-2 px-2">Company</th>
                        <th className="py-2 px-2 text-right">EMI #</th>
                        <th className="py-2 px-2 text-right">Due</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2 text-right">Collected</th>
                        <th className="py-2 px-2">Mode</th>
                        <th className="py-2 px-2">Collected By</th>
                        <th className="py-2 px-2">Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, i) => {
                        const isExpanded = expandedRow === row.emiId;
                        const statusStyle = STATUS_STYLE[row.status] || { label: row.status, className: 'bg-gray-100 text-gray-700' };
                        const modeStyle = row.paymentMode ? (PAYMENT_MODE_STYLE[row.paymentMode] || { label: row.paymentMode, className: 'bg-gray-100 text-gray-700' }) : null;
                        return (
                          <>
                            <tr key={row.emiId}
                              className={`border-b cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isExpanded ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                              onClick={() => setExpandedRow(isExpanded ? null : row.emiId)}
                            >
                              <td className="py-3 pl-4 pr-2 text-gray-400">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </td>
                              <td className="py-3 px-2">
                                <p className="font-medium text-gray-900 text-xs">{row.applicationNo}</p>
                                <p className="text-gray-500 text-xs">{row.customerName}</p>
                                <p className="text-gray-400 text-xs">{row.customerPhone}</p>
                              </td>
                              <td className="py-3 px-2">
                                <p className="text-xs font-medium">{row.companyCode}</p>
                                <p className="text-xs text-gray-400">{row.companyName}</p>
                              </td>
                              <td className="py-3 px-2 text-right font-medium">#{row.emiNumber}</td>
                              <td className="py-3 px-2 text-right">
                                <p className="font-medium">{fc(row.dueAmount)}</p>
                                <p className="text-xs text-gray-400">{fd(row.dueDate)}</p>
                              </td>
                              <td className="py-3 px-2">
                                <Badge className={`text-xs ${statusStyle.className}`}>{statusStyle.label}</Badge>
                              </td>
                              <td className="py-3 px-2 text-right">
                                {row.isCollected ? (
                                  <p className="font-bold text-emerald-700">{fc(row.paidAmount)}</p>
                                ) : (
                                  <p className="text-gray-400 text-xs">—</p>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                {modeStyle ? <Badge className={`text-xs ${modeStyle.className}`}>{modeStyle.label}</Badge> : <span className="text-gray-400 text-xs">—</span>}
                              </td>
                              <td className="py-3 px-2">
                                {row.collectedByName ? (
                                  <div>
                                    <p className="text-xs font-medium">{row.collectedByName}</p>
                                    <p className="text-xs text-gray-400">{row.collectedByRole}</p>
                                  </div>
                                ) : <span className="text-gray-400 text-xs">—</span>}
                              </td>
                              <td className="py-3 px-2">
                                <p className="text-xs font-medium">{row.agentName || '—'}</p>
                                {row.agentCode && <p className="text-xs text-gray-400">{row.agentCode}</p>}
                              </td>
                            </tr>

                            {/* Expanded Detail Row */}
                            {isExpanded && (
                              <tr key={`${row.emiId}-detail`} className="bg-teal-50 border-b">
                                <td colSpan={10} className="px-6 py-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-gray-700 uppercase tracking-wide">Loan Info</p>
                                      <p><span className="text-gray-500">App No:</span> <span className="font-medium">{row.applicationNo}</span></p>
                                      <p><span className="text-gray-500">Customer:</span> <span className="font-medium">{row.customerName}</span></p>
                                      <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{row.customerPhone}</span></p>
                                      <p><span className="text-gray-500">Company:</span> <span className="font-medium">{row.companyName}</span></p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-gray-700 uppercase tracking-wide">Amount Breakdown</p>
                                      <p><span className="text-gray-500">Principal:</span> <span className="font-medium text-blue-700">{fc(row.isCollected ? row.paidPrincipal : row.principalDue)}</span></p>
                                      <p><span className="text-gray-500">Interest:</span> <span className="font-medium text-indigo-700">{fc(row.isCollected ? row.paidInterest : row.interestDue)}</span></p>
                                      {row.penaltyAmount > 0 && <>
                                        <p><span className="text-gray-500">Penalty:</span> <span className="font-medium text-red-600">{fc(row.penaltyAmount)}</span></p>
                                        {row.waivedAmount > 0 && <p><span className="text-gray-500">Waived:</span> <span className="font-medium text-orange-600">−{fc(row.waivedAmount)}</span></p>}
                                        <p><span className="text-gray-500">Net Penalty:</span> <span className="font-bold text-red-700">{fc(Math.max(0, row.penaltyAmount - row.waivedAmount))}</span></p>
                                      </>}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-gray-700 uppercase tracking-wide">Collection</p>
                                      {row.isCollected ? <>
                                        <p><span className="text-gray-500">Collected:</span> <span className="font-bold text-emerald-700">{fc(row.paidAmount)}</span></p>
                                        <p><span className="text-gray-500">Date:</span> <span className="font-medium">{row.paidDate ? fdt(row.paidDate) : '—'}</span></p>
                                        <p><span className="text-gray-500">Mode:</span> <span className="font-medium">{PAYMENT_MODE_STYLE[row.paymentMode]?.label || row.paymentMode}</span></p>
                                        {row.paymentRef && <p><span className="text-gray-500">Ref:</span> <span className="font-medium">{row.paymentRef}</span></p>}
                                      </> : <p className="text-red-600 font-medium">Not Collected</p>}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-semibold text-gray-700 uppercase tracking-wide">People</p>
                                      {row.collectedByName && <p><span className="text-gray-500">Collected by:</span> <span className="font-medium">{row.collectedByName} ({row.collectedByRole})</span></p>}
                                      {row.agentName && <p><span className="text-gray-500">Agent:</span> <span className="font-medium">{row.agentName} {row.agentCode ? `(${row.agentCode})` : ''}</span></p>}
                                      {row.staffName && <p><span className="text-gray-500">Staff:</span> <span className="font-medium">{row.staffName} ({row.staffRole})</span></p>}
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
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-gray-400 text-right">
            Report for {fd(`${report.date}T00:00:00`)} · Generated {new Date().toLocaleTimeString('en-IN')}
          </p>
        </>
      )}
    </div>
  );
}
