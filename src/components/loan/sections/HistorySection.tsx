'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { LoanDetails } from './types';

interface HistorySectionProps {
  loanDetails: LoanDetails | null;
}

const HistorySection = memo(function HistorySection({ loanDetails }: HistorySectionProps) {
  // Build timeline from workflow logs or fallback to status dates
  const timelineItems = loanDetails?.workflowLogs && loanDetails.workflowLogs.length > 0
    ? loanDetails.workflowLogs
    : [
        { date: loanDetails?.submittedAt || loanDetails?.createdAt, event: 'Application Submitted', status: 'SUBMITTED' },
        { date: loanDetails?.saApprovedAt, event: 'Super Admin Approved', status: 'SA_APPROVED' },
        { date: loanDetails?.companyApprovedAt, event: 'Company Approved', status: 'COMPANY_APPROVED' },
        { date: loanDetails?.agentApprovedAt, event: 'Agent Approved', status: 'AGENT_APPROVED_STAGE1' },
        { date: loanDetails?.loanFormCompletedAt, event: 'Form Completed', status: 'LOAN_FORM_COMPLETED' },
        { date: loanDetails?.sanctionCreatedAt, event: 'Sanction Created', status: 'SESSION_CREATED' },
        { date: loanDetails?.customerApprovedAt, event: 'Customer Approved Sanction', status: 'CUSTOMER_SESSION_APPROVED' },
        { date: loanDetails?.finalApprovedAt, event: 'Final Approved', status: 'FINAL_APPROVED' },
        { date: loanDetails?.disbursedAt, event: 'Loan Disbursed', status: 'DISBURSED' },
        { date: loanDetails?.rejectedAt, event: 'Rejected', status: loanDetails?.status },
      ].filter((item): item is { date: string; event: string; status: string } => !!item.date);

  return (
    <>
      {/* Workflow Timeline */}
      <Card className="border-0 shadow-sm mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Workflow Timeline
          </CardTitle>
          <CardDescription>Complete journey of this loan application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {loanDetails?.workflowLogs && loanDetails.workflowLogs.length > 0 ? (
              <div className="space-y-4">
                {loanDetails.workflowLogs.map((log, i) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        i === 0 ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        {i === 0 ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        )}
                      </div>
                      {i < (loanDetails.workflowLogs?.length || 0) - 1 && (
                        <div className="w-0.5 h-8 bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{log.action}</p>
                        <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Status: {log.previousStatus} → {log.newStatus}
                      </p>
                      {log.actionBy && (
                        <p className="text-xs text-gray-400">
                          By: {log.actionBy.name} ({log.actionBy.role})
                        </p>
                      )}
                      {log.remarks && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{log.remarks}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {timelineItems.map((item, i, arr) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        i === arr.length - 1 && !loanDetails?.rejectedAt ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.event}</p>
                        <span className="text-xs text-gray-500">{formatDate(item.date || new Date())}</span>
                      </div>
                      <p className="text-sm text-gray-500">Status: {item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {loanDetails?.payments && loanDetails.payments.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-600" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loanDetails.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {payment.paymentMode} • {formatDate(payment.createdAt)}
                    </p>
                    {payment.cashier && (
                      <p className="text-xs text-gray-400">
                        Collected by: {payment.cashier.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge className={payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {payment.status}
                    </Badge>
                    {payment.receiptNumber && (
                      <p className="text-xs text-gray-400 mt-1">{payment.receiptNumber}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
});

export default HistorySection;
