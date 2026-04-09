'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import type { ReportsTabProps } from './types';

function ReportsTabComponent({
  profitAndLoss,
  dateRange,
  handleExportReport,
  formatCurrency,
  formatDate,
}: ReportsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">{formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}</p>
        </div>
        <Button variant="outline" onClick={() => handleExportReport('profit-loss')}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" /> INCOME
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {profitAndLoss?.income?.map((item: any) => (
                  <TableRow key={item.accountCode}>
                    <TableCell className="font-mono text-xs">{item.accountCode}</TableCell>
                    <TableCell>{item.accountName}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-green-50 dark:bg-green-900/20">
                  <TableCell colSpan={2}>Total Income</TableCell>
                  <TableCell className="text-right font-mono text-green-600">{formatCurrency(profitAndLoss?.totalIncome || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-5 w-5" /> EXPENSES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {profitAndLoss?.expenses?.map((item: any) => (
                  <TableRow key={item.accountCode}>
                    <TableCell className="font-mono text-xs">{item.accountCode}</TableCell>
                    <TableCell>{item.accountName}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-red-50 dark:bg-red-900/20">
                  <TableCell colSpan={2}>Total Expenses</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{formatCurrency(profitAndLoss?.totalExpenses || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">NET PROFIT / (LOSS)</p>
              <p className="text-4xl font-bold">{formatCurrency(profitAndLoss?.netProfit || 0)}</p>
            </div>
            {(profitAndLoss?.netProfit || 0) >= 0 ? <TrendingUp className="h-16 w-16 opacity-50" /> : <TrendingDown className="h-16 w-16 opacity-50" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(ReportsTabComponent);
