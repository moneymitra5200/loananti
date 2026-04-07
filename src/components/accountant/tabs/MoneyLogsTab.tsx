'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Wallet, CreditCard, TrendingUp, TrendingDown, Receipt, Landmark, DollarSign } from 'lucide-react';
import type { MoneyLogsTabProps } from './types';

function MoneyLogsTabComponent({
  moneyLogs,
  moneyLogStats,
  moneyLogFilter,
  setMoneyLogFilter,
  fetchMoneyLogs,
  formatCurrency,
  formatDate,
}: MoneyLogsTabProps) {
  const filteredLogs = moneyLogs.filter(log => {
    if (moneyLogFilter === 'all') return true;
    if (moneyLogFilter === 'emi') return log.type === 'EMI_PAYMENT';
    if (moneyLogFilter === 'disbursement') return log.type === 'LOAN_DISBURSEMENT' || log.type === 'OFFLINE_LOAN_DISBURSEMENT';
    if (moneyLogFilter === 'credit') return log.type === 'CREDIT' || log.type === 'BANK_TRANSACTION';
    if (moneyLogFilter === 'expense') return log.type === 'EXPENSE';
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMI_PAYMENT': return <Wallet className="h-4 w-4 text-green-600" />;
      case 'LOAN_DISBURSEMENT':
      case 'OFFLINE_LOAN_DISBURSEMENT': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'CREDIT': return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'DEBIT': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'EXPENSE': return <Receipt className="h-4 w-4 text-orange-600" />;
      case 'BANK_TRANSACTION': return <Landmark className="h-4 w-4 text-purple-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string, category: string) => {
    const colors: Record<string, string> = {
      'EMI_PAYMENT': 'bg-green-100 text-green-700',
      'LOAN_DISBURSEMENT': 'bg-blue-100 text-blue-700',
      'OFFLINE_LOAN_DISBURSEMENT': 'bg-purple-100 text-purple-700',
      'CREDIT': 'bg-emerald-100 text-emerald-700',
      'DEBIT': 'bg-red-100 text-red-700',
      'EXPENSE': 'bg-orange-100 text-orange-700',
      'BANK_TRANSACTION': category.includes('Credit') ? 'bg-cyan-100 text-cyan-700' : 'bg-pink-100 text-pink-700',
    };
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-700'}>{category}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Money Logs</h1>
          <p className="text-muted-foreground">All ecosystem money transactions - EMI, Credits, Disbursements, Expenses</p>
        </div>
        <Button variant="outline" onClick={() => { fetchMoneyLogs(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">EMI Collection</p>
            <p className="text-2xl font-bold">{formatCurrency(moneyLogStats.totalEMICollection)}</p>
            <p className="text-xs mt-1 opacity-75">{moneyLogStats.emiCount} payments</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Disbursements</p>
            <p className="text-2xl font-bold">{formatCurrency(moneyLogStats.totalDisbursements)}</p>
            <p className="text-xs mt-1 opacity-75">{moneyLogStats.disbursementCount} loans</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Total Credits</p>
            <p className="text-2xl font-bold">{formatCurrency(moneyLogStats.totalCredits)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Total Debits</p>
            <p className="text-2xl font-bold">{formatCurrency(moneyLogStats.totalDebits)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Expenses</p>
            <p className="text-2xl font-bold">{formatCurrency(moneyLogStats.totalExpenses)}</p>
            <p className="text-xs mt-1 opacity-75">{moneyLogStats.expenseCount} records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <Button
              size="sm"
              variant={moneyLogFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setMoneyLogFilter('all')}
            >
              All ({moneyLogs.length})
            </Button>
            <Button
              size="sm"
              variant={moneyLogFilter === 'emi' ? 'default' : 'outline'}
              className={moneyLogFilter === 'emi' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => setMoneyLogFilter('emi')}
            >
              <Wallet className="h-4 w-4 mr-1" /> EMI ({moneyLogs.filter(l => l.type === 'EMI_PAYMENT').length})
            </Button>
            <Button
              size="sm"
              variant={moneyLogFilter === 'disbursement' ? 'default' : 'outline'}
              className={moneyLogFilter === 'disbursement' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setMoneyLogFilter('disbursement')}
            >
              <CreditCard className="h-4 w-4 mr-1" /> Disbursements ({moneyLogs.filter(l => l.type === 'LOAN_DISBURSEMENT' || l.type === 'OFFLINE_LOAN_DISBURSEMENT').length})
            </Button>
            <Button
              size="sm"
              variant={moneyLogFilter === 'credit' ? 'default' : 'outline'}
              className={moneyLogFilter === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setMoneyLogFilter('credit')}
            >
              <TrendingUp className="h-4 w-4 mr-1" /> Credits ({moneyLogs.filter(l => l.type === 'CREDIT' || l.type === 'BANK_TRANSACTION').length})
            </Button>
            <Button
              size="sm"
              variant={moneyLogFilter === 'expense' ? 'default' : 'outline'}
              className={moneyLogFilter === 'expense' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              onClick={() => setMoneyLogFilter('expense')}
            >
              <Receipt className="h-4 w-4 mr-1" /> Expenses ({moneyLogs.filter(l => l.type === 'EXPENSE').length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Money Logs Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No money transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Customer/Reference</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={`${log.type}-${log.id}`} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(log.type)}
                          {getTypeBadge(log.type, log.category)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{log.description}</p>
                        {log.loanApplicationNo && (
                          <p className="text-xs text-muted-foreground">{log.loanApplicationNo}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.customerName ? (
                          <div>
                            <p className="font-medium text-sm">{log.customerName}</p>
                            {log.customerPhone && <p className="text-xs text-muted-foreground">{log.customerPhone}</p>}
                          </div>
                        ) : log.bankName ? (
                          <div>
                            <p className="font-medium text-sm">{log.bankName}</p>
                            {log.accountNumber && <p className="text-xs text-muted-foreground font-mono">{log.accountNumber}</p>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.paymentMode ? (
                          <Badge variant="outline" className="text-xs">{log.paymentMode}</Badge>
                        ) : log.disbursementMode ? (
                          <Badge variant="outline" className="text-xs">{log.disbursementMode}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-bold ${
                          log.type === 'EMI_PAYMENT' || log.type === 'CREDIT' || (log.type === 'BANK_TRANSACTION' && log.category === 'Bank Credit') ? 'text-green-600' :
                          log.type === 'EXPENSE' || log.type === 'DEBIT' || (log.type === 'BANK_TRANSACTION' && log.category === 'Bank Debit') ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {log.type === 'EMI_PAYMENT' || log.type === 'CREDIT' || (log.type === 'BANK_TRANSACTION' && log.category === 'Bank Credit') ? '+' :
                           log.type === 'EXPENSE' || log.type === 'DEBIT' || (log.type === 'BANK_TRANSACTION' && log.category === 'Bank Debit') ? '-' : ''}
                          {formatCurrency(log.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.companyBalanceAfter !== undefined ? (
                          <div className="text-xs">
                            <p className="text-emerald-600">Co: {formatCurrency(log.companyBalanceAfter)}</p>
                            {log.personalBalanceAfter !== undefined && (
                              <p className="text-amber-600">Pr: {formatCurrency(log.personalBalanceAfter)}</p>
                            )}
                          </div>
                        ) : log.balanceAfter !== undefined ? (
                          <p className="text-xs font-mono">{formatCurrency(log.balanceAfter)}</p>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(log.transactionDate || log.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        {log.createdBy ? (
                          <div className="text-xs">
                            <p className="font-medium">{log.createdBy.name}</p>
                            <p className="text-muted-foreground">{log.createdBy.role}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
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

export default memo(MoneyLogsTabComponent);
