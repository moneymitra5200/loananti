'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, CheckCircle, FileEdit } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { Loan } from './types';

interface DashboardTabProps {
  loans: Loan[];
  pendingLoans: Loan[];
  setActiveTab: (tab: string) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    AGENT_APPROVED_STAGE1: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Pending Form' },
    LOAN_FORM_COMPLETED: { className: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Form Completed' },
    SESSION_CREATED: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Sanction Created' },
    REJECTED_FINAL: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700 border-gray-200', label: status };
  return <Badge className={c.className} variant="outline">{c.label}</Badge>;
};

function DashboardTabComponent({ loans, pendingLoans, setActiveTab }: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Pending Alert */}
      {pendingLoans.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FileEdit className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800">{pendingLoans.length} Loan Form{pendingLoans.length > 1 ? 's' : ''} Pending</h4>
                <p className="text-sm text-orange-600">Complete the forms to move loans forward</p>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setActiveTab('pending')}>
                Start Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No loans assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {loans.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-100 text-orange-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{loan.applicationNo}</p>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(loan.status)}
                    <p className="font-semibold hidden sm:block">{formatCurrency(loan.requestedAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(DashboardTabComponent);
