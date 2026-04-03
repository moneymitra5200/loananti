'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BankForm, Company } from '../../types';

interface BankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankForm: BankForm;
  setBankForm: React.Dispatch<React.SetStateAction<BankForm>>;
  selectedCompany: Company | undefined;
  onSubmit: () => void;
}

export default function BankDialog({ 
  open, 
  onOpenChange, 
  bankForm, 
  setBankForm, 
  selectedCompany,
  onSubmit 
}: BankDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
          <DialogDescription>Add a bank account for {selectedCompany?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bank Name *</Label>
            <Input 
              value={bankForm.bankName} 
              onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
              placeholder="State Bank of India"
            />
          </div>
          <div>
            <Label>Account Number *</Label>
            <Input 
              value={bankForm.accountNumber} 
              onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
              placeholder="1234567890"
            />
          </div>
          <div>
            <Label>Account Name</Label>
            <Input 
              value={bankForm.accountName} 
              onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
              placeholder="Company Name"
            />
          </div>
          <div>
            <Label>IFSC Code</Label>
            <Input 
              value={bankForm.ifscCode} 
              onChange={(e) => setBankForm(prev => ({ ...prev, ifscCode: e.target.value }))}
              placeholder="SBIN0001234"
            />
          </div>
          <div>
            <Label>UPI ID</Label>
            <Input 
              value={bankForm.upiId} 
              onChange={(e) => setBankForm(prev => ({ ...prev, upiId: e.target.value }))}
              placeholder="company@upi"
            />
          </div>
          <div>
            <Label>Opening Balance</Label>
            <Input 
              type="number"
              value={bankForm.openingBalance} 
              onChange={(e) => setBankForm(prev => ({ ...prev, openingBalance: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={bankForm.isDefault}
              onChange={(e) => setBankForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="isDefault">Set as default bank account</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Add Bank Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
