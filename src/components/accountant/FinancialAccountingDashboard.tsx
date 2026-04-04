'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Calculator, FileText, TrendingUp, DollarSign, Loader2, RefreshCw, 
  FileSpreadsheet, BookOpen, Landmark, ArrowUpRight, ArrowDownRight,
  CreditCard, Clock, LogOut, User, Wallet, ArrowUp, ArrowDown,
  Building2, Plus, Receipt, Scan, BookCopy, PieChart, BarChart3,
  LayoutDashboard, Settings, HelpCircle, AlertTriangle, CheckCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface Company {
  id: string;
  name: string;
  code: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  currentBalance: number;
  isActive: boolean;
  isDefault: boolean;
  upiId?: string;
  qrCodeUrl?: string;
}

interface BankTransaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  transactionDate: Date | string;
}

interface CashBookEntry {
  id: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  entryDate: Date;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  narration: string;
  referenceType: string;
  totalDebit: number;
  totalCredit: number;
  paymentMode: string;
  lines: Array<{
    account: { accountCode: string; accountName: string };
    debitAmount: number;
    creditAmount: number;
  }>;
}

interface ChartOfAccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountCode?: string;
  currentBalance: number;
  isActive: boolean;
}

interface ProfitLossData {
  income: Array<{ accountCode: string; accountName: string; amount: number }>;
  expenses: Array<{ accountCode: string; accountName: string; amount: number }>;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

interface BalanceSheetItem {
  name: string;
  amount: number;
  type: string;
  isCalculated?: boolean;
  formula?: string;
  details?: Array<{ name: string; amount: number; bankName?: string; accountNumber?: string; balance?: number }>;
  canAdd?: boolean;
  count?: number;
  onlineLoans?: number;
  offlineLoans?: number;
}

interface BalanceSheetData {
  company: { id: string; name: string; code: string };
  financialYear: string;
  leftSide: { items: Array<BalanceSheetItem>; total: number };
  rightSide: { items: Array<BalanceSheetItem>; total: number };
  summary: {
    cashBookBalance: number;
    bankBalance: number;
    equity: number;
    borrowedMoney: number;
    profitLoss: number;
    loanPrincipal: number;
    interestReceivable: number;
    isBalanced: boolean;
  };
}

interface CashFlowData {
  inflows: Array<{ source: string; amount: number }>;
  outflows: Array<{ source: string; amount: number }>;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

// ============================================
// SECTION COMPONENTS
// ============================================

// Overview Section
function OverviewSection({ 
  stats, 
  bankAccounts, 
  profitLoss, 
  formatCurrency 
}: { 
  stats: any; 
  bankAccounts: BankAccount[]; 
  profitLoss: ProfitLossData | null;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bank Balance</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalBankBalance)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash in Hand</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.cashBookBalance)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                <p className={`text-2xl font-bold ${profitLoss && profitLoss.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profitLoss?.netProfit || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bank Accounts</p>
                <p className="text-2xl font-bold text-blue-600">{bankAccounts.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank Accounts Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bank accounts configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${account.currentBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Landmark className={`h-5 w-5 ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{account.bankName}</p>
                      <p className="text-sm text-muted-foreground">****{account.accountNumber.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.currentBalance)}
                    </p>
                    {account.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium">Record Entry</p>
            <p className="text-xs text-muted-foreground">Income/Expense</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <Landmark className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
            <p className="font-medium">Bank Account</p>
            <p className="text-xs text-muted-foreground">Add New Bank</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium">Journal Entry</p>
            <p className="text-xs text-muted-foreground">Manual Entry</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <Scan className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <p className="font-medium">Scan & Sync</p>
            <p className="text-xs text-muted-foreground">Reconcile Data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Profit & Loss Section
function ProfitLossSection({ 
  data, 
  formatCurrency 
}: { 
  data: ProfitLossData | null;
  formatCurrency: (amount: number) => string;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No profit & loss data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Profit & Loss Statement
          </CardTitle>
          <CardDescription>Income and Expenses summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Income */}
            <div>
              <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Income
              </h3>
              <div className="space-y-2">
                {data.income.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-green-50 rounded">
                    <span>{item.accountName}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between p-2 bg-green-100 rounded font-semibold">
                  <span>Total Income</span>
                  <span className="text-green-700">{formatCurrency(data.totalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" />
                Expenses
              </h3>
              <div className="space-y-2">
                {data.expenses.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-red-50 rounded">
                    <span>{item.accountName}</span>
                    <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between p-2 bg-red-100 rounded font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-red-700">{formatCurrency(data.totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Net Profit/Loss */}
          <div className={`p-4 rounded-lg ${data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                {data.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
              </span>
              <span className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(data.netProfit))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Balance Sheet Section
function BalanceSheetSection({ 
  data, 
  formatCurrency 
}: { 
  data: BalanceSheetData | null;
  formatCurrency: (amount: number) => string;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No balance sheet data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Balance Sheet
          </CardTitle>
          <CardDescription>
            Financial position statement • Equity is auto-calculated from Opening Balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT SIDE - Liabilities (Source of Funds) */}
            <div>
              <h3 className="font-semibold text-purple-600 mb-3 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" />
                Liabilities (Source of Funds)
              </h3>
              <div className="space-y-2">
                {data.leftSide.items.map((item, idx) => (
                  <div key={idx} className="p-2 bg-purple-50 rounded">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.isCalculated && (
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        )}
                      </div>
                      <span className={`font-medium ${item.amount >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    {item.formula && (
                      <p className="text-xs text-muted-foreground mt-1">{item.formula}</p>
                    )}
                    {item.details && (
                      <div className="mt-2 pl-4 border-l-2 border-purple-200 text-sm text-muted-foreground">
                        {item.details.map((detail: any, i: number) => (
                          <div key={i} className="flex justify-between py-1">
                            <span>{detail.name}</span>
                            <span>{formatCurrency(detail.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between p-2 bg-purple-100 rounded font-semibold">
                  <span>Total Liabilities</span>
                  <span className="text-purple-700">{formatCurrency(data.leftSide.total)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Assets (How Funds Are Used) */}
            <div>
              <h3 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Assets (How Funds Are Used)
              </h3>
              <div className="space-y-2">
                {data.rightSide.items.map((item, idx) => (
                  <div key={idx} className="p-2 bg-blue-50 rounded">
                    <div className="flex justify-between">
                      <span>{item.name}</span>
                      <span className="font-medium text-blue-600">{formatCurrency(item.amount)}</span>
                    </div>
                    {item.details && item.details.length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-blue-200 text-sm text-muted-foreground">
                        {item.details.map((detail: any, i: number) => (
                          <div key={i} className="flex justify-between py-1">
                            <span>{detail.bankName || detail.name}</span>
                            <span>{formatCurrency(detail.balance || detail.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.count !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.count} loans ({item.onlineLoans} online, {item.offlineLoans} offline)
                      </p>
                    )}
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between p-2 bg-blue-100 rounded font-semibold">
                  <span>Total Assets</span>
                  <span className="text-blue-700">{formatCurrency(data.rightSide.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className={`mt-6 p-4 rounded-lg ${data.summary.isBalanced ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-2">
              {data.summary.isBalanced ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <span className={data.summary.isBalanced ? 'text-green-700' : 'text-amber-700'}>
                {data.summary.isBalanced ? 'Balance Sheet is Balanced' : 'Balance Sheet is NOT Balanced'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Cash Flow Section
function CashFlowSection({ 
  data, 
  cashBookBalance,
  bankBalance,
  formatCurrency 
}: { 
  data: CashFlowData | null;
  cashBookBalance: number;
  bankBalance: number;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Inflows</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.totalInflows || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Outflows</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(data?.totalOutflows || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${data && data.netCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(data?.netCashFlow || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Position */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Cash Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-amber-600" />
                <span className="font-medium">Cash in Hand</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(cashBookBalance)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">Bank Balance</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(bankBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inflows & Outflows */}
      {data && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Cash Inflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.inflows.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-green-50 rounded">
                    <span>{item.source}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Cash Outflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.outflows.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-red-50 rounded">
                    <span>{item.source}</span>
                    <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Bank Accounts Section
function BankAccountsSection({ 
  accounts, 
  transactions,
  totalBalance,
  formatCurrency,
  formatDate,
  onAddBank,
  onAddMoney
}: { 
  accounts: BankAccount[];
  transactions: BankTransaction[];
  totalBalance: number;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  onAddBank: () => void;
  onAddMoney: (account: BankAccount) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Total Balance */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Bank Balance</p>
              <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalBalance)}</p>
            </div>
            <Button onClick={onAddBank} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Bank
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts List */}
      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bank accounts configured</p>
              <Button onClick={onAddBank} variant="outline" className="mt-4">
                Add your first bank account
              </Button>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${account.currentBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Landmark className={`h-6 w-6 ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{account.bankName}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.accountName} • ****{account.accountNumber.slice(-4)}
                      </p>
                      {account.upiId && (
                        <p className="text-xs text-muted-foreground">UPI: {account.upiId}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.currentBalance)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {account.isDefault && <Badge variant="default">Default</Badge>}
                      <Badge variant={account.isActive ? 'default' : 'secondary'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Daybook Section
function DaybookSection({ 
  entries, 
  formatCurrency,
  formatDate
}: { 
  entries: JournalEntry[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          Daybook
        </CardTitle>
        <CardDescription>Daily transaction entries</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No journal entries found</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry No.</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell>{entry.entryNumber}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.narration}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(entry.totalDebit)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(entry.totalCredit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Cashbook Section
function CashbookSection({ 
  entries, 
  currentBalance,
  formatCurrency,
  formatDate,
  onAddCash
}: { 
  entries: CashBookEntry[];
  currentBalance: number;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  onAddCash: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cash in Hand</p>
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(currentBalance)}</p>
            </div>
            <Button onClick={onAddCash} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600" />
            Cash Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No cash transactions found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.entryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={entry.entryType === 'CREDIT' ? 'default' : 'destructive'}>
                          {entry.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className={`text-right ${entry.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.entryType === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.balanceAfter)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ledger Section
function LedgerSection({ 
  selectedCompanyId,
  formatCurrency,
  formatDate
}: { 
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCompanyId) return;
    
    let isMounted = true;
    
    // Use setTimeout to avoid synchronous setState warning
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounting/ledger?companyId=${selectedCompanyId}`);
        const data = await res.json();
        if (isMounted) {
          setLedgers(data.ledgers || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId]);

  // Get selected ledger details
  const selectedLedger = selectedAccount !== null ? ledgers.find(l => l.accountId === selectedAccount) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookCopy className="h-5 w-5 text-indigo-600" />
            Ledger Accounts
          </CardTitle>
          <CardDescription>Account-wise transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : ledgers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookCopy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No ledger entries found</p>
              <p className="text-sm mt-2">Journal entries will appear here after EMI payments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ledgers.map((ledger) => (
                  <Card 
                    key={ledger.accountId} 
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedAccount === ledger.accountId ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setSelectedAccount(selectedAccount === ledger.accountId ? null : ledger.accountId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{ledger.accountCode}</p>
                          <p className="font-medium">{ledger.accountName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ledger.transactions?.length || 0} transactions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${ledger.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(ledger.closingBalance)}
                          </p>
                          <p className="text-xs text-muted-foreground">Closing Balance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Selected Account Details */}
              {selectedLedger && selectedLedger.transactions?.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{selectedLedger.accountName} - Transactions</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedAccount(null)}>
                        Close
                      </Button>
                    </CardTitle>
                    <div className="flex gap-4 text-sm">
                      <span>Opening: {formatCurrency(selectedLedger.openingBalance)}</span>
                      <span>Total Debit: {formatCurrency(selectedLedger.totalDebit)}</span>
                      <span>Total Credit: {formatCurrency(selectedLedger.totalCredit)}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Entry No.</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLedger.transactions.map((txn: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{formatDate(txn.date)}</TableCell>
                              <TableCell>{txn.entryNumber}</TableCell>
                              <TableCell className="max-w-xs truncate">{txn.narration}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(txn.debit || 0)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(txn.credit || 0)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(txn.balance || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Trial Balance Section
function TrialBalanceSection({ 
  selectedCompanyId,
  formatCurrency
}: { 
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
}) {
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalDebits: 0, totalCredits: 0, isBalanced: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCompanyId) return;
    
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accountant/trial-balance?companyId=${selectedCompanyId}`);
        const data = await res.json();
        if (isMounted) {
          setTrialBalance(data.trialBalance || []);
          setTotals({
            totalDebits: data.totalDebits || 0,
            totalCredits: data.totalCredits || 0,
            isBalanced: data.isBalanced ?? true
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-purple-600" />
          Trial Balance
        </CardTitle>
        <CardDescription>Summary of all account balances</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          </div>
        ) : trialBalance.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No accounts found</p>
            <p className="text-sm mt-2">Chart of accounts will appear here after initialization</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit Balance</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.map((account, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          account.accountType === 'ASSET' ? 'border-blue-500 text-blue-600' :
                          account.accountType === 'LIABILITY' ? 'border-purple-500 text-purple-600' :
                          account.accountType === 'INCOME' ? 'border-green-500 text-green-600' :
                          account.accountType === 'EXPENSE' ? 'border-red-500 text-red-600' :
                          'border-gray-500 text-gray-600'
                        }>
                          {account.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className={`mt-4 p-4 rounded-lg ${totals.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Debits</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totals.totalDebits)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totals.totalCredits)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    {totals.isBalanced ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-700">Balanced</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-700">Not Balanced</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FinancialAccountingDashboard() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  
  // State
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  
  // Company Filter
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Year Filter for Balance Sheet
  const [selectedYear, setSelectedYear] = useState<string>('current');
  
  // Data States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);
  const [cashBookBalance, setCashBookBalance] = useState(0);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);

  // Dialog States
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);

  // ============================================
  // HELPERS
  // ============================================

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }, []);

  const formatDate = useCallback((date: Date | string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy');
  }, []);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await fetch('/api/company');
      if (res.ok) {
        const data = await res.json();
        const companiesList = data.companies || [];
        setCompanies(companiesList);
        return companiesList;
      }
      return [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!selectedCompanyId) return;
    
    setLoading(true);
    try {
      const yearParam = selectedYear !== 'current' ? selectedYear : '';
      const balanceSheetUrl = yearParam 
        ? `/api/accountant/balance-sheet?companyId=${selectedCompanyId}&year=${yearParam}`
        : `/api/accountant/balance-sheet?companyId=${selectedCompanyId}`;
      
      const [
        bankRes,
        profitLossRes,
        balanceSheetRes,
        cashFlowRes,
        journalRes,
        cashBookRes
      ] = await Promise.all([
        fetch(`/api/accountant/bank-accounts?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/profit-loss?companyId=${selectedCompanyId}`),
        fetch(balanceSheetUrl),
        fetch(`/api/accountant/cash-flow?companyId=${selectedCompanyId}`),
        fetch(`/api/accounting/journal-entries?companyId=${selectedCompanyId}&limit=100`),
        fetch(`/api/accountant/cashbook?companyId=${selectedCompanyId}`)
      ]);

      const bankData = bankRes.ok ? await bankRes.json() : { bankAccounts: [], transactions: [] };
      const profitLossData = profitLossRes.ok ? await profitLossRes.json() : null;
      const balanceSheetData = balanceSheetRes.ok ? await balanceSheetRes.json() : null;
      const cashFlowData = cashFlowRes.ok ? await cashFlowRes.json() : null;
      const journalData = journalRes.ok ? await journalRes.json() : { entries: [] };
      const cashBookData = cashBookRes.ok ? await cashBookRes.json() : { entries: [], currentBalance: 0 };

      setBankAccounts(bankData.bankAccounts || []);
      setBankTransactions(bankData.transactions || []);
      setProfitLoss(profitLossData);
      setBalanceSheet(balanceSheetData);
      setCashFlow(cashFlowData);
      setJournalEntries(journalData.entries || []);
      setCashBookEntries(cashBookData.entries || []);
      setCashBookBalance(cashBookData.currentBalance || 0);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear]);

  useEffect(() => {
    const loadCompanies = async () => {
      const companiesList = await fetchCompanies();
      if (companiesList.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(companiesList[0].id);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchAllData();
    }
  }, [selectedCompanyId, fetchAllData]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

  const stats = {
    totalBankBalance,
    cashBookBalance,
    bankAccountsCount: bankAccounts.length,
    journalEntriesCount: journalEntries.length
  };

  // ============================================
  // MENU ITEMS
  // ============================================

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
    { id: 'trial-balance', label: 'Trial Balance', icon: Calculator },
    { id: 'cash-flow', label: 'Cash Flow', icon: DollarSign },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark },
    { id: 'daybook', label: 'Daybook', icon: BookOpen },
    { id: 'cashbook', label: 'Cashbook', icon: Wallet },
    { id: 'ledger', label: 'Ledger', icon: BookCopy },
  ];

  // ============================================
  // RENDER SECTION CONTENT
  // ============================================

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection 
            stats={stats}
            bankAccounts={bankAccounts}
            profitLoss={profitLoss}
            formatCurrency={formatCurrency}
          />
        );
      case 'profit-loss':
        return <ProfitLossSection data={profitLoss} formatCurrency={formatCurrency} />;
      case 'balance-sheet':
        return <BalanceSheetSection data={balanceSheet} formatCurrency={formatCurrency} />;
      case 'trial-balance':
        return <TrialBalanceSection selectedCompanyId={selectedCompanyId} formatCurrency={formatCurrency} />;
      case 'cash-flow':
        return (
          <CashFlowSection 
            data={cashFlow}
            cashBookBalance={cashBookBalance}
            bankBalance={totalBankBalance}
            formatCurrency={formatCurrency}
          />
        );
      case 'bank-accounts':
        return (
          <BankAccountsSection 
            accounts={bankAccounts}
            transactions={bankTransactions}
            totalBalance={totalBankBalance}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onAddBank={() => setShowBankDialog(true)}
            onAddMoney={() => {}}
          />
        );
      case 'daybook':
        return (
          <DaybookSection 
            entries={journalEntries}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'cashbook':
        return (
          <CashbookSection 
            entries={cashBookEntries}
            currentBalance={cashBookBalance}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onAddCash={() => setShowCashDialog(true)}
          />
        );
      case 'ledger':
        return (
          <LedgerSection 
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      default:
        return (
          <OverviewSection 
            stats={stats}
            bankAccounts={bankAccounts}
            profitLoss={profitLoss}
            formatCurrency={formatCurrency}
          />
        );
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            {/* Left Section - Logo & Title */}
            <div className="flex items-center gap-3">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold leading-tight">Financial Accounting</h1>
                <p className="text-[10px] text-emerald-100">{selectedCompany?.name || 'Select Company'}</p>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Company Selector */}
              <Select 
                value={selectedCompanyId || undefined} 
                onValueChange={setSelectedCompanyId}
                disabled={companiesLoading}
              >
                <SelectTrigger className="w-36 h-8 bg-white/10 border-white/20 text-white text-sm">
                  {companiesLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <SelectValue placeholder="Select Company" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {companies.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                      No companies found
                    </div>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <span className="truncate text-sm">{company.name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => fetchAllData()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 p-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.profilePicture} alt={user?.name || 'User'} />
                      <AvatarFallback className="text-xs bg-emerald-500 text-white">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r min-h-[calc(100vh-56px)] sticky top-14 flex flex-col">
          <nav className="p-2 space-y-1 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Logout Button */}
          <div className="p-2 border-t">
            <button
              onClick={async () => {
                await signOut();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {companiesLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-gray-500">Loading companies...</p>
              </motion.div>
            ) : !selectedCompanyId ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <Building2 className="h-12 w-12 text-gray-300" />
                <p className="text-gray-500">Please select a company to view data</p>
              </motion.div>
            ) : loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-64"
              >
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
