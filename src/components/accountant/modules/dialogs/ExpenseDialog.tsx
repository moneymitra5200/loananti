'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExpenseForm, Company } from '../../types';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseForm: ExpenseForm;
  setExpenseForm: React.Dispatch<React.SetStateAction<ExpenseForm>>;
  selectedCompany: Company | undefined;
  onSubmit: () => void;
}

export default function ExpenseDialog({ 
  open, 
  onOpenChange, 
  expenseForm, 
  setExpenseForm, 
  selectedCompany,
  onSubmit 
}: ExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
          <DialogDescription>Record an expense for {selectedCompany?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Expense Type</Label>
            <Select 
              value={expenseForm.expenseType} 
              onValueChange={(val) => setExpenseForm(prev => ({ ...prev, expenseType: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY">Salary</SelectItem>
                <SelectItem value="OFFICE_RENT">Office Rent</SelectItem>
                <SelectItem value="UTILITIES">Utilities</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="TRAVEL">Travel</SelectItem>
                <SelectItem value="OFFICE_SUPPLIES">Office Supplies</SelectItem>
                <SelectItem value="BANK_CHARGES">Bank Charges</SelectItem>
                <SelectItem value="MISCELLANEOUS">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea 
              value={expenseForm.description} 
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter expense description"
            />
          </div>
          <div>
            <Label>Amount (₹) *</Label>
            <Input 
              type="number"
              value={expenseForm.amount} 
              onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Payment Mode</Label>
            <Select 
              value={expenseForm.paymentMode} 
              onValueChange={(val) => setExpenseForm(prev => ({ ...prev, paymentMode: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Date</Label>
            <Input 
              type="date"
              value={expenseForm.paymentDate} 
              onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentDate: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Record Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
