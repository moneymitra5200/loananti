'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface LoanToDelete {
  id: string;
  identifier: string;
  loanType: string;
  customer?: { name: string };
  approvedAmount: number;
  emiAmount: number;
}

interface DeleteLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanToDelete: LoanToDelete | null;
  deleteReason: string;
  setDeleteReason: (reason: string) => void;
  deleting: boolean;
  handleDeleteLoan: () => void;
  setLoanToDelete: (loan: LoanToDelete | null) => void;
}

export default function DeleteLoanDialog({
  open,
  onOpenChange,
  loanToDelete,
  deleteReason,
  setDeleteReason,
  deleting,
  handleDeleteLoan,
  setLoanToDelete,
}: DeleteLoanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Loan
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The loan will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        {loanToDelete && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${loanToDelete.loanType === 'ONLINE' ? 'bg-blue-50' : 'bg-purple-50'}`}>
              <div className="flex items-center gap-3">
                <Badge className={loanToDelete.loanType === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                  {loanToDelete.loanType}
                </Badge>
                <div>
                  <p className="font-semibold">{loanToDelete.identifier}</p>
                  <p className="text-sm text-gray-500">{loanToDelete.customer?.name}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium">{formatCurrency(loanToDelete.approvedAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">EMI</p>
                  <p className="font-medium">{formatCurrency(loanToDelete.emiAmount)}/mo</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason for Deletion *</Label>
              <Textarea
                placeholder="Please provide a reason for deleting this loan..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> This will permanently delete the loan record, all EMI schedules, 
                payment history, and related documents. The deletion will be recorded in the audit log.
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setLoanToDelete(null); setDeleteReason(''); }}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteLoan} 
            disabled={deleting || !deleteReason.trim()}
          >
            {deleting ? 'Deleting...' : 'Delete Loan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
