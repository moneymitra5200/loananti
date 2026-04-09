'use client';

import { useState, memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Eye, Clock, Loader2, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose?: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; company?: any;
  requestedTenure?: number; requestedInterestRate?: number;
}

interface Props {
  loans: Loan[];
  onRefresh: () => void;
  onViewDetails: (loan: Loan) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    SUBMITTED: { className: 'bg-blue-100 text-blue-700', label: 'New Application' },
    SA_APPROVED: { className: 'bg-purple-100 text-purple-700', label: 'SA Approved' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

function PendingLoansSection({ loans, onRefresh, onViewDetails }: Props) {
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState('');

  const pendingLoans = useMemo(() => loans.filter(l => l.status === 'SUBMITTED' || l.status === 'SA_APPROVED'), [loans]);

  const handleAction = useCallback(async (action: 'approve' | 'reject') => {
    if (!selectedLoan) return;
    setSaving(true);
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          action: action === 'approve' ? 'sa_approve' : 'reject',
          role: 'SUPER_ADMIN',
          remarks
        })
      });
      if (response.ok) {
        toast({ title: 'Success', description: `Loan ${action === 'approve' ? 'approved' : 'rejected'}` });
        setShowDialog(false);
        onRefresh();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [selectedLoan, remarks, onRefresh]);

  const openDialog = useCallback((loan: Loan) => {
    setSelectedLoan(loan);
    setRemarks('');
    setShowDialog(true);
  }, []);

  return (
    <>
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Loans awaiting super admin approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No loans pending approval</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {pendingLoans.map((loan, index) => (
                <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}
                  className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500">
                        <AvatarFallback className="bg-transparent text-white font-semibold">
                          {loan.customer?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                          {getStatusBadge(loan.status)}
                          {loan.fraudFlag && <Badge className="bg-red-100 text-red-700">Flagged</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                        {loan.company && <p className="text-xs text-blue-600 flex items-center gap-1"><Building2 className="h-3 w-3" />{loan.company.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                        <p className="text-xs text-gray-500">{loan.requestedTenure} mo @ {loan.requestedInterestRate}%</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onViewDetails(loan)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => openDialog(loan)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Action
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Action - {selectedLoan?.applicationNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{selectedLoan?.customer?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Requested Amount</p>
              <p className="font-bold text-lg">{formatCurrency(selectedLoan?.requestedAmount || 0)}</p>
            </div>
            <div>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks (optional)..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={() => handleAction('reject')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
            </Button>
            <Button className="bg-green-500 hover:bg-green-600" onClick={() => handleAction('approve')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(PendingLoansSection);
