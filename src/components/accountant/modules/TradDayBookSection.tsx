'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface DayEntry {
  id: string;
  source: string;
  entryDate: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  amount: number;
  entryType?: string | null;       // CREDIT | DEBIT (cashbook)
  transactionType?: string | null; // CREDIT | DEBIT (bank)
  entryNumber?: string;
  lines?: {
    id: string;
    debitAmount: number;
    creditAmount: number;
    narration?: string;
    account?: { accountCode: string; accountName: string };
  }[];
}

// Row in the traditional daybook table
interface DayRow {
  date: string;           // shown only on first row of entry
  particulars: string;    // "Cash A/c Dr. To Sales A/c" or "  To Sales A/c" or "(narration)"
  lf: string;
  dr: number | null;
  cr: number | null;
  isNarration: boolean;
  isSub: boolean;         // credit/sub row — slightly indented
  entryId: string;
}

const INR = (n: number | null) =>
  n == null || n === 0 ? '–' : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => format(new Date(d), 'yyyy/MM/dd');

/** Convert raw API entries into traditional daybook rows */
function buildRows(entries: DayEntry[]): DayRow[] {
  const rows: DayRow[] = [];

  for (const entry of entries) {
    const dateStr = fmtDate(entry.entryDate);

    // --- Journal entry with lines ---
    if (entry.source === 'JOURNAL' && entry.lines && entry.lines.length > 0) {
      const drLines = entry.lines.filter(l => l.debitAmount > 0);
      const crLines = entry.lines.filter(l => l.creditAmount > 0);
      let firstRow = true;

      // Debit lines first
      for (const line of drLines) {
        const accName = line.account?.accountName || 'Account';
        const crNames = crLines.map(l => l.account?.accountName || 'Account').join(' / ');
        const particulars = drLines.length === 1
          ? `${accName} A/c  Dr.  To ${crNames || 'Account'}`
          : `${accName} A/c  Dr.`;

        rows.push({
          date: firstRow ? dateStr : '',
          particulars,
          lf: '–',
          dr: line.debitAmount,
          cr: null,
          isNarration: false,
          isSub: false,
          entryId: entry.id,
        });
        firstRow = false;
      }

      // Credit lines
      for (const line of crLines) {
        const accName = line.account?.accountName || 'Account';
        rows.push({
          date: '',
          particulars: `  To ${accName} A/c`,
          lf: '–',
          dr: null,
          cr: line.creditAmount,
          isNarration: false,
          isSub: true,
          entryId: entry.id,
        });
      }

      // Narration row
      const narration = entry.description || `${entry.referenceType?.replace(/_/g, ' ')}`;
      if (narration) {
        rows.push({
          date: '',
          particulars: `(${narration})`,
          lf: '–',
          dr: null,
          cr: null,
          isNarration: true,
          isSub: false,
          entryId: entry.id,
        });
      }
      continue;
    }

    // --- Cashbook / Bank entry (no journal lines) ---
    const isCredit =
      entry.entryType === 'CREDIT' || entry.transactionType === 'CREDIT';
    const isBank = entry.source === 'BANK';
    const cashLabel = isBank ? 'Bank A/c' : 'Cash A/c';
    const refLabel = entry.description || entry.referenceType?.replace(/_/g, ' ') || 'Account';

    let drPart: string;
    let crPart: string;
    if (isCredit) {
      // Money IN → Cash/Bank is Debit, other is Credit
      drPart = `${cashLabel}  Dr.  To ${refLabel}`;
      crPart = `  To ${refLabel}`;
    } else {
      // Money OUT → Cash/Bank is Credit, other is Debit
      drPart = `${refLabel}  Dr.  To ${cashLabel}`;
      crPart = `  To ${cashLabel}`;
    }

    rows.push({
      date: dateStr,
      particulars: drPart,
      lf: '–',
      dr: isCredit ? entry.amount : entry.amount,
      cr: null,
      isNarration: false,
      isSub: false,
      entryId: entry.id,
    });
    rows.push({
      date: '',
      particulars: crPart,
      lf: '–',
      dr: null,
      cr: entry.amount,
      isNarration: false,
      isSub: true,
      entryId: entry.id,
    });

    // Narration
    if (entry.description) {
      rows.push({
        date: '',
        particulars: `(${entry.description})`,
        lf: '–',
        dr: null,
        cr: null,
        isNarration: true,
        isSub: false,
        entryId: entry.id,
      });
    }
  }

  return rows;
}

const PER_PAGE = 100; // rows per page

export default function TradDayBookSection({ selectedCompanyId }: { selectedCompanyId: string }) {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/accounting/daybook?companyId=${selectedCompanyId}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      setEntries(data.entries || []);
      setPage(1);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [selectedCompanyId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const rows = buildRows(entries);
  const totalDr = rows.reduce((s, r) => s + (r.dr ?? 0), 0);
  const totalCr = rows.reduce((s, r) => s + (r.cr ?? 0), 0);
  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pagedRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Day Book
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Traditional double-entry daybook — Date | Particulars | L.F. | Dr | Cr</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">From:</span>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-sm" />
          <span className="text-xs text-gray-500">To:</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-sm" />
          <Button size="sm" variant="outline" className="h-8" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entries', val: entries.length, cls: 'text-gray-700' },
          { label: 'Total Dr (₹)', val: INR(totalDr), cls: 'text-blue-700 font-mono' },
          { label: 'Total Cr (₹)', val: INR(totalCr), cls: 'text-green-700 font-mono' },
        ].map(c => (
          <Card key={c.label} className="border shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
              <p className={`text-sm font-bold ${c.cls}`}>{c.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daybook Table */}
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-emerald-500" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-500">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No entries found for this period</p>
          <p className="text-sm mt-1">Pay an EMI, disburse a loan, or add an expense to see entries</p>
        </CardContent></Card>
      ) : (
        <Card className="border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left py-3 px-4 font-semibold w-32 border-r border-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-semibold border-r border-gray-600">Particulars</th>
                  <th className="text-center py-3 px-3 font-semibold w-16 border-r border-gray-600">L.F.</th>
                  <th className="text-right py-3 px-4 font-semibold w-36 border-r border-gray-600">Amount (Dr)</th>
                  <th className="text-right py-3 px-4 font-semibold w-36">Amount (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, i) => {
                  // Detect entry boundary — shade alternating entries
                  const prevEntryId = i > 0 ? pagedRows[i - 1].entryId : null;
                  const isNewEntry = row.entryId !== prevEntryId;
                  const entryIndex = rows.filter((r, idx) => idx < (page - 1) * PER_PAGE + i && r.entryId !== (idx > 0 ? rows[idx - 1].entryId : null)).length;
                  const isEven = (entryIndex % 2 === 0);

                  return (
                    <tr
                      key={i}
                      className={[
                        isNewEntry ? 'border-t border-gray-200' : '',
                        row.isNarration ? 'bg-slate-50/60 italic' : isEven ? 'bg-white' : 'bg-gray-50/40',
                      ].join(' ')}
                    >
                      {/* Date — only on first row of entry */}
                      <td className="py-1.5 px-4 text-gray-600 font-medium align-top border-r border-gray-100 whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* Particulars */}
                      <td className={`py-1.5 px-4 border-r border-gray-100 ${row.isNarration ? 'text-gray-500 text-xs' : row.isSub ? 'pl-10 text-gray-700' : 'font-medium text-gray-800'}`}>
                        {row.particulars}
                      </td>

                      {/* L.F. */}
                      <td className="py-1.5 px-3 text-center text-gray-400 border-r border-gray-100">
                        {row.lf}
                      </td>

                      {/* Dr */}
                      <td className="py-1.5 px-4 text-right font-mono border-r border-gray-100">
                        {row.dr != null && row.dr > 0 ? (
                          <span className="font-semibold text-blue-800">{INR(row.dr)}</span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>

                      {/* Cr */}
                      <td className="py-1.5 px-4 text-right font-mono">
                        {row.cr != null && row.cr > 0 ? (
                          <span className="font-semibold text-green-800">{INR(row.cr)}</span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals */}
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold">
                  <td colSpan={3} className="py-2.5 px-4 text-gray-700 text-sm uppercase tracking-wide border-r border-gray-300">Total</td>
                  <td className="py-2.5 px-4 text-right font-mono text-blue-900 text-sm border-r border-gray-300 underline decoration-double">{INR(totalDr)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-green-900 text-sm underline decoration-double">{INR(totalCr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50">
              <span className="text-sm text-gray-500">Rows {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, rows.length)} of {rows.length}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm px-2 py-1">Page {page}/{totalPages}</span>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
