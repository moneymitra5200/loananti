'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, CheckCircle, Eye, FileEdit } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any;
}

interface PendingLoansSectionProps {
  loans: Loan[];
  onFillForm: (loan: Loan) => void;
  onView: (loan: Loan) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    AGENT_APPROVED: { className: 'bg-blue-100 text-blue-700', label: 'Agent Approved' },
    LOAN_FORM_COMPLETED: { className: 'bg-green-100 text-green-700', label: 'Form Completed' },
    SESSION_CREATED: { className: 'bg-amber-100 text-amber-700', label: 'Session Created' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

function PendingLoansSectionComponent({ loans, onFillForm, onView }: PendingLoansSectionProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />Pending Applications
        </CardTitle>
        <CardDescription>Applications requiring loan form completion</CardDescription>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No pending applications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan, index) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-400 to-indigo-500">
                      <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                        {loan.customer?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                        {getStatusBadge(loan.status)}
                      </div>
                      <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                      <p className="text-xs text-gray-400">{formatDate(loan.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                      <p className="text-xs text-gray-500">{loan.loanType}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onView(loan)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => onFillForm(loan)}>
                        <FileEdit className="h-4 w-4 mr-1" />Fill Form
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
  );
}

export default memo(PendingLoansSectionComponent);
