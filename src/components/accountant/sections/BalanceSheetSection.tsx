'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Download, FileSpreadsheet, FileImage, FileText, Printer, ChevronDown,
  CheckCircle, XCircle, ChevronRight
} from 'lucide-react';
import {
  exportBalanceSheetCSV, exportAsPDF, exportAsImage, exportAsWord, printToPDF
} from '@/utils/accountingExport';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BSItem {
  accountCode?: string;
  accountName?: string;
  name?: string;
  amount: number;
  isSection?: boolean;
  isHead?: boolean;
  isSubHead?: boolean;
  subAccounts?: BSItem[];
  type?: string;
  isCalculated?: boolean;
  details?: { name?: string; accountName?: string; amount: number }[];
}

interface BalanceSheetData {
  // Format A (from /api/accounting/reports/balance-sheet)
  assets?: BSItem[];
  liabilities?: BSItem[];
  equity?: BSItem[];
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  // Format B (from /api/accountant/balance-sheet)
  leftSide?: { title: string; items: BSItem[]; total: number };
  rightSide?: { title: string; items: BSItem[]; total: number };
  summary?: {
    isBalanced?: boolean;
    difference?: number;
    totalEquity?: number;
    totalLiabilities?: number;
    totalAssets?: number;
    profitLoss?: number;
    totalIncome?: number;
    totalExpenses?: number;
  };
  company?: { name?: string; code?: string };
  financialYear?: string;
}

interface BalanceSheetSectionProps {
  balanceSheet: BalanceSheetData | null;
  onExport?: () => void;
  companyName?: string;
}

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── Row renderer ──────────────────────────────────────────────────────────────
function BSRow({ item, depth = 0 }: { item: BSItem; depth?: number }) {
  const label = item.accountName || item.name || '';
  const indent = depth * 20;

  if (item.isSection) {
    return (
      <tr className="bg-slate-100">
        <td colSpan={3} className="px-4 py-1.5 font-semibold text-slate-700 text-xs uppercase tracking-wider" style={{ paddingLeft: indent + 16 }}>
          {label}
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={`hover:bg-gray-50 border-b border-gray-50 ${item.isHead ? 'bg-gray-50/50' : ''}`}>
        <td className="px-4 py-2.5 font-mono text-xs text-gray-400 w-16" style={{ paddingLeft: indent + 16 }}>
          {item.accountCode || ''}
        </td>
        <td className="px-4 py-2.5 text-gray-800 text-sm" style={{ paddingLeft: item.isHead ? indent + 24 : indent + 16 }}>
          {item.isHead ? <ChevronRight className="inline h-3 w-3 mr-1 text-gray-400" /> : null}
          {label}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
          {item.isSection ? '' : INR(item.amount || 0)}
        </td>
      </tr>
      {/* Sub-accounts */}
      {item.subAccounts?.map((sub, i) => (
        <BSRow key={i} item={sub} depth={depth + 1} />
      ))}
      {/* Inline details */}
      {item.details?.map((d, i) => (
        <tr key={`d-${i}`} className="bg-gray-50/30 text-xs">
          <td className="px-4 py-1.5 font-mono text-gray-300" style={{ paddingLeft: (depth + 1) * 20 + 16 }}></td>
          <td className="px-4 py-1.5 text-gray-500 italic" style={{ paddingLeft: (depth + 1) * 20 + 16 }}>
            {d.name || d.accountName}
          </td>
          <td className="px-4 py-1.5 text-right font-mono text-gray-500">{INR(d.amount || 0)}</td>
        </tr>
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BalanceSheetSection({ balanceSheet, onExport, companyName }: BalanceSheetSectionProps) {
  const elementId = 'balance-sheet-printable';

  // Normalise both API formats
  const isFormatB = !!(balanceSheet?.leftSide || balanceSheet?.rightSide);
  const name = companyName || balanceSheet?.company?.name || 'Company';
  const fy   = balanceSheet?.financialYear || `FY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // ── Assets (Right side) ──────────────────────────────────────────────────
  let assets: BSItem[] = [];
  let totalAssets = 0;

  if (isFormatB && balanceSheet?.rightSide) {
    assets     = balanceSheet.rightSide.items || [];
    totalAssets = balanceSheet.rightSide.total || 0;
  } else {
    assets     = balanceSheet?.assets || [];
    totalAssets = balanceSheet?.totalAssets || assets.filter(a => !a.isSection).reduce((s, a) => s + (a.amount || 0), 0);
  }

  // ── Liabilities + Equity (Left side) ─────────────────────────────────────
  let liabilities: BSItem[] = [];
  let equity: BSItem[]      = [];
  let totalLiabilities      = 0;
  let totalEquity           = 0;

  if (isFormatB && balanceSheet?.leftSide) {
    // Format B: left side items are already merged liab+equity
    const leftItems = balanceSheet.leftSide.items || [];
    liabilities = leftItems.filter(i => i.type === 'LIABILITY');
    equity      = leftItems.filter(i => i.type !== 'LIABILITY');
    totalLiabilities = liabilities.reduce((s, i) => s + (i.amount || 0), 0);
    totalEquity      = equity.reduce((s, i) => s + (i.amount || 0), 0);
  } else {
    liabilities      = balanceSheet?.liabilities || [];
    equity           = balanceSheet?.equity || [];
    totalLiabilities = balanceSheet?.totalLiabilities ?? liabilities.reduce((s, a) => s + (a.amount || 0), 0);
    totalEquity      = balanceSheet?.totalEquity ?? equity.reduce((s, a) => s + (a.amount || 0), 0);
  }

  const totalLiabEquity = totalLiabilities + totalEquity;
  const isBalanced      = balanceSheet?.summary?.isBalanced ?? (Math.abs(totalAssets - totalLiabEquity) < 1);
  const difference      = balanceSheet?.summary?.difference ?? Math.abs(totalAssets - totalLiabEquity);

  // P&L summary from balance sheet
  const profitLoss   = balanceSheet?.summary?.profitLoss;
  const totalIncome  = balanceSheet?.summary?.totalIncome;
  const totalExpenses = balanceSheet?.summary?.totalExpenses;

  const handleCSV = () => exportBalanceSheetCSV(balanceSheet, name);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-sm text-gray-500">{name} · {fy}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Balance status badge */}
          {isBalanced
            ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 px-3 py-1">
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Balanced ✓
              </Badge>
            : <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1">
                <XCircle className="h-3.5 w-3.5 mr-1" /> Diff: {INR(difference)}
              </Badge>
          }

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download As</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel / CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsPDF(elementId, `BalanceSheet_${name}`, `Balance Sheet — ${name}`)}>
                <FileText className="h-4 w-4 mr-2 text-red-600" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsImage(elementId, `BalanceSheet_${name}`)}>
                <FileImage className="h-4 w-4 mr-2 text-blue-600" /> Image (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsWord(elementId, `BalanceSheet_${name}`, `Balance Sheet — ${name}`)}>
                <FileText className="h-4 w-4 mr-2 text-indigo-600" /> Word (.doc)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => printToPDF(elementId, `Balance Sheet — ${name}`)}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── PRINTABLE BALANCE SHEET ── */}
      <div id={elementId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Print header */}
        <div className="hidden print:block text-center py-4 border-b bg-white">
          <h1 className="text-xl font-bold">{name}</h1>
          <h2 className="text-lg font-semibold">Balance Sheet</h2>
          <p className="text-sm text-gray-600">{fy} · As on {new Date().toLocaleDateString('en-IN')}</p>
        </div>

        {/* Screen header */}
        <div className="print:hidden bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-3 flex justify-between items-center">
          <span className="font-semibold text-sm">{name}</span>
          <span className="text-xs opacity-70">{fy} · As on {new Date().toLocaleDateString('en-IN')}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">

          {/* ── LEFT: LIABILITIES & CAPITAL ─────────────────────────────── */}
          <div>
            <div className="bg-slate-600 text-white px-4 py-2 text-sm font-bold uppercase tracking-wide">
              A. Capital &amp; Liabilities
            </div>

            {/* I. CAPITAL & RESERVES */}
            <div className="bg-blue-50 px-4 py-1.5 border-b border-blue-100">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">I. Capital &amp; Reserves</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50/60 border-b border-gray-100">
                  <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 w-16">Code</th>
                  <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500">Particulars</th>
                  <th className="px-4 py-1.5 text-right text-xs font-semibold text-gray-500">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {equity.length > 0 ? equity.map((e, i) => <BSRow key={i} item={e} />) : (
                  <tr><td colSpan={3} className="px-4 py-3 text-gray-400 text-center italic text-sm">No equity entries</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-blue-100 border-t-2 border-blue-300">
                  <td colSpan={2} className="px-4 py-2.5 font-bold text-blue-800 text-sm">Sub-Total (Capital)</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-800 font-mono">{INR(totalEquity)}</td>
                </tr>
              </tfoot>
            </table>

            {/* II. LIABILITIES */}
            <div className="bg-orange-50 px-4 py-1.5 border-y border-orange-100">
              <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">II. Liabilities</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {liabilities.length > 0 ? liabilities.map((l, i) => <BSRow key={i} item={l} />) : (
                  <tr><td colSpan={3} className="px-4 py-3 text-gray-400 text-center italic text-sm">No liabilities</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-orange-100 border-t-2 border-orange-300">
                  <td colSpan={2} className="px-4 py-2.5 font-bold text-orange-800 text-sm">Sub-Total (Liabilities)</td>
                  <td className="px-4 py-2.5 text-right font-bold text-orange-800 font-mono">{INR(totalLiabilities)}</td>
                </tr>
                <tr className="bg-slate-700 text-white">
                  <td colSpan={2} className="px-4 py-3 font-bold text-sm">TOTAL (A)</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-lg">{INR(totalLiabEquity)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── RIGHT: ASSETS ────────────────────────────────────────────── */}
          <div>
            <div className="bg-emerald-600 text-white px-4 py-2 text-sm font-bold uppercase tracking-wide">
              B. Assets
            </div>

            {/* Fixed Assets section */}
            <div className="bg-emerald-50 px-4 py-1.5 border-b border-emerald-100">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">I. Fixed Assets &amp; Investments</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-gray-100">
                  <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 w-16">Code</th>
                  <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500">Particulars</th>
                  <th className="px-4 py-1.5 text-right text-xs font-semibold text-gray-500">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* Fixed assets = non-current items */}
                {assets.filter(a => !a.isSection && (a.accountCode?.startsWith('15') || a.accountCode?.startsWith('16') || a.accountCode?.startsWith('17'))).length > 0
                  ? assets.filter(a => a.accountCode?.startsWith('15') || a.accountCode?.startsWith('16') || a.accountCode?.startsWith('17')).map((a, i) => <BSRow key={i} item={a} />)
                  : <tr><td colSpan={3} className="px-4 py-3 text-gray-400 text-center italic text-sm">No fixed assets</td></tr>
                }
              </tbody>
            </table>

            {/* Current Assets section */}
            <div className="bg-teal-50 px-4 py-1.5 border-y border-teal-100">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">II. Current Assets (Loans &amp; Cash)</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {assets.filter(a => a.isSection || !(a.accountCode?.startsWith('15') || a.accountCode?.startsWith('16') || a.accountCode?.startsWith('17'))).map((a, i) => (
                  <BSRow key={i} item={a} />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-700 text-white">
                  <td colSpan={2} className="px-4 py-3 font-bold text-sm">TOTAL (B)</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-lg">{INR(totalAssets)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balance Check Strip */}
        <div className={`px-6 py-3 flex items-center justify-between gap-3 text-sm border-t ${
          isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {isBalanced
              ? <><CheckCircle className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700 font-medium">Balance Sheet is Balanced — A = B ✓</span></>
              : <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-700 font-medium">Imbalance Detected: {INR(difference)}</span></>
            }
          </div>
          <div className="text-xs text-gray-500 flex gap-4">
            <span>Capital &amp; Liabilities: <strong>{INR(totalLiabEquity)}</strong></span>
            <span>Assets: <strong>{INR(totalAssets)}</strong></span>
          </div>
        </div>

        {/* P&L Summary (if available) */}
        {(totalIncome !== undefined || profitLoss !== undefined) && (
          <div className="px-6 py-4 bg-gray-50 border-t grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Total Income</p>
              <p className="font-bold text-emerald-700 text-lg">{INR(totalIncome || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Total Expenses</p>
              <p className="font-bold text-red-600 text-lg">{INR(totalExpenses || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Net {(profitLoss || 0) >= 0 ? 'Profit' : 'Loss'}</p>
              <p className={`font-bold text-lg ${(profitLoss || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {INR(Math.abs(profitLoss || 0))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
