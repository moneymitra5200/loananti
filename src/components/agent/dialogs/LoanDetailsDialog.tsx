'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/helpers';
import type { Loan } from '../types';

interface LoanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function LoanDetailsDialog({
  open,
  onOpenChange,
  selectedLoan,
  getStatusBadge
}: LoanDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Loan Details</DialogTitle>
          <DialogDescription>{selectedLoan?.applicationNo}</DialogDescription>
        </DialogHeader>
        {selectedLoan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-semibold">{selectedLoan.customer?.name}</p>
                <p className="text-sm text-gray-500">{selectedLoan.customer?.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedLoan.status)}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-semibold">{formatCurrency(selectedLoan.requestedAmount)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Loan Type</p>
                <p className="font-semibold">{selectedLoan.loanType}</p>
              </div>
            </div>
            {selectedLoan.sessionForm && (
              <div className="p-4 bg-emerald-50 rounded-lg">
                <h4 className="font-semibold mb-2">Sanction Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Approved Amount</p>
                    <p className="font-semibold">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Interest Rate</p>
                    <p className="font-semibold">{selectedLoan.sessionForm.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">EMI</p>
                    <p className="font-semibold">{formatCurrency(selectedLoan.sessionForm.emiAmount)}/mo</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
