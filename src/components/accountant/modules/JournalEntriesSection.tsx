'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2, RefreshCw, Search, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, BookOpen, Filter,
  TrendingUp, ArrowUpRight, ArrowDownRight, Zap,
  Receipt, CreditCard, Building2, CircleDollarSign
} from 'lucide-react';
import { format } from 'date-fns';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface JournalLine {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  account?: {
    accountCode: string;
    accountName: string;
    accountType: string;
  };
}

// Extract "[Customer: RAJ]" from a line narration → returns customer name or empty string
function extractCustomerFromLineNarration(narration?: string): string {
  if (!narration) return '';
  const match = narration.match(/\[Customer:\s*([^\]]+)\]/);
  return match ? match[1].trim() : '';
}

// Build enriched account display name — for Loans Receivable show "Loans Receivable – RAJ"
const LOANS_RECEIVABLE_CODES = new Set(['1200', '1201', '1210']);
function getDisplayAccountName(line: JournalLine): { name: string; sub: string } {
  const base = line.account?.accountName || 'Unknown Account';
  if (LOANS_RECEIVABLE_CODES.has(line.account?.accountCode || '')) {
    const customer = extractCustomerFromLineNarration(line.narration);
    if (customer) {
      return {
        name: `${base} – ${customer}`,
        sub: line.debitAmount > 0 ? `Loan given to ${customer}` : `Repayment from ${customer}`,
      };
    }
  }
  // For non-Loans Receivable lines, show raw narration as sub-text (if any)
  const cleanNarration = line.narration?.replace(/\[Customer:[^\]]*\]/g, '').trim() || '';
  return { name: base, sub: cleanNarration };
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  referenceType?: string;
  referenceId?: string;
  narration?: string;
  totalDebit: number;
  totalCredit: number;
  isAutoEntry?: boolean;
  paymentMode?: string;
  lines: JournalLine[];
  createdAt?: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const PAYMENT_REF_TYPES = [
  'EMI_PAYMENT', 'MIRROR_EMI_PAYMENT', 'PARTIAL_EMI_PAYMENT',
  'INTEREST_ONLY_PAYMENT', 'MIRROR_INTEREST_INCOME',
];

const DISBURSEMENT_REF_TYPES = ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'];
const FEE_REF_TYPES = ['PROCESSING_FEE_COLLECTION', 'PROCESSING_FEE'];
const ALL_TYPES = ['all', ...PAYMENT_REF_TYPES, ...DISBURSEMENT_REF_TYPES, ...FEE_REF_TYPES,
  'MANUAL_ENTRY', 'EXPENSE_ENTRY', 'OPENING_BALANCE'];

const TYPE_LABELS: Record<string, string> = {
  all: 'All Types',
  EMI_PAYMENT: 'EMI Payment',
  MIRROR_EMI_PAYMENT: 'EMI Payment',
  MIRROR_INTEREST_INCOME: 'Interest Income',
  PARTIAL_EMI_PAYMENT: 'Partial EMI',
  INTEREST_ONLY_PAYMENT: 'Interest Only',
  LOAN_DISBURSEMENT: 'Loan Disbursement',
  MIRROR_LOAN_DISBURSEMENT: 'Loan Disbursement',
  PROCESSING_FEE_COLLECTION: 'Processing Fee',
  PROCESSING_FEE: 'Processing Fee',
  MANUAL_ENTRY: 'Manual Entry',
  EXPENSE_ENTRY: 'Expense',
  OPENING_BALANCE: 'Opening Balance',
};

function getBadgeVariant(refType?: string): { bg: string; text: string; icon: React.ReactNode } {
  if (!refType) return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <BookOpen className="h-3 w-3" /> };
  if (PAYMENT_REF_TYPES.includes(refType)) return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <ArrowUpRight className="h-3 w-3" /> };
  if (DISBURSEMENT_REF_TYPES.includes(refType)) return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <ArrowDownRight className="h-3 w-3" /> };
  if (FEE_REF_TYPES.includes(refType)) return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Receipt className="h-3 w-3" /> };
  if (refType === 'EXPENSE_ENTRY') return { bg: 'bg-red-100', text: 'text-red-700', icon: <TrendingUp className="h-3 w-3" /> };
  if (refType === 'MANUAL_ENTRY') return { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Zap className="h-3 w-3" /> };
  return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <BookOpen className="h-3 w-3" /> };
}

function getAccountTypeColor(accountType?: string) {
  switch (accountType) {
    case 'ASSET':    return 'text-blue-600';
    case 'LIABILITY': return 'text-red-600';
    case 'INCOME':   return 'text-emerald-600';
    case 'EXPENSE':  return 'text-orange-600';
    case 'EQUITY':   return 'text-purple-600';
    default:         return 'text-gray-600';
  }
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d: string) => { try { return format(new Date(d), 'dd MMM yyyy, hh:mm a'); } catch { return d; } };
const fmtShort = (d: string) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; } };

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function JournalEntriesSection({ selectedCompanyId }: { selectedCompanyId: string }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const LIMIT = 30;

  const loadEntries = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: selectedCompanyId,
        limit: String(LIMIT),
        offset: String(page * LIMIT),
      });
      if (filterType && filterType !== 'all') params.set('referenceType', filterType);
      const res = await fetch(`/api/accounting/journal-entries?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load journal entries:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, filterType, page]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { setPage(0); }, [filterType, selectedCompanyId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filter by search client-side
  const filtered = entries.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.entryNumber?.toLowerCase().includes(s) ||
      e.narration?.toLowerCase().includes(s) ||
      e.referenceId?.toLowerCase().includes(s) ||
      e.referenceType?.toLowerCase().includes(s)
    );
  });

  // Stats
  const paymentEntries = entries.filter(e => e.referenceType && PAYMENT_REF_TYPES.includes(e.referenceType));
  const totalReceived = paymentEntries.reduce((s, e) => s + e.totalDebit, 0);
  const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 0.01);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Journal Entries — Payment Audit
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            All double-entry journal entries · {total} total entries
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Unbalanced Alert */}
      {unbalanced.length > 0 && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">{unbalanced.length} unbalanced entr{unbalanced.length > 1 ? 'ies' : 'y'} detected!</span>{' '}
            {unbalanced.map(e => e.entryNumber).join(', ')} — Debit ≠ Credit. Investigate immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Entries</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">EMI Payments</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{paymentEntries.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardContent className="p-4">
            <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Total Received</p>
            <p className="text-lg font-bold text-teal-800 mt-1">{fmt(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${unbalanced.length > 0 ? 'bg-gradient-to-br from-red-50 to-rose-50' : 'bg-gradient-to-br from-gray-50 to-slate-50'}`}>
          <CardContent className="p-4">
            <p className={`text-xs font-medium uppercase tracking-wide ${unbalanced.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Errors</p>
            <p className={`text-2xl font-bold mt-1 ${unbalanced.length > 0 ? 'text-red-700' : 'text-gray-600'}`}>
              {unbalanced.length === 0 ? '✓ None' : `${unbalanced.length} ⚠`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by number, narration, reference…"
            className="pl-9 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 h-9">
            <Filter className="h-4 w-4 mr-1 text-gray-400" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {ALL_TYPES.map(t => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterType !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setFilterType('all')} className="text-gray-500 h-9">
            Clear filter
          </Button>
        )}
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 bg-gray-50 border-b">
          <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="col-span-1"></div>
            <div className="col-span-2">Journal #</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Narration / Reference</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1 text-right">Debit</div>
            <div className="col-span-1 text-right">Credit</div>
          </div>
        </CardHeader>
        <ScrollArea className="h-[580px]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <BookOpen className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm">No journal entries found</p>
              <p className="text-xs mt-1 text-gray-400">Approve a payment to trigger accounting entries</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(entry => {
                const isExpanded = expandedIds.has(entry.id);
                const { bg, text, icon } = getBadgeVariant(entry.referenceType);
                const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) <= 0.01;
                const isPayment = entry.referenceType && PAYMENT_REF_TYPES.includes(entry.referenceType);
                return (
                  <div key={entry.id} className={`${isPayment ? 'bg-emerald-50/30' : 'bg-white'} hover:bg-gray-50/70 transition-colors`}>
                    {/* Main Row */}
                    <button
                      className="w-full text-left"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <div className="grid grid-cols-12 items-center px-4 py-3 gap-1">
                        {/* Expand icon */}
                        <div className="col-span-1 flex items-center gap-1">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-gray-400" />
                            : <ChevronRight className="h-4 w-4 text-gray-400" />
                          }
                          {!isBalanced && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>

                        {/* Entry Number */}
                        <div className="col-span-2">
                          <span className="font-mono text-sm font-semibold text-gray-700">{entry.entryNumber}</span>
                          {entry.isAutoEntry && (
                            <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 rounded px-1 py-0.5 uppercase font-bold">Auto</span>
                          )}
                        </div>

                        {/* Date */}
                        <div className="col-span-2">
                          <span className="text-xs text-gray-600">{fmtShort(entry.entryDate)}</span>
                        </div>

                        {/* Narration */}
                        <div className="col-span-3">
                          <p className="text-sm text-gray-800 truncate max-w-[200px]">{entry.narration || '—'}</p>
                          {entry.referenceId && (
                            <p className="text-xs text-gray-400 font-mono truncate">{entry.referenceId}</p>
                          )}
                        </div>

                        {/* Type Badge */}
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
                            {icon}
                            {TYPE_LABELS[entry.referenceType || ''] || (entry.referenceType?.replace(/_/g, ' ') || 'Manual')}
                          </span>
                          {entry.paymentMode && (
                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase">{entry.paymentMode}</p>
                          )}
                        </div>

                        {/* Debit */}
                        <div className="col-span-1 text-right">
                          <span className="text-sm font-semibold text-blue-700">{fmt(entry.totalDebit)}</span>
                        </div>

                        {/* Credit */}
                        <div className="col-span-1 text-right">
                          <span className="text-sm font-semibold text-emerald-700">{fmt(entry.totalCredit)}</span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Detail — Debit/Credit Lines */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-white border-t border-gray-100">
                        <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 grid grid-cols-12">
                            <div className="col-span-1">Code</div>
                            <div className="col-span-5">Account Name</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-2 text-right">Dr (Debit)</div>
                            <div className="col-span-2 text-right">Cr (Credit)</div>
                          </div>
                          {entry.lines.map((line, i) => {
                            const { name: displayName, sub: displaySub } = getDisplayAccountName(line);
                            return (
                              <div
                                key={i}
                                className={`grid grid-cols-12 items-center px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} text-sm`}
                              >
                                <div className="col-span-1">
                                  <span className="font-mono text-xs text-gray-500">{line.account?.accountCode || '—'}</span>
                                </div>
                                <div className="col-span-5">
                                  <p className={`font-medium ${getAccountTypeColor(line.account?.accountType)}`}>
                                    {displayName}
                                  </p>
                                  {displaySub && <p className="text-xs text-gray-400 mt-0.5">{displaySub}</p>}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-xs text-gray-400 uppercase">{line.account?.accountType || '—'}</span>
                                </div>
                                <div className="col-span-2 text-right">
                                  {line.debitAmount > 0
                                    ? <span className="font-semibold text-blue-700">{fmt(line.debitAmount)}</span>
                                    : <span className="text-gray-300">—</span>
                                  }
                                </div>
                                <div className="col-span-2 text-right">
                                  {line.creditAmount > 0
                                    ? <span className="font-semibold text-emerald-700">{fmt(line.creditAmount)}</span>
                                    : <span className="text-gray-300">—</span>
                                  }
                                </div>
                              </div>
                            );
                          })}
                          {/* Totals row */}
                          <div className="grid grid-cols-12 items-center px-3 py-2 bg-gray-100 border-t border-gray-200 text-sm font-bold">
                            <div className="col-span-8 text-gray-700">Total</div>
                            <div className="col-span-2 text-right text-blue-800">{fmt(entry.totalDebit)}</div>
                            <div className="col-span-2 text-right text-emerald-800">{fmt(entry.totalCredit)}</div>
                          </div>
                          {!isBalanced && (
                            <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              ⚠ UNBALANCED: Debit ({fmt(entry.totalDebit)}) ≠ Credit ({fmt(entry.totalCredit)}) — Difference: {fmt(Math.abs(entry.totalDebit - entry.totalCredit))}
                            </div>
                          )}
                          {isBalanced && (
                            <div className="px-3 py-2 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Balanced ✓ — Double-entry verified
                            </div>
                          )}
                        </div>
                        {/* Metadata */}
                        <div className="mt-2 flex gap-4 text-xs text-gray-400">
                          <span>ID: <span className="font-mono">{entry.id.slice(0, 12)}…</span></span>
                          {entry.createdAt && <span>Created: {fmtDate(entry.createdAt)}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total} entries</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1 pb-2 border-t">
        <span className="font-medium text-gray-700 mr-1">Legend:</span>
        {[
          { label: 'EMI / Loan Payment', bg: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Disbursement', bg: 'bg-blue-100', text: 'text-blue-700' },
          { label: 'Processing Fee', bg: 'bg-amber-100', text: 'text-amber-700' },
          { label: 'Expense', bg: 'bg-red-100', text: 'text-red-700' },
          { label: 'Manual', bg: 'bg-purple-100', text: 'text-purple-700' },
        ].map(l => (
          <span key={l.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${l.bg} ${l.text}`}>
            {l.label}
          </span>
        ))}
        <span className="text-gray-400 italic">Click any row to expand debit/credit lines</span>
      </div>
    </div>
  );
}
