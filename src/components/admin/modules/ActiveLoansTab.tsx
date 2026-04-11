'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, RefreshCw, Eye, Trash2, FileText, Receipt, DollarSign, Copy, Lock, 
  PlayCircle, Loader2, Calculator, AlertCircle, Clock, Search, IndianRupee
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import ParallelLoanView from '@/components/loan/ParallelLoanView';

interface ActiveLoan {
  id: string;
  identifier: string;
  customer?: { name: string; phone: string };
  disbursedAmount?: number;
  approvedAmount?: number;
  emiAmount?: number;
  loanType: string;
  status: string;
  interestRate?: number;
  tenure?: number;
  nextEmi?: { 
    id: string;
    status: string; 
    dueDate?: string;
    amount?: number;
    installmentNumber?: number;
  };
  isMirrorLoan?: boolean;
  isOriginalMirrorLoan?: boolean;
  displayColor?: string | null;
  mirrorMapping?: {
    id: string;
    originalLoanId: string;
    mirrorLoanId?: string;
    mirrorTenure: number;
    originalTenure: number;
    displayColor?: string | null;
    extraEMICount?: number;
    mirrorInterestRate?: number;
    mirrorLoan?: {
      id: string;
      applicationNo: string;
      status: string;
      loanType?: string;
      disbursedAmount?: number;
      createdAt?: string;
      interestRate?: number;
      tenure?: number;
      emiAmount?: number;
      company?: { id?: string; name: string; code?: string };
      customer?: { name?: string; phone?: string; email?: string };
      sessionForm?: {
        approvedAmount?: number;
        interestRate?: number;
        tenure?: number;
        emiAmount?: number;
      };
    };
  } | null;
  isInterestOnlyLoan?: boolean;
  company?: { id?: string; name: string; code?: string };
  emiSchedules?: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    totalAmount: number;
    paymentStatus: string;
  }>;
  summary?: {
    totalEMIs: number;
    paidEMIs: number;
    pendingEMIs: number;
    overdueEMIs: number;
    nextDueEMI?: string;
  };
}

interface ActiveLoanStats {
  totalOnline: number;
  totalOffline: number;
  totalOnlineAmount: number;
  totalOfflineAmount: number;
}

interface ActiveLoansTabProps {
  allActiveLoans: ActiveLoan[];
  activeLoanFilter: 'all' | 'online' | 'offline';
  setActiveLoanFilter: (filter: 'all' | 'online' | 'offline') => void;
  activeLoanStats: ActiveLoanStats;
  loading: boolean;
  fetchAllActiveLoans: () => void;
  setLoanToDelete: (loan: ActiveLoan | null) => void;
  setShowDeleteLoanDialog: (show: boolean) => void;
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
  userId?: string;        // ← needed for EMI payment
  userRole?: string;      // ← for permission checks
  onPaymentComplete?: () => void;
}

export default function ActiveLoansTab({
  allActiveLoans,
  activeLoanFilter,
  setActiveLoanFilter,
  activeLoanStats,
  loading,
  fetchAllActiveLoans,
  setLoanToDelete,
  setShowDeleteLoanDialog,
  setSelectedLoanId,
  setShowLoanDetailPanel,
  userId,
  userRole = 'SUPER_ADMIN',
  onPaymentComplete
}: ActiveLoansTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, any>>({});
  
  // ── EMI Payment Dialog State ───────────────────────────────────────────────
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payLoan, setPayLoan] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentType, setPaymentType] = useState<'FULL_EMI' | 'PARTIAL_PAYMENT'>('FULL_EMI');
  const [partialAmount, setPartialAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // Handler called from ParallelLoanView Pay button
  const handlePayEmi = useCallback((loan: any) => {
    setPayLoan(loan);
    setPaymentMode('CASH');
    setPaymentType('FULL_EMI');
    setPartialAmount('');
    setShowPayDialog(true);
  }, []);

  // Process the payment
  const processPayment = async () => {
    const nextEmi = payLoan?.nextEmi;
    if (!nextEmi?.id || !payLoan?.id || !userId) {
      toast({ title: 'Error', description: 'Missing EMI or user data. Ensure the loan has a pending EMI.', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append('emiId', nextEmi.id);
      fd.append('loanId', payLoan.id);
      fd.append('paymentMode', paymentMode);
      fd.append('paidBy', userId);
      fd.append('paymentType', paymentType);
      fd.append('amount', paymentType === 'PARTIAL_PAYMENT' ? partialAmount : String(nextEmi.amount || 0));
      if (paymentType === 'PARTIAL_PAYMENT') {
        fd.append('partialAmount', partialAmount);
        fd.append('nextPaymentDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
      }
      const res = await fetch('/api/emi/pay', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: '✅ Payment Successful', description: data.message || 'EMI payment processed successfully' });
        setShowPayDialog(false);
        fetchAllActiveLoans();
        onPaymentComplete?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Payment failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error during payment', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Start Loan Dialog State
  const [showStartLoanDialog, setShowStartLoanDialog] = useState(false);
  const [selectedLoanToStart, setSelectedLoanToStart] = useState<ActiveLoan | null>(null);
  const [startLoanForm, setStartLoanForm] = useState({
    tenure: 12,
    interestRate: 15
  });
  const [emiPreview, setEmiPreview] = useState<{
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [startingLoan, setStartingLoan] = useState(false);

  // Fetch mirror mappings on mount
  useEffect(() => {
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const mappingMap: Record<string, any> = {};
            for (const mapping of data.mappings) {
              mappingMap[mapping.originalLoanId] = mapping;
              if (mapping.mirrorLoanId) {
                mappingMap[mapping.mirrorLoanId] = mapping;
              }
            }
            setMirrorMappings(mappingMap);
          }
        }
      } catch (error) {
        console.error('Failed to fetch mirror mappings:', error);
      }
    };

    fetchMirrorMappings();
  }, []);

  // Filter loans - exclude mirror loans
  const filteredActiveLoans = allActiveLoans.filter(loan => {
    // Type filter
    if (activeLoanFilter !== 'all' && loan.loanType !== activeLoanFilter.toUpperCase()) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        loan.identifier?.toLowerCase().includes(query) ||
        loan.customer?.name?.toLowerCase().includes(query) ||
        loan.customer?.phone?.includes(query);
      if (!matchesSearch) return false;
    }
    
    // Exclude mirror loans from being shown separately
    const isMirror = loan.isMirrorLoan;
    return !isMirror;
  });

  // Count interest-only loans
  const interestOnlyCount = allActiveLoans.filter(loan => loan.status === 'ACTIVE_INTEREST_ONLY').length;

  // Open Start Loan Dialog
  const openStartLoanDialog = async (loan: ActiveLoan) => {
    setSelectedLoanToStart(loan);
    setLoadingPreview(true);
    setShowStartLoanDialog(true);

    try {
      const response = await fetch(`/api/loan/start?loanId=${loan.id}`);
      const data = await response.json();

      if (data.success) {
        setStartLoanForm({
          tenure: data.preview.tenure,
          interestRate: data.preview.interestRate
        });
        setEmiPreview({
          emiAmount: data.preview.emiAmount,
          totalInterest: data.preview.totalInterest,
          totalAmount: data.preview.totalAmount
        });
      }
    } catch (error) {
      console.error('Error fetching loan preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch loan details',
        variant: 'destructive'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Calculate EMI preview when form changes
  const calculateEmiPreview = async () => {
    if (!selectedLoanToStart) return;

    setLoadingPreview(true);
    try {
      const response = await fetch(
        `/api/loan/start?loanId=${selectedLoanToStart.id}&tenure=${startLoanForm.tenure}&interestRate=${startLoanForm.interestRate}`
      );
      const data = await response.json();

      if (data.success) {
        setEmiPreview({
          emiAmount: data.preview.emiAmount,
          totalInterest: data.preview.totalInterest,
          totalAmount: data.preview.totalAmount
        });
      }
    } catch (error) {
      console.error('Error calculating EMI preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle Start Loan
  const handleStartLoan = async () => {
    if (!selectedLoanToStart) return;

    setStartingLoan(true);
    try {
      const response = await fetch('/api/loan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoanToStart.id,
          tenure: startLoanForm.tenure,
          interestRate: startLoanForm.interestRate,
          startedBy: 'admin'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Loan Started Successfully',
          description: data.message
        });
        setShowStartLoanDialog(false);
        setSelectedLoanToStart(null);
        fetchAllActiveLoans();
      } else {
        throw new Error(data.error || 'Failed to start loan');
      }
    } catch (error) {
      console.error('Error starting loan:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start loan',
        variant: 'destructive'
      });
    } finally {
      setStartingLoan(false);
    }
  };

  // Handle form change with debounced EMI calculation
  const handleFormChange = (field: 'tenure' | 'interestRate', value: number) => {
    setStartLoanForm(prev => ({ ...prev, [field]: value }));
    setTimeout(() => calculateEmiPreview(), 300);
  };

  // Convert ActiveLoan to format expected by ParallelLoanView
  const convertToLoanData = (loan: ActiveLoan) => ({
    id: loan.id,
    identifier: loan.identifier,
    customer: loan.customer,
    customerName: loan.customer?.name,
    customerPhone: loan.customer?.phone,
    approvedAmount: loan.approvedAmount || loan.disbursedAmount || 0,
    interestRate: loan.interestRate || 0,
    tenure: loan.tenure || 0,
    emiAmount: loan.emiAmount || 0,
    status: loan.status,
    loanType: loan.loanType,
    company: loan.company ? {
      id: loan.company.id || '',
      name: loan.company.name,
      code: loan.company.code || ''
    } : undefined,
    isInterestOnlyLoan: loan.isInterestOnlyLoan,
    summary: loan.summary,
    nextEmi: loan.nextEmi ? {
      ...loan.nextEmi,
      dueDate: loan.nextEmi.dueDate || '',
      amount: loan.nextEmi.amount || 0,
      status: loan.nextEmi.status
    } : undefined,
    emiSchedules: loan.emiSchedules,
    createdAt: new Date().toISOString()
  });

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: ActiveLoan, index: number) => {
    const mapping = mirrorMappings[loan.id] || loan.mirrorMapping;
    const isInterestOnly = loan.status === 'ACTIVE_INTEREST_ONLY';
    
    // Extract mirror loan data from the mapping if it exists
    let mirrorLoanData: {
      id: string;
      identifier: string;
      applicationNo: string;
      customer?: { name?: string; phone?: string; email?: string };
      customerName?: string;
      customerPhone?: string;
      approvedAmount: number;
      disbursedAmount?: number;
      interestRate: number;
      tenure: number;
      emiAmount: number;
      status: string;
      loanType?: string;
      company?: { id: string; name: string; code: string };
      createdAt: string;
    } | null = null;
    
    if (mapping?.mirrorLoan) {
      const ml = mapping.mirrorLoan;
      mirrorLoanData = {
        id: ml.id,
        identifier: ml.applicationNo,
        applicationNo: ml.applicationNo,
        customer: ml.customer,
        customerName: ml.customer?.name,
        customerPhone: ml.customer?.phone,
        approvedAmount: ml.sessionForm?.approvedAmount || ml.disbursedAmount || 0,
        disbursedAmount: ml.disbursedAmount || 0,
        interestRate: ml.interestRate || 0,
        tenure: ml.tenure || 0,
        emiAmount: ml.emiAmount || ml.sessionForm?.emiAmount || 0,
        status: ml.status || 'UNKNOWN',
        loanType: ml.loanType,
        company: ml.company ? {
          id: ml.company.id || '',
          name: ml.company.name,
          code: ml.company.code || ''
        } : undefined,
        createdAt: ml.createdAt || new Date().toISOString()
      };
    } else if (mapping?.offlineMirrorLoan) {
      const oml = mapping.offlineMirrorLoan;
      mirrorLoanData = {
        id: oml.id,
        identifier: oml.loanNumber,
        applicationNo: oml.loanNumber,
        customerName: oml.customerName,
        approvedAmount: oml.loanAmount || 0,
        disbursedAmount: oml.loanAmount || 0,
        interestRate: oml.interestRate || 0,
        tenure: oml.tenure || 0,
        emiAmount: oml.emiAmount || 0,
        status: oml.status || 'UNKNOWN',
        loanType: 'OFFLINE',
        company: oml.company ? {
          id: oml.company.id || '',
          name: oml.company.name,
          code: oml.company.code || ''
        } : undefined,
        createdAt: oml.createdAt || new Date().toISOString()
      };
    }
    
    return (
      <div key={loan.id} className="relative">
        <ParallelLoanView
          originalLoan={convertToLoanData(loan)}
          mirrorLoan={mirrorLoanData}
          mirrorMapping={mapping ? {
            displayColor: mapping.displayColor || loan.displayColor,
            extraEMICount: mapping.extraEMICount,
            mirrorInterestRate: mapping.mirrorInterestRate,
            mirrorTenure: mapping.mirrorTenure,
            mirrorEMIsPaid: mapping.mirrorEMIsPaid,
            extraEMIsPaid: mapping.extraEMIsPaid,
            mirrorCompanyId: mapping.mirrorCompanyId,
            originalCompanyId: mapping.originalCompanyId
          } : null}
          onViewOriginal={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
          onViewMirror={() => { 
            const mirrorId = mapping?.mirrorLoanId || loan.id;
            setSelectedLoanId(mirrorId); 
            setShowLoanDetailPanel(true); 
          }}
          onPayEmi={(loanData) => handlePayEmi({ ...loan, nextEmi: loan.nextEmi })}
          showPayButton={!isInterestOnly}
          showEmiProgress={true}
        />
        
        {/* Interest-Only Start Button Overlay */}
        {isInterestOnly && (
          <div className="absolute top-4 right-4">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
              onClick={() => openStartLoanDialog(loan)}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Start Loan
            </Button>
          </div>
        )}
        
        {/* Delete Button (not for mirror loans) */}
        {!loan.isMirrorLoan && (
          <div className="absolute bottom-4 right-4">
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:bg-red-50 bg-white shadow"
              onClick={() => { setLoanToDelete(loan); setShowDeleteLoanDialog(true); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Toggle Bar */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Search by name, loan#..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <Button
                  size="sm"
                  variant={activeLoanFilter === 'all' ? 'default' : 'outline'}
                  className={activeLoanFilter === 'all' ? 'bg-gray-700 hover:bg-gray-800' : ''}
                  onClick={() => setActiveLoanFilter('all')}
                >
                  All ({activeLoanStats.totalOnline + activeLoanStats.totalOffline})
                </Button>
                <Button
                  size="sm"
                  variant={activeLoanFilter === 'online' ? 'default' : 'outline'}
                  className={activeLoanFilter === 'online' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}
                  onClick={() => setActiveLoanFilter('online')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Online ({activeLoanStats.totalOnline})
                </Button>
                <Button
                  size="sm"
                  variant={activeLoanFilter === 'offline' ? 'default' : 'outline'}
                  className={activeLoanFilter === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}
                  onClick={() => setActiveLoanFilter('offline')}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Offline ({activeLoanStats.totalOffline})
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllActiveLoans}>
              <RefreshCw className="h-4 w-4 mr-1" />Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Active Loans</p>
                <p className="text-2xl font-bold text-emerald-600">{activeLoanStats.totalOnline + activeLoanStats.totalOffline}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online Loans</p>
                <p className="text-2xl font-bold text-blue-600">{activeLoanStats.totalOnline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(activeLoanStats.totalOnlineAmount)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Offline Loans</p>
                <p className="text-2xl font-bold text-purple-600">{activeLoanStats.totalOffline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(activeLoanStats.totalOfflineAmount)}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Interest-Only Phase</p>
                <p className="text-2xl font-bold text-amber-600">{interestOnlyCount}</p>
                <p className="text-xs text-gray-400">Awaiting Start</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Calculator className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400"></div>
          <span>Original (Left)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-400"></div>
          <span>Mirror (Right)</span>
        </div>
      </div>

      {/* Active Loans List - Parallel View */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Active Loans (Parallel View)
            {activeLoanFilter !== 'all' && (
              <Badge className={activeLoanFilter === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                {activeLoanFilter.toUpperCase()} ONLY
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Original loans on left, mirror loans on right
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredActiveLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No {activeLoanFilter !== 'all' ? activeLoanFilter : ''} loans found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchAllActiveLoans}>
                Load Loans
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              <AnimatePresence>
                {filteredActiveLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Loan Dialog */}
      <Dialog open={showStartLoanDialog} onOpenChange={setShowStartLoanDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-amber-600" />
              Start Loan - Convert to EMI
            </DialogTitle>
            <DialogDescription>
              Configure the loan parameters and start EMI payments.
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Loan Info */}
              {selectedLoanToStart && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-800">Loan ID:</span>
                    <span className="text-sm text-amber-900">{selectedLoanToStart.identifier}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-800">Customer:</span>
                    <span className="text-sm text-amber-900">{selectedLoanToStart.customer?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-800">Principal Amount:</span>
                    <span className="text-lg font-bold text-amber-900">
                      {formatCurrency(selectedLoanToStart.disbursedAmount || selectedLoanToStart.approvedAmount || 0)}
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenure">Tenure (months)</Label>
                  <Input
                    id="tenure"
                    type="number"
                    min={1}
                    max={120}
                    value={startLoanForm.tenure}
                    onChange={(e) => handleFormChange('tenure', parseInt(e.target.value) || 12)}
                  />
                  <p className="text-xs text-gray-500">Range: 1-120 months</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (% p.a.)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    min={1}
                    max={50}
                    step={0.25}
                    value={startLoanForm.interestRate}
                    onChange={(e) => handleFormChange('interestRate', parseFloat(e.target.value) || 15)}
                  />
                  <p className="text-xs text-gray-500">Range: 1-50%</p>
                </div>
              </div>

              <Separator />

              {/* EMI Preview */}
              {emiPreview && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-emerald-800 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    EMI Preview
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-700">Monthly EMI:</span>
                      <span className="text-xl font-bold text-emerald-900">
                        {formatCurrency(emiPreview.emiAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-700">Total Interest:</span>
                      <span className="text-sm font-medium text-emerald-900">
                        {formatCurrency(emiPreview.totalInterest)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-700">Total Amount:</span>
                      <span className="text-sm font-medium text-emerald-900">
                        {formatCurrency(emiPreview.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800">
                  Starting the loan will create EMI schedules based on the above parameters. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStartLoanDialog(false)}
              disabled={startingLoan}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleStartLoan}
              disabled={startingLoan || loadingPreview}
            >
              {startingLoan ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Loan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Pay EMI Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Collect EMI Payment
            </DialogTitle>
            <DialogDescription>
              {payLoan?.identifier} &mdash; {payLoan?.customer?.name || payLoan?.customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* EMI Info */}
            {payLoan?.nextEmi && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700">EMI #{payLoan.nextEmi.installmentNumber} Due Amount</span>
                  <span className="text-lg font-bold text-emerald-900">{formatCurrency(payLoan.nextEmi.amount || 0)}</span>
                </div>
              </div>
            )}

            {/* Payment Type */}
            <div className="space-y-1">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_EMI">Full EMI</SelectItem>
                  <SelectItem value="PARTIAL_PAYMENT">Partial Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Partial amount */}
            {paymentType === 'PARTIAL_PAYMENT' && (
              <div className="space-y-1">
                <Label>Partial Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              </div>
            )}

            {/* Payment Mode */}
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)} disabled={processing}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={processPayment} disabled={processing}>
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><IndianRupee className="h-4 w-4 mr-1" />Confirm Payment</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
