'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark, TrendingDown, CreditCard, Wallet, RefreshCw, Plus, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import type { Stats, BankTransaction } from '../types';

interface OverviewSectionProps {
  stats: Stats;
  bankTransactions: BankTransaction[];
  onScanClick: () => void;
  onBankClick: () => void;
  onExpenseClick: () => void;
  onIncomeClick: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDateShort = (date: Date | string) => {
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return 'N/A';
  }
};

export default function OverviewSection({
  stats,
  bankTransactions,
  onScanClick,
  onBankClick,
  onExpenseClick,
  onIncomeClick
}: OverviewSectionProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-sm text-gray-500">Active Loans</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalLoans}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
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
            <Button onClick={onScanClick} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Past Transactions
            </Button>
            <Button onClick={onBankClick} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
            <Button onClick={onExpenseClick} variant="outline">
              <TrendingDown className="h-4 w-4 mr-2" />
              Record Expense
            </Button>
            <Button onClick={onIncomeClick} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Record Income
            </Button>
          </div>
        </CardContent>
      </Card>

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
