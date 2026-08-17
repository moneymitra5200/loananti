'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarClock, IndianRupee, History, Info, FileText, Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { EMISchedule, LoanDetails } from './types';
import { openDoc } from '@/utils/openDoc';

interface Props {
  loanDetails: LoanDetails;
  emiSchedules: EMISchedule[];
  currentUserRole: string;
  onPayEMI: (emi: EMISchedule) => void;
  onChangeDate?: (emi: EMISchedule) => void;
  isMirrorLoan?: boolean;
}

const InterestOnlyEMISection = memo(function InterestOnlyEMISection({ 
  loanDetails, 
  emiSchedules, 
  currentUserRole,
  onPayEMI,
  onChangeDate,
  isMirrorLoan = false
}: Props) {
  // Calculate total interest paid
  const totalInterestPaid = emiSchedules
    .filter(e => e.status === 'PAID' || e.status === 'INTEREST_ONLY_PAID')
    .reduce((sum, e) => sum + (e.paidAmount || 0), 0);
    
  const paidCount = emiSchedules.filter(e => e.status === 'PAID' || e.status === 'INTEREST_ONLY_PAID').length;

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
            <CalendarClock className="h-5 w-5" />
            Interest EMI
            <Badge className="bg-amber-200 text-amber-700">Interest Only Phase</Badge>
          </CardTitle>
        </div>
        <CardDescription>
          Pay monthly interest until ready to start full EMI payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Interest Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border border-amber-200">
              <p className="text-xs text-gray-500">Principal Amount</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(loanDetails.sessionForm?.approvedAmount || loanDetails.requestedAmount)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-amber-200">
              <p className="text-xs text-gray-500">Interest Rate</p>
              <p className="text-lg font-bold text-amber-700">
                {loanDetails.sessionForm?.interestRate || 0}% p.a.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-amber-200">
              <p className="text-xs text-gray-500">Monthly Interest</p>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(
                  loanDetails.interestOnlyMonthlyAmount || 
                  ((loanDetails.sessionForm?.approvedAmount || loanDetails.requestedAmount || 0) * (loanDetails.sessionForm?.interestRate || 0) / 100 / 12)
                )}
              </p>
            </div>
          </div>

          {/* Total Interest Paid */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Total Interest Paid</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(totalInterestPaid)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Payments Made</p>
                <p className="text-xl font-bold text-gray-700">
                  {paidCount}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Current Pending Interest EMI */}
          {(() => {
            const pendingEmi = emiSchedules.find(e => e.status === 'PENDING' && e.isInterestOnly);
            if (pendingEmi) {
              return (
                <div className="p-4 bg-white rounded-lg border-2 border-amber-300 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Interest Payment #{pendingEmi.emiNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {formatDate(pendingEmi.dueDate)}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(pendingEmi.emiAmount)}
                      </p>
                      <p className="text-xs text-gray-500">Interest Amount Due</p>
                    </div>
                    {!isMirrorLoan ? (
                      currentUserRole !== 'ACCOUNTANT' && (
                        <div className="flex items-center gap-2">
                          <Button
                            className="bg-amber-500 hover:bg-amber-600"
                            onClick={() => onPayEMI(pendingEmi)}
                          >
                            <IndianRupee className="h-4 w-4 mr-1" />
                            Pay Interest
                          </Button>
                          {onChangeDate && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-400 text-amber-800 hover:bg-amber-100"
                              onClick={() => onChangeDate(pendingEmi)}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Change Date
                            </Button>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Synced from original
                      </span>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-blue-700 font-medium">No pending interest EMI</p>
                <p className="text-sm text-blue-600">Your interest is up to date!</p>
              </div>
            );
          })()}

          <Separator />

          {/* Payment History */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Payment History
            </h4>
            {paidCount > 0 ? (
              <div className="w-full">
                <div className="space-y-2">
                  {emiSchedules
                    .filter(e => e.status === 'PAID' || e.status === 'INTEREST_ONLY_PAID')
                    .sort((a, b) => b.emiNumber - a.emiNumber)
                    .map((emi, index, arr) => (
                      <div key={emi.id} className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              Payment #{arr.length - index}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                              Due Date: {emi.dueDate ? formatDate(emi.dueDate) : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Paid Date: {emi.paidDate ? formatDate(emi.paidDate) : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatCurrency(emi.paidAmount || 0)}
                            </p>
                            <div className="flex items-center gap-1">
                              <Badge className="bg-gray-100 text-gray-600 text-xs">
                                {emi.paymentMode || 'CASH'}
                              </Badge>
                              {emi.status === 'INTEREST_ONLY_PAID' && (
                                <Badge className="bg-purple-100 text-purple-600 text-xs">
                                  Interest Only
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Payment Proof */}
                        {emi.proofUrl && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Payment Proof
                            </p>
                            {emi.proofUrl.includes('application/pdf') || emi.proofUrl.toLowerCase().endsWith('.pdf') ? (
                              <button
                                type="button"
                                onClick={() => openDoc(emi.proofUrl!)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100"
                              >
                                <FileText className="h-3 w-3" /> View PDF Proof
                              </button>
                            ) : (
                              <button type="button" onClick={() => openDoc(emi.proofUrl!)} className="shrink-0">
                                <img
                                  src={emi.proofUrl}
                                  alt="Payment Proof"
                                  className="h-16 w-24 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No payments yet</p>
              </div>
            )}
          </div>

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              You are in the Interest Only phase. Pay monthly interest until ready to start full EMI payments.
              Click "Start Loan" button above when you want to begin regular EMI payments.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
});

export default InterestOnlyEMISection;
