'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, FileText, Receipt, CreditCard, Wallet } from 'lucide-react';
import type { ActiveLoansTabProps } from './types';

function ActiveLoansTabComponent({
  activeLoans,
  loanStats,
  loanFilter,
  setLoanFilter,
  fetchDashboardData,
  formatCurrency,
  formatDate,
}: ActiveLoansTabProps) {
  const filteredLoans = activeLoans.filter(loan => {
    if (loanFilter === 'all') return true;
    return loan.loanType === loanFilter.toUpperCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Active Loans</h1>
          <p className="text-muted-foreground">All disbursed and active loans (Online & Offline)</p>
        </div>
        <Button variant="outline" onClick={() => fetchDashboardData()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Loan Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Online Loans</p>
                <p className="text-2xl font-bold">{loanStats.totalOnline}</p>
              </div>
              <FileText className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs mt-2 opacity-75">{formatCurrency(loanStats.totalOnlineAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Offline Loans</p>
                <p className="text-2xl font-bold">{loanStats.totalOffline}</p>
              </div>
              <Receipt className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs mt-2 opacity-75">{formatCurrency(loanStats.totalOfflineAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Active</p>
                <p className="text-2xl font-bold">{loanStats.totalOnline + loanStats.totalOffline}</p>
              </div>
              <CreditCard className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(loanStats.totalOnlineAmount + loanStats.totalOfflineAmount)}</p>
              </div>
              <Wallet className="h-8 w-8 opacity-80" />
            </div>
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
              variant={loanFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setLoanFilter('all')}
            >
              All ({loanStats.totalOnline + loanStats.totalOffline})
            </Button>
            <Button
              size="sm"
              variant={loanFilter === 'online' ? 'default' : 'outline'}
              className={loanFilter === 'online' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setLoanFilter('online')}
            >
              <FileText className="h-4 w-4 mr-1" /> Online ({loanStats.totalOnline})
            </Button>
            <Button
              size="sm"
              variant={loanFilter === 'offline' ? 'default' : 'outline'}
              className={loanFilter === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              onClick={() => setLoanFilter('offline')}
            >
              <Receipt className="h-4 w-4 mr-1" /> Offline ({loanStats.totalOffline})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredLoans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active loans found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Rate/Tenure</TableHead>
                    <TableHead className="text-right">EMI</TableHead>
                    <TableHead>Next EMI</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${loan.loanType === 'ONLINE' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                          {loan.identifier}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={loan.loanType === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                          {loan.loanType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.customer?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{loan.customer?.phone || loan.customer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{loan.company?.name || 'N/A'}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(loan.approvedAmount)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{loan.interestRate}%</p>
                        <p className="text-xs text-muted-foreground">{loan.tenure} mo</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(loan.emiAmount)}
                      </TableCell>
                      <TableCell>
                        {loan.nextEmi ? (
                          <div>
                            <p className="text-sm">{formatDate(loan.nextEmi.dueDate)}</p>
                            <Badge variant={loan.nextEmi.status === 'OVERDUE' ? 'destructive' : 'outline'} className="text-xs mt-1">
                              {loan.nextEmi.status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">{loan.status}</Badge>
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

export default memo(ActiveLoansTabComponent);
