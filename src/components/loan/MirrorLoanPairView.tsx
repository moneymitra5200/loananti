'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Building2, User, Phone, Calendar, Eye, IndianRupee, Clock,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface LoanData {
  id: string;
  loanNumber?: string;
  identifier?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customer?: { name?: string; phone?: string; email?: string };
  loanAmount?: number;
  approvedAmount?: number;
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

interface MirrorLoanPairViewProps {
  originalLoan: LoanData | null;
  mirrorLoan: LoanData | null;
  mirrorMapping?: {
    displayColor?: string | null;
    extraEMICount?: number;
    mirrorInterestRate?: number;
    mirrorTenure?: number;
    originalInterestRate?: number;
    originalTenure?: number;
    mirrorEMIsPaid?: number;
    extraEMIsPaid?: number;
  } | null;
  onViewOriginal?: () => void;
  onViewMirror?: () => void;
  onPayEmi?: (loan: LoanData, emi?: any) => void;
  userRole?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showEmiSchedule?: boolean;
}

export function MirrorLoanPairView({
  originalLoan,
  mirrorLoan,
  mirrorMapping,
  onViewOriginal,
  onViewMirror,
  onPayEmi,
  userRole = 'SUPER_ADMIN',
  isExpanded = false,
  onToggleExpand,
  showEmiSchedule = false
}: MirrorLoanPairViewProps) {
  const hexColor = mirrorMapping?.displayColor || '#3B82F6';

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
  const getLoanIdentifier = (loan: LoanData) => loan.loanNumber || loan.identifier || 'N/A';
  const getLoanAmount = (loan: LoanData) => loan.loanAmount || loan.approvedAmount || 0;

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

  const shouldBlink = originalLoan && isDueDateNear(originalLoan.summary?.nextDueEMI || originalLoan.nextEmi?.dueDate);

  // Render a single loan card
  const renderLoanCard = (loan: LoanData | null, type: 'original' | 'mirror') => {
    if (!loan) {
      return (
        <div className="flex-1 p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 min-h-[180px] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {type} loan</p>
            <p className="text-xs">Not mirrored</p>
          </div>
        </div>
      );
    }

    const isOriginal = type === 'original';
    const bgColor = isOriginal ? 'bg-emerald-50/50' : 'bg-blue-50/50';
    const borderColor = isOriginal ? 'border-emerald-200' : 'border-blue-200';
    const gradientColor = isOriginal ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-cyan-500';

    return (
      <div
        className={`flex-1 p-4 rounded-lg border-2 ${bgColor} ${borderColor} transition-all hover:shadow-md`}
        style={hexColor ? {
          backgroundColor: isOriginal ? `${hexColor}10` : `${hexColor}08`,
          borderColor: hexColor
        } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className={`h-10 w-10 bg-gradient-to-br ${gradientColor}`}>
              <AvatarFallback className="bg-transparent text-white font-semibold">
                {getCustomerName(loan).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(loan.status)}>{loan.status}</Badge>
                <Badge variant="outline" className={isOriginal ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                  {isOriginal ? 'ORIGINAL' : 'MIRROR'}
                </Badge>
              </div>
              <p className="text-sm font-medium text-gray-600 mt-1">{getLoanIdentifier(loan)}</p>
            </div>
          </div>
          {loan.company && (
            <Badge variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {loan.company.name}
            </Badge>
          )}
        </div>

        {/* Customer Info */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">{getCustomerName(loan)}</span>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-4">
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
        <div className="flex items-center justify-between">
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
          </div>
          <div className="flex gap-2">
            {onPayEmi && (loan.status === 'ACTIVE' || loan.status === 'INTEREST_ONLY') && (
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => onPayEmi(loan)}
              >
                <IndianRupee className="h-4 w-4 mr-1" /> Pay
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={isOriginal ? onViewOriginal : onViewMirror}
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
          </div>
        </div>

        {/* EMI Progress for Original */}
        {isOriginal && loan.summary && (
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
              <div>
                <span className="text-gray-500">Mirror Rate:</span>
                <span className="ml-1 font-medium">{mirrorMapping.mirrorInterestRate}%</span>
              </div>
              <div>
                <span className="text-gray-500">Mirror Tenure:</span>
                <span className="ml-1 font-medium">{mirrorMapping.mirrorTenure} mo</span>
              </div>
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
      className={`border rounded-xl transition-all ${shouldBlink ? 'animate-pulse ring-2 ring-red-400' : ''}`}
      style={hexColor ? {
        borderColor: `${hexColor}40`,
        borderLeftWidth: '4px',
        borderLeftColor: hexColor
      } : undefined}
    >
      {/* Pair Header */}
      <div
        className="px-4 py-2 flex items-center justify-between border-b"
        style={hexColor ? { backgroundColor: `${hexColor}15` } : undefined}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: hexColor }}
          />
          <span className="text-sm font-medium text-gray-700">
            Loan Pair #{originalLoan ? getLoanIdentifier(originalLoan) : 'N/A'}
          </span>
          {mirrorMapping?.extraEMICount && mirrorMapping.extraEMICount > 0 && (
            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
              +{mirrorMapping.extraEMICount} Extra EMIs
            </Badge>
          )}
        </div>
        {onToggleExpand && (
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Main Content - Parallel View */}
      <div className="p-4">
        <div className="flex gap-2 items-stretch">
          {/* Original Loan - LEFT SIDE */}
          {renderLoanCard(originalLoan, 'original')}

          {/* Divider */}
          <div className="flex flex-col items-center justify-center px-2">
            <Separator orientation="vertical" className="h-full bg-gray-300" />
            <div
              className="my-2 px-2 py-1 rounded text-xs font-bold text-white"
              style={{ backgroundColor: hexColor }}
            >
              MIRROR
            </div>
            <Separator orientation="vertical" className="h-full bg-gray-300" />
          </div>

          {/* Mirror Loan - RIGHT SIDE */}
          {renderLoanCard(mirrorLoan, 'mirror')}
        </div>
      </div>

      {/* Expanded EMI Schedule View */}
      {isExpanded && originalLoan && (
        <div className="border-t p-4 bg-gray-50/50">
          <h5 className="font-medium text-gray-700 mb-3">EMI Schedule Comparison</h5>
          {originalLoan.emiSchedules && originalLoan.emiSchedules.length > 0 ? (
            <div className="grid gap-2">
              {originalLoan.emiSchedules.slice(0, 6).map((emi: any, idx: number) => {
                const isPaid = emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID';
                const isExtra = mirrorMapping && idx >= (mirrorMapping.mirrorTenure || originalLoan.tenure);

                return (
                  <div
                    key={emi.id || idx}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isPaid ? 'bg-green-50 border border-green-100' :
                      emi.paymentStatus === 'OVERDUE' ? 'bg-red-50 border border-red-100' :
                      'bg-white border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isPaid ? 'bg-green-200 text-green-700' :
                        emi.paymentStatus === 'OVERDUE' ? 'bg-red-200 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        #{emi.installmentNumber}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDate(emi.dueDate)}</p>
                        <p className="text-xs text-gray-500">
                          {isPaid ? 'Paid' : emi.paymentStatus === 'OVERDUE' ? 'Overdue' : 'Pending'}
                        </p>
                      </div>
                      {isExtra && (
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                          Extra EMI - Profit
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{formatCurrency(emi.totalAmount)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No EMI schedule available</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default MirrorLoanPairView;
