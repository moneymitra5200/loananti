'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookCopy, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const ACCOUNTS = [
  { code: 'CASH',       label: 'Cash in Hand',               type: 'ASSET',     desc: 'Physical cash received and paid' },
  { code: 'BANK',       label: 'Cash at Bank',               type: 'ASSET',     desc: 'Bank account transactions' },
  { code: 'LOANS',      label: 'Loans Given / Advances',     type: 'ASSET',     desc: 'Money lent to borrowers' },
  { code: 'INTEREST',   label: 'Interest Income',            type: 'INCOME',    desc: 'Interest earned on loans' },
  { code: 'PROCESSING', label: 'Processing Fee Income',      type: 'INCOME',    desc: 'Processing fees collected' },
  { code: 'PENALTY',    label: 'Penalty / Late Fee Income',  type: 'INCOME',    desc: 'Late payment charges collected' },
  { code: 'BORROWED',   label: 'Borrowed Funds',             type: 'LIABILITY', desc: 'Money borrowed from external sources' },
  { code: 'CAPITAL',    label: "Owner's Capital",            type: 'EQUITY',    desc: 'Capital introduced by owner' },
  { code: 'EXPENSES',   label: 'All Expenses',               type: 'EXPENSE',   desc: 'Expenses paid from business funds' },
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

export default function LedgerSection({ selectedCompanyId }: { selectedCompanyId: string }) {
  const [selectedAccount, setSelectedAccount] = useState('CASH');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/real-ledger?companyId=${selectedCompanyId}&account=${selectedAccount}&startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success) setLedger(data.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [selectedCompanyId, selectedAccount, startDate, endDate]);

  const acctInfo = ACCOUNTS.find(a => a.code === selectedAccount);

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
                <SelectContent>
                  {ACCOUNTS.map(a => (
                    <SelectItem key={a.code} value={a.code}>
                      <span className="font-medium">{a.label}</span>
                      <span className="ml-2 text-xs text-gray-400">({a.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <p className={`text-lg font-bold ${ledger.openingBalance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(Math.abs(ledger.openingBalance))}</p>
              <p className="text-xs text-gray-400">{ledger.openingBalance >= 0 ? '(Dr)' : '(Cr)'}</p>
            </div>
            <div className="p-4 border-r text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Period Activity</p>
              <p className="text-sm text-blue-700 font-semibold">Dr: {fmt(ledger.totalDebit)}</p>
              <p className="text-sm text-green-700 font-semibold">Cr: {fmt(ledger.totalCredit)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Closing Balance</p>
              <p className={`text-lg font-bold ${ledger.closingBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(Math.abs(ledger.closingBalance))}</p>
              <p className="text-xs text-gray-400">{ledger.closingBalance >= 0 ? '(Dr)' : '(Cr)'}</p>
            </div>
          </div>

          {/* Transaction table — always show, opening balance always visible */}
          <ScrollArea className="max-h-[500px]">
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
                {/* Opening balance row — always shown */}
                <tr className="bg-blue-50 border-b">
                  <td className="py-2 px-4 text-xs text-gray-500">{format(new Date(startDate), 'dd MMM yyyy')}</td>
                  <td className="py-2 px-4 font-medium text-gray-700" colSpan={2}>Opening Balance b/d</td>
                  <td className="py-2 px-4 text-right font-mono text-blue-700">{ledger.openingBalance > 0 ? fmt(ledger.openingBalance) : '—'}</td>
                  <td className="py-2 px-4 text-right font-mono text-green-700">{ledger.openingBalance < 0 ? fmt(Math.abs(ledger.openingBalance)) : '—'}</td>
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
                    <td className={`py-2 px-4 text-right font-mono font-medium ${row.debit > 0 ? 'text-blue-700' : 'text-gray-200'}`}>
                      {row.debit > 0 ? fmt(row.debit) : '—'}
                    </td>
                    <td className={`py-2 px-4 text-right font-mono font-medium ${row.credit > 0 ? 'text-green-700' : 'text-gray-200'}`}>
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
                  <td className="py-2.5 px-4 text-xs text-gray-600" colSpan={4}>Closing Balance c/d</td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-800"></td>
                  <td className={`py-2.5 px-4 text-right font-mono text-lg font-bold ${ledger.closingBalance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {fmt(ledger.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </ScrollArea>
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
