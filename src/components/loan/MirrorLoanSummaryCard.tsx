'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, ArrowRight, RefreshCw, IndianRupee, TrendingUp, 
  Calendar, Percent, Info, CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MirrorLoanSummaryCardProps {
  mirrorMapping: {
    mirrorCompany?: { id: string; name: string; code: string };
    originalCompany?: { id: string; name: string; code: string };
    mirrorInterestRate: number;
    mirrorInterestType: string;
    originalInterestRate: number;
    originalInterestType: string;
    originalTenure: number;
    mirrorTenure: number;
    extraEMICount: number;
    originalEMIAmount: number;
    totalMirrorInterest: number;
    totalExtraEMIProfit: number;
    disbursementCompanyId?: string;
  };
  originalLoanAmount: number;
  showDisbursementFlow?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function MirrorLoanSummaryCard({ 
  mirrorMapping, 
  originalLoanAmount,
  showDisbursementFlow = true 
}: MirrorLoanSummaryCardProps) {
  const {
    mirrorCompany,
    originalCompany,
    mirrorInterestRate,
    mirrorInterestType,
    originalInterestRate,
    originalInterestType,
    originalTenure,
    mirrorTenure,
    extraEMICount,
    originalEMIAmount,
    totalMirrorInterest,
    totalExtraEMIProfit
  } = mirrorMapping;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 via-white to-pink-50 border-l-4 border-l-purple-500 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5" />
          Mirror Loan Summary
        </CardTitle>
        <p className="text-purple-100 text-sm">
          Government Compliance - Dual Company Structure
        </p>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Company Flow Diagram */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center justify-between">
            {/* Original Company (Company 3) */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-1">
                Original Company
              </Badge>
              <p className="font-semibold text-gray-900">{originalCompany?.name || 'Company 3'}</p>
              <p className="text-xs text-gray-500">{originalCompany?.code || 'CMP3'}</p>
              <div className="mt-2 text-xs text-blue-600">
                <p>Loan Owner</p>
                <p className="font-medium">Extra EMI Profit: {formatCurrency(totalExtraEMIProfit)}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center px-4">
              <ArrowRight className="h-8 w-8 text-purple-500" />
              <Badge className="mt-1 bg-purple-100 text-purple-700 text-xs">
                Mirror
              </Badge>
            </div>

            {/* Mirror Company (Company 1) */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
              <Badge className="bg-green-500 text-white mb-1">
                Mirror Company
              </Badge>
              <p className="font-semibold text-gray-900">{mirrorCompany?.name || 'Company 1'}</p>
              <p className="text-xs text-gray-500">{mirrorCompany?.code || 'CMP1'}</p>
              <div className="mt-2 text-xs text-green-600">
                <p>Operational Company</p>
                <p className="font-medium">Mirror Interest: {formatCurrency(totalMirrorInterest)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Disbursement Flow */}
        {showDisbursementFlow && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800">Disbursement Flow</h4>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-amber-200">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{mirrorCompany?.name || 'Company 1'}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500" />
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-amber-200">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Disburse {formatCurrency(originalLoanAmount)}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500" />
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-amber-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Customer</span>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              Money is disbursed from <strong>Mirror Company (Company 1)</strong>&apos;s bank account, not from Original Company.
            </p>
          </motion.div>
        )}

        <Separator />

        {/* Interest Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-xs text-red-600 font-medium mb-1">Customer Sees</p>
            <div className="flex items-baseline gap-1">
              <Percent className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-700">{originalInterestRate}%</span>
            </div>
            <p className="text-xs text-red-500">{originalInterestType} Rate</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <Calendar className="h-3 w-3" />
              <span>{originalTenure} EMIs</span>
            </div>
          </div>
          
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <p className="text-xs text-emerald-600 font-medium mb-1">Mirror Loan</p>
            <div className="flex items-baseline gap-1">
              <Percent className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-700">{mirrorInterestRate}%</span>
            </div>
            <p className="text-xs text-emerald-500">{mirrorInterestType} Rate</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
              <Calendar className="h-3 w-3" />
              <span>{mirrorTenure} EMIs</span>
            </div>
          </div>
        </div>

        {/* Extra EMI Profit */}
        {extraEMICount > 0 && (
          <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-800">Extra EMIs = Pure Profit</span>
              </div>
              <Badge className="bg-amber-500 text-white">{extraEMICount} Extra EMI(s)</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-lg p-2">
                <p className="text-xs text-gray-500">Each Extra EMI</p>
                <p className="font-bold text-gray-900">{formatCurrency(originalEMIAmount)}</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <p className="text-xs text-gray-500">Total Profit</p>
                <p className="font-bold text-amber-700">{formatCurrency(totalExtraEMIProfit)}</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              Extra EMIs go to <strong>{originalCompany?.name || 'Company 3'}</strong> as pure profit.
            </p>
          </div>
        )}

        {/* Key Points */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Key Points
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
              <span>Loan is <strong>owned</strong> by {originalCompany?.name || 'Company 3'} (Original Company)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
              <span>Money is <strong>disbursed</strong> from {mirrorCompany?.name || 'Company 1'} (Mirror Company)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
              <span>Mirror Interest goes to {mirrorCompany?.name || 'Company 1'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
              <span>Extra EMIs profit goes to {originalCompany?.name || 'Company 3'}</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
