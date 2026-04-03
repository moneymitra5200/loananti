'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
}

interface Props {
  loans: Loan[];
  onViewLoan: (loan: Loan) => void;
  onApprove: (loan: Loan) => void;
  onReject: (loan: Loan) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    CUSTOMER_SESSION_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Awaiting Final' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

function FinalApprovalTab({ loans, onViewLoan, onApprove, onReject }: Props) {
  const pendingForFinal = useMemo(() => loans.filter(l => l.status === 'CUSTOMER_SESSION_APPROVED'), [loans]);

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
              const showSanctionDetails = loan.sessionForm;
              const displayAmount = showSanctionDetails ? loan.sessionForm.approvedAmount : loan.requestedAmount;
              const displayTenure = showSanctionDetails ? loan.sessionForm.tenure : null;
              const displayInterest = showSanctionDetails ? loan.sessionForm.interestRate : null;
              const displayEMI = showSanctionDetails ? loan.sessionForm.emiAmount : null;

              return (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 border rounded-xl hover:bg-gray-50 transition-all bg-white border-emerald-200 bg-emerald-50/30"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500">
                        <AvatarFallback className="bg-transparent text-white font-semibold">
                          {loan.customer?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                          {getStatusBadge(loan.status)}
                          {showSanctionDetails && (
                            <Badge className="bg-emerald-100 text-emerald-700">Sanction: {formatCurrency(displayAmount)}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {showSanctionDetails ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-gray-400 line-through">{formatCurrency(loan.requestedAmount)}</span>
                              <ArrowRight className="h-3 w-3 text-emerald-500" />
                              <p className="font-bold text-lg text-emerald-700">{formatCurrency(displayAmount)}</p>
                            </div>
                            <div className="flex items-center gap-2 justify-end text-xs text-gray-500">
                              <span>{displayTenure} mo</span>
                              <span>•</span>
                              <span>{displayInterest}%</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">EMI: {formatCurrency(displayEMI)}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                            <p className="text-xs text-gray-500">{loan.loanType}</p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => onViewLoan(loan)}>
                          <Eye className="h-4 w-4 mr-1" />View All
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => onReject(loan)}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => onApprove(loan)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Final Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(FinalApprovalTab);
