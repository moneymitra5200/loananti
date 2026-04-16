'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, BookOpen, Search, ChevronLeft, ChevronRight, Receipt, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface JournalLine {
  id: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  account?: { accountCode: string; accountName: string; accountType: string };
}
interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  narration?: string;
  referenceType?: string;
  totalDebit: number;
  totalCredit: number;
  paymentMode?: string;
  isAutoEntry: boolean;
  lines: JournalLine[];
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d: string) => format(new Date(d), 'dd MMM yyyy');
const refLabel = (t?: string) => ({
  EMI_PAYMENT: 'EMI Receipt', LOAN_DISBURSEMENT: 'Loan Disbursed', PROCESSING_FEE: 'Processing Fee',
  EXPENSE: 'Expense', EXPENSE_PAYMENT: 'Expense', EQUITY_INVESTMENT: 'Capital', BORROWED_MONEY: 'Borrowed',
  LOAN_REPAYMENT: 'Repayment', MANUAL_ENTRY: 'Manual', MIRROR_EMI_PAYMENT: 'Mirror EMI',
  INTEREST_ONLY_PAYMENT: 'Interest Only',
}[t || ''] || (t?.replace(/_/g, ' ') || 'Transaction'));

const modeColor = (m?: string) => ({
  CASH: 'bg-emerald-100 text-emerald-700', BANK_TRANSFER: 'bg-blue-100 text-blue-700',
  ONLINE: 'bg-purple-100 text-purple-700', UPI: 'bg-purple-100 text-purple-700',
  CHEQUE: 'bg-amber-100 text-amber-700',
}[m || ''] || 'bg-gray-100 text-gray-600');

export default function DayBookSection({ selectedCompanyId, formatCurrency }: { selectedCompanyId: string; formatCurrency: (n: number) => string }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const load = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries?companyId=${selectedCompanyId}&startDate=${startDate}&endDate=${endDate}&limit=200&offset=0`);
      const data = await res.json();
      setEntries(data.entries || []);
      setPage(1);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [selectedCompanyId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e =>
    !search ||
    e.narration?.toLowerCase().includes(search.toLowerCase()) ||
    e.entryNumber?.toLowerCase().includes(search.toLowerCase()) ||
    e.referenceType?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by date
  const byDate: Record<string, JournalEntry[]> = {};
  for (const e of filtered) {
    const d = fmtDate(e.entryDate);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  }
  const days = Object.keys(byDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const totalPages = Math.ceil(days.length / PER_PAGE);
  const pagedDays = days.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalDr = filtered.reduce((s, e) => s + e.totalDebit, 0);
  const totalCr = filtered.reduce((s, e) => s + e.totalCredit, 0);
  const balanced = Math.abs(totalDr - totalCr) < 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Daybook — Journal Voucher View
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Every transaction shown in double-entry (Dr/Cr) format — the primary book of accounts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-44 text-sm" />
          </div>
          <span className="text-xs text-gray-500">From:</span>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-sm" />
          <span className="text-xs text-gray-500">To:</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-sm" />
          <Button size="sm" variant="outline" className="h-8" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Vouchers', val: filtered.length, cls: 'text-gray-700' },
          { label: 'Total Debit (Dr)', val: fmt(totalDr), cls: 'text-blue-700' },
          { label: 'Total Credit (Cr)', val: fmt(totalCr), cls: 'text-green-700' },
          { label: balanced ? '✓ Books Balanced' : '⚠ Difference', val: balanced ? 'OK' : fmt(Math.abs(totalDr - totalCr)), cls: balanced ? 'text-emerald-700' : 'text-red-700' },
        ].map(c => (
          <Card key={c.label} className="border shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
              <p className={`text-base font-bold ${c.cls}`}>{c.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!balanced && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Note: Some transactions may not have journal entries recorded. The difference shown reflects missing journal entries. Your cash/bank balances are still correct.
        </div>
      )}

      {/* Journal Vouchers */}
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-emerald-500" /></div>
      ) : pagedDays.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-500">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No journal entries found for this period</p>
          <p className="text-sm mt-1">Transactions will appear here after EMIs are paid, loans disbursed, or expenses recorded</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {pagedDays.map(day => (
            <div key={day}>
              {/* Day heading */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-gray-500 bg-white px-3 border rounded-full py-0.5">{day}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-3">
                {byDate[day].map(entry => (
                  <Card key={entry.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-2.5 px-4 bg-gray-50 border-b flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm font-semibold text-gray-700">{entry.entryNumber}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-medium">{refLabel(entry.referenceType)}</Badge>
                        {entry.paymentMode && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${modeColor(entry.paymentMode)}`}>{entry.paymentMode}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{fmtDate(entry.entryDate)}</span>
                    </CardHeader>
                    <CardContent className="px-0 py-0">
                      {/* Journal voucher Dr/Cr table */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-blue-50/40">
                            <th className="text-left py-1.5 px-4 text-xs font-semibold text-gray-500 w-8">#</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-500">Account Head</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-400 w-20">Type</th>
                            <th className="text-right py-1.5 px-4 text-xs font-semibold text-blue-700 w-28">Dr (₹)</th>
                            <th className="text-right py-1.5 px-4 text-xs font-semibold text-green-700 w-28">Cr (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.length > 0 ? entry.lines.map((line, i) => (
                            <tr key={line.id} className={`border-b border-dashed ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <td className="py-1.5 px-4 text-gray-400 text-xs">{i + 1}.</td>
                              <td className="py-1.5 px-2">
                                <div className="font-medium text-gray-800">
                                  {line.debitAmount > 0 ? '' : '\u00A0\u00A0\u00A0\u00A0'}
                                  {line.account?.accountName || '—'}
                                </div>
                                {line.narration && <div className="text-xs text-gray-400">{line.narration}</div>}
                              </td>
                              <td className="py-1.5 px-2">
                                <span className="text-[10px] text-gray-400">{line.account?.accountType || ''}</span>
                              </td>
                              <td className={`py-1.5 px-4 text-right font-mono font-semibold ${line.debitAmount > 0 ? 'text-blue-700' : 'text-gray-200'}`}>
                                {line.debitAmount > 0 ? fmt(line.debitAmount) : '—'}
                              </td>
                              <td className={`py-1.5 px-4 text-right font-mono font-semibold ${line.creditAmount > 0 ? 'text-green-700' : 'text-gray-200'}`}>
                                {line.creditAmount > 0 ? fmt(line.creditAmount) : '—'}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} className="py-2 px-4 text-xs text-gray-400 italic">No line details available for this entry</td></tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 border-t-2 border-gray-300">
                            <td colSpan={3} className="py-2 px-4 text-xs font-bold text-gray-600 uppercase tracking-wide">
                              {entry.narration ? `Narration: ${entry.narration}` : 'TOTAL'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-bold text-blue-800 text-sm underline decoration-double">
                              {fmt(entry.totalDebit)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-bold text-green-800 text-sm underline decoration-double">
                              {fmt(entry.totalCredit)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-500">Day {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, days.length)} of {days.length} days</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm px-2 py-1">Page {page}/{totalPages}</span>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
