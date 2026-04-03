'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import type { Loan, Staff } from '../types';

interface BulkApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkApprovalAction: 'approve' | 'reject';
  selectedLoanIds: string[];
  pendingForAgent: Loan[];
  staffList: Staff[];
  bulkStaffId: string;
  setBulkStaffId: (id: string) => void;
  bulkSaving: boolean;
  onBulkApproval: () => void;
}

export default function BulkApprovalDialog({
  open,
  onOpenChange,
  bulkApprovalAction,
  selectedLoanIds,
  pendingForAgent,
  staffList,
  bulkStaffId,
  setBulkStaffId,
  bulkSaving,
  onBulkApproval
}: BulkApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {bulkApprovalAction === 'approve' ? (
              <><CheckCircle className="h-5 w-5 text-cyan-600" />Bulk Approve Applications</>
            ) : (
              <><XCircle className="h-5 w-5 text-red-600" />Bulk Reject Applications</>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedLoanIds.length} applications selected for {bulkApprovalAction}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Total Applications</span>
              <span className="font-semibold">{selectedLoanIds.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Amount</span>
              <span className="font-semibold">
                {formatCurrency(selectedLoanIds.reduce((sum, id) => {
                  const loan = pendingForAgent.find(l => l.id === id);
                  return sum + (loan?.requestedAmount || 0);
                }, 0))}
              </span>
            </div>
          </div>

          {bulkApprovalAction === 'approve' && (
            <div>
              <Label className="text-sm font-medium">Assign to Staff *</Label>
              {staffList.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
                  No staff available. Please create a staff member first.
                </div>
              ) : (
                <Select value={bulkStaffId} onValueChange={setBulkStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.staffCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className={bulkApprovalAction === 'approve' ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-red-500 hover:bg-red-600'}
            onClick={onBulkApproval}
            disabled={bulkSaving || (bulkApprovalAction === 'approve' && !bulkStaffId)}
          >
            {bulkSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>{bulkApprovalAction === 'approve' ? 'Approve All' : 'Reject All'} ({selectedLoanIds.length})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
