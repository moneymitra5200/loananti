'use client';

import { memo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CheckCircle, Receipt, Eye, ImageOff } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { LoanDetails } from './types';

interface HistorySectionProps {
  loanDetails: LoanDetails | null;
}

const HistorySection = memo(function HistorySection({ loanDetails }: HistorySectionProps) {
  const [proofDialogUrl, setProofDialogUrl] = useState<string | null>(null);

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
      {/* Proof Image Viewer Dialog */}
      <Dialog open={!!proofDialogUrl} onOpenChange={() => setProofDialogUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              Payment Proof Document
            </DialogTitle>
          </DialogHeader>
          {proofDialogUrl && (
            <div className="flex flex-col items-center gap-4">
              {/* Try image first; if it fails show a link */}
              <img
                src={proofDialogUrl}
                alt="Payment Proof"
                className="max-w-full max-h-[60vh] rounded-lg border shadow-md object-contain"
                onError={(e) => {
                  // If native image fails, replace with a download link
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex-col items-center gap-2 text-center">
                <ImageOff className="h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-500">Cannot preview this file type</p>
                <a
                  href={proofDialogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Open in new tab ↗
                </a>
              </div>
              <a
                href={proofDialogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 underline"
              >
                View Full Size ↗
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              {loanDetails.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {payment.paymentMode} • {formatDate(payment.createdAt)}
                    </p>
                    {payment.cashier && (
                      <p className="text-xs text-gray-400">
                        Collected by: {payment.cashier.name}
                      </p>
                    )}
                    {payment.paidBy && !payment.cashier && (
                      <p className="text-xs text-gray-400">
                        By: {payment.paidBy?.name || 'N/A'}
                      </p>
                    )}
                    {payment.remarks && (
                      <p className="text-xs text-gray-400 truncate" title={payment.remarks}>
                        {payment.remarks}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <Badge className={payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {payment.status}
                    </Badge>
                    {payment.receiptNumber && (
                      <p className="text-xs text-gray-400">{payment.receiptNumber}</p>
                    )}
                    {/* ── Proof View Button ── */}
                    {payment.proofUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs mt-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={() => setProofDialogUrl(payment.proofUrl)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Proof
                      </Button>
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
