'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface CompanyItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  customer: { id: string; name: string; email: string; phone: string; };
}

interface BulkApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoanIds: string[];
  bulkApprovalAction: 'approve' | 'reject';
  bulkCompanyId: string;
  setBulkCompanyId: (id: string) => void;
  bulkAgentId: string;
  setBulkAgentId: (id: string) => void;
  bulkSaving: boolean;
  companies: CompanyItem[];
  agentsList: Agent[];
  handleBulkCompanyChange: (companyId: string) => void;
  handleBulkApproval: () => void;
  pendingForSA: Loan[];
}

export default function BulkApprovalDialog({
  open,
  onOpenChange,
  selectedLoanIds,
  bulkApprovalAction,
  bulkCompanyId,
  setBulkCompanyId,
  bulkAgentId,
  setBulkAgentId,
  bulkSaving,
  companies,
  agentsList,
  handleBulkCompanyChange,
  handleBulkApproval,
  pendingForSA,
}: BulkApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {bulkApprovalAction === 'approve' ? (
              <><CheckCircle className="h-5 w-5 text-emerald-600" />Bulk Approve Applications</>
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
                  const loan = pendingForSA.find(l => l.id === id);
                  return sum + (loan?.requestedAmount || 0);
                }, 0))}
              </span>
            </div>
          </div>

          {bulkApprovalAction === 'approve' && (
            <>
              <div>
                <Label className="text-sm font-medium">Assign to Company *</Label>
                <Select value={bulkCompanyId} onValueChange={handleBulkCompanyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bulkCompanyId && (
                <div>
                  <Label className="text-sm font-medium">Assign to Agent *</Label>
                  {agentsList.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
                      No agents found for this company. Please add agents first.
                    </div>
                  ) : (
                    <Select value={bulkAgentId} onValueChange={setBulkAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentsList.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name} ({a.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className={bulkApprovalAction === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'} 
            onClick={handleBulkApproval}
            disabled={bulkSaving || (bulkApprovalAction === 'approve' && (!bulkCompanyId || !bulkAgentId))}
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
