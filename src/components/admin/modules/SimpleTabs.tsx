'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Wallet, XCircle } from 'lucide-react';

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone: string };
  sessionForm?: any;
  fraudFlag: boolean;
  riskScore: number;
  purpose: string;
  requestedTenure?: number;
  requestedInterestRate?: number;
  loanForm?: any;
  company?: any;
}

interface SimpleTabsProps {
  inProgressLoans: Loan[];
  activeLoans: Loan[];
  rejectedLoans: Loan[];
  renderLoanCard: (loan: Loan, index: number, showActions?: boolean, actions?: React.ReactNode) => React.ReactNode;
  type: 'progress' | 'active' | 'rejected';
}

export default function SimpleTabs({
  inProgressLoans,
  activeLoans,
  rejectedLoans,
  renderLoanCard,
  type
}: SimpleTabsProps) {
  if (type === 'progress') {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle>In Progress Applications</CardTitle>
          <CardDescription>Applications currently moving through the workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {inProgressLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No applications in progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressLoans.map((loan, index) => renderLoanCard(loan, index))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (type === 'active') {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
          <CardDescription>Currently running loans with active EMI schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {activeLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No active loans</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeLoans.map((loan, index) => renderLoanCard(loan, index))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // rejected
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle>Rejected Applications</CardTitle>
        <CardDescription>Applications that were rejected at various stages</CardDescription>
      </CardHeader>
      <CardContent>
        {rejectedLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <XCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No rejected applications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rejectedLoans.map((loan, index) => renderLoanCard(loan, index))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
