'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Landmark, TrendingDown, CreditCard, Wallet, RefreshCw, Plus, TrendingUp,
  PiggyBank, Banknote, Scale
} from 'lucide-react';
import { BankTransaction, ChartOfAccountItem } from '../types';

interface OverviewSectionProps {
  stats: {
    totalBankBalance: number;
    totalExpenses: number;
    totalLoans: number;
    totalOutstanding: number;
  };
  bankTransactions: BankTransaction[];
  chartOfAccounts?: ChartOfAccountItem[];
  onOpenScanDialog: () => void;
  onOpenBankDialog: () => void;
  onOpenExpenseDialog: () => void;
  onOpenIncomeDialog: () => void;
  onOpenEquityDialog: () => void;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}

export default function OverviewSection({ 
  stats, 
  bankTransactions,
  chartOfAccounts = [],
  onOpenScanDialog, 
  onOpenBankDialog,
  onOpenExpenseDialog,
  onOpenIncomeDialog,
  onOpenEquityDialog,
  formatCurrency, 
  formatDateShort 
}: OverviewSectionProps) {
  // Calculate cash and equity balances from chart of accounts
  const cashBalance = chartOfAccounts.find(a => a.accountCode === '1101')?.currentBalance || 0;
  const equityBalance = chartOfAccounts
    .filter(a => a.accountType === 'EQUITY')
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const totalAssets = chartOfAccounts
    .filter(a => a.accountType === 'ASSET')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bank Balance</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalBankBalance)}</p>
              </div>
              <Landmark className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cash in Hand</p>
                <p className="text-2xl font-bold text-teal-600">{formatCurrency(cashBalance)}</p>
              </div>
              <Banknote className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Owner's Equity</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(equityBalance)}</p>
              </div>
              <PiggyBank className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalOutstanding)}</p>
              </div>
              <Wallet className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onOpenEquityDialog} className="bg-purple-600 hover:bg-purple-700">
              <PiggyBank className="h-4 w-4 mr-2" />
              Add Equity / Capital
            </Button>
            <Button onClick={onOpenScanDialog} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Past Transactions
            </Button>
            <Button onClick={onOpenBankDialog} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
            <Button onClick={onOpenExpenseDialog} variant="outline">
              <TrendingDown className="h-4 w-4 mr-2" />
              Record Expense
            </Button>
            <Button onClick={onOpenIncomeDialog} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Record Income
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accounting Summary */}
      {chartOfAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Accounting Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Assets</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(totalAssets)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Liabilities</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(chartOfAccounts.filter(a => a.accountType === 'LIABILITY').reduce((s, a) => s + a.currentBalance, 0))}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Equity</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(equityBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {bankTransactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankTransactions.slice(0, 10).map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{formatDateShort(txn.transactionDate)}</TableCell>
                      <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                      <TableCell>
                        <Badge variant={txn.transactionType === 'CREDIT' ? 'default' : 'destructive'}>
                          {txn.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${txn.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
