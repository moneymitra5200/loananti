'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from 'lucide-react';
import type { YearEndTabProps } from './types';

function YearEndTabComponent({
  financialYears,
  profitAndLoss,
  formatCurrency,
  formatDate,
}: YearEndTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Year-End Closing</h1>
          <p className="text-muted-foreground">Manage financial year closing and carry forward balances</p>
        </div>
      </div>

      {/* Financial Years List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Financial Years
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialYears.map((fy) => (
                <TableRow key={fy.id}>
                  <TableCell className="font-medium">{fy.name}</TableCell>
                  <TableCell>{formatDate(fy.startDate)}</TableCell>
                  <TableCell>{formatDate(fy.endDate)}</TableCell>
                  <TableCell>
                    {fy.isClosed ? (
                      <Badge className="bg-gray-500">Closed</Badge>
                    ) : (
                      <Badge className="bg-green-500">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!fy.isClosed && (
                      <Button size="sm" variant="outline">
                        Close Year
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {financialYears.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No financial years configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Year-End Process Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Year-End Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium">Review Trial Balance</p>
                <p className="text-sm text-muted-foreground">Ensure all accounts are balanced before closing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium">Post Adjusting Entries</p>
                <p className="text-sm text-muted-foreground">Record any year-end adjustments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium">Close Income & Expense</p>
                <p className="text-sm text-muted-foreground">Transfer net profit/loss to Retained Earnings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-600 font-bold text-sm">4</span>
              </div>
              <div>
                <p className="font-medium">Carry Forward Balances</p>
                <p className="text-sm text-muted-foreground">Asset & Liability balances carry to new year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Year Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm">Total Income</span>
              <span className="font-bold text-green-600">{formatCurrency(profitAndLoss?.totalIncome || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-sm">Total Expenses</span>
              <span className="font-bold text-red-600">{formatCurrency(profitAndLoss?.totalExpenses || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="font-medium">Net Profit/Loss</span>
              <span className={`font-bold text-xl ${(profitAndLoss?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profitAndLoss?.netProfit || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default memo(YearEndTabComponent);
