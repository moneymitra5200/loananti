'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, BookOpen, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface DayEntry {
  id: string;
  source: string;
  entryDate: string;
  description: string;
  referenceType?: string;
  amount: number;
  entryType?: string | null;       // CREDIT | DEBIT (cashbook)
  transactionType?: string | null; // CREDIT | DEBIT (bank)
  lines?: {
    id: string;
    debitAmount: number;
    creditAmount: number;
    narration?: string;
    account?: { accountCode: string; accountName: string };
  }[];
}

interface DayRow {
  particulars: string;
  particularsLine2?: string; // "  To ..." credit line
  narration?: string;
  dr: number | null;
  cr: number | null;
  entryId: string;
}

interface DayGroup {
  date: string;           // 'yyyy/MM/dd'
  dateRaw: string;        // for sorting
  openingBalance: number;
  closingBalance: number;
  totalDr: number;
  totalCr: number;
  rows: DayRow[];
}

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d: string) => format(new Date(d), 'dd MMM yyyy (EEE)');

/** Determine if an entry increases (+) or decreases (-) the cash balance, and by how much */
function entryBalanceImpact(entry: DayEntry): number {
  if (entry.source === 'CASHBOOK') {
    return entry.entryType === 'CREDIT' ? entry.amount : -entry.amount;
  }
  if (entry.source === 'BANK') {
    return entry.transactionType === 'CREDIT' ? entry.amount : -entry.amount;
  }
  // JOURNAL: sum net credits as positive, debits as negative
  if (entry.source === 'JOURNAL' && entry.lines) {
    const netCr = entry.lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    const netDr = entry.lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
    return netCr - netDr;
  }
  // fallback
  const isCredit = entry.entryType === 'CREDIT' || entry.transactionType === 'CREDIT';
  return isCredit ? entry.amount : -entry.amount;
}

/** Build a single DayRow from an entry */
function entryToRow(entry: DayEntry): DayRow {
  // JOURNAL with lines
  if (entry.source === 'JOURNAL' && entry.lines && entry.lines.length > 0) {
    const drLines = entry.lines.filter(l => l.debitAmount > 0);
    const crLines = entry.lines.filter(l => l.creditAmount > 0);
    const totalDr = drLines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCr = crLines.reduce((s, l) => s + l.creditAmount, 0);
    const drNames = drLines.map(l => l.account?.accountName || 'Account').join(' / ');
    const crNames = crLines.map(l => l.account?.accountName || 'Account').join(' / ');

    const particulars = drLines.length === 1 && crLines.length === 1
      ? `${drNames} A/c  Dr.  To ${crNames} A/c`
      : drNames.length > 0
        ? `${drNames} A/c  Dr.`
        : `${crNames} A/c  (Cr.)`;

    return {
      particulars,
      particularsLine2: (drLines.length > 1 || crLines.length > 1)
        ? crNames ? `  To ${crNames} A/c` : undefined
        : undefined,
      narration: `(${entry.description || (entry.referenceType?.replace(/_/g, ' ') || '')})`,
      dr: totalDr > 0 ? totalDr : null,
      cr: totalCr > 0 ? totalCr : null,
      entryId: entry.id,
    };
  }

  // CASHBOOK / BANK
  const isCredit = entry.entryType === 'CREDIT' || entry.transactionType === 'CREDIT';
  const isBank = entry.source === 'BANK';
  const cashLabel = isBank ? 'Bank A/c' : 'Cash A/c';
  const refLabel = entry.description || entry.referenceType?.replace(/_/g, ' ') || 'Account';

  const particulars = isCredit
    ? `${cashLabel}  Dr.  To  ${refLabel}`
    : `${refLabel}  Dr.  To  ${cashLabel}`;

  return {
    particulars,
    narration: `(${refLabel})`,
    dr: entry.amount,
    cr: isCredit ? null : null,          // in Dr col (debit the received a/c)
    entryId: entry.id,
  };
}

/** Group entries by date, build DayGroups with opening/closing balance */
function buildDayGroups(entries: DayEntry[], openingBalance: number): DayGroup[] {
  // Group by date string
  const byDate: Record<string, DayEntry[]> = {};
  for (const e of entries) {
    const d = e.entryDate.split('T')[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  }

  const sortedDates = Object.keys(byDate).sort();
  const groups: DayGroup[] = [];
  let runningBalance = openingBalance;

  for (const dateKey of sortedDates) {
    const dayEntries = byDate[dateKey];
    const dayOpen = runningBalance;

    let dayDr = 0;
    let dayCr = 0;

    // Calculate day totals and impact
    for (const e of dayEntries) {
      const impact = entryBalanceImpact(e);
      if (impact >= 0) dayCr += impact;
      else dayDr += Math.abs(impact);
    }

    const dayClose = dayOpen + dayCr - dayDr;
    runningBalance = dayClose;

    groups.push({
      date: fmtDate(dateKey),
      dateRaw: dateKey,
      openingBalance: dayOpen,
      closingBalance: dayClose,
      totalDr: dayDr,
      totalCr: dayCr,
      rows: dayEntries.map(entryToRow),
    });
  }

  // Return newest day first
  return groups.reverse();
}

const PER_PAGE = 7; // days per page

export default function TradDayBookSection({ selectedCompanyId }: { selectedCompanyId: string }) {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
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
      setOpeningBalance(data.openingBalance || 0);
      setPage(1);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [selectedCompanyId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const dayGroups = buildDayGroups(entries, openingBalance);
  const totalPages = Math.ceil(dayGroups.length / PER_PAGE);
  const pagedGroups = dayGroups.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const periodTotalDr = dayGroups.reduce((s, g) => s + g.totalDr, 0);
  const periodTotalCr = dayGroups.reduce((s, g) => s + g.totalCr, 0);
  const periodClosing = (dayGroups[0]?.closingBalance ?? openingBalance); // newest group is first

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Day Book
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Traditional format — grouped by day with Opening & Closing Balance
          </p>
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

      {/* Period Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Opening Balance', val: INR(openingBalance), cls: 'text-gray-700', sub: 'Start of period' },
          { label: 'Total Dr (Out)', val: INR(periodTotalDr), cls: 'text-blue-700', sub: 'Cash/Bank out' },
          { label: 'Total Cr (In)', val: INR(periodTotalCr), cls: 'text-green-700', sub: 'Cash/Bank in' },
          { label: 'Closing Balance', val: INR(periodClosing), cls: 'text-emerald-700 font-bold', sub: 'End of period' },
        ].map(c => (
          <Card key={c.label} className="border shadow-sm">
            <CardContent className="p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{c.label}</p>
              <p className={`text-sm font-bold font-mono ${c.cls}`}>{c.val}</p>
              <p className="text-[10px] text-gray-400">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-emerald-500" /></div>
      ) : dayGroups.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-500">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No entries found for this period</p>
          <p className="text-sm mt-1">Pay an EMI, disburse a loan, or record an expense</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {pagedGroups.map((group) => (
            <Card key={group.dateRaw} className="border shadow-md overflow-hidden">
              {/* Day Header */}
              <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{group.date}</span>
                  <Badge className="bg-emerald-500 text-white text-[10px]">{group.rows.length} {group.rows.length === 1 ? 'entry' : 'entries'}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400">Dr: <span className="text-blue-300 font-mono">{INR(group.totalDr)}</span></span>
                  <span className="text-gray-400">Cr: <span className="text-green-300 font-mono">{INR(group.totalCr)}</span></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-semibold text-gray-600 text-xs border-r border-gray-200">Particulars</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-500 text-xs w-12 border-r border-gray-200">L.F.</th>
                      <th className="text-right py-2 px-4 font-semibold text-blue-700 text-xs w-36 border-r border-gray-200">Amount (Dr)</th>
                      <th className="text-right py-2 px-4 font-semibold text-green-700 text-xs w-36">Amount (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening Balance Row */}
                    <tr className="bg-amber-50 border-b border-amber-200">
                      <td className="py-2 px-4 font-semibold text-amber-800 flex items-center gap-1.5">
                        <ArrowDown className="h-3.5 w-3.5 text-amber-500" />
                        To Balance b/d  <span className="font-normal text-xs text-amber-600">(Opening Balance)</span>
                      </td>
                      <td className="py-2 px-3 text-center text-gray-400 border-l border-amber-200">–</td>
                      <td className="py-2 px-4 text-right border-l border-amber-200"></td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-amber-800">{INR(group.openingBalance)}</td>
                    </tr>

                    {/* Transaction Rows */}
                    {group.rows.map((row, i) => (
                      <React.Fragment key={`${row.entryId}-${i}`}>
                        {/* Main Dr row */}
                        <tr className={`border-b border-dashed border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="py-1.5 px-4 font-medium text-gray-800 border-r border-gray-100">
                            {row.particulars}
                          </td>
                          <td className="py-1.5 px-3 text-center text-gray-400 text-xs border-r border-gray-100">–</td>
                          <td className="py-1.5 px-4 text-right font-mono font-semibold text-blue-800 border-r border-gray-100">
                            {row.dr != null ? INR(row.dr) : <span className="text-gray-200">–</span>}
                          </td>
                          <td className="py-1.5 px-4 text-right font-mono font-semibold text-green-800">
                            {row.cr != null ? INR(row.cr) : <span className="text-gray-200">–</span>}
                          </td>
                        </tr>
                        {/* Cr sub-row if present */}
                        {row.particularsLine2 && (
                          <tr className={`border-b border-dashed border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="py-1 px-4 pl-10 text-gray-700 border-r border-gray-100">
                              {row.particularsLine2}
                            </td>
                            <td className="py-1 px-3 text-center text-gray-300 border-r border-gray-100">–</td>
                            <td className="py-1 px-4 text-right border-r border-gray-100"><span className="text-gray-200">–</span></td>
                            <td className="py-1 px-4 text-right"></td>
                          </tr>
                        )}
                        {/* Narration */}
                        {row.narration && (
                          <tr className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-gray-50'}`}>
                            <td className="py-1 px-6 text-xs italic text-gray-400 border-r border-gray-100" colSpan={4}>
                              {row.narration}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Day Total Row */}
                    <tr className="bg-gray-100 border-t border-gray-300">
                      <td className="py-2 px-4 text-xs font-bold text-gray-600 uppercase tracking-wide border-r border-gray-300">
                        Day Total
                      </td>
                      <td className="py-2 px-3 text-center text-gray-400 border-r border-gray-300">–</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-blue-900 text-sm border-r border-gray-300 underline decoration-double">
                        {INR(group.totalDr)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-green-900 text-sm underline decoration-double">
                        {INR(group.totalCr + group.openingBalance)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    {/* Closing Balance */}
                    <tr className="bg-emerald-50 border-t-2 border-emerald-400">
                      <td className="py-2.5 px-4 font-bold text-emerald-800 flex items-center gap-1.5 border-r border-emerald-200">
                        <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
                        By Balance c/d  <span className="font-normal text-xs text-emerald-600">(Closing Balance)</span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400 border-r border-emerald-200">–</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-900 text-sm border-r border-emerald-200">
                        {INR(group.closingBalance)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-emerald-600 italic">
                        → Opens next day
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-gray-500">
                Days {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, dayGroups.length)} of {dayGroups.length}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 py-1">Page {page}/{totalPages}</span>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
