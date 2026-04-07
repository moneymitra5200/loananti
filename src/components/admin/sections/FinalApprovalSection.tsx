'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any;
}

interface FinalApprovalSectionProps {
  loans: Loan[];
  onApprove: (loan: Loan) => void;
  onReject: (loan: Loan) => void;
  onView: (loan: Loan) => void;
}

function FinalApprovalSectionComponent({ loans, onApprove, onReject, onView }: FinalApprovalSectionProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />Final Approval Queue
        </CardTitle>
        <CardDescription>Customer-approved sanctions awaiting final authorization</CardDescription>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No applications awaiting final approval</p>
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
                    <Avatar className="h-10 w-10 bg-gradient-to-br from-green-400 to-emerald-500">
                      <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                        {loan.customer?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                        <Badge className="bg-green-100 text-green-700">Ready</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                      <p className="text-xs text-gray-500">{loan.sessionForm?.tenure} mo @ {loan.sessionForm?.interestRate}%</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-blue-200 text-blue-600" onClick={() => onView(loan)}>
                        <Eye className="h-4 w-4 mr-1" />View
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600" onClick={() => onReject(loan)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => onApprove(loan)}>
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
  );
}

export default memo(FinalApprovalSectionComponent);
