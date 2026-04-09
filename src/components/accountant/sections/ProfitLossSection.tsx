'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import type { ProfitLoss } from '../types';

interface ProfitLossSectionProps {
  profitLoss: ProfitLoss | null;
  onExport: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function ProfitLossSection({ profitLoss, onExport }: ProfitLossSectionProps) {
  const isProfit = (profitLoss?.netProfit || 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Profit & Loss Statement</h2>
        <Button onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Net Profit/Loss Card */}
      <Card className={`${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isProfit ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
              <div>
                <p className="text-sm text-gray-600">{isProfit ? 'Net Profit' : 'Net Loss'}</p>
                <p className={`text-3xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(profitLoss?.netProfit || 0))}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(profitLoss?.totalRevenue || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              REVENUE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {profitLoss?.revenue?.map((rev, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{rev.accountName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rev.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-green-50 font-bold">
                  <TableCell>Total Revenue</TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(profitLoss?.totalRevenue || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              EXPENSES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {(profitLoss?.expenses?.length || 0) > 0 ? (
                  profitLoss?.expenses?.map((exp, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{exp.accountName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">No expenses recorded</TableCell>
                    <TableCell className="text-right">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-red-50 font-bold">
                  <TableCell>Total Expenses</TableCell>
                  <TableCell className="text-right text-red-700">
                    {formatCurrency(profitLoss?.totalExpenses || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
