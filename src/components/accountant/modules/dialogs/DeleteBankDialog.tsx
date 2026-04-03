'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { BankAccount } from '../../types';

interface DeleteBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankToDelete: BankAccount | null;
  deleting: boolean;
  onSubmit: () => void;
  formatCurrency: (amount: number) => string;
}

export default function DeleteBankDialog({ 
  open, 
  onOpenChange, 
  bankToDelete,
  deleting,
  onSubmit,
  formatCurrency
}: DeleteBankDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Bank Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-2">
              You are about to permanently delete:
            </p>
            <div className="bg-white rounded p-3 mb-3">
              <p className="font-semibold">{bankToDelete?.bankName}</p>
              <p className="text-sm text-gray-500">Account: ****{bankToDelete?.accountNumber?.slice(-4)}</p>
              <p className="text-sm text-gray-500">Balance: {formatCurrency(bankToDelete?.currentBalance || 0)}</p>
            </div>
            <p className="text-sm text-red-700">
              This will also permanently delete all transactions associated with this bank account.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={onSubmit} 
            disabled={deleting}
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
