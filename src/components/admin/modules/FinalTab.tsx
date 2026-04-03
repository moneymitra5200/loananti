'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Eye, XCircle } from 'lucide-react';
import type { Loan } from '../types';

interface FinalTabProps {
  pendingForFinal: Loan[];
  setSelectedLoan: (loan: Loan | null) => void;
  fetchLoanDetails: (id: string) => void;
  setApprovalAction: (action: 'approve' | 'reject' | 'send_back') => void;
  setShowApprovalDialog: (show: boolean) => void;
  renderLoanCard: (loan: Loan, index: number, showActions: boolean, actions: React.ReactNode) => React.ReactNode;
}

export default function FinalTab({
  pendingForFinal,
  setSelectedLoan,
  fetchLoanDetails,
  setApprovalAction,
  setShowApprovalDialog,
  renderLoanCard
}: FinalTabProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />Final Approval Queue
        </CardTitle>
        <CardDescription>Customer-approved sanctions awaiting final authorization for disbursement</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingForFinal.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No applications awaiting final approval</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingForFinal.map((loan, index) => {
              return renderLoanCard(loan, index, false,
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => { setSelectedLoan(loan); fetchLoanDetails(loan.id); }}>
                    <Eye className="h-4 w-4 mr-1" />View All
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => { setSelectedLoan(loan); setApprovalAction('reject'); setShowApprovalDialog(true); }}>
                    <XCircle className="h-4 w-4 mr-1" />Reject
                  </Button>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setSelectedLoan(loan);
                      setApprovalAction('approve');
                      // Always show approval dialog with mirror option for Company 3 loans
                      setShowApprovalDialog(true);
                    }}>
                    <CheckCircle className="h-4 w-4 mr-1" />Final Approve
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
