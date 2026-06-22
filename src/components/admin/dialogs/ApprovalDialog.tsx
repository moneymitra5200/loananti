'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft, 
  Calculator, 
  RefreshCw, 
  Building2, 
  Loader2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Percent, 
  Users2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  CreditCard, 
  FileCheck, 
  FileText, 
  Eye, 
  Receipt, 
  Scale, 
  Car, 
  HeartHandshake, 
  Info, 
  Calendar, 
  DollarSign,
  ShieldAlert
} from 'lucide-react';

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
  isInterestOnlyLoan?: boolean;
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
  
  // Tab control & detail states
  const [activeTab, setActiveTab] = useState<string>('approval');
  const [fullLoanDetails, setFullLoanDetails] = useState<any>(null);
  const [loadingFullDetails, setLoadingFullDetails] = useState(false);

  // Fetch comprehensive loan details when the dialog is opened
  useEffect(() => {
    if (open && selectedLoan?.id) {
      setLoadingFullDetails(true);
      setActiveTab('approval'); // Reset to decision tab when opening a new loan
      fetch(`/api/loan/details?loanId=${selectedLoan.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setFullLoanDetails(data.loan);
          }
        })
        .catch(err => {
          console.error('Error fetching loan audit details:', err);
        })
        .finally(() => {
          setLoadingFullDetails(false);
        });
    } else {
      setFullLoanDetails(null);
    }
  }, [open, selectedLoan?.id]);

  const onAction = async () => {
    setIsProcessing(true);
    try {
      await handleApproval(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCreditScore = () => {
    if (fullLoanDetails?.creditScore !== undefined && fullLoanDetails?.creditScore !== null && fullLoanDetails?.creditScore > 0) {
      return fullLoanDetails.creditScore;
    }
    if (selectedLoan && (selectedLoan as any).creditScore !== undefined && (selectedLoan as any).creditScore > 0) {
      return (selectedLoan as any).creditScore;
    }
    const remarks = fullLoanDetails?.loanForm?.internalRemarks || selectedLoan?.loanForm?.internalRemarks || '';
    if (remarks) {
      try {
        const parsed = JSON.parse(remarks);
        if (parsed && typeof parsed === 'object' && parsed.creditScore) {
          return parseInt(parsed.creditScore) || 0;
        }
      } catch (e) {
        // not JSON
      }
      const match = remarks.match(/Credit Score[:\s]*(\d+)/i);
      if (match) return parseInt(match[1]);
    }
    return null;
  };

  const openDoc = (docUrl: string) => {
    if (!docUrl) return;
    if (docUrl.startsWith('data:')) {
      const isPdf = docUrl.startsWith('data:application/pdf');
      const w = window.open('', '_blank');
      if (w) {
        if (isPdf) {
          w.document.write(`<html><body style="margin:0"><embed src="${docUrl}" type="application/pdf" width="100%" height="100%" style="position:fixed;top:0;left:0;width:100%;height:100%"/></body></html>`);
        } else {
          w.document.write(`<html><head><title>Document</title></head><body style="margin:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${docUrl}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`);
        }
        w.document.close();
      }
    } else {
      window.open(docUrl, '_blank');
    }
  };

  const isFinalApproval = selectedLoan?.status === 'CUSTOMER_SESSION_APPROVED';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col h-screen border-l border-gray-200 shadow-2xl" side="right">
        {/* Header - Fixed */}
        <div className={`text-white p-6 flex-shrink-0 ${isFinalApproval ? 'bg-gradient-to-r from-emerald-600 to-green-500' : 'bg-gradient-to-r from-indigo-600 to-blue-500'}`}>
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
                <SheetDescription className={`${isFinalApproval ? 'text-green-100' : 'text-blue-100'} mt-1.5 flex flex-wrap items-center gap-2 text-sm font-medium`}>
                  <span>{selectedLoan?.applicationNo}</span>
                  <span>•</span>
                  <span>{selectedLoan?.customer?.name}</span>
                  <span>•</span>
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs px-2 py-0.5 font-bold">
                    {selectedLoan?.loanType} LOAN
                  </Badge>
                  {selectedLoan?.isInterestOnlyLoan && (
                    <Badge variant="secondary" className="bg-amber-500 text-white border-0 text-xs px-2 py-0.5 font-bold">
                      INTEREST ONLY
                    </Badge>
                  )}
                </SheetDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20 rounded-full h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {selectedLoan?.company && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                <Building2 className="h-4 w-4" />
                <span className="bg-white/25 px-2.5 py-1 rounded-md">{selectedLoan.company.name} ({selectedLoan.company.code})</span>
              </div>
            )}
          </SheetHeader>
        </div>

        {/* Tab Switcher - Fixed below Header */}
        <div className="bg-gray-50 border-b px-6 py-2 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-gray-200/60 p-1 rounded-lg">
              <TabsTrigger value="approval" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm py-1.5">
                Decision & Sanction
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm py-1.5">
                Applicant Profile
              </TabsTrigger>
              <TabsTrigger value="form" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm py-1.5">
                Form & Details
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm py-1.5">
                Verification & Docs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full bg-slate-50/50">
            <div className="p-6">
              {loadingFullDetails ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-gray-500 font-medium">Fetching comprehensive loan file details for audit...</p>
                </div>
              ) : (
                <Tabs value={activeTab} className="w-full mt-0">
                  
                  {/* TAB 1: DECISION & SANCTION */}
                  <TabsContent value="approval" className="mt-0 space-y-4">
                    {selectedLoan && (
                      <>
                        {/* Show Sanction Details for Final Approval */}
                        {isFinalApproval && selectedLoan.sessionForm ? (
                          <div className="space-y-4">
                            {/* Original vs Sanction Comparison */}
                            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl shadow-sm">
                              <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                Sanction Details Comparison
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Original Request</p>
                                  <div className="bg-white p-3 rounded-lg border border-amber-100 space-y-1.5 text-sm shadow-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Amount:</span>
                                      <span className="font-medium line-through text-gray-400">{formatCurrency(selectedLoan.requestedAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Tenure:</span>
                                      <span className="font-medium">
                                        {selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY' 
                                          ? 'N/A' 
                                          : `${selectedLoan.requestedTenure || 'N/A'} months`}
                                      </span>
                                    </div>
                                    <div className="flex justify-between font-bold border-b pb-1.5 mb-1.5">
                                      <span className="text-gray-500">Interest:</span>
                                      <span className="font-medium">{selectedLoan.requestedInterestRate || 'N/A'}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Loan Type:</span>
                                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold px-1.5 py-0.2 select-none uppercase">
                                        {selectedLoan.loanType}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Sanction Approved</p>
                                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 space-y-1.5 text-sm shadow-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Amount:</span>
                                      <span className="font-bold text-emerald-700">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Tenure:</span>
                                      <span className="font-bold text-emerald-700">
                                        {selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY' 
                                          ? 'N/A' 
                                          : `${selectedLoan.sessionForm.tenure} months`}
                                      </span>
                                    </div>
                                    <div className="flex justify-between font-bold border-b border-emerald-200 pb-1.5 mb-1.5">
                                      <span className="text-gray-500">Interest:</span>
                                      <span className="font-bold text-emerald-700">{selectedLoan.sessionForm.interestRate}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Credit Score:</span>
                                      {(() => {
                                        const score = getCreditScore();
                                        if (score === null || score === 0) {
                                          return <span className="font-bold text-gray-500">N/A</span>;
                                        }
                                        const scoreColor = score >= 750 ? 'bg-green-100 text-green-700 border-green-200' : score >= 650 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
                                        return (
                                          <Badge className={`${scoreColor} border text-[10px] font-extrabold px-1.5 py-0.2 select-none`}>
                                            {score}
                                          </Badge>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* EMI Details */}
                            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl shadow-sm">
                              <h4 className="font-bold text-blue-800 mb-3 text-sm flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-blue-600" />
                                EMI & Charges Details
                              </h4>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                  <p className="text-xs text-blue-600 font-medium">
                                    {selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY' ? 'Monthly Interest' : 'Monthly EMI'}
                                  </p>
                                  <p className="text-lg font-extrabold text-blue-800 mt-1">{formatCurrency(selectedLoan.sessionForm.emiAmount)}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                  <p className="text-xs text-blue-600 font-medium">Total Interest</p>
                                  <p className="text-lg font-extrabold text-blue-800 mt-1">
                                    {selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY' ? 'N/A' : formatCurrency(selectedLoan.sessionForm.totalInterest)}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                  <p className="text-xs text-blue-600 font-medium">Total Repayment</p>
                                  <p className="text-lg font-extrabold text-blue-800 mt-1">
                                    {selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY' ? 'N/A' : formatCurrency(selectedLoan.sessionForm.totalAmount)}
                                  </p>
                                </div>
                              </div>
                              {/* Interest Type Display */}
                              <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-700 text-xs font-semibold">Interest Type:</span>
                                  <Badge className={selectedLoan.sessionForm.interestType === 'FLAT' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-0' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0'}>
                                    {selectedLoan.sessionForm.interestType || 'FLAT'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-700 text-xs font-semibold">Interest Rate:</span>
                                  <span className="font-extrabold text-blue-800 text-sm">{selectedLoan.sessionForm.interestRate}%</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Customer Approval Info */}
                            <div className="p-4 bg-green-50/70 border border-green-200/80 rounded-xl flex items-center gap-3 shadow-sm">
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <div>
                                <p className="font-bold text-green-800 text-sm">Customer has approved this sanction</p>
                                <p className="text-xs text-green-600 font-medium">Approved on: {selectedLoan.sessionForm.customerApprovedAt ? formatDate(selectedLoan.sessionForm.customerApprovedAt) : 'N/A'}</p>
                              </div>
                            </div>
                            
                            {/* Mirror Loan Configuration - Only for Company 3 loans */}
                            {selectedLoan.company && !selectedLoan.company.code?.includes('1') && !selectedLoan.company.code?.includes('2') && (
                              <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <RefreshCw className="h-5 w-5 text-purple-600" />
                                    <h4 className="font-bold text-purple-800 text-sm">Mirror Loan Configuration</h4>
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
                                    <Label htmlFor="enableMirror" className="text-xs font-bold text-purple-700 cursor-pointer select-none">
                                      Enable Mirror Loan
                                    </Label>
                                  </div>
                                </div>
                                
                                {mirrorLoanConfig.enabled && (
                                  <>
                                    {mirrorCompanies.length === 0 ? (
                                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-amber-700 text-xs">
                                          <strong>No mirror companies available.</strong> You need at least 2 companies (Company 1 & Company 2) to enable mirror loans.
                                        </p>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="space-y-3">
                                          <Label className="text-xs font-bold text-purple-700">Select Mirror Company</Label>
                                          <p className="text-[11px] text-purple-600 font-medium">
                                            Choose which company will hold the actual financial entries.
                                          </p>
                                          <div className="grid grid-cols-2 gap-3">
                                            {mirrorCompanies.map((company) => {
                                              const isCompany1 = company.isCompany1;
                                              const companyName = company.name || 'Unknown Company';
                                              const isSelected = mirrorLoanConfig.mirrorCompanyId === company.id;
                                              
                                              return (
                                                <div
                                                  key={company.id}
                                                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                      ? 'border-purple-600 bg-purple-100 shadow-sm'
                                                      : 'border-purple-200 hover:border-purple-400 bg-white shadow-sm'
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
                                                    <span className="font-bold text-gray-900 text-xs truncate max-w-[130px]">{companyName}</span>
                                                    {isSelected && (
                                                      <CheckCircle className="h-4 w-4 text-purple-600 ml-auto" />
                                                    )}
                                                  </div>
                                                  <div className="text-[11px] space-y-1">
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-500">Code:</span>
                                                      <span className="font-bold text-purple-700">{company.code}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          
                                          {/* Custom Interest Rate and Type Inputs */}
                                          {mirrorLoanConfig.mirrorCompanyId && (
                                            <div className="mt-4 p-4 bg-white border border-purple-300 rounded-xl space-y-4">
                                              <h5 className="font-bold text-purple-800 flex items-center gap-2 text-xs">
                                                <Percent className="h-4 w-4" />
                                                Set Mirror Loan Interest
                                              </h5>
                                              <p className="text-[11px] text-purple-600 font-medium">
                                                Configure interest rate and amortization method for the mirror loan:
                                              </p>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                  <Label className="text-xs font-semibold text-gray-700">Interest Rate (%) *</Label>
                                                  <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="1"
                                                    max="50"
                                                    placeholder="e.g., 15"
                                                    value={mirrorLoanConfig.mirrorInterestRate || ''}
                                                    className="h-9 text-sm"
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
                                                </div>
                                                <div className="space-y-1.5">
                                                  <Label className="text-xs font-semibold text-gray-700">Interest Type *</Label>
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
                                                    <SelectTrigger className="h-9 text-sm">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                                                      <SelectItem value="FLAT">Flat Rate</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Mirror Loan Preview */}
                                        {loadingMirrorPreview && (
                                          <div className="flex items-center justify-center p-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                            <span className="ml-2 text-xs font-semibold text-purple-600">Calculating mirror loan schedules...</span>
                                          </div>
                                        )}
                                        
                                        {mirrorPreview && !loadingMirrorPreview && (
                                          <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-4 shadow-sm">
                                            <h5 className="font-bold text-purple-800 flex items-center gap-2 text-xs">
                                              <Calculator className="h-4 w-4" />
                                              Mirror EMI Structure Comparison
                                            </h5>
                                            
                                            {(selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY') ? (
                                              <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="p-3 bg-red-50/50 rounded-lg border border-red-200">
                                                    <p className="text-[10px] font-bold text-red-800 uppercase mb-2">Original Setup</p>
                                                    <div className="flex justify-between text-xs">
                                                      <span className="text-gray-500 font-medium">Principal:</span>
                                                      <span className="font-bold">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                      <span className="text-gray-600 font-medium">Interest Rate:</span>
                                                      <span className="font-bold text-gray-800">{selectedLoan.sessionForm.interestRate}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                      <span className="text-gray-600 font-medium">Monthly Interest:</span>
                                                      <span className="font-bold text-red-700">{formatCurrency(selectedLoan.sessionForm.emiAmount)}</span>
                                                    </div>
                                                  </div>
                                                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                                                    <p className="text-[10px] font-bold text-emerald-800 uppercase mb-2">Mirror Setup</p>
                                                    <div className="flex justify-between text-xs">
                                                      <span className="text-gray-500 font-medium">Principal:</span>
                                                      <span className="font-bold">{formatCurrency(selectedLoan.sessionForm.approvedAmount)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                      <span className="text-gray-600 font-medium">Interest Rate:</span>
                                                      <span className="font-bold text-gray-800">{mirrorPreview.appliedMirrorRate || selectedLoan.sessionForm.interestRate}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                      <span className="text-gray-600 font-medium font-bold">Monthly Interest:</span>
                                                      <span className="font-bold text-emerald-700 font-extrabold">
                                                        {formatCurrency(
                                                          Math.round(selectedLoan.sessionForm.approvedAmount * ((mirrorPreview.appliedMirrorRate || selectedLoan.sessionForm.interestRate) / 100) / 12)
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs">
                                                  <p className="text-purple-800 flex items-start gap-1.5">
                                                    <Building2 className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                                                    <span>This interest-only loan will be mirrored. Monthly interest collection will be based on the mirror interest rate. No amortized EMI schedule is generated.</span>
                                                  </p>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                {/* Summary Cards */}
                                                <div className="grid grid-cols-2 gap-4">
                                                  {/* Original Loan Summary */}
                                                  <div className="p-3 bg-red-50/50 rounded-lg border border-red-200">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                      <Building2 className="h-3.5 w-3.5 text-red-600" />
                                                      <span className="font-bold text-red-800 text-xs">Original Loan</span>
                                                      <Badge className="bg-red-100 text-red-700 text-[9px] hover:bg-red-100 border-0 px-1 py-0 scale-90">
                                                        {selectedLoan.sessionForm.interestType || 'FLAT'}
                                                      </Badge>
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
                                                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                                                        <span className="text-gray-500">Interest:</span>
                                                        <span className="text-red-700">{formatCurrency(mirrorPreview.originalLoan.totalInterest)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Mirror Loan Summary */}
                                                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                                                      <span className="font-bold text-emerald-800 text-xs">Mirror Loan</span>
                                                      <Badge className="bg-green-100 text-green-700 text-[9px] hover:bg-green-100 border-0 px-1 py-0 scale-90">
                                                        REDUCING
                                                      </Badge>
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
                                                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                                                        <span className="text-gray-500">Interest:</span>
                                                        <span className="text-emerald-700">{formatCurrency(mirrorPreview.mirrorLoan.totalInterest)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {/* Interest Savings */}
                                                <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
                                                  <div className="flex items-center justify-between text-xs">
                                                    <div>
                                                      <p className="text-purple-600 font-semibold">Interest Difference (Original - Mirror)</p>
                                                      <p className="text-base font-extrabold text-purple-800 mt-0.5">
                                                        {formatCurrency(mirrorPreview.originalLoan.totalInterest - mirrorPreview.mirrorLoan.totalInterest)}
                                                      </p>
                                                    </div>
                                                    <Badge className="bg-purple-200 text-purple-800 hover:bg-purple-200 font-bold border-0">
                                                      {((1 - mirrorPreview.mirrorLoan.totalInterest / mirrorPreview.originalLoan.totalInterest) * 100).toFixed(1)}% diff
                                                    </Badge>
                                                  </div>
                                                </div>

                                                {/* EMI Schedule Comparison Toggle Panels */}
                                                <div className="space-y-2 pt-1">
                                                  {/* Original EMI Schedule */}
                                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <button
                                                      type="button"
                                                      className="w-full flex items-center justify-between p-2.5 bg-red-50/50 hover:bg-red-100/50 transition-colors"
                                                      onClick={() => setShowOriginalSchedule(!showOriginalSchedule)}
                                                    >
                                                      <span className="font-bold text-red-800 flex items-center gap-1.5 text-xs">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        Original Schedule ({selectedLoan.sessionForm.tenure} months)
                                                      </span>
                                                      {showOriginalSchedule ? <ChevronUp className="h-4 w-4 text-red-600" /> : <ChevronDown className="h-4 w-4 text-red-600" />}
                                                    </button>
                                                    {showOriginalSchedule && (
                                                      <div className="max-h-52 overflow-y-auto">
                                                        <Table>
                                                          <TableHeader className="sticky top-0 bg-white">
                                                            <TableRow className="hover:bg-transparent">
                                                              <TableHead className="text-[10px] h-8 font-bold">Month</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">EMI</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">Principal</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">Interest</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">Balance</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {mirrorPreview.originalLoan.schedule.map((row: any, idx: number) => (
                                                              <TableRow key={idx} className="text-[11px] hover:bg-gray-50 h-8">
                                                                <TableCell className="py-1 font-medium">{row.month}</TableCell>
                                                                <TableCell className="py-1">{formatCurrency(row.emi)}</TableCell>
                                                                <TableCell className="py-1">{formatCurrency(row.principal)}</TableCell>
                                                                <TableCell className="py-1">{formatCurrency(row.interest)}</TableCell>
                                                                <TableCell className="py-1 font-semibold">{formatCurrency(row.balance)}</TableCell>
                                                              </TableRow>
                                                            ))}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Mirror EMI Schedule */}
                                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <button
                                                      type="button"
                                                      className="w-full flex items-center justify-between p-2.5 bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors"
                                                      onClick={() => setShowMirrorSchedule(!showMirrorSchedule)}
                                                    >
                                                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        Mirror Schedule ({mirrorPreview.mirrorLoan.schedule.length} months)
                                                      </span>
                                                      {showMirrorSchedule ? <ChevronUp className="h-4 w-4 text-emerald-600" /> : <ChevronDown className="h-4 w-4 text-emerald-600" />}
                                                    </button>
                                                    {showMirrorSchedule && (
                                                      <div className="max-h-52 overflow-y-auto">
                                                        <Table>
                                                          <TableHeader className="sticky top-0 bg-white">
                                                            <TableRow className="hover:bg-transparent">
                                                              <TableHead className="text-[10px] h-8 font-bold">Month</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">EMI</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">Principal</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">Interest</TableHead>
                                                              <TableHead className="text-[10px] h-8 font-bold">Balance</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {mirrorPreview.mirrorLoan.schedule.map((row: any, idx: number) => (
                                                              <TableRow key={idx} className="text-[11px] hover:bg-gray-50 h-8">
                                                                <TableCell className="py-1 font-medium">{row.month}</TableCell>
                                                                <TableCell className="py-1">{formatCurrency(row.emi)}</TableCell>
                                                                <TableCell className="py-1">{formatCurrency(row.principal)}</TableCell>
                                                                <TableCell className="py-1">{formatCurrency(row.interest)}</TableCell>
                                                                <TableCell className="py-1 font-semibold">{formatCurrency(row.balance)}</TableCell>
                                                              </TableRow>
                                                            ))}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </>
                                            )}
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
                          <div className="p-4 bg-gray-100 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
                              <Info className="h-4 w-4 text-gray-500" />
                              Requested Loan Specification
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border shadow-sm">
                              <div>
                                <p className="text-gray-500 text-xs">Amount Requested</p>
                                <p className="font-extrabold text-gray-900 mt-0.5">{formatCurrency(selectedLoan.requestedAmount)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Loan Product Type</p>
                                <p className="font-bold text-gray-900 mt-0.5">{selectedLoan.loanType} Loan</p>
                              </div>
                              <div className="mt-2">
                                <p className="text-gray-500 text-xs">Requested Tenure</p>
                                <p className="font-bold text-gray-900 mt-0.5">
                                  {selectedLoan.isInterestOnlyLoan || selectedLoan.loanType === 'INTEREST_ONLY' 
                                    ? 'N/A' 
                                    : `${selectedLoan.requestedTenure || 'N/A'} months`}
                                </p>
                              </div>
                              <div className="mt-2">
                                <p className="text-gray-500 text-xs">Loan Purpose</p>
                                <p className="font-bold text-gray-900 mt-0.5">{selectedLoan.purpose || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Company Selection - Only for SUBMITTED status */}
                        {approvalAction === 'approve' && selectedLoan?.status === 'SUBMITTED' && (
                          <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              Assign to Financial Company *
                            </Label>
                            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                              <SelectTrigger className="w-full h-10 text-sm">
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
                              <p className="text-[11px] text-green-600 font-bold flex items-center gap-1 mt-1 bg-green-50 px-2 py-1 rounded w-fit">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Routing: {companies.find(c => c.id === selectedCompanyId)?.name || 'Unknown'}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Remarks */}
                        <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <Label className="text-xs font-bold text-gray-700">Audit Remarks (Optional)</Label>
                          <Textarea 
                            placeholder="Enter remarks for the approval log..." 
                            value={remarks} 
                            onChange={(e) => setRemarks(e.target.value)} 
                            className="min-h-[80px] text-sm"
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  {/* TAB 2: APPLICANT PROFILE */}
                  <TabsContent value="customer" className="mt-0 space-y-4">
                    {fullLoanDetails ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Personal Card */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-indigo-700 tracking-wider">
                              <User className="h-4 w-4" />
                              Personal Identity Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-gray-500 font-medium">Applicant Name</p>
                                <p className="font-bold text-gray-900 text-sm mt-0.5">
                                  {fullLoanDetails.customer?.name || `${fullLoanDetails.firstName || ''} ${fullLoanDetails.lastName || ''}`.trim() || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Date of Birth</p>
                                <p className="font-bold text-gray-900 mt-0.5">
                                  {fullLoanDetails.dateOfBirth || fullLoanDetails.customer?.dateOfBirth 
                                    ? formatDate(fullLoanDetails.dateOfBirth || fullLoanDetails.customer?.dateOfBirth) 
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">PAN Number</p>
                                <p className="font-bold text-gray-900 font-mono text-sm tracking-wider mt-0.5">
                                  {fullLoanDetails.panNumber || fullLoanDetails.customer?.panNumber || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Aadhaar Number</p>
                                <p className="font-bold text-gray-900 font-mono tracking-wide mt-0.5">
                                  {fullLoanDetails.aadhaarNumber || fullLoanDetails.customer?.aadhaarNumber || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Gender</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fullLoanDetails.gender || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Marital Status</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fullLoanDetails.maritalStatus || 'N/A'}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Contact Card */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-emerald-700 tracking-wider">
                              <Phone className="h-4 w-4" />
                              Contact & Address
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-3">
                            <div className="grid grid-cols-1 gap-2.5 text-xs">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-gray-500 font-medium">Email Address</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.customer?.email || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 border-t pt-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-gray-500 font-medium">Phone Number</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.phone || fullLoanDetails.customer?.phone || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 border-t pt-2">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-gray-500 font-medium">Address</p>
                                  <p className="font-bold text-gray-900 leading-normal">
                                    {[
                                      fullLoanDetails.address || fullLoanDetails.customer?.address,
                                      fullLoanDetails.city || fullLoanDetails.customer?.city,
                                      fullLoanDetails.state || fullLoanDetails.customer?.state,
                                      fullLoanDetails.pincode || fullLoanDetails.customer?.pincode
                                    ].filter(Boolean).join(', ') || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Bank Details Card */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl md:col-span-2">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-orange-700 tracking-wider">
                              <CreditCard className="h-4 w-4" />
                              Settlement & Bank Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-gray-500 font-medium">Bank Name</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fullLoanDetails.bankName || fullLoanDetails.customer?.bankName || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Account Number</p>
                                <p className="font-bold text-gray-900 font-mono mt-0.5">
                                  {fullLoanDetails.bankAccountNumber || fullLoanDetails.customer?.bankAccountNumber || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">IFSC Code</p>
                                <p className="font-bold text-gray-900 font-mono tracking-wider mt-0.5">
                                  {fullLoanDetails.bankIfsc || fullLoanDetails.customer?.bankIfsc || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Account Holder</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fullLoanDetails.accountHolderName || fullLoanDetails.customer?.name || 'N/A'}</p>
                              </div>
                              <div className="pt-2 border-t md:border-0">
                                <p className="text-gray-500 font-medium">Branch Location</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fullLoanDetails.bankBranch || 'N/A'}</p>
                              </div>
                              <div className="pt-2 border-t md:border-0">
                                <p className="text-gray-500 font-medium">Account Type</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fullLoanDetails.accountType || 'N/A'}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-white border rounded-xl">
                        <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs font-semibold">No applicant details loaded.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: FORM & DETAILS */}
                  <TabsContent value="form" className="mt-0 space-y-4">
                    {fullLoanDetails ? (
                      <div className="space-y-4">
                        {/* Asset Specific Details: Gold Loan */}
                        {(fullLoanDetails.loanType === 'GOLD' || fullLoanDetails.loanType?.includes('GOLD')) && fullLoanDetails.goldLoanDetail && (
                          <Card className="border border-amber-200 bg-amber-50/20 shadow-sm rounded-xl">
                            <CardHeader className="pb-2 border-b border-amber-100 bg-amber-50/40">
                              <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-amber-700 tracking-wider">
                                <Scale className="h-4 w-4" />
                                Gold Collateral Valuation Details
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 text-xs">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                  <p className="text-amber-800 font-medium">Gross Weight</p>
                                  <p className="font-extrabold text-sm text-gray-900">{fullLoanDetails.goldLoanDetail.grossWeight}g</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Net Weight</p>
                                  <p className="font-extrabold text-sm text-gray-900">{fullLoanDetails.goldLoanDetail.netWeight}g</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Gold Karat</p>
                                  <p className="font-extrabold text-sm text-gray-900">{fullLoanDetails.goldLoanDetail.karat}K</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Valuation Amount</p>
                                  <p className="font-extrabold text-sm text-emerald-700">{formatCurrency(fullLoanDetails.goldLoanDetail.valuationAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Rate per gram</p>
                                  <p className="font-bold text-gray-900">{formatCurrency(fullLoanDetails.goldLoanDetail.goldRate)}</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Total Items</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.goldLoanDetail.numberOfItems || 1}</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Verified By</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.goldLoanDetail.verifiedBy || 'Staff'}</p>
                                </div>
                                <div>
                                  <p className="text-amber-800 font-medium">Verification Date</p>
                                  <p className="font-bold text-gray-900">{formatDate(fullLoanDetails.goldLoanDetail.verificationDate)}</p>
                                </div>
                              </div>
                              {fullLoanDetails.goldLoanDetail.itemDescription && (
                                <div className="p-2 bg-white border border-amber-100 rounded-lg text-[11px] text-amber-900 mb-2">
                                  <strong>Gold Description:</strong> {fullLoanDetails.goldLoanDetail.itemDescription}
                                </div>
                              )}
                              {fullLoanDetails.goldLoanDetail.goldItemPhoto && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs border-amber-200 hover:bg-amber-50"
                                  onClick={() => openDoc(fullLoanDetails.goldLoanDetail!.goldItemPhoto!)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View Collateral Photo
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Asset Specific Details: Vehicle Loan */}
                        {(fullLoanDetails.loanType === 'VEHICLE' || fullLoanDetails.loanType?.includes('VEHICLE')) && fullLoanDetails.vehicleLoanDetail && (
                          <Card className="border border-blue-200 bg-blue-50/20 shadow-sm rounded-xl">
                            <CardHeader className="pb-2 border-b border-blue-100 bg-blue-50/40">
                              <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-blue-700 tracking-wider">
                                <Car className="h-4 w-4" />
                                Vehicle Collateral Specifications
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 text-xs">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                  <p className="text-blue-800 font-medium">Vehicle Make</p>
                                  <p className="font-extrabold text-sm text-gray-900">{fullLoanDetails.vehicleLoanDetail.manufacturer}</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Model & Year</p>
                                  <p className="font-extrabold text-sm text-gray-900">{fullLoanDetails.vehicleLoanDetail.model} ({fullLoanDetails.vehicleLoanDetail.yearOfManufacture})</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Registration No</p>
                                  <p className="font-extrabold text-sm text-gray-900 font-mono">{fullLoanDetails.vehicleLoanDetail.vehicleNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Valuation Amount</p>
                                  <p className="font-extrabold text-sm text-emerald-700">{formatCurrency(fullLoanDetails.vehicleLoanDetail.valuationAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Chassis Number</p>
                                  <p className="font-bold text-gray-900 font-mono">{fullLoanDetails.vehicleLoanDetail.chassisNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Engine Number</p>
                                  <p className="font-bold text-gray-900 font-mono">{fullLoanDetails.vehicleLoanDetail.engineNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Fuel Type</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.vehicleLoanDetail.fuelType || 'PETROL'}</p>
                                </div>
                                <div>
                                  <p className="text-blue-800 font-medium">Vehicle Color</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.vehicleLoanDetail.color || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {fullLoanDetails.vehicleLoanDetail.rcBookPhoto && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-blue-200 hover:bg-blue-50"
                                    onClick={() => openDoc(fullLoanDetails.vehicleLoanDetail!.rcBookPhoto!)}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" /> View RC Book Photo
                                  </Button>
                                )}
                                {fullLoanDetails.vehicleLoanDetail.vehiclePhoto && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-blue-200 hover:bg-blue-50"
                                    onClick={() => openDoc(fullLoanDetails.vehicleLoanDetail!.vehiclePhoto!)}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" /> View Vehicle Photo
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Employment / Business Card */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-purple-700 tracking-wider">
                              <Briefcase className="h-4 w-4" />
                              Employment & Income Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 text-xs space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-gray-500 font-medium">Employment Type</p>
                                <p className="font-bold text-gray-900">{fullLoanDetails.employmentType || fullLoanDetails.customer?.employmentType || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium">Monthly Income</p>
                                <p className="font-bold text-emerald-700 text-sm">
                                  {fullLoanDetails.monthlyIncome 
                                    ? formatCurrency(fullLoanDetails.monthlyIncome) 
                                    : fullLoanDetails.customer?.monthlyIncome 
                                      ? formatCurrency(fullLoanDetails.customer.monthlyIncome) 
                                      : 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            {fullLoanDetails.employmentType !== 'SELF_EMPLOYED' && fullLoanDetails.employmentType !== 'BUSINESS' ? (
                              <div className="grid grid-cols-1 gap-2.5 pt-2 border-t">
                                <div>
                                  <p className="text-gray-500 font-medium">Employer / Office Name</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.employerName || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Designation</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.designation || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Office Address</p>
                                  <p className="font-bold text-gray-900 leading-normal">{fullLoanDetails.employerAddress || 'N/A'}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2.5 pt-2 border-t">
                                <div>
                                  <p className="text-gray-500 font-medium">Business / Enterprise Name</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.businessName || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Business / Entity Type</p>
                                  <p className="font-bold text-gray-900">{fullLoanDetails.businessType || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Annual Turnover</p>
                                  <p className="font-bold text-emerald-700">{fullLoanDetails.annualTurnover ? formatCurrency(fullLoanDetails.annualTurnover) : 'N/A'}</p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* References Card */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-rose-700 tracking-wider">
                              <HeartHandshake className="h-4 w-4" />
                              Contact References
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 text-xs space-y-3">
                            {fullLoanDetails.reference1Name ? (
                              <div className="space-y-2">
                                <div className="p-2.5 bg-gray-50 rounded-lg border">
                                  <p className="font-bold text-gray-900 text-xs flex justify-between">
                                    <span>{fullLoanDetails.reference1Name} ({fullLoanDetails.reference1Relation || 'Ref 1'})</span>
                                    <span className="text-gray-500 font-normal">{fullLoanDetails.reference1Phone}</span>
                                  </p>
                                  {fullLoanDetails.reference1Address && (
                                    <p className="text-[10px] text-gray-500 mt-1 leading-normal">{fullLoanDetails.reference1Address}</p>
                                  )}
                                </div>
                                {fullLoanDetails.reference2Name && (
                                  <div className="p-2.5 bg-gray-50 rounded-lg border">
                                    <p className="font-bold text-gray-900 text-xs flex justify-between">
                                      <span>{fullLoanDetails.reference2Name} ({fullLoanDetails.reference2Relation || 'Ref 2'})</span>
                                      <span className="text-gray-500 font-normal">{fullLoanDetails.reference2Phone}</span>
                                    </p>
                                    {fullLoanDetails.reference2Address && (
                                      <p className="text-[10px] text-gray-500 mt-1 leading-normal">{fullLoanDetails.reference2Address}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic py-4 text-center">No references provided.</p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Family details parsed from internalRemarks */}
                        {(() => {
                          let familyDetails: any = null;
                          try {
                            if (fullLoanDetails.loanForm?.internalRemarks) {
                              const parsed = JSON.parse(fullLoanDetails.loanForm.internalRemarks);
                              if (parsed && typeof parsed === 'object' && ('numberOfPeopleInHouse' in parsed || 'earningMembers' in parsed)) {
                                familyDetails = parsed;
                              }
                            }
                          } catch (e) {
                            // ignore parse error
                          }
                          
                          if (!familyDetails) return null;
                          
                          return (
                            <Card className="border border-green-200 bg-green-50/10 shadow-sm rounded-xl md:col-span-2">
                              <CardHeader className="pb-2 border-b border-green-100 bg-green-50/20">
                                <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-green-700 tracking-wider">
                                  <Users2 className="h-4 w-4" />
                                  Household & Family Parameters
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-3 text-xs">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                  <div>
                                    <p className="text-gray-500 font-medium">Total Family Members</p>
                                    <p className="font-bold text-gray-900 text-sm mt-0.5">{familyDetails.numberOfPeopleInHouse || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 font-medium">Earning Members</p>
                                    <p className="font-bold text-gray-900 text-sm mt-0.5">{familyDetails.numberOfEarningMembers || '0'}</p>
                                  </div>
                                </div>
                                {familyDetails.earningMembers && familyDetails.earningMembers.length > 0 && (
                                  <div className="space-y-2 mt-3 pt-3 border-t">
                                    <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider">Earning Member breakdown</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {familyDetails.earningMembers.map((member: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm text-xs">
                                          <div>
                                            <span className="font-bold text-gray-900">{member.name || `Member ${idx+1}`}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">({member.jobField || 'Job'})</span>
                                          </div>
                                          <span className="font-extrabold text-green-700">{member.income ? formatCurrency(parseFloat(member.income)) : 'N/A'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-white border rounded-xl">
                        <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs font-semibold">No loan form details loaded.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 4: VERIFICATION & DOCS */}
                  <TabsContent value="documents" className="mt-0 space-y-4">
                    {fullLoanDetails ? (
                      <div className="space-y-4">
                        {/* Verification checklist card */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-teal-700 tracking-wider">
                              <FileCheck className="h-4 w-4" />
                              Administrative Verification Audit Checklist
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 text-xs">
                            {fullLoanDetails.loanForm ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {[
                                    { label: 'PAN Card Verified', value: fullLoanDetails.loanForm.panVerified },
                                    { label: 'Aadhaar Verified', value: fullLoanDetails.loanForm.aadhaarVerified },
                                    { label: 'Bank Statement Verified', value: fullLoanDetails.loanForm.bankVerified },
                                    { label: 'Employment Status Verified', value: fullLoanDetails.loanForm.employmentVerified },
                                    { label: 'Current Address Verified', value: fullLoanDetails.loanForm.addressVerified },
                                    { label: 'Income Verification', value: fullLoanDetails.loanForm.incomeVerified },
                                  ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border">
                                      {item.value ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-green-600 flex-shrink-0" />
                                      ) : (
                                        <X className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                                      )}
                                      <span className="font-semibold text-gray-800 text-[11px] leading-tight">{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                {fullLoanDetails.loanForm.verificationRemarks && (
                                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs mt-2">
                                    <p className="font-bold text-blue-800 flex items-center gap-1 mb-1">
                                      <Info className="h-3.5 w-3.5" />
                                      Verification Officer Remarks:
                                    </p>
                                    <p className="text-blue-900 leading-normal">{fullLoanDetails.loanForm.verificationRemarks}</p>
                                  </div>
                                )}
                                
                                <div className="flex gap-4 pt-1 border-t mt-2">
                                  <div className="bg-amber-50/50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-2">
                                    <div>
                                      <span className="text-[10px] text-gray-500 font-bold block">RISK SCORE</span>
                                      <span className="text-base font-extrabold text-amber-600">{fullLoanDetails.loanForm.riskScore || 'N/A'}</span>
                                    </div>
                                  </div>
                                  {fullLoanDetails.loanForm.fraudFlag && (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 flex items-center gap-1 text-[11px] font-bold shadow-sm px-2.5">
                                      <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
                                      FRAUD FLAG DETECTED
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-center py-6 text-gray-400 italic">No checklist verification record available.</p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Uploaded Documents Grid */}
                        <Card className="border border-gray-200 shadow-sm rounded-xl">
                          <CardHeader className="pb-2 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-gray-700 tracking-wider">
                              <FileText className="h-4 w-4" />
                              Applicant Document Attachments
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { label: 'Applicant Photo', key: 'photoDoc', icon: User },
                                { label: 'PAN Card PDF/Image', key: 'panCardDoc', icon: FileText },
                                { label: 'Aadhaar Card Front', key: 'aadhaarFrontDoc', icon: FileText },
                                { label: 'Aadhaar Card Back', key: 'aadhaarBackDoc', icon: FileText },
                                { label: 'Bank Passbook / Cheque', key: 'passbookDoc', icon: CreditCard },
                                { label: 'Recent Bank Statement', key: 'bankStatementDoc', icon: Receipt },
                                { label: 'Salary Slip / Income Proof', key: 'salarySlipDoc', icon: Receipt },
                                { label: 'Aadhaar Address Proof', key: 'addressProofDoc', icon: MapPin },
                                { label: 'Other Document Attachment', key: 'otherDocs', icon: FileText },
                              ].map((doc) => {
                                const docUrl = fullLoanDetails[doc.key];
                                return (
                                  <div 
                                    key={doc.key} 
                                    className={`p-3 rounded-lg border flex flex-col justify-between h-24 shadow-sm transition-all ${
                                      docUrl 
                                        ? 'bg-white border-gray-200 hover:border-indigo-300' 
                                        : 'bg-gray-50/50 border-gray-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <doc.icon className={`h-4 w-4 flex-shrink-0 ${docUrl ? 'text-indigo-600' : 'text-gray-300'}`} />
                                      <span className={`text-[11px] font-bold truncate leading-tight ${docUrl ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {doc.label}
                                      </span>
                                    </div>
                                    {docUrl ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 font-bold"
                                        type="button"
                                        onClick={() => openDoc(docUrl)}
                                      >
                                        <Eye className="h-3 w-3 mr-1" /> View Attachment
                                      </Button>
                                    ) : (
                                      <p className="text-[10px] text-gray-400 font-semibold italic">Not uploaded</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-white border rounded-xl">
                        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs font-semibold">No uploaded documents fetched.</p>
                      </div>
                    )}
                  </TabsContent>

                </Tabs>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm font-semibold">
              Cancel
            </Button>
            {/* Show Send Back button for applicable statuses */}
            {['SA_APPROVED', 'COMPANY_APPROVED', 'AGENT_APPROVED_STAGE1', 'LOAN_FORM_COMPLETED', 'SESSION_CREATED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED', 'ACTIVE'].includes(selectedLoan?.status || '') && (
              <Button 
                variant="outline" 
                className="border-amber-500 text-amber-600 hover:bg-amber-50 h-10 text-sm font-semibold"
                onClick={() => { setApprovalAction('send_back'); }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Send Back
              </Button>
            )}
            <Button 
              className={`h-10 text-sm font-bold text-white ${
                approvalAction === 'approve' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : approvalAction === 'send_back' 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-red-600 hover:bg-red-700'
              }`} 
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
