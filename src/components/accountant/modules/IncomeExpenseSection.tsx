'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { Income, Expense } from '../types';

interface IncomeExpenseSectionProps {
  incomes: Income[];
  expenses: Expense[];
  onAddIncome: () => void;
  onAddExpense: () => void;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}

export function IncomeSection({ 
  incomes, 
  onAddIncome, 
  formatCurrency, 
  formatDateShort 
}: { 
  incomes: Income[];
  onAddIncome: () => void;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Income</h2>
        <Button onClick={onAddIncome}>
          <Plus className="h-4 w-4 mr-2" />
          Record Income
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No income recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{formatDateShort(income.date)}</TableCell>
                    <TableCell><Badge variant="default">{income.type}</Badge></TableCell>
                    <TableCell>{income.description}</TableCell>
                    <TableCell>{income.source}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      +{formatCurrency(income.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ExpenseSection({ 
  expenses, 
  onAddExpense, 
  formatCurrency, 
  formatDateShort 
}: { 
  expenses: Expense[];
  onAddExpense: () => void;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <Button onClick={onAddExpense}>
          <Plus className="h-4 w-4 mr-2" />
          Record Expense
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No expenses recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDateShort(expense.paymentDate)}</TableCell>
                    <TableCell className="font-mono text-sm">{expense.expenseNumber}</TableCell>
                    <TableCell><Badge variant="secondary">{expense.expenseType}</Badge></TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.paymentMode}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IncomeExpenseSection(props: IncomeExpenseSectionProps) {
  return null; // This component is just for re-exporting the sub-components
}
