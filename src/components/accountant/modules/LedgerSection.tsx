'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useAutoRefresh, useRelativeTime } from '@/hooks/useAutoRefresh';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, BookCopy, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const PRESET_ACCOUNTS = [
  { code: 'CASH',       label: 'Cash in Hand (Summary)',     type: 'ASSET',     desc: 'Physical cash received and paid' },
  { code: 'BANK',       label: 'Cash at Bank (Summary)',     type: 'ASSET',     desc: 'Bank account transactions' },
  { code: 'LOANS',      label: 'Loans Given / Advances (Summary)', type: 'ASSET', desc: 'Money lent to borrowers' },
  { code: 'INTEREST',   label: 'Interest Income (Summary)',  type: 'INCOME',    desc: 'Interest earned on loans' },
  { code: 'PROCESSING', label: 'Processing Fee Income (Summary)', type: 'INCOME', desc: 'Processing fees collected' },
  { code: 'PENALTY',    label: 'Penalty / Late Fee Income (Summary)', type: 'INCOME', desc: 'Late payment charges collected' },
  { code: 'BORROWED',   label: 'Borrowed Funds (Summary)',   type: 'LIABILITY', desc: 'Money borrowed from external sources' },
  { code: 'CAPITAL',    label: "Owner's Capital (Summary)",  type: 'EQUITY',    desc: 'Capital introduced by owner' },
  { code: 'EXPENSES',   label: 'All Expenses (Summary)',     type: 'EXPENSE',   desc: 'Expenses paid from business funds' },
];

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'text-blue-700 bg-blue-50', INCOME: 'text-green-700 bg-green-50',
  LIABILITY: 'text-red-700 bg-red-50', EQUITY: 'text-purple-700 bg-purple-50',
  EXPENSE: 'text-orange-700 bg-orange-50',
};

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n || 0);

interface LedgerRow { date: string; particulars: string; referenceNo: string; debit: number; credit: number; balance: number; }
interface LedgerData {
  accountName: string; accountCode: string; accountType: string;
  openingBalance: number; transactions: LedgerRow[];
  closingBalance: number; totalDebit: number; totalCredit: number;
}
interface COAItem { code: string; label: string; type: string; desc: string; }

export default function LedgerSection({ selectedCompanyId, refreshKey = 0, selectedYear }: { selectedCompanyId: string; refreshKey?: number; selectedYear?: string }) {
  const getFYStartDate = () => {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-04-01`;
  };

  const [selectedAccount, setSelectedAccount] = useState('CASH');
  const [startDate, setStartDate] = useState(getFYStartDate());
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbAccounts, setDbAccounts] = useState<COAItem[]>([]);

  useEffect(() => {
    if (selectedYear === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    } else if (selectedYear) {
      const yr = parseInt(selectedYear);
      if (!isNaN(yr)) {
        setStartDate(`${yr}-04-01`);
        setEndDate(`${yr + 1}-03-31`);
      }
    }
  }, [selectedYear]);

  const setPeriodFY = () => {
    setStartDate(getFYStartDate());
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const setPeriodMonth = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const setPeriodAllTime = () => {
    setStartDate('2020-01-01');
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Fetch Chart of Accounts for company
  useEffect(() => {
    if (!selectedCompanyId) return;
    fetch(`/api/accounting?action=chart-of-accounts&companyId=${selectedCompanyId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.accounts) {
          const list: COAItem[] = data.data.accounts.map((a: any) => ({
            code: a.accountCode,
            label: `${a.accountCode} — ${a.accountName}`,
            type: a.accountType,
            desc: `Account Head (${a.accountCode})`
          }));
          setDbAccounts(list);
        }
      })
      .catch(() => {});
  }, [selectedCompanyId]);

  // Combine presets and dynamic COA accounts
  const allAccountOptions: COAItem[] = [...PRESET_ACCOUNTS];
  for (const acc of dbAccounts) {
    if (!allAccountOptions.some(a => a.code === acc.code)) {
      allAccountOptions.push(acc);
    }
  }

  const load = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/accounting/real-ledger?companyId=${selectedCompanyId}&account=${selectedAccount}&startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }
      );
      const data = await res.json();
      if (data.success) setLedger(data.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [selectedCompanyId, selectedAccount, startDate, endDate, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const { lastUpdated: ldLastUpdated } = useAutoRefresh({
    onRefresh: load,
    intervalMs: 0,
    enabled: !!selectedCompanyId && !!ledger,
  });
  const ldUpdatedLabel = useRelativeTime(ldLastUpdated);

  const acctInfo = allAccountOptions.find(a => a.code === selectedAccount) || {
    code: ledger?.accountCode || selectedAccount,
    label: ledger?.accountName || selectedAccount,
    type: ledger?.accountType || 'ASSET',
    desc: `Account Code: ${ledger?.accountCode || selectedAccount}`
  };

  const isCreditNormal = ['EQUITY', 'LIABILITY', 'INCOME'].includes(ledger?.accountType || acctInfo.type);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookCopy className="h-5 w-5 text-indigo-600" />
          Ledger Account View
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Individual account ledger — derived from Daybook entries. Shows opening balance, all transactions, and closing balance.</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-gray-500 block mb-1">Select Account Head</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {allAccountOptions.map(a => (
                    <SelectItem key={a.code} value={a.code}>
                      <span className="font-medium">{a.label}</span>
                      <span className="ml-2 text-xs text-gray-400">({a.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <Button variant={startDate === getFYStartDate() ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8" onClick={setPeriodFY}>
                Current FY
              </Button>
              <Button variant={startDate === format(startOfMonth(new Date()), 'yyyy-MM-dd') ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8" onClick={setPeriodMonth}>
                This Month
              </Button>
              <Button variant={startDate === '2020-01-01' ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8" onClick={setPeriodAllTime}>
                All Time
              </Button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-36" />
            </div>
            <Button onClick={load} disabled={loading} className="h-9 bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Show Ledger
            </Button>
            {ldUpdatedLabel && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live · {ldUpdatedLabel}
              </span>
            )}
          </div>
          {acctInfo && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[acctInfo.type]}`}>{acctInfo.type}</span>
              <span className="text-xs text-gray-500">{acctInfo.desc}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-indigo-500" /></div>
      ) : ledger ? (
        <Card className="overflow-hidden">
          {/* Ledger Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white p-4">
            <h3 className="font-bold text-lg">{ledger.accountName}</h3>
            <p className="text-indigo-200 text-sm">Account Code: {ledger.accountCode} | Period: {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}</p>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 border-b">
            <div className="p-4 border-r text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Opening Balance</p>
              <p className={`text-lg font-bold ${isCreditNormal ? (ledger.openingBalance >= 0 ? 'text-green-700' : 'text-red-600') : (ledger.openingBalance >= 0 ? 'text-blue-700' : 'text-red-600')}`}>
                {fmt(Math.abs(ledger.openingBalance))}
              </p>
              <p className="text-xs text-gray-400">
                {isCreditNormal ? (ledger.openingBalance >= 0 ? '(Cr)' : '(Dr)') : (ledger.openingBalance >= 0 ? '(Dr)' : '(Cr)')}
              </p>
            </div>
            <div className="p-4 border-r text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Period Activity</p>
              <p className="text-sm text-blue-700 font-semibold">Dr: {fmt(ledger.totalDebit)}</p>
              <p className="text-sm text-green-700 font-semibold">Cr: {fmt(ledger.totalCredit)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Closing Balance</p>
              <p className={`text-lg font-bold ${ledger.closingBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmt(Math.abs(ledger.closingBalance))}
              </p>
              <p className="text-xs text-gray-400">
                {isCreditNormal ? (ledger.closingBalance >= 0 ? '(Cr)' : '(Dr)') : (ledger.closingBalance >= 0 ? '(Dr)' : '(Cr)')}
              </p>
            </div>
          </div>

          {/* Transaction table */}
          <div className="max-w-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 w-28">Date</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500">Particulars</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 w-32">Ref No.</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-blue-700 w-32">Dr (₹)</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-green-700 w-32">Cr (₹)</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-700 w-36">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                <tr className="bg-blue-50/70 border-b font-medium">
                  <td className="py-2 px-4 text-xs text-gray-500">{format(new Date(startDate), 'dd MMM yyyy')}</td>
                  <td className="py-2 px-4 font-semibold text-gray-700" colSpan={2}>Opening Balance b/d</td>
                  <td className="py-2 px-4 text-right font-mono text-blue-700">
                    {!isCreditNormal && ledger.openingBalance !== 0 ? fmt(Math.abs(ledger.openingBalance)) : '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-green-700">
                    {isCreditNormal && ledger.openingBalance !== 0 ? fmt(Math.abs(ledger.openingBalance)) : '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-semibold">{fmt(ledger.openingBalance)}</td>
                </tr>
                {ledger.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400 text-sm italic">No transactions in this period</td>
                  </tr>
                ) : ledger.transactions.map((row, i) => (
                  <tr key={i} className={`border-b border-dashed ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-indigo-50/30 transition-colors`}>
                    <td className="py-2 px-4 text-xs text-gray-500 whitespace-nowrap">{format(new Date(row.date), 'dd MMM yyyy')}</td>
                    <td className="py-2 px-4 text-gray-800 max-w-xs truncate">{row.particulars}</td>
                    <td className="py-2 px-4 text-xs text-gray-400 font-mono truncate">{row.referenceNo}</td>
                    <td className={`py-2 px-4 text-right font-mono font-medium ${row.debit > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                      {row.debit > 0 ? fmt(row.debit) : '—'}
                    </td>
                    <td className={`py-2 px-4 text-right font-mono font-medium ${row.credit > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                      {row.credit > 0 ? fmt(row.credit) : '—'}
                    </td>
                    <td className={`py-2 px-4 text-right font-mono font-semibold ${row.balance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {fmt(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Totals */}
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td className="py-2.5 px-4 text-xs uppercase tracking-wide text-gray-600" colSpan={3}>TOTAL</td>
                  <td className="py-2.5 px-4 text-right font-mono text-blue-800 underline decoration-double">{fmt(ledger.totalDebit)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-green-800 underline decoration-double">{fmt(ledger.totalCredit)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-gray-800"></td>
                </tr>
                {/* Closing balance */}
                <tr className="bg-emerald-50 border-t font-bold">
                  <td className="py-2.5 px-4 text-xs text-gray-600" colSpan={4}>
                    Closing Balance c/d {isCreditNormal ? '(Cr)' : '(Dr)'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-800"></td>
                  <td className={`py-2.5 px-4 text-right font-mono text-lg font-bold ${ledger.closingBalance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {fmt(ledger.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-14 text-center text-gray-400">
            <BookCopy className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select an account and click "Show Ledger"</p>
            <p className="text-sm mt-1">All transactions for the selected account will appear here with running balance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
