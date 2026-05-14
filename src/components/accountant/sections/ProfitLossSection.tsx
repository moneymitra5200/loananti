'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download, TrendingUp, TrendingDown, FileSpreadsheet,
  FileImage, FileText, Printer, ChevronDown, CheckCircle, XCircle
} from 'lucide-react';
import {
  exportProfitLossCSV, exportAsPDF, exportAsImage, exportAsWord, printToPDF
} from '@/utils/accountingExport';

interface PLItem { accountCode: string; accountName: string; amount: number; }

interface ProfitLossData {
  income?: PLItem[];
  expenses?: PLItem[];
  revenue?: PLItem[];
  totalIncome?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
  period?: { startDate?: string | null; endDate?: string | null };
}

interface ProfitLossSectionProps {
  profitLoss: ProfitLossData | null;
  onExport?: () => void;
  companyName?: string;
  period?: string;
}

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function ProfitLossSection({
  profitLoss, onExport, companyName = 'Company', period
}: ProfitLossSectionProps) {
  const elementId = 'pl-statement-printable';

  const income: PLItem[]   = profitLoss?.income || profitLoss?.revenue || [];
  const expenses: PLItem[] = profitLoss?.expenses || [];
  const totalIncome   = profitLoss?.totalIncome ?? profitLoss?.totalRevenue ?? 0;
  const totalExpenses = profitLoss?.totalExpenses ?? 0;
  const netProfit     = profitLoss?.netProfit ?? (totalIncome - totalExpenses);
  const isProfit      = netProfit >= 0;

  // Real T-Account format:
  // Dr Side = Expenses + (Net Profit if profitable)
  // Cr Side = Income   + (Net Loss if loss)
  const drTotal = totalExpenses + (isProfit ? netProfit : 0);
  const crTotal = totalIncome  + (!isProfit ? Math.abs(netProfit) : 0);

  const periodStr = period ||
    (profitLoss?.period?.startDate && profitLoss?.period?.endDate
      ? `${new Date(profitLoss.period.startDate).toLocaleDateString('en-IN')} to ${new Date(profitLoss.period.endDate).toLocaleDateString('en-IN')}`
      : `As on ${new Date().toLocaleDateString('en-IN')}`);

  const handleCSV = () =>
    exportProfitLossCSV({ income, expenses, totalIncome, totalExpenses, netProfit }, companyName, periodStr);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profit &amp; Loss Statement</h2>
          <p className="text-sm text-gray-500">{periodStr}</p>
        </div>

        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Download As</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel / CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsPDF(elementId, `ProfitLoss_${companyName}`, `P&L — ${companyName}`)}>
              <FileText className="h-4 w-4 mr-2 text-red-600" /> PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsImage(elementId, `ProfitLoss_${companyName}`)}>
              <FileImage className="h-4 w-4 mr-2 text-blue-600" /> Image (PNG)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsWord(elementId, `ProfitLoss_${companyName}`, `P&L — ${companyName}`)}>
              <FileText className="h-4 w-4 mr-2 text-indigo-600" /> Word (.doc)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => printToPDF(elementId, `P&L — ${companyName}`)}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Net P&L Banner */}
      <div className={`rounded-xl p-5 flex items-center justify-between shadow-sm ${
        isProfit ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
      } text-white`}>
        <div className="flex items-center gap-4">
          {isProfit
            ? <TrendingUp className="h-10 w-10 opacity-80" />
            : <TrendingDown className="h-10 w-10 opacity-80" />}
          <div>
            <p className="text-sm opacity-80 font-medium uppercase tracking-wider">
              Net {isProfit ? 'Profit' : 'Loss'}
            </p>
            <p className="text-4xl font-bold">{INR(Math.abs(netProfit))}</p>
          </div>
        </div>
        <div className="text-right opacity-90 text-sm space-y-1">
          <p>Total Income: <span className="font-semibold">{INR(totalIncome)}</span></p>
          <p>Total Expenses: <span className="font-semibold">{INR(totalExpenses)}</span></p>
          <Badge className={`mt-1 ${isProfit ? 'bg-emerald-800' : 'bg-red-800'} text-white border-0`}>
            {isProfit ? 'Profitable' : 'Loss-Making'}
          </Badge>
        </div>
      </div>

      {/* ─── PRINTABLE T-ACCOUNT FORMAT ─── */}
      <div id={elementId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Print Header (hidden on screen) */}
        <div className="hidden print:block text-center py-4 border-b">
          <h1 className="text-xl font-bold">{companyName}</h1>
          <h2 className="text-lg font-semibold">Profit &amp; Loss Account</h2>
          <p className="text-sm text-gray-600">{periodStr}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* ─── DR SIDE (Expenses) ─── */}
          <div>
            <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Dr Side — Expenses
              </span>
              <span className="text-xs opacity-80">Debit</span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 w-8">Code</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Particulars</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.length > 0 ? expenses.map((e, i) => (
                  <tr key={i} className="hover:bg-red-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{e.accountCode}</td>
                    <td className="px-4 py-2.5 text-gray-800">{e.accountName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-900">{INR(e.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400 italic">No expenses recorded</td>
                  </tr>
                )}

                {/* Net Profit goes to Dr side (balancing entry) */}
                {isProfit && (
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-600">NET</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-700">Net Profit c/d</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{INR(netProfit)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-red-100 border-t-2 border-red-300">
                  <td colSpan={2} className="px-4 py-3 font-bold text-red-800 text-sm">Total (Dr)</td>
                  <td className="px-4 py-3 text-right font-bold text-red-800 font-mono text-sm">{INR(drTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ─── CR SIDE (Income) ─── */}
          <div>
            <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Cr Side — Income
              </span>
              <span className="text-xs opacity-80">Credit</span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 w-8">Code</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Particulars</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {income.length > 0 ? income.map((inc, i) => (
                  <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{inc.accountCode}</td>
                    <td className="px-4 py-2.5 text-gray-800">{inc.accountName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-900">{INR(inc.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400 italic">No income recorded</td>
                  </tr>
                )}

                {/* Net Loss goes to Cr side (balancing entry) */}
                {!isProfit && (
                  <tr className="bg-red-50 border-t-2 border-red-200">
                    <td className="px-4 py-2.5 font-mono text-xs text-red-600">NET</td>
                    <td className="px-4 py-2.5 font-semibold text-red-700">Net Loss c/d</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-700">{INR(Math.abs(netProfit))}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-100 border-t-2 border-emerald-300">
                  <td colSpan={2} className="px-4 py-3 font-bold text-emerald-800 text-sm">Total (Cr)</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800 font-mono text-sm">{INR(crTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balance Check */}
        <div className={`px-6 py-3 flex items-center gap-3 text-sm border-t ${
          Math.abs(drTotal - crTotal) < 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          {Math.abs(drTotal - crTotal) < 1
            ? <><CheckCircle className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700 font-medium">Dr Total = Cr Total — Statement is Balanced ✓</span></>
            : <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-700 font-medium">Imbalance: {INR(Math.abs(drTotal - crTotal))}</span></>
          }
          <span className="ml-auto text-gray-400 text-xs">Dr: {INR(drTotal)} | Cr: {INR(crTotal)}</span>
        </div>
      </div>
    </div>
  );
}
