'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ArrowLeft, Calculator, RefreshCw, Building2, Loader2, X, ChevronDown, ChevronUp, Percent } from 'lucide-react';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Helper function for date formatting
const formatDate = (date: string | Date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  createdAt: string;
  riskScore: number;
  fraudFlag: boolean;
  purpose: string;
  requestedTenure?: number;
  requestedInterestRate?: number;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any;
  loanForm?: any;
  company?: any;
}

interface CompanyItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface MirrorCompany {
  id: string;
  name: string;
  code: string;
  isCompany1: boolean;
  mirrorInterestRate: number;
  mirrorInterestType?: string;
  mirrorType: 'COMPANY_1_15_PERCENT' | 'COMPANY_2_SAME_RATE' | 'NONE';
  defaultInterestRate?: number;
  displayName?: string;
  companyType?: 'COMPANY_1' | 'COMPANY_2' | 'COMPANY_3' | 'UNKNOWN';
}

interface MirrorLoanConfig {
  enabled: boolean;
  mirrorCompanyId: string;
  mirrorType: 'COMPANY_1_15_PERCENT' | 'COMPANY_2_SAME_RATE' | 'NONE' | 'CUSTOM_RATE';
  mirrorInterestRate?: number;  // User-defined rate
  mirrorInterestType?: string;  // FLAT or REDUCING
}

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  approvalAction: 'approve' | 'reject' | 'send_back';
  setApprovalAction: (action: 'approve' | 'reject' | 'send_back') => void;
  remarks: string;
  setRemarks: (remarks: string) => void;
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  companies: CompanyItem[];
  mirrorLoanConfig: MirrorLoanConfig;
  setMirrorLoanConfig: (config: MirrorLoanConfig) => void;
  mirrorCompanies: MirrorCompany[];
  mirrorPreview: any;
  loadingMirrorPreview: boolean;
  fetchMirrorPreview: (loan: Loan, mirrorCompanyId: string, mirrorType: string, mirrorRate?: number | null) => void;
  setMirrorPreview: (preview: any) => void;
  handleApproval: (isFastApprove?: boolean, chargesAmount?: number) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function ApprovalDialog({
  open,
  onOpenChange,
  selectedLoan,
  approvalAction,
  setApprovalAction,
  remarks,
  setRemarks,
  selectedCompanyId,
  setSelectedCompanyId,
  companies,
  mirrorLoanConfig,
  setMirrorLoanConfig,
  mirrorCompanies,
  mirrorPreview,
  loadingMirrorPreview,
  fetchMirrorPreview,
  setMirrorPreview,
  handleApproval,
  getStatusBadge,
}: ApprovalDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginalSchedule, setShowOriginalSchedule] = useState(false);
  const [showMirrorSchedule, setShowMirrorSchedule] = useState(false);
  const [fastApprove, setFastApprove] = useState(false);
  const [chargesAmount, setChargesAmount] = useState<string>('');

  const onAction = async () => {
    setIsProcessing(true);
    try {
      const amt = parseFloat(chargesAmount) || 0;
      await handleApproval(fastApprove, amt);
      setChargesAmount('');
    } finally {
      setIsProcessing(false);
    }
  };

  const isFinalApproval = selectedLoan?.status === 'CUSTOMER_SESSION_APPROVED';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col h-screen" side="right">
        {/* Header - Fixed */}
        <div className={`text-white p-6 flex-shrink-0 ${isFinalApproval ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl flex items-center gap-2 text-white">
                  {isFinalApproval ? (
                    <>
                      <CheckCircle className="h-6 w-6" /> Final Approval
                    </>
                  ) : approvalAction === 'approve' ? (
                    'Approve Application'
                  ) : approvalAction === 'reject' ? (
                    'Reject Application'
                  ) : (
                    'Send Back Application'
                  )}
                </SheetTitle>
                <SheetDescription className={`${isFinalApproval ? 'text-green-100' : 'text-blue-100'} mt-1`}>
                  {selectedLoan?.applicationNo} - {selectedLoan?.customer?.name}
                </SheetDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {selectedLoan?.company && (
              <div className="mt-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm bg-white/20 px-2 py-0.5 rounded">{selectedLoan.company.name}</span>
              </div>
            )}
          </SheetHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {selectedLoan && (
                <>
                  {/* Show Sanction Details for Final Approval */}
                  {isFinalApproval && selectedLoan.sessionForm ? (
                    <div className="space-y-4">
                      {/* Original vs Sanction Comparison */}
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Sanction Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-xs text-amber-600 font-medium uppercase">Original Request</p>
                            <div className="bg-white p-3 rounded border border-amber-100 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="font-medium line-through text-gray-400">{formatCurrency(selectedLoan.requestedAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Tenure:</span>
                                <span className="font-medium">{selectedLoan.requestedTenure || 'N/A'} months</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Interest:</span>
                                <span className="font-medium">{selectedLoan.requestedInterestRate || 'N/A'}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-emerald-600 font-medium uppercase">Sanction Approved</p>
                            <div className="bg-emerald-50 p-3 rounded border border-emerald-200 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="font-bold text-emerald-700">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Tenure:</span>
                                <span className="font-bold text-emerald-700">{selectedLoan.sessionForm.tenure} months</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Interest:</span>
                                <span className="font-bold text-emerald-700">{selectedLoan.sessionForm.interestRate}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* EMI Details */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3">EMI & Charges</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-blue-600">Monthly EMI</p>
                            <p className="text-xl font-bold text-blue-800">{formatCurrency(selectedLoan.sessionForm.emiAmount)}</p>
                          </div>
                          <div>
                            <p className="text-blue-600">Total Interest</p>
                            <p className="text-xl font-bold text-blue-800">{formatCurrency(selectedLoan.sessionForm.totalInterest)}</p>
                          </div>
                          <div>
                            <p className="text-blue-600">Total Repayment</p>
                            <p className="text-xl font-bold text-blue-800">{formatCurrency(selectedLoan.sessionForm.totalAmount)}</p>
                          </div>
                        </div>
                        {/* Interest Type Display */}
                        <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 text-sm">Interest Type:</span>
                            <Badge className={selectedLoan.sessionForm.interestType === 'FLAT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                              {selectedLoan.sessionForm.interestType || 'FLAT'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 text-sm">Interest Rate:</span>
                            <span className="font-bold text-blue-800">{selectedLoan.sessionForm.interestRate}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Customer Approval Info */}
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Customer has approved this sanction</p>
                          <p className="text-sm text-green-600">Approved on: {selectedLoan.sessionForm.customerApprovedAt ? formatDate(selectedLoan.sessionForm.customerApprovedAt) : 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* Mirror Loan Configuration - Only for Company 3 loans */}
                      {selectedLoan.company && !selectedLoan.company.code?.includes('1') && !selectedLoan.company.code?.includes('2') && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-5 w-5 text-purple-600" />
                              <h4 className="font-semibold text-purple-800">Mirror Loan Configuration</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="enableMirror"
                                checked={mirrorLoanConfig.enabled}
                                onCheckedChange={(checked) => {
                                  setMirrorLoanConfig({ ...mirrorLoanConfig, enabled: checked as boolean });
                                  if (!checked) {
                                    setMirrorPreview(null);
                                  }
                                }}
                              />
                              <Label htmlFor="enableMirror" className="text-sm font-medium text-purple-700">
                                Enable Mirror Loan
                              </Label>
                            </div>
                          </div>
                          
                          {mirrorLoanConfig.enabled && (
                            <>
                              {mirrorCompanies.length === 0 ? (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                  <p className="text-amber-700 text-sm">
                                    <strong>No mirror companies available.</strong> You need at least 2 companies (Company 1 & Company 2) to enable mirror loans.
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-3">
                                    <Label className="text-sm font-medium text-purple-700">Select Mirror Company</Label>
                                    <p className="text-xs text-purple-600">
                                      Choose which company will lend the actual money.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                      {mirrorCompanies.map((company) => {
                                        const isCompany1 = company.isCompany1;
                                        const companyName = company.name || 'Unknown Company';
                                        const isSelected = mirrorLoanConfig.mirrorCompanyId === company.id;
                                        
                                        return (
                                          <div
                                            key={company.id}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                              isSelected
                                                ? 'border-purple-500 bg-purple-100'
                                                : 'border-purple-200 hover:border-purple-400 bg-white'
                                            }`}
                                            onClick={() => {
                                              // Set default rate based on company or use previous custom rate
                                              const defaultRate = mirrorLoanConfig.mirrorInterestRate || (isCompany1 ? 15 : 24);
                                              setMirrorLoanConfig({
                                                ...mirrorLoanConfig,
                                                mirrorCompanyId: company.id,
                                                mirrorType: 'CUSTOM_RATE',
                                                mirrorInterestRate: defaultRate,
                                                mirrorInterestType: mirrorLoanConfig.mirrorInterestType || 'REDUCING'
                                              });
                                              fetchMirrorPreview(selectedLoan, company.id, 'CUSTOM_RATE', defaultRate);
                                            }}
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              <Building2 className="h-4 w-4 text-purple-600" />
                                              <span className="font-semibold text-gray-900">{companyName}</span>
                                              {isSelected && (
                                                <CheckCircle className="h-4 w-4 text-purple-600 ml-auto" />
                                              )}
                                            </div>
                                            <div className="text-sm space-y-1">
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Code:</span>
                                                <span className="font-medium text-purple-700">{company.code}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Type:</span>
                                                <span className="font-medium text-green-600">Mirror Company</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Custom Interest Rate and Type Inputs */}
                                    {mirrorLoanConfig.mirrorCompanyId && (
                                      <div className="mt-4 p-4 bg-white border border-purple-300 rounded-lg space-y-4">
                                        <h5 className="font-semibold text-purple-800 flex items-center gap-2">
                                          <Percent className="h-4 w-4" />
                                          Set Mirror Loan Interest
                                        </h5>
                                        <p className="text-xs text-purple-600">
                                          Interest rate is set per loan. You can customize the rate and type for this specific loan.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Interest Rate (%) *</Label>
                                            <Input
                                              type="number"
                                              step="0.1"
                                              min="1"
                                              max="50"
                                              placeholder="e.g., 15"
                                              value={mirrorLoanConfig.mirrorInterestRate || ''}
                                              onChange={(e) => {
                                                const rate = parseFloat(e.target.value) || 0;
                                                setMirrorLoanConfig({
                                                  ...mirrorLoanConfig,
                                                  mirrorInterestRate: rate
                                                });
                                                // Update preview with new rate
                                                if (rate > 0) {
                                                  fetchMirrorPreview(selectedLoan, mirrorLoanConfig.mirrorCompanyId, 'CUSTOM_RATE', rate);
                                                }
                                              }}
                                            />
                                            <p className="text-xs text-gray-500">Enter any rate (e.g., 15 for 15%)</p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Interest Type *</Label>
                                            <Select
                                              value={mirrorLoanConfig.mirrorInterestType || 'REDUCING'}
                                              onValueChange={(value) => {
                                                setMirrorLoanConfig({
                                                  ...mirrorLoanConfig,
                                                  mirrorInterestType: value
                                                });
                                                // Update preview with new type
                                                fetchMirrorPreview(selectedLoan, mirrorLoanConfig.mirrorCompanyId, 'CUSTOM_RATE', mirrorLoanConfig.mirrorInterestRate);
                                              }}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                                                <SelectItem value="FLAT">Flat Rate</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <p className="text-xs text-gray-500">Reducing is recommended for mirror loans</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Mirror Loan Preview */}
                                  {loadingMirrorPreview && (
                                    <div className="flex items-center justify-center p-4">
                                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                                      <span className="ml-2 text-purple-600">Calculating mirror loan...</span>
                                    </div>
                                  )}
                                  
                                  {mirrorPreview && !loadingMirrorPreview && (
                                    <div className="bg-white p-4 rounded-lg border border-purple-200 space-y-4">
                                      <h5 className="font-semibold text-purple-800 flex items-center gap-2">
                                        <Calculator className="h-4 w-4" />
                                        EMI Structure Comparison
                                      </h5>
                                      
                                      {/* Summary Cards */}
                                      <div className="grid grid-cols-2 gap-4">
                                        {/* Original Loan Summary */}
                                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="h-4 w-4 text-red-600" />
                                            <span className="font-medium text-red-800 text-sm">Original Loan</span>
                                            <Badge className="bg-red-100 text-red-700 text-xs">{selectedLoan.sessionForm.interestType || 'FLAT'}</Badge>
                                          </div>
                                          <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Principal:</span>
                                              <span className="font-medium">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">EMI:</span>
                                              <span className="font-medium">{formatCurrency(selectedLoan.sessionForm.emiAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Tenure:</span>
                                              <span className="font-medium">{selectedLoan.sessionForm.tenure} mo</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Rate:</span>
                                              <span className="font-medium">{selectedLoan.sessionForm.interestRate}%</span>
                                            </div>
                                            <div className="flex justify-between border-t pt-1 mt-1">
                                              <span className="text-gray-500">Total Interest:</span>
                                              <span className="font-bold text-red-600">{formatCurrency(mirrorPreview.originalLoan.totalInterest)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Total Repayment:</span>
                                              <span className="font-bold text-red-600">{formatCurrency(mirrorPreview.originalLoan.totalAmount)}</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Mirror Loan Summary */}
                                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="h-4 w-4 text-emerald-600" />
                                            <span className="font-medium text-emerald-800 text-sm">Mirror Loan</span>
                                            <Badge className="bg-green-100 text-green-700 text-xs">REDUCING</Badge>
                                          </div>
                                          <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Principal:</span>
                                              <span className="font-medium">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">EMI:</span>
                                              <span className="font-medium">{formatCurrency(mirrorPreview.mirrorLoan.emiAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Tenure:</span>
                                              <span className="font-medium">{mirrorPreview.mirrorLoan.schedule.length} mo</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Rate:</span>
                                              <span className="font-medium">{mirrorPreview.appliedMirrorRate || selectedLoan.sessionForm.interestRate}%</span>
                                            </div>
                                            <div className="flex justify-between border-t pt-1 mt-1">
                                              <span className="text-gray-500">Total Interest:</span>
                                              <span className="font-bold text-emerald-600">{formatCurrency(mirrorPreview.mirrorLoan.totalInterest)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Total Repayment:</span>
                                              <span className="font-bold text-emerald-600">{formatCurrency(mirrorPreview.mirrorLoan.totalAmount)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Interest Savings */}
                                      <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs text-purple-600">Interest Savings with Mirror Loan</p>
                                            <p className="text-lg font-bold text-purple-800">
                                              {formatCurrency(mirrorPreview.originalLoan.totalInterest - mirrorPreview.mirrorLoan.totalInterest)}
                                            </p>
                                          </div>
                                          <Badge className="bg-purple-200 text-purple-800">
                                            {((1 - mirrorPreview.mirrorLoan.totalInterest / mirrorPreview.originalLoan.totalInterest) * 100).toFixed(1)}% saved
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* EMI Schedule Comparison */}
                                      <div className="space-y-3">
                                        <h6 className="font-semibold text-gray-800">EMI Schedule Comparison</h6>
                                        
                                        {/* Original EMI Schedule */}
                                        <div className="border rounded-lg overflow-hidden">
                                          <button
                                            className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
                                            onClick={() => setShowOriginalSchedule(!showOriginalSchedule)}
                                          >
                                            <span className="font-medium text-red-800 flex items-center gap-2">
                                              <Building2 className="h-4 w-4" />
                                              Original Loan Schedule ({selectedLoan.sessionForm.tenure} months)
                                            </span>
                                            {showOriginalSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </button>
                                          {showOriginalSchedule && (
                                            <div className="max-h-60 overflow-y-auto">
                                              <Table>
                                                <TableHeader className="sticky top-0 bg-white">
                                                  <TableRow>
                                                    <TableHead className="text-xs">Month</TableHead>
                                                    <TableHead className="text-xs">EMI</TableHead>
                                                    <TableHead className="text-xs">Principal</TableHead>
                                                    <TableHead className="text-xs">Interest</TableHead>
                                                    <TableHead className="text-xs">Balance</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {mirrorPreview.originalLoan.schedule.map((row: any, idx: number) => (
                                                    <TableRow key={idx} className="text-xs">
                                                      <TableCell>{row.month}</TableCell>
                                                      <TableCell>{formatCurrency(row.emi)}</TableCell>
                                                      <TableCell>{formatCurrency(row.principal)}</TableCell>
                                                      <TableCell>{formatCurrency(row.interest)}</TableCell>
                                                      <TableCell>{formatCurrency(row.balance)}</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          )}
                                        </div>

                                        {/* Mirror EMI Schedule */}
                                        <div className="border rounded-lg overflow-hidden">
                                          <button
                                            className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                            onClick={() => setShowMirrorSchedule(!showMirrorSchedule)}
                                          >
                                            <span className="font-medium text-emerald-800 flex items-center gap-2">
                                              <Building2 className="h-4 w-4" />
                                              Mirror Loan Schedule ({mirrorPreview.mirrorLoan.schedule.length} months)
                                            </span>
                                            {showMirrorSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </button>
                                          {showMirrorSchedule && (
                                            <div className="max-h-60 overflow-y-auto">
                                              <Table>
                                                <TableHeader className="sticky top-0 bg-white">
                                                  <TableRow>
                                                    <TableHead className="text-xs">Month</TableHead>
                                                    <TableHead className="text-xs">EMI</TableHead>
                                                    <TableHead className="text-xs">Principal</TableHead>
                                                    <TableHead className="text-xs">Interest</TableHead>
                                                    <TableHead className="text-xs">Balance</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {mirrorPreview.mirrorLoan.schedule.map((row: any, idx: number) => (
                                                    <TableRow key={idx} className="text-xs">
                                                      <TableCell>{row.month}</TableCell>
                                                      <TableCell>{formatCurrency(row.emi)}</TableCell>
                                                      <TableCell>{formatCurrency(row.principal)}</TableCell>
                                                      <TableCell>{formatCurrency(row.interest)}</TableCell>
                                                      <TableCell>{formatCurrency(row.balance)}</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Original Details for Non-Final Approval */
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Amount</p>
                          <p className="font-semibold">{formatCurrency(selectedLoan.requestedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-semibold">{selectedLoan.loanType}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tenure</p>
                          <p className="font-semibold">{selectedLoan.requestedTenure || 'N/A'} months</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Purpose</p>
                          <p className="font-semibold">{selectedLoan.purpose || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Company Selection - Only for SUBMITTED status */}
                  {approvalAction === 'approve' && selectedLoan?.status === 'SUBMITTED' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Assign to Company *</Label>
                      <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {companies && companies.length > 0 ? (
                            companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} {c.code ? `(${c.code})` : ''}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              No companies available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedCompanyId && companies && companies.length > 0 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Selected: {companies.find(c => c.id === selectedCompanyId)?.name || 'Unknown'}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Charges Amount — always visible for all approval types */}
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 font-semibold text-sm">💵 Charges / Fees Collected</span>
                    </div>
                    <p className="text-xs text-orange-600">
                      Enter any charges collected from customer (file fee, processing, etc). This amount will be added to your personal credit.
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={chargesAmount}
                        onChange={(e) => setChargesAmount(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    {parseFloat(chargesAmount) > 0 && (
                      <p className="text-xs text-emerald-700 font-medium">
                        ✅ ₹{parseFloat(chargesAmount).toLocaleString('en-IN')} will be added to your personal credit on approval.
                      </p>
                    )}
                  </div>

                  {/* Remarks */}
                  <div>
                    <Label>Remarks (Optional)</Label>
                    <Textarea placeholder="Add remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </div>

                  {/* Fast Forward Option for Super Admin */}
                  {approvalAction === 'approve' && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
                      <Checkbox 
                        id="fast-approve" 
                        checked={fastApprove} 
                        onCheckedChange={(checked) => setFastApprove(checked === true)} 
                        className="h-5 w-5"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="fast-approve" className="text-purple-900 font-bold cursor-pointer">
                          Skip intermediate steps (Fast Forward)
                        </Label>
                        <p className="text-xs text-purple-600">
                          Directly move to Final Approval. Use this for offline-verified loans.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedLoan && getStatusBadge(selectedLoan.status)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* Show Send Back button for applicable statuses */}
            {['SA_APPROVED', 'COMPANY_APPROVED', 'AGENT_APPROVED_STAGE1', 'LOAN_FORM_COMPLETED', 'SESSION_CREATED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED', 'ACTIVE'].includes(selectedLoan?.status || '') && (
              <Button 
                variant="outline" 
                className="border-amber-500 text-amber-600 hover:bg-amber-50"
                onClick={() => { setApprovalAction('send_back'); }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Send Back
              </Button>
            )}
            <Button 
              className={approvalAction === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : approvalAction === 'send_back' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'} 
              onClick={onAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                approvalAction === 'approve' 
                  ? (mirrorLoanConfig.enabled ? 'Approve and Continue' : 'Approve') 
                  : approvalAction === 'send_back' ? 'Confirm Send Back' 
                  : 'Reject'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
