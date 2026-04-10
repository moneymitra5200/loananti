'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, DollarSign, CreditCard, CheckCircle, XCircle, 
  Banknote, Building, AlertCircle, MapPin
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { LoanDetails } from './types';

interface OverviewSectionProps {
  loanDetails: LoanDetails | null;
}

const OverviewSection = memo(function OverviewSection({ loanDetails }: OverviewSectionProps) {
  return (
    <>
      {/* Application Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Application Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Application No</p>
              <p className="font-semibold">{loanDetails?.applicationNo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Applied On</p>
              <p className="font-semibold">{formatDate(loanDetails?.submittedAt || loanDetails?.createdAt || new Date())}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Loan Type</p>
              <p className="font-semibold">{loanDetails?.loanType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Purpose</p>
              <p className="font-semibold">{loanDetails?.purpose || 'N/A'}</p>
            </div>
            {loanDetails?.applicationLocation && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-blue-500" /> Application Location
                </p>
                <p className="font-semibold text-blue-700">{loanDetails.applicationLocation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requested vs Approved */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Loan Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500">Requested</p>
              <p className="font-bold text-lg">{formatCurrency(loanDetails?.requestedAmount || 0)}</p>
              <p className="text-xs text-gray-400">{loanDetails?.requestedTenure} months @ {loanDetails?.requestedInterestRate}%</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-center">
              <p className="text-xs text-emerald-600">Approved</p>
              <p className="font-bold text-lg text-emerald-700">{formatCurrency(loanDetails?.sessionForm?.approvedAmount || 0)}</p>
              <p className="text-xs text-emerald-500">{loanDetails?.sessionForm?.tenure} months @ {loanDetails?.sessionForm?.interestRate}%</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <p className="text-xs text-purple-600">Disbursed</p>
              <p className="font-bold text-lg text-purple-700">{formatCurrency(loanDetails?.disbursedAmount || 0)}</p>
              <p className="text-xs text-purple-500">{loanDetails?.disbursementMode || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sanction Details */}
      {loanDetails?.sessionForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Sanction / EMI Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Interest Rate</p>
                <p className="font-semibold">{loanDetails.sessionForm.interestRate}% p.a.</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tenure</p>
                <p className="font-semibold">{loanDetails.sessionForm.tenure} months</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">EMI Amount</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(loanDetails.sessionForm.emiAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Interest</p>
                <p className="font-semibold">{formatCurrency(loanDetails.sessionForm.totalInterest)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-semibold">{formatCurrency(loanDetails.sessionForm.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Processing Fee</p>
                <p className="font-semibold">{formatCurrency(loanDetails.sessionForm.processingFee || 0)}</p>
              </div>
              {loanDetails.sessionForm.startDate && (
                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="font-semibold">{formatDate(loanDetails.sessionForm.startDate)}</p>
                </div>
              )}
              {loanDetails.sessionForm.moratoriumPeriod && loanDetails.sessionForm.moratoriumPeriod > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Moratorium</p>
                  <p className="font-semibold">{loanDetails.sessionForm.moratoriumPeriod} months</p>
                </div>
              )}
              {loanDetails.sessionForm.latePaymentPenalty && (
                <div>
                  <p className="text-xs text-gray-500">Late Fee</p>
                  <p className="font-semibold">{loanDetails.sessionForm.latePaymentPenalty}%</p>
                </div>
              )}
            </div>
            {loanDetails.sessionForm.specialConditions && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600 font-medium">Special Conditions</p>
                <p className="text-sm mt-1">{loanDetails.sessionForm.specialConditions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification Status */}
      {loanDetails?.loanForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-2 rounded-lg text-center ${loanDetails.loanForm.panVerified ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">PAN</p>
                {loanDetails.loanForm.panVerified ? 
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600" /> :
                  <XCircle className="h-5 w-5 mx-auto text-gray-400" />
                }
              </div>
              <div className={`p-2 rounded-lg text-center ${loanDetails.loanForm.aadhaarVerified ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">Aadhaar</p>
                {loanDetails.loanForm.aadhaarVerified ? 
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600" /> :
                  <XCircle className="h-5 w-5 mx-auto text-gray-400" />
                }
              </div>
              <div className={`p-2 rounded-lg text-center ${loanDetails.loanForm.bankVerified ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">Bank</p>
                {loanDetails.loanForm.bankVerified ? 
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600" /> :
                  <XCircle className="h-5 w-5 mx-auto text-gray-400" />
                }
              </div>
              <div className={`p-2 rounded-lg text-center ${loanDetails.loanForm.employmentVerified ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">Employment</p>
                {loanDetails.loanForm.employmentVerified ? 
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600" /> :
                  <XCircle className="h-5 w-5 mx-auto text-gray-400" />
                }
              </div>
              <div className={`p-2 rounded-lg text-center ${loanDetails.loanForm.addressVerified ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">Address</p>
                {loanDetails.loanForm.addressVerified ? 
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600" /> :
                  <XCircle className="h-5 w-5 mx-auto text-gray-400" />
                }
              </div>
              <div className={`p-2 rounded-lg text-center ${loanDetails.loanForm.incomeVerified ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">Income</p>
                {loanDetails.loanForm.incomeVerified ? 
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600" /> :
                  <XCircle className="h-5 w-5 mx-auto text-gray-400" />
                }
              </div>
            </div>
            {loanDetails.loanForm.riskScore && loanDetails.loanForm.riskScore > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Risk Score</span>
                  <span className={`font-bold ${loanDetails.loanForm.riskScore > 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {loanDetails.loanForm.riskScore}/100
                  </span>
                </div>
                {loanDetails.loanForm.riskFactors && (
                  <p className="text-xs text-gray-500 mt-1">{loanDetails.loanForm.riskFactors}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disbursement Details */}
      {loanDetails?.disbursedAmount && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-purple-600" />
              Disbursement Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Disbursed Amount</p>
                <p className="font-semibold text-purple-600">{formatCurrency(loanDetails.disbursedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Disbursed On</p>
                <p className="font-semibold">{formatDate(loanDetails.disbursedAt || new Date())}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Mode</p>
                <p className="font-semibold">{loanDetails.disbursementMode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reference</p>
                <p className="font-semibold">{loanDetails.disbursementRef || 'N/A'}</p>
              </div>
              {loanDetails.disbursedBy && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Disbursed By</p>
                  <p className="font-semibold">{loanDetails.disbursedBy.name} ({loanDetails.disbursedBy.email})</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-orange-600" />
            Assignment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Company</p>
              <p className="font-semibold">{loanDetails?.company?.name || 'N/A'}</p>
              {loanDetails?.company?.code && <p className="text-xs text-gray-400">Code: {loanDetails.company.code}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500">Agent</p>
              <p className="font-semibold">{loanDetails?.agent?.name || loanDetails?.sessionForm?.agent?.name || 'N/A'}</p>
              {loanDetails?.agent?.agentCode && <p className="text-xs text-gray-400">Code: {loanDetails.agent.agentCode}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk & Fraud */}
      {(loanDetails?.riskScore || loanDetails?.fraudFlag) && (
        <Card className={`border-0 shadow-sm ${loanDetails?.fraudFlag ? 'bg-red-50' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className={`h-4 w-4 ${loanDetails?.fraudFlag ? 'text-red-600' : 'text-amber-600'}`} />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loanDetails?.riskScore && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Risk Score</span>
                  <span className={`font-bold ${loanDetails.riskScore > 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {loanDetails.riskScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${loanDetails.riskScore > 50 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${loanDetails.riskScore}%` }}
                  />
                </div>
              </div>
            )}
            {loanDetails?.fraudFlag && (
              <div className="p-3 bg-red-100 rounded-lg">
                <p className="text-red-800 font-medium">⚠️ Fraud Flag Detected</p>
                {((loanDetails as any).fraudReason) && <p className="text-red-600 text-sm mt-1">{(loanDetails as any).fraudReason}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection Info */}
      {loanDetails?.rejectedAt && (
        <Card className="border-0 shadow-sm bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Rejection Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Rejected On</p>
                <p className="font-semibold">{formatDate(loanDetails.rejectedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Rejected By</p>
                <p className="font-semibold">{(loanDetails as any).rejectedBy?.name || 'N/A'}</p>
              </div>
              {loanDetails.rejectionReason && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="font-semibold">{loanDetails.rejectionReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
});

export default OverviewSection;


