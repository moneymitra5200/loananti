'use client';

import React, { memo, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download, FileSpreadsheet, FileImage, FileText, Printer, ChevronDown,
  CheckCircle, XCircle, Search
} from 'lucide-react';
import {
  exportTrialBalanceCSV, exportAsPDF, exportAsImage, exportAsWord, printToPDF
} from '@/utils/accountingExport';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { badge: string; row: string }> = {
  ASSET:     { badge: 'bg-blue-100 text-blue-700 border-blue-300',     row: 'bg-blue-50/30' },
  LIABILITY: { badge: 'bg-orange-100 text-orange-700 border-orange-300', row: 'bg-orange-50/30' },
  EQUITY:    { badge: 'bg-purple-100 text-purple-700 border-purple-300', row: 'bg-purple-50/30' },
  INCOME:    { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', row: 'bg-emerald-50/30' },
  EXPENSE:   { badge: 'bg-red-100 text-red-700 border-red-300',         row: 'bg-red-50/30' },
};

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── Types ─────────────────────────────────────────────────────────────────────
interface TBItem {
  accountId?: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
  openingBalance?: number;
  totalDebit?: number;
  totalCredit?: number;
  closingBalance?: number;
  isActualBalance?: boolean;
}

interface TrialBalanceTabProps {
  trialBalance?: TBItem[] | null;
  trialBalanceData?: {
    trialBalance?: TBItem[];
    totalDebits?: number;
    totalCredits?: number;
    isBalanced?: boolean;
    difference?: number;
    asOfDate?: string | Date;
    entryCount?: number;
  } | null;
  handleExportReport?: (type: string) => void;
  formatCurrency?: (n: number) => string;
  formatDate?: (d: Date | string) => string;
  getAccountTypeColor?: (type: string) => string;
  companyName?: string;
}

const ELEMENT_ID = 'trial-balance-printable';

function TrialBalanceTabComponent({
  trialBalance: tbArray,
  trialBalanceData,
  handleExportReport,
  formatCurrency = INR,
  formatDate,
  companyName = 'Company',
}: TrialBalanceTabProps) {
  const [search, setSearch] = useState('');
  const [groupByType, setGroupByType] = useState(true);

  // Resolve data from either prop format
  const items: TBItem[] = useMemo(
    () => trialBalanceData?.trialBalance || tbArray || [],
    [trialBalanceData, tbArray]
  );

  const totalDr  = trialBalanceData?.totalDebits  ?? items.reduce((s, i) => s + (i.debitBalance || 0), 0);
  const totalCr  = trialBalanceData?.totalCredits ?? items.reduce((s, i) => s + (i.creditBalance || 0), 0);
  const isBalanced = trialBalanceData?.isBalanced ?? (Math.abs(totalDr - totalCr) < 0.01);
  const difference  = trialBalanceData?.difference  ?? Math.abs(totalDr - totalCr);
  const entryCount  = trialBalanceData?.entryCount;
  const asOfDate    = trialBalanceData?.asOfDate ? new Date(trialBalanceData.asOfDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

  // Filter + group
  const filtered = useMemo(() =>
    items.filter(i =>
      !search ||
      i.accountName.toLowerCase().includes(search.toLowerCase()) ||
      i.accountCode.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

  const grouped = useMemo(() => {
    if (!groupByType) return { ALL: filtered };
    return filtered.reduce<Record<string, TBItem[]>>((acc, item) => {
      const k = item.accountType || 'OTHER';
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }, [filtered, groupByType]);

  const typeOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'OTHER', 'ALL'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  const handleCSV = () => exportTrialBalanceCSV({ trialBalance: items }, companyName);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
          <p className="text-sm text-gray-500">
            As on {asOfDate}
            {entryCount !== undefined && ` · ${entryCount} journal entries`}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Balance indicator */}
          {isBalanced
            ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 px-3 py-1">
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Balanced ✓
              </Badge>
            : <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1">
                <XCircle className="h-3.5 w-3.5 mr-1" /> Diff: {INR(difference)}
              </Badge>
          }

          {/* Group toggle */}
          <Button
            variant={groupByType ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupByType(v => !v)}
            className={groupByType ? 'bg-slate-700 text-white' : ''}
          >
            Group by Type
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <Download className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download As</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel / CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsPDF(ELEMENT_ID, `TrialBalance_${companyName}`, `Trial Balance — ${companyName}`)}>
                <FileText className="h-4 w-4 mr-2 text-red-600" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsImage(ELEMENT_ID, `TrialBalance_${companyName}`)}>
                <FileImage className="h-4 w-4 mr-2 text-blue-600" /> Image (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsWord(ELEMENT_ID, `TrialBalance_${companyName}`, `Trial Balance — ${companyName}`)}>
                <FileText className="h-4 w-4 mr-2 text-indigo-600" /> Word (.doc)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => printToPDF(ELEMENT_ID, `Trial Balance — ${companyName}`)}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search accounts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── PRINTABLE TABLE ── */}
      <div id={ELEMENT_ID} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden print:block text-center py-4 border-b">
          <h1 className="text-xl font-bold">{companyName}</h1>
          <h2 className="text-lg font-semibold">Trial Balance</h2>
          <p className="text-sm text-gray-600">As on {asOfDate}</p>
        </div>

        <div className="max-w-full">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-700 hover:bg-slate-700">
                <TableHead className="text-white font-semibold text-xs uppercase w-24">Code</TableHead>
                <TableHead className="text-white font-semibold text-xs uppercase">Account Name</TableHead>
                <TableHead className="text-white font-semibold text-xs uppercase w-28">Type</TableHead>
                <TableHead className="text-white font-semibold text-xs uppercase text-right w-32">Debit (₹)</TableHead>
                <TableHead className="text-white font-semibold text-xs uppercase text-right w-32">Credit (₹)</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedGroups.map(groupKey => {
                const groupItems = grouped[groupKey];
                const colors = TYPE_COLORS[groupKey] || TYPE_COLORS.INCOME;
                const groupDr = groupItems.reduce((s, i) => s + (i.debitBalance || 0), 0);
                const groupCr = groupItems.reduce((s, i) => s + (i.creditBalance || 0), 0);

                return (
                  <React.Fragment key={groupKey}>
                    {/* Group header row */}
                    {groupByType && groupKey !== 'ALL' && (
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableCell colSpan={3} className="py-2 px-4 font-bold text-slate-700 text-xs uppercase tracking-wider">
                          {groupKey} ACCOUNTS
                        </TableCell>
                        <TableCell className="py-2 px-4 text-right font-bold text-slate-700 text-xs font-mono">{groupDr > 0 ? INR(groupDr) : '—'}</TableCell>
                        <TableCell className="py-2 px-4 text-right font-bold text-slate-700 text-xs font-mono">{groupCr > 0 ? INR(groupCr) : '—'}</TableCell>
                      </TableRow>
                    )}

                    {groupItems.map(item => (
                      <TableRow key={item.accountCode} className={`${colors.row} border-b border-gray-50`}>
                        <TableCell className="font-mono text-xs text-gray-500 py-2.5">{item.accountCode}</TableCell>
                        <TableCell className="py-2.5 text-sm">
                          <span className="text-gray-800">{item.accountName}</span>
                          {item.isActualBalance && (
                            <span className="ml-2 text-xs text-blue-500 italic">(actual)</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className={`text-xs ${colors.badge}`}>{item.accountType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-2.5 text-gray-900">
                          {item.debitBalance > 0 ? INR(item.debitBalance) : <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-2.5 text-gray-900">
                          {item.creditBalance > 0 ? INR(item.creditBalance) : <span className="text-gray-300">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 italic">
                    No accounts found{search ? ` for "${search}"` : ''}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals row */}
        <div className={`border-t-2 ${isBalanced ? 'border-emerald-400' : 'border-red-400'}`}>
          <Table>
            <TableBody>
              <TableRow className="bg-slate-700 hover:bg-slate-700 text-white">
                <TableCell className="py-3 px-4 font-bold text-sm uppercase tracking-wide" colSpan={3}>
                  TOTAL ({filtered.length} accounts)
                </TableCell>
                <TableCell className="py-3 px-4 text-right font-bold font-mono text-base">{INR(totalDr)}</TableCell>
                <TableCell className="py-3 px-4 text-right font-bold font-mono text-base">{INR(totalCr)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Balance check */}
        <div className={`px-6 py-3 flex items-center gap-3 text-sm ${
          isBalanced ? 'bg-emerald-50' : 'bg-red-50'
        }`}>
          {isBalanced
            ? <><CheckCircle className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700 font-medium">Trial Balance is Balanced — Total Debit = Total Credit ✓</span></>
            : <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-700 font-medium">Imbalance: Dr exceeds Cr by {INR(difference)}</span></>
          }
          <div className="ml-auto flex gap-4 text-xs text-gray-500">
            <span>Total Dr: <strong className="text-gray-700">{INR(totalDr)}</strong></span>
            <span>Total Cr: <strong className="text-gray-700">{INR(totalCr)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TrialBalanceTabComponent);
