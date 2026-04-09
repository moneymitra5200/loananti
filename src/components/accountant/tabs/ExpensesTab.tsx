'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, Trash2 } from 'lucide-react';
import type { ExpensesTabProps } from './types';

function ExpensesTabComponent({
  expenses,
  setSelectedExpense,
  setShowExpenseDialog,
  setShowExpenseDetailDialog,
  confirmDelete,
  formatCurrency,
  formatDate,
}: ExpensesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Record and manage company expenses</p>
        </div>
        <Button onClick={() => setShowExpenseDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Record Expense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">{formatCurrency(expenses.filter(e => new Date(e.paymentDate).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600">{expenses.filter(e => e.isApproved).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{expenses.filter(e => !e.isApproved).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono">{expense.expenseNumber}</TableCell>
                    <TableCell><Badge variant="outline">{expense.expenseType}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{formatDate(expense.paymentDate)}</TableCell>
                    <TableCell>
                      {expense.isApproved ? <Badge className="bg-green-500">Approved</Badge> : <Badge variant="destructive">Pending</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedExpense(expense); setShowExpenseDetailDialog(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!expense.isApproved && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => confirmDelete('expense', expense.id, expense.expenseNumber)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(ExpensesTabComponent);
