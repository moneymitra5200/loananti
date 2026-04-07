'use client';

import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
}

interface Props {
  loans: Loan[];
  selectedLoanIds: string[];
  onSelectLoan: (loanId: string) => void;
  onSelectAll: (loanIds: string[]) => void;
  onViewLoan: (loan: Loan) => void;
  onApprove: (loan: Loan) => void;
  onReject: (loan: Loan) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    SUBMITTED: { className: 'bg-blue-100 text-blue-700', label: 'New' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

function PendingLoansTab({
  loans,
  selectedLoanIds,
  onSelectLoan,
  onSelectAll,
  onViewLoan,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  onClearSelection
}: Props) {
  const pendingForSA = useMemo(() => loans.filter(l => l.status === 'SUBMITTED'), [loans]);
  const pendingLoanIds = useMemo(() => pendingForSA.map(l => l.id), [pendingForSA]);
  const selectedTotal = useMemo(() => 
    selectedLoanIds.reduce((sum, id) => {
      const loan = pendingForSA.find(l => l.id === id);
      return sum + (loan?.requestedAmount || 0);
    }, 0),
    [selectedLoanIds, pendingForSA]
  );

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedLoanIds.length > 0 && (
        <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">
                  {selectedLoanIds.length} selected
                </Badge>
                <span className="text-sm text-emerald-700">
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={onBulkReject}>
                  <XCircle className="h-4 w-4 mr-1" />Reject All
                </Button>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={onBulkApprove}>
                  <CheckCircle className="h-4 w-4 mr-1" />Approve All
                </Button>
                <Button size="sm" variant="ghost" onClick={onClearSelection}>
                  X
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />New Loan Applications
              </CardTitle>
              <CardDescription>Applications awaiting initial approval. Assign a company to approve.</CardDescription>
            </div>
            {pendingForSA.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-pending"
                  checked={selectedLoanIds.length === pendingLoanIds.length && pendingLoanIds.length > 0}
                  onCheckedChange={() => onSelectAll(pendingLoanIds)}
                />
                <Label htmlFor="select-all-pending" className="text-sm font-medium cursor-pointer">
                  Select All ({pendingForSA.length})
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingForSA.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No pending applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingForSA.map((loan, index) => (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 border rounded-xl hover:bg-gray-50 transition-all bg-white ${
                    selectedLoanIds.includes(loan.id) ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Checkbox checked={selectedLoanIds.includes(loan.id)} onCheckedChange={() => onSelectLoan(loan.id)} />
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500">
                        <AvatarFallback className="bg-transparent text-white font-semibold">
                          {loan.customer?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                          {getStatusBadge(loan.status)}
                          {loan.fraudFlag && <Badge className="bg-red-100 text-red-700">High Risk</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                        <p className="text-xs text-gray-500">{loan.loanType}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onViewLoan(loan)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => onReject(loan)}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => onApprove(loan)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Approve
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
    </div>
  );
}

export default memo(PendingLoansTab);
