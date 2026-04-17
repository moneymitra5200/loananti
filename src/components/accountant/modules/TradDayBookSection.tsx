'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, BookOpen, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────
interface JournalLine {
  id: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  account?: { accountCode: string; accountName: string };
}

interface DayEntry {
  id: string;
  source: 'CASHBOOK' | 'BANK' | 'JOURNAL';
  entryDate: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  amount: number;
  entryType?: string | null;
  transactionType?: string | null;
  lines?: JournalLine[];
  createdAt?: string;
}

// One "voucher" to display: a list of Dr lines, a list of Cr lines, narration
interface Voucher {
  entryId: string;
  dateStr: string;   // formatted – shown only on first displayed row
  drLines: { account: string; amount: number }[];
  crLines: { account: string; amount: number }[];
  narration: string;
  balanceImpact: number; // +ve = cash in, -ve = cash out
}

// ─────────────────────────────────────────────────
// ACCOUNT HEAD MAPPING  (referenceType → names)
// ─────────────────────────────────────────────────
function resolveAccounts(
  entry: DayEntry
): { drLines: { account: string; amount: number }[]; crLines: { account: string; amount: number }[] } {
  const amt = entry.amount;
  const isBank = entry.source === 'BANK';
  const cashLabel = isBank ? 'Bank A/c' : 'Cash in Hand A/c';
  const isCredit =
    entry.entryType === 'CREDIT' || entry.transactionType === 'CREDIT';
  const ref = (entry.referenceType || '').toUpperCase();

  // ── JOURNAL with lines → use real account names ────────────────────
  if (entry.source === 'JOURNAL' && entry.lines && entry.lines.length > 0) {
    const drLines = entry.lines
      .filter(l => l.debitAmount > 0)
      .map(l => ({ account: l.account?.accountName || 'Account', amount: l.debitAmount }));
    const crLines = entry.lines
      .filter(l => l.creditAmount > 0)
      .map(l => ({ account: l.account?.accountName || 'Account', amount: l.creditAmount }));
    return { drLines, crLines };
  }

  // ── CASHBOOK / BANK – map by referenceType ─────────────────────────
  // Loan disbursement (money out)
  if (ref.includes('OFFLINE_LOAN') || ref.includes('LOAN_DISBURSEMENT') || ref === 'ONLINE_LOAN') {
    return {
      drLines: [{ account: 'Loans Receivable A/c', amount: amt }],
      crLines: [{ account: cashLabel, amount: amt }],
    };
  }

  // EMI / repayment (money in)
  if (ref.includes('EMI_PAYMENT') || ref.includes('REPAYMENT')) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: 'Loans Receivable A/c', amount: amt }],
    };
  }

  // Processing fee income
  if (ref.includes('PROCESSING_FEE')) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: 'Processing Fee Income A/c', amount: amt }],
    };
  }

  // Mirror EMI / Mirror interest
  if (ref.includes('MIRROR')) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: 'Interest Income A/c', amount: amt }],
    };
  }

  // Interest-only payment
  if (ref.includes('INTEREST_ONLY') || ref.includes('INTEREST')) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: 'Interest Income A/c', amount: amt }],
    };
  }

  // Equity / Capital
  if (ref.includes('EQUITY') || ref.includes('CAPITAL')) {
    return isCredit
      ? { drLines: [{ account: cashLabel, amount: amt }], crLines: [{ account: "Owner's Capital A/c", amount: amt }] }
      : { drLines: [{ account: "Owner's Capital A/c", amount: amt }], crLines: [{ account: cashLabel, amount: amt }] };
  }

  // Borrowing (money in – loan taken)
  if (ref.includes('BORROW') || ref.includes('LOAN_TAKEN')) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: 'Loans Payable A/c', amount: amt }],
    };
  }

  // Repay borrowing (money out)
  if (ref.includes('REPAY_BORROW')) {
    return {
      drLines: [{ account: 'Loans Payable A/c', amount: amt }],
      crLines: [{ account: cashLabel, amount: amt }],
    };
  }

  // Expense (money out)
  if (ref.includes('EXPENSE')) {
    const expName = entry.description || 'Expense';
    return {
      drLines: [{ account: `${expName} A/c`, amount: amt }],
      crLines: [{ account: cashLabel, amount: amt }],
    };
  }

  // Extra EMI profit
  if (ref.includes('EXTRA_EMI')) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: 'Extra EMI Income A/c', amount: amt }],
    };
  }

  // Manual / generic fallback
  const desc = entry.description || 'Account';
  if (isCredit) {
    return {
      drLines: [{ account: cashLabel, amount: amt }],
      crLines: [{ account: `${desc} A/c`, amount: amt }],
    };
  }
  return {
    drLines: [{ account: `${desc} A/c`, amount: amt }],
    crLines: [{ account: cashLabel, amount: amt }],
  };
}

function entryToVoucher(entry: DayEntry): Voucher {
  const { drLines, crLines } = resolveAccounts(entry);
  const isCredit =
    entry.entryType === 'CREDIT' ||
    entry.transactionType === 'CREDIT' ||
    (entry.source === 'JOURNAL' && crLines.reduce((s, l) => s + l.amount, 0) >= drLines.reduce((s, l) => s + l.amount, 0));

  const netCr = crLines.reduce((s, l) => s + l.amount, 0);
  const netDr = drLines.reduce((s, l) => s + l.amount, 0);

  return {
    entryId: entry.id,
    dateStr: format(new Date(entry.entryDate), 'dd/MM'),
    drLines,
    crLines,
    narration: `Being ${entry.description || entry.referenceType?.replace(/_/g, ' ') || 'transaction'}`,
    balanceImpact: netCr - netDr,
  };
}

// ─────────────────────────────────────────────────
// DAY GROUP
// ─────────────────────────────────────────────────
interface DayGroup {
  dateLabel: string;      // e.g. "17 Apr 2026 (Fri)"
  dateKey: string;        // yyyy-MM-dd for sorting
  openingBalance: number;
  closingBalance: number;
  totalDr: number;
  totalCr: number;
  vouchers: Voucher[];
}

function buildDayGroups(entries: DayEntry[], openingBalance: number): DayGroup[] {
  const byDate: Record<string, DayEntry[]> = {};
  for (const e of entries) {
    const d = e.entryDate.split('T')[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  }

  const sortedDates = Object.keys(byDate).sort();
  const groups: DayGroup[] = [];
  let running = openingBalance;

  for (const dateKey of sortedDates) {
    const dayEntries = byDate[dateKey];
    const dayOpen = running;
    // Sort entries within day: newest first (by created time)
    dayEntries.sort((a, b) => new Date(b.createdAt || b.entryDate).getTime() - new Date(a.createdAt || a.entryDate).getTime());
    const vouchers = dayEntries.map(entryToVoucher);

    const dayDr = vouchers.reduce((s, v) => s + v.drLines.reduce((ss, l) => ss + l.amount, 0), 0);
    const dayCr = vouchers.reduce((s, v) => s + v.crLines.reduce((ss, l) => ss + l.amount, 0), 0);
    const dayClose = dayOpen + dayCr - dayDr;
    running = dayClose;

    groups.push({
      dateLabel: format(new Date(dateKey), 'dd MMM yyyy (EEE)'),
      dateKey,
      openingBalance: dayOpen,
      closingBalance: dayClose,
      totalDr: dayDr,
      totalCr: dayCr,
      vouchers,
    });
  }

  return groups.reverse(); // newest first
}

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
const INR = (n: number) =>
  '₹' + Math.abs(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PER_PAGE = 7;

// ─────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [selectedCompanyId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const dayGroups = buildDayGroups(entries, openingBalance);
  const totalPages = Math.ceil(dayGroups.length / PER_PAGE);
  const pagedGroups = dayGroups.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const lastGroup = dayGroups[0]; // newest = first after reverse
  const periodClose = lastGroup?.closingBalance ?? openingBalance;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Day Book
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Date | Particulars (Dr.) / To (Cr.) | L.F. | Debit | Credit — grouped by day
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

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Opening Balance', val: INR(openingBalance), cls: 'text-gray-700', sub: 'Start of period' },
          { label: 'Total Debit', val: INR(dayGroups.reduce((s, g) => s + g.totalDr, 0)), cls: 'text-blue-700', sub: 'Cash / Bank out' },
          { label: 'Total Credit', val: INR(dayGroups.reduce((s, g) => s + g.totalCr, 0)), cls: 'text-green-700', sub: 'Cash / Bank in' },
          { label: 'Closing Balance', val: INR(periodClose), cls: 'text-emerald-700 font-bold', sub: 'End of period' },
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

      {/* ── Content ── */}
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-emerald-500" /></div>
      ) : dayGroups.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-500">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No entries found for this period</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {pagedGroups.map((group, gIdx) => {
            // Calculate running balance for each voucher
            let runningBal = group.openingBalance;
            const vouchersWithBal = group.vouchers.map(v => {
              const bal = runningBal + v.balanceImpact;
              runningBal = bal;
              return { ...v, runningBalance: bal };
            });

            return (
            <Card key={group.dateKey} className="border shadow-md overflow-hidden">
              {/* Day header bar */}
              <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {format(new Date(group.dateKey), 'dd')}
                  </div>
                  <div>
                    <span className="font-bold text-lg">{group.dateLabel}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="bg-emerald-500 text-white text-[10px]">
                        {group.vouchers.length} {group.vouchers.length === 1 ? 'entry' : 'entries'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Opening</p>
                      <p className="font-mono font-bold text-amber-300">{INR(group.openingBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Closing</p>
                      <p className="font-mono font-bold text-emerald-300">{INR(group.closingBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  {/* Column headers */}
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-14 border-r border-slate-200">#</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 border-r border-slate-200">
                        Particulars (Accounts &amp; Explanation)
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 w-10 border-r border-slate-200">L.F.</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-blue-700 w-28 border-r border-slate-200">Debit (₹)</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-green-700 w-28 border-r border-slate-200">Credit (₹)</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-purple-700 w-32">Balance (₹)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* Opening balance row - highlighted */}
                    <tr className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-300">
                      <td className="py-3 px-3 text-center border-r border-amber-200">
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center mx-auto">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-amber-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-800 text-base">To Balance b/d</span>
                          <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">(Opening Balance)</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1 italic">Brought forward from previous day</p>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-300 border-r border-amber-200">–</td>
                      <td className="py-3 px-3 border-r border-amber-200"></td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-800 text-base border-r border-amber-200">
                        {INR(group.openingBalance)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-800 text-base bg-amber-100">
                        {INR(group.openingBalance)}
                      </td>
                    </tr>

                    {/* Voucher rows */}
                    {vouchersWithBal.map((v, vi) => {
                      const isIncome = v.balanceImpact > 0;
                      const isEven = vi % 2 === 0;
                      const bgBase = isIncome 
                        ? (isEven ? 'bg-emerald-50/50' : 'bg-emerald-50/30')
                        : (isEven ? 'bg-rose-50/50' : 'bg-rose-50/30');

                      return (
                        <React.Fragment key={v.entryId}>
                          {/* Separator between vouchers */}
                          {vi > 0 && (
                            <tr><td colSpan={6} className="py-0.5 bg-gray-100"></td></tr>
                          )}

                          {/* Dr lines — each on its own row */}
                          {v.drLines.map((dl, di) => (
                            <tr key={`dr-${di}`} className={`${bgBase} hover:bg-opacity-70 transition-colors`}>
                              <td className="py-2 px-3 text-center text-xs text-gray-400 font-medium border-r border-gray-200 align-top">
                                {di === 0 ? vi + 1 : ''}
                              </td>
                              <td className="py-2 px-4 font-semibold text-gray-800 border-r border-gray-200">
                                <span className="text-blue-700">{dl.account}</span>
                                <span className="text-xs text-gray-400 ml-1">(Dr.)</span>
                              </td>
                              <td className="py-2 px-2 text-center text-gray-300 text-xs border-r border-gray-200">–</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-blue-800 border-r border-gray-200 bg-blue-50/30">
                                {INR(dl.amount)}
                              </td>
                              <td className="py-2 px-3 border-r border-gray-200"></td>
                              <td className="py-2 px-3 border-r border-gray-200"></td>
                            </tr>
                          ))}

                          {/* Cr lines — indented "To …" */}
                          {v.crLines.map((cl, ci) => (
                            <tr key={`cr-${ci}`} className={`${bgBase} hover:bg-opacity-70 transition-colors`}>
                              <td className="py-2 px-3 border-r border-gray-200"></td>
                              <td className="py-2 px-4 border-r border-gray-200">
                                <span className="pl-6 text-gray-600">To&nbsp;&nbsp;</span>
                                <span className="text-green-700 font-semibold">{cl.account}</span>
                                <span className="text-xs text-gray-400 ml-1">(Cr.)</span>
                              </td>
                              <td className="py-2 px-2 text-center text-gray-300 text-xs border-r border-gray-200">–</td>
                              <td className="py-2 px-3 border-r border-gray-200"></td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-green-800 bg-green-50/30 border-r border-gray-200">
                                {INR(cl.amount)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold border-r border-gray-200 bg-slate-50">
                                <span className={v.runningBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                                  {INR(v.runningBalance)}
                                </span>
                              </td>
                            </tr>
                          ))}

                          {/* Narration row with impact indicator */}
                          <tr className={`${isIncome ? 'bg-emerald-100/50' : 'bg-rose-100/50'} border-b border-dashed border-gray-300`}>
                            <td className="py-1.5 px-3 border-r border-gray-200"></td>
                            <td className="py-1.5 px-4 border-r border-gray-200" colSpan={3}>
                              <span className="text-xs text-gray-500 italic">({v.narration})</span>
                            </td>
                            <td className="py-1.5 px-3 text-center border-r border-gray-200">
                              {isIncome ? (
                                <span className="text-xs text-emerald-600 font-medium">▲ Income</span>
                              ) : (
                                <span className="text-xs text-rose-600 font-medium">▼ Expense</span>
                              )}
                            </td>
                            <td className={`py-1.5 px-3 text-right border-r border-gray-200 font-mono text-xs ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isIncome ? '+' : ''}{INR(v.balanceImpact)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {/* Day total row - highlighted */}
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-400">
                      <td className="py-3 px-3 border-r border-slate-300"></td>
                      <td className="py-3 px-4 border-r border-slate-300">
                        <span className="font-bold text-gray-700 uppercase tracking-wide">Day Total</span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-400 border-r border-slate-300">–</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-900 border-r border-slate-300 bg-blue-100/50">
                        <span className="underline decoration-double">{INR(group.totalDr)}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-green-900 border-r border-slate-300 bg-green-100/50">
                        <span className="underline decoration-double">{INR(group.totalCr + group.openingBalance)}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 bg-slate-200/50">
                        {INR(group.closingBalance)}
                      </td>
                    </tr>
                  </tbody>

                  {/* Closing balance footer - highlighted */}
                  <tfoot>
                    <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-400">
                      <td className="py-3 px-3 border-r border-emerald-200">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-emerald-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-800 text-base">By Balance c/d</span>
                          <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">(Closing Balance)</span>
                        </div>
                        <p className="text-xs text-emerald-600 mt-1 italic">Carried forward to next day</p>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-400 border-r border-emerald-200">–</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 text-base border-r border-emerald-200 bg-emerald-100/50">
                        {INR(group.closingBalance)}
                      </td>
                      <td className="py-3 px-3 border-r border-emerald-200"></td>
                      <td className="py-3 px-3 text-center text-xs font-medium text-emerald-700 bg-emerald-100">
                        → Opens next day
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Connector to next day */}
              {gIdx < pagedGroups.length - 1 && (
                <div className="bg-gray-100 py-2 px-4 flex items-center justify-center gap-2 text-xs text-gray-500 border-t border-b">
                  <div className="h-px w-12 bg-gray-300"></div>
                  <span className="font-medium">Carried forward: {INR(group.closingBalance)}</span>
                  <span>→</span>
                  <span className="font-medium">Opens next day</span>
                  <div className="h-px w-12 bg-gray-300"></div>
                </div>
              )}
            </Card>
          );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-gray-500">
                Days {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, dayGroups.length)} of {dayGroups.length}
              </span>
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">Page {page}/{totalPages}</span>
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
