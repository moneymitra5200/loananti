'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import type { Loan, Staff } from '../types';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  approvalAction: 'approve' | 'reject' | 'send_back';
  staffList: Staff[];
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  remarks: string;
  setRemarks: (remarks: string) => void;
  setApprovalAction: (action: 'approve' | 'reject' | 'send_back') => void;
  setShowStaffDialog: (show: boolean) => void;
  saving: boolean;
  onApprove: () => void;
}

export default function ApprovalDialog({
  open,
  onOpenChange,
  selectedLoan,
  approvalAction,
  staffList,
  selectedStaffId,
  setSelectedStaffId,
  remarks,
  setRemarks,
  setApprovalAction,
  setShowStaffDialog,
  saving,
  onApprove
}: ApprovalDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const onAction = async () => {
    setIsProcessing(true);
    try {
      await onApprove();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {approvalAction === 'approve' ? 'Approve & Assign Staff' : approvalAction === 'reject' ? 'Reject Application' : 'Send Back Application'}
          </DialogTitle>
          <DialogDescription>{selectedLoan?.applicationNo} - {selectedLoan?.customer?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {selectedLoan && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-semibold">{formatCurrency(selectedLoan.requestedAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-semibold">{selectedLoan.loanType}</p>
                </div>
              </div>
            </div>
          )}
          {approvalAction === 'approve' && (
            <div>
              <Label>Assign to Staff *</Label>
              {staffList.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-lg text-amber-700 text-sm">
                  No staff available. Please create a staff member first.
                  <Button size="sm" className="ml-2" onClick={() => { onOpenChange(false); setShowStaffDialog(true); }}>
                    Create Staff
                  </Button>
                </div>
              ) : (
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.staffCode})</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Textarea placeholder="Add remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {/* Show Send Back button for applicable statuses */}
          {['AGENT_APPROVED_STAGE1', 'LOAN_FORM_COMPLETED', 'SESSION_CREATED'].includes(selectedLoan?.status || '') && (
            <Button
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
              onClick={() => { setApprovalAction('send_back'); }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Send Back
            </Button>
          )}
          <Button
            className={approvalAction === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : approvalAction === 'send_back' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}
            onClick={onAction}
            disabled={saving || isProcessing}
          >
            {saving || isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              approvalAction === 'approve' ? 'Approve' : approvalAction === 'send_back' ? 'Confirm Send Back' : 'Reject'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
