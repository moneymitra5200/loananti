'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Building2, User, Phone, Calendar, Eye, IndianRupee, Clock,
  AlertTriangle, CheckCircle, ArrowRightLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface LoanData {
  id: string;
  loanNumber?: string;
  identifier?: string;
  applicationNo?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customer?: { name?: string; phone?: string; email?: string };
  loanAmount?: number;
  approvedAmount?: number;
  disbursedAmount?: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  status: string;
  loanType?: string;
  disbursementDate?: string;
  createdAt: string;
  company?: { id: string; name: string; code: string };
  isInterestOnlyLoan?: boolean;
  interestOnlyMonthlyAmount?: number;
  isMirrorLoan?: boolean;
  originalLoanId?: string;
  displayColor?: string;
  summary?: {
    totalEMIs: number;
    paidEMIs: number;
    pendingEMIs: number;
    overdueEMIs: number;
    nextDueEMI?: string;
  };
  nextEmi?: { dueDate: string; amount: number; status: string };
  emiSchedules?: any[];
}

interface ParallelLoanViewProps {
  originalLoan: LoanData;
  mirrorLoan?: LoanData | null;
  mirrorMapping?: {
    displayColor?: string | null;
    extraEMICount?: number;
    mirrorInterestRate?: number;
    mirrorTenure?: number;
    originalInterestRate?: number;
    originalTenure?: number;
    mirrorEMIsPaid?: number;
    extraEMIsPaid?: number;
    mirrorCompanyId?: string;
    originalCompanyId?: string;
  } | null;
  onViewOriginal?: () => void;
  onViewMirror?: () => void;
  onPayEmi?: (loan: LoanData, isOriginal: boolean) => void;
  userRole?: string;
  showPayButton?: boolean;
  showEmiProgress?: boolean;
  compact?: boolean;
}

export function ParallelLoanView({
  originalLoan,
  mirrorLoan,
  mirrorMapping,
  onViewOriginal,
  onViewMirror,
  onPayEmi,
  userRole = 'SUPER_ADMIN',
  showPayButton = true,
  showEmiProgress = true,
  compact = false
}: ParallelLoanViewProps) {
  const hexColor = mirrorMapping?.displayColor || '#10B981';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-700 border-green-200';
      case 'INTEREST_ONLY': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'DEFAULTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getCustomerName = (loan: LoanData) => loan.customerName || loan.customer?.name || 'Unknown';
  const getCustomerPhone = (loan: LoanData) => loan.customerPhone || loan.customer?.phone || 'N/A';
  const getLoanIdentifier = (loan: LoanData) => loan.loanNumber || loan.identifier || loan.applicationNo || 'N/A';
  const getLoanAmount = (loan: LoanData) => loan.loanAmount || loan.approvedAmount || loan.disbursedAmount || 0;

  // Check if due date is near (within 3 days)
  const isDueDateNear = (nextDueDate?: string) => {
    if (!nextDueDate) return false;
    const dueDate = new Date(nextDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const shouldBlink = isDueDateNear(originalLoan.summary?.nextDueEMI || originalLoan.nextEmi?.dueDate);

  // Render a single loan card (for either original or mirror side)
  const renderLoanSide = (loan: LoanData | null | undefined, type: 'original' | 'mirror') => {
    const isOriginal = type === 'original';
    const hasLoan = !!loan;

    // Background colors
    const bgColor = isOriginal ? 'bg-emerald-50/80' : 'bg-blue-50/80';
    const borderColor = isOriginal ? 'border-emerald-300' : 'border-blue-300';
    const headerBg = isOriginal ? 'bg-emerald-100' : 'bg-blue-100';

    if (!hasLoan) {
      // Empty state for mirror side when no mirror exists
      return (
        <div className="flex-1 p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 min-h-[160px] flex flex-col items-center justify-center">
          <Building2 className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400 font-medium">No Mirror Loan</p>
          <p className="text-xs text-gray-300 mt-1">This loan is not mirrored</p>
        </div>
      );
    }

    return (
      <div
        className={`flex-1 p-4 rounded-lg border-2 ${bgColor} ${borderColor} transition-all hover:shadow-md`}
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: isOriginal ? '#10B981' : hexColor
        }}
      >
        {/* Header with Status and Type Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getStatusColor(loan.status)}>{loan.status}</Badge>
            <Badge
              variant="outline"
              className={isOriginal ? 'bg-emerald-200 text-emerald-800 border-emerald-300' : 'bg-blue-200 text-blue-800 border-blue-300'}
            >
              {isOriginal ? 'ORIGINAL' : 'MIRROR'}
            </Badge>
            {loan.isInterestOnlyLoan && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <Clock className="h-3 w-3 mr-1" /> Interest Only
              </Badge>
            )}
          </div>
          {loan.company && (
            <Badge variant="secondary" className="text-xs bg-gray-100">
              <Building2 className="h-3 w-3 mr-1" />
              {loan.company.name}
            </Badge>
          )}
        </div>

        {/* Loan Identifier */}
        <div className="mb-2">
          <p className="font-mono text-sm font-semibold text-gray-700">{getLoanIdentifier(loan)}</p>
        </div>

        {/* Customer Info */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900 text-sm">{getCustomerName(loan)}</span>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {getCustomerPhone(loan)}
            </div>
            {(loan.disbursementDate || loan.createdAt) && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(loan.disbursementDate || loan.createdAt)}
              </div>
            )}
          </div>
        </div>

        {/* Amount Info */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(getLoanAmount(loan))}</p>
            <p className="text-xs text-gray-500">
              @{loan.interestRate}% for {loan.tenure} months
            </p>
            {loan.emiAmount > 0 && (
              <p className="text-xs text-emerald-600 font-medium">
                EMI: {formatCurrency(loan.emiAmount)}/mo
              </p>
            )}
            {loan.isInterestOnlyLoan && loan.interestOnlyMonthlyAmount && (
              <p className="text-xs text-purple-600 font-medium">
                Monthly Interest: {formatCurrency(loan.interestOnlyMonthlyAmount)}
              </p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {showPayButton && onPayEmi && (loan.status === 'ACTIVE' || loan.status === 'INTEREST_ONLY') && (
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => onPayEmi(loan, isOriginal)}
              >
                <IndianRupee className="h-3 w-3 mr-1" /> Pay
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={isOriginal ? onViewOriginal : onViewMirror}
              className="text-gray-600"
            >
              <Eye className="h-3 w-3 mr-1" /> View
            </Button>
          </div>
        </div>

        {/* EMI Progress - Only for Original side */}
        {isOriginal && showEmiProgress && loan.summary && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">EMI Progress</span>
              <span className="font-medium">{loan.summary.paidEMIs}/{loan.summary.totalEMIs}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                style={{ width: `${(loan.summary.paidEMIs / loan.summary.totalEMIs) * 100}%` }}
              />
            </div>
            {loan.summary.overdueEMIs > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertTriangle className="h-3 w-3" /> {loan.summary.overdueEMIs} overdue
              </div>
            )}
          </div>
        )}

        {/* Mirror-specific info */}
        {!isOriginal && mirrorMapping && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {mirrorMapping.mirrorInterestRate && (
                <div>
                  <span className="text-gray-500">Mirror Rate:</span>
                  <span className="ml-1 font-medium">{mirrorMapping.mirrorInterestRate}%</span>
                </div>
              )}
              {mirrorMapping.mirrorTenure && (
                <div>
                  <span className="text-gray-500">Mirror Tenure:</span>
                  <span className="ml-1 font-medium">{mirrorMapping.mirrorTenure} mo</span>
                </div>
              )}
              {mirrorMapping.extraEMICount && mirrorMapping.extraEMICount > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">Extra EMIs:</span>
                  <span className="ml-1 font-medium text-emerald-600">{mirrorMapping.extraEMICount}</span>
                  <span className="text-gray-400 ml-1">(Profit)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`border rounded-xl overflow-hidden bg-white ${shouldBlink ? 'animate-pulse ring-2 ring-red-400' : ''}`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: hexColor
      }}
    >
      {/* Pair Header - Only show if there's a mirror mapping */}
      {mirrorMapping && (
        <div
          className="px-4 py-2 flex items-center justify-between border-b bg-gray-50"
          style={{ backgroundColor: `${hexColor}10` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hexColor }}
            />
            <span className="text-sm font-medium text-gray-700">
              Mirror Pair #{getLoanIdentifier(originalLoan)}
            </span>
            {mirrorMapping.extraEMICount && mirrorMapping.extraEMICount > 0 && (
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                +{mirrorMapping.extraEMICount} Extra EMIs
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Mirrored
          </Badge>
        </div>
      )}

      {/* Main Content - Parallel View */}
      <div className="p-4">
        <div className="flex gap-0 items-stretch">
          {/* LEFT SIDE - Original Loan */}
          {renderLoanSide(originalLoan, 'original')}

          {/* CENTER - Vertical Divider */}
          <div className="flex flex-col items-center justify-center px-3 py-2">
            <div className="h-full w-0.5 bg-gradient-to-b from-emerald-400 via-gray-400 to-blue-400 rounded-full" />
            <div
              className="my-2 px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: hexColor }}
            >
              VS
            </div>
            <div className="h-full w-0.5 bg-gradient-to-b from-blue-400 via-gray-400 to-emerald-400 rounded-full" />
          </div>

          {/* RIGHT SIDE - Mirror Loan */}
          {renderLoanSide(mirrorLoan, 'mirror')}
        </div>
      </div>
    </motion.div>
  );
}

export default ParallelLoanView;
