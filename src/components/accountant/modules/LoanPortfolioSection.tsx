'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard } from 'lucide-react';
import { ActiveLoan } from '../types';

interface LoanPortfolioSectionProps {
  activeLoans: ActiveLoan[];
  totalOutstanding: number;
  formatCurrency: (amount: number) => string;
}

export default function LoanPortfolioSection({ 
  activeLoans, 
  totalOutstanding, 
  formatCurrency 
}: LoanPortfolioSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Loan Portfolio</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total Loans</p>
            <p className="text-2xl font-bold">{activeLoans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total Disbursed</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(activeLoans.reduce((s, l) => s + (l.disbursedAmount || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No active loans
                    </TableCell>
                  </TableRow>
                ) : (
                  activeLoans.map((loan) => {
                    const outstanding = loan.emiSchedules.reduce((s, e) => s + (e.totalAmount - e.paidAmount), 0);
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono">{loan.applicationNo}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{loan.customer?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{loan.customer?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(loan.disbursedAmount || 0)}</TableCell>
                        <TableCell className="text-right">{loan.interestRate}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(loan.emiAmount)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(outstanding)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
