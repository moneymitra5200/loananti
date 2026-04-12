// Active Loans Section - SuperAdmin
// Enhanced with EMI Management Features

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { 
  Wallet, DollarSign, FileText, Receipt, RefreshCw, Trash2, Eye, 
  Calendar, IndianRupee, Clock, AlertTriangle, ChevronDown, ChevronUp, Edit,
  Settings, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { getEMIDueStatus, getEMIRowClass, getEMIBadgeConfig } from '@/utils/emi-due-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import MirrorLoanPairView from '@/components/loan/MirrorLoanPairView';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface ActiveLoan {
  id: string;
  identifier: string;
  loanType: 'ONLINE' | 'OFFLINE';
  status: string;
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  customer?: { name: string; phone?: string; email?: string; id?: string };
  company?: { name: string; id?: string };
  nextEmi?: { id?: string; dueDate: string; amount: number; status: string; installmentNumber?: number };
  disbursementDate?: string;
  createdAt: string;
  emiSchedules?: any[];
  // A-Z Details
  panNumber?: string;
  aadhaarNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  employmentType?: string;
  monthlyIncome?: number;
  purpose?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  // Documents
  panCardDoc?: string;
  aadhaarFrontDoc?: string;
  aadhaarBackDoc?: string;
  incomeProofDoc?: string;
  addressProofDoc?: string;
  photoDoc?: string;
  bankStatementDoc?: string;
  salarySlipDoc?: string;
  electionCardDoc?: string;
  housePhotoDoc?: string;
  otherDocs?: string;
  // Signature
  digitalSignature?: string;
  // References
  reference1Name?: string;
  reference1Phone?: string;
  reference1Relation?: string;
  reference2Name?: string;
  reference2Phone?: string;
  reference2Relation?: string;
  // Bank Details
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  // Mirror Loan Info
  isMirrorLoan?: boolean;
  isOriginalMirrorLoan?: boolean;
  displayColor?: string;
  mirrorMapping?: {
    id: string;
    originalLoanId: string;
    mirrorLoanId?: string;
    mirrorTenure?: number;
    originalTenure?: number;
    displayColor?: string;
    extraEMICount?: number;
    mirrorInterestRate?: number;
    mirrorEMIsPaid?: number;
    extraEMIsPaid?: number;
    isOfflineLoan?: boolean;
  };
  mirrorLoanId?: string;
  mirrorCompanyId?: string;
  mirrorInterestRate?: number;
  extraEMICount?: number;
}

interface ActiveLoansSectionProps {
  loans: ActiveLoan[];
  stats: {
    totalOnline: number;
    totalOffline: number;
    totalOnlineAmount: number;
    totalOfflineAmount: number;
  };
  filter: 'all' | 'online' | 'offline';
  loading: boolean;
  userRole?: string;
  userId?: string;
  onFilterChange: (filter: 'all' | 'online' | 'offline') => void;
  onRefresh: () => void;
  onDelete: (loan: ActiveLoan) => void;
  onView: (loan: ActiveLoan) => void;
  onPaymentComplete?: () => void;
}

export function ActiveLoansSection({
  loans,
  stats,
  filter,
  loading,
  userRole = 'SUPER_ADMIN',
  userId,
  onFilterChange,
  onRefresh,
  onDelete,
  onView,
  onPaymentComplete
}: ActiveLoansSectionProps) {
  const { settings: sysSettings } = useSystemSettings();

  // Determine if this role can see mirror loans
  const canSeeMirror = (() => {
    if (userRole === 'SUPER_ADMIN' || userRole === 'CASHIER') return true;
    if (userRole === 'AGENT') return sysSettings.agentCanSeeMirror;
    if (userRole === 'STAFF') return sysSettings.staffCanSeeMirror;
    if (userRole === 'COMPANY') return sysSettings.companyCanSeeMirror;
    if (userRole === 'ACCOUNTANT') return sysSettings.accountantCanSeeMirror;
    return false;
  })();
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEmiDateDialog, setShowEmiDateDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);
  const [selectedEmi, setSelectedEmi] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'FULL_EMI' | 'PARTIAL_PAYMENT' | 'INTEREST_ONLY'>('FULL_EMI');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [partialAmount, setPartialAmount] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | undefined>(undefined);
  const [newEmiDate, setNewEmiDate] = useState<Date | undefined>(undefined);
  const [processing, setProcessing] = useState(false);
  const [emiDateReason, setEmiDateReason] = useState('');

  // Mirror Loan State
  const [mirrorLoanData, setMirrorLoanData] = useState<any>(null);
  const [loadingMirror, setLoadingMirror] = useState(false);

  // Mirror Mappings State for parallel view
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, any>>({});
  const [mirrorLoans, setMirrorLoans] = useState<Record<string, ActiveLoan>>({});
  const [expandedPairLoans, setExpandedPairLoans] = useState<Set<string>>(new Set());

  // Fetch all mirror mappings on mount
  useEffect(() => {
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const mappingMap: Record<string, any> = {};
            const mirrorLoanIds: string[] = [];

            for (const mapping of data.mappings) {
              mappingMap[mapping.originalLoanId] = mapping;
              if (mapping.mirrorLoanId) {
                mappingMap[mapping.mirrorLoanId] = mapping;
                mirrorLoanIds.push(mapping.mirrorLoanId);
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
  }, []); // ← run once on mount only; onRefresh is a new ref every render and causes infinite flicker

  // EMI Settings State
  const [emiSettings, setEmiSettings] = useState<{[key: string]: {
    allowPartialPayment: boolean;
    allowInterestOnly: boolean;
    autoAdjustDates: boolean;
  }}>({});
  
  // EMI Payment Settings Dialog
  const [showEmiSettingsDialog, setShowEmiSettingsDialog] = useState(false);
  const [emiPaymentSettings, setEmiPaymentSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [secondaryPaymentPages, setSecondaryPaymentPages] = useState<any[]>([]);

  // Delete loan state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<ActiveLoan | null>(null);
  const [deleteNote, setDeleteNote] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteLoan = (loan: ActiveLoan) => {
    setLoanToDelete(loan);
    setDeleteNote('');
    setShowDeleteDialog(true);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDelete || !userId) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({
        loanId: loanToDelete.id,
        userId,
        loanType: loanToDelete.loanType,
        reason: 'Deleted by Super Admin',
        note: deleteNote
      });
      const res = await fetch(`/api/loan/delete?${params}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Loan Deleted', description: data.message });
        setShowDeleteDialog(false);
        setLoanToDelete(null);
        onRefresh?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete loan', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Network error deleting loan', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // Accountant cannot manage EMIs
  const canManageEmi = userRole !== 'ACCOUNTANT';

  // Fetch mirror loan data when a loan is expanded
  const fetchMirrorLoanData = async (loanId: string) => {
    setLoadingMirror(true);
    try {
      const response = await fetch(`/api/mirror-loan?action=loan-mappings&loanId=${loanId}`);
      const data = await response.json();
      if (data.success && data.mappings && data.mappings.length > 0) {
        const mapping = data.mappings[0];
        setMirrorLoanData({
          id: mapping.id,
          mirrorCompanyId: mapping.mirrorCompanyId,
          mirrorCompanyName: mapping.mirrorCompany?.name,
          mirrorInterestRate: mapping.mirrorInterestRate,
          mirrorInterestType: mapping.mirrorInterestType,
          originalInterestRate: mapping.originalInterestRate,
          originalInterestType: mapping.originalInterestType,
          mirrorTenure: mapping.mirrorTenure,
          originalTenure: mapping.originalTenure,
          extraEMICount: mapping.extraEMICount,
          originalEMIAmount: mapping.originalEMIAmount,
          mirrorEMIsPaid: mapping.mirrorEMIsPaid,
          extraEMIsPaid: mapping.extraEMIsPaid,
          totalProfitReceived: mapping.totalProfitReceived,
          mirrorCompletedAt: mapping.mirrorCompletedAt,
          // EMI Schedules
          mirrorSchedule: mapping.mirrorSchedule || [],
          originalSchedule: mapping.originalSchedule || []
        });
      } else {
        setMirrorLoanData(null);
      }
    } catch (error) {
      console.error('Error fetching mirror loan data:', error);
      setMirrorLoanData(null);
    } finally {
      setLoadingMirror(false);
    }
  };

  // Fetch mirror data when loan is expanded
  React.useEffect(() => {
    if (expandedLoan) {
      fetchMirrorLoanData(expandedLoan);
    } else {
      setMirrorLoanData(null);
    }
  }, [expandedLoan]);

  // Update EMI setting
  const updateEmiSetting = async (emiId: string, field: string, value: boolean) => {
    try {
      const response = await fetch('/api/emi/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emiId, [field]: value })
      });
      
      if (response.ok) {
        setEmiSettings(prev => ({
          ...prev,
          [emiId]: {
            ...prev[emiId],
            [field]: value
          }
        }));
        toast({ title: 'Setting Updated', description: `${field} has been ${value ? 'enabled' : 'disabled'}` });
      } else {
        toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  };

  // Fetch EMI Payment Settings
  const fetchEmiPaymentSettings = async (emiId: string, companyId?: string) => {
    try {
      const response = await fetch(`/api/emi-payment-settings?emiScheduleId=${emiId}`);
      const data = await response.json();
      if (data.success) {
        setEmiPaymentSettings(data.settings);
        
        // Fetch secondary payment pages for this company
        if (companyId) {
          const pagesResponse = await fetch(`/api/emi-payment-settings?action=secondary-pages&companyId=${companyId}`);
          const pagesData = await pagesResponse.json();
          if (pagesData.success) {
            setSecondaryPaymentPages(pagesData.pages);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching EMI payment settings:', error);
    }
  };

  // Save EMI Payment Settings
  const saveEmiPaymentSettings = async () => {
    if (!selectedEmi || !selectedLoan) return;
    setSavingSettings(true);
    try {
      const response = await fetch('/api/emi-payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emiScheduleId: selectedEmi.id,
          loanApplicationId: selectedLoan.id,
          ...emiPaymentSettings,
          modifiedById: userId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Settings Saved', description: 'EMI payment settings have been updated' });
        setShowEmiSettingsDialog(false);
        onRefresh?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Open EMI Settings Dialog
  const handleOpenEmiSettings = async (loan: ActiveLoan, emi: any) => {
    setSelectedLoan(loan);
    setSelectedEmi(emi);
    await fetchEmiPaymentSettings(emi.id, loan.company?.id);
    setShowEmiSettingsDialog(true);
  };

  const filteredLoans = loans.filter(loan => {
    if (filter !== 'all' && loan.loanType !== filter.toUpperCase()) return false;
    
    // Use the isMirrorLoan field from API (now properly set for both online and offline loans)
    // Also check mapping for backward compatibility
    if (loan.isMirrorLoan) return false;
    
    // If this loan is a mirror loan, don't show it separately (will be shown with original)
    const mapping = mirrorMappings[loan.id];
    
    // Check if this is a mirror loan (online or offline)
    // For online loans: mapping.mirrorLoanId === loan.id
    // For offline loans: mapping.isOfflineLoan && mapping.mirrorLoanId === loan.id
    //                  OR mapping.offlineMirrorLoan?.id === loan.id
    const isOnlineMirror = mapping?.mirrorLoanId === loan.id && !mapping?.isOfflineLoan;
    const isOfflineMirror = mapping?.isOfflineLoan && 
                            (mapping?.mirrorLoanId === loan.id || mapping?.offlineMirrorLoan?.id === loan.id);
    const isMirror = isOnlineMirror || isOfflineMirror;
    
    return !isMirror;
  });

  // Toggle expanded state for pair loans
  const togglePairExpanded = (loanId: string) => {
    setExpandedPairLoans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loanId)) {
        newSet.delete(loanId);
      } else {
        newSet.add(loanId);
      }
      return newSet;
    });
  };

  // Convert ActiveLoan to format expected by MirrorLoanPairView
  const convertToLoanData = (loan: ActiveLoan) => ({
    id: loan.id,
    identifier: loan.identifier,
    customer: loan.customer,
    approvedAmount: loan.approvedAmount,
    interestRate: loan.interestRate,
    tenure: loan.tenure,
    emiAmount: loan.emiAmount,
    status: loan.status,
    loanType: loan.loanType,
    disbursementDate: loan.disbursementDate,
    createdAt: loan.createdAt,
    company: loan.company ? { 
      id: loan.company.id || '', 
      name: loan.company.name, 
      code: '' 
    } : undefined,
    nextEmi: loan.nextEmi,
    emiSchedules: loan.emiSchedules
  });

  const handlePayEmi = (loan: ActiveLoan, emi?: any) => {
    setSelectedLoan(loan);
    setSelectedEmi(emi || loan.nextEmi);
    setPaymentType('FULL_EMI');
    setPaymentMode('CASH');
    setPartialAmount('');
    setNextPaymentDate(undefined);
    setShowPaymentDialog(true);
  };

  const handleChangeEmiDate = (loan: ActiveLoan, emi?: any) => {
    setSelectedLoan(loan);
    setSelectedEmi(emi || loan.nextEmi);
    if (emi?.dueDate || loan.nextEmi?.dueDate) {
      setNewEmiDate(new Date(emi?.dueDate || loan.nextEmi?.dueDate));
    } else {
      setNewEmiDate(new Date());
    }
    setEmiDateReason('');
    setShowEmiDateDialog(true);
  };

  const processPayment = async () => {
    if (!selectedLoan || !selectedEmi || !userId) return;

    // Validation for partial payment
    if (paymentType === 'PARTIAL_PAYMENT') {
      if (!partialAmount || parseFloat(partialAmount) <= 0) {
        toast({ title: 'Error', description: 'Please enter a valid partial amount', variant: 'destructive' });
        return;
      }
      if (!nextPaymentDate) {
        toast({ title: 'Error', description: 'Please select when the remaining amount will be paid', variant: 'destructive' });
        return;
      }
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('emiId', selectedEmi.id || selectedLoan.nextEmi?.id || '');
      formData.append('loanId', selectedLoan.id);
      formData.append('amount', paymentType === 'PARTIAL_PAYMENT' ? partialAmount : selectedEmi.amount?.toString() || '0');
      formData.append('paymentMode', paymentMode);
      formData.append('paidBy', userId);
      formData.append('paymentType', paymentType);
      
      // Pass mirror company ID for mirror loans - payment should be recorded in mirror company's books
      if (selectedLoan.mirrorCompanyId) {
        formData.append('mirrorCompanyId', selectedLoan.mirrorCompanyId);
        console.log(`[EMI Payment] Mirror loan detected - payment will be recorded in mirror company: ${selectedLoan.mirrorCompanyId}`);
      }

      if (paymentType === 'PARTIAL_PAYMENT') {
        formData.append('partialAmount', partialAmount);
        formData.append('nextPaymentDate', nextPaymentDate?.toISOString() || '');
      }

      const response = await fetch('/api/emi/pay', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Payment Successful',
          description: data.message || `EMI payment of ${formatCurrency(data.data?.paidAmount || 0)} processed successfully`
        });
        setShowPaymentDialog(false);
        onPaymentComplete?.();
        onRefresh();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process payment', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: 'Error', description: 'Failed to process payment', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const updateEmiDate = async () => {
    if (!selectedLoan || !selectedEmi || !newEmiDate || !userId) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/emi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emiId: selectedEmi.id || selectedLoan.nextEmi?.id,
          action: 'change-due-date',
          data: {
            newDueDate: newEmiDate.toISOString(),
            reason: emiDateReason
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'EMI Date Updated',
          description: `Due date changed to ${format(newEmiDate, 'dd MMM yyyy')}`
        });
        setShowEmiDateDialog(false);
        onRefresh();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update EMI date', variant: 'destructive' });
      }
    } catch (error) {
      console.error('EMI date update error:', error);
      toast({ title: 'Error', description: 'Failed to update EMI date', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentDetails = () => {
    if (!selectedEmi) return { amount: 0, remaining: 0, principal: 0, interest: 0 };
    
    const totalAmount = selectedEmi.amount || 0;
    const paidAmount = selectedEmi.paidAmount || 0;
    const remaining = totalAmount - paidAmount;
    
    if (paymentType === 'FULL_EMI') {
      return { amount: remaining, remaining: 0, principal: remaining * 0.7, interest: remaining * 0.3 };
    } else if (paymentType === 'PARTIAL_PAYMENT') {
      const partial = parseFloat(partialAmount) || 0;
      return { amount: partial, remaining: remaining - partial, principal: partial * 0.7, interest: partial * 0.3 };
    } else {
      return { amount: remaining * 0.3, remaining: remaining, principal: 0, interest: remaining * 0.3 };
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Toggle Bar */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Filter by Type:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  className={filter === 'all' ? 'bg-gray-700 hover:bg-gray-800' : ''}
                  onClick={() => onFilterChange('all')}
                >
                  All ({stats.totalOnline + stats.totalOffline})
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'online' ? 'default' : 'outline'}
                  className={filter === 'online' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}
                  onClick={() => onFilterChange('online')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Online ({stats.totalOnline})
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'offline' ? 'default' : 'outline'}
                  className={filter === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}
                  onClick={() => onFilterChange('offline')}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Offline ({stats.totalOffline})
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
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
                <p className="text-2xl font-bold text-emerald-600">{stats.totalOnline + stats.totalOffline}</p>
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
                <p className="text-2xl font-bold text-blue-600">{stats.totalOnline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(stats.totalOnlineAmount)}</p>
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
                <p className="text-2xl font-bold text-purple-600">{stats.totalOffline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(stats.totalOfflineAmount)}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Disbursed</p>
                <p className="text-2xl font-bold text-teal-600">{formatCurrency(stats.totalOnlineAmount + stats.totalOfflineAmount)}</p>
              </div>
              <div className="p-2 bg-teal-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans List */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Active Loans
                {filter !== 'all' && (
                  <Badge className={filter === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                    {filter.toUpperCase()} ONLY
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {filter === 'all' ? 'All disbursed loans (online + offline)' :
                 filter === 'online' ? 'Online loans from digital applications' :
                 'Offline loans created manually'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No {filter !== 'all' ? filter : ''} loans found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
                Load Loans
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredLoans.map((loan, index) => {
                const isOnline = loan.loanType === 'ONLINE';
                const bgColor = isOnline ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100';
                const gradientColors = isOnline ? 'from-blue-400 to-cyan-500' : 'from-purple-400 to-pink-500';
                const isExpanded = expandedLoan === loan.id;

                // Check if this loan has a mirror mapping
                // Use both the API-provided fields and the local mapping state
                const mapping = mirrorMappings[loan.id] || loan.mirrorMapping;
                const isMirrorPair = loan.isOriginalMirrorLoan || (!!mapping && !loan.isMirrorLoan);

                // If this is a mirror pair, render with parallel view
                if (isMirrorPair) {
                  const mirrorMappingData = loan.mirrorMapping || mapping;
                  return (
                    <MirrorLoanPairView
                      key={`${loan.loanType}-${loan.id}`}
                      originalLoan={convertToLoanData(loan)}
                      mirrorLoan={null}
                      mirrorMapping={{
                        displayColor: mirrorMappingData?.displayColor || loan.displayColor,
                        extraEMICount: mirrorMappingData?.extraEMICount || 0,
                        mirrorInterestRate: mirrorMappingData?.mirrorInterestRate || 0,
                        mirrorTenure: mirrorMappingData?.mirrorTenure || 0,
                        mirrorEMIsPaid: mirrorMappingData?.mirrorEMIsPaid || 0,
                        extraEMIsPaid: mirrorMappingData?.extraEMIsPaid || 0
                      }}
                      onViewOriginal={() => onView(loan)}
                      onViewMirror={() => onView(loan)}
                      onPayEmi={(l) => handlePayEmi(loan)}
                      onDeleteLoan={() => handleDeleteLoan(loan)}
                      userRole={userRole}
                      canSeeMirror={canSeeMirror}
                      isExpanded={expandedPairLoans.has(loan.id)}
                      onToggleExpand={() => togglePairExpanded(loan.id)}
                    />
                  );
                }

                // --- EMI Due Date Blink Logic ---
                const emiDueStatus = getEMIDueStatus(loan.nextEmi?.dueDate);
                const emiRowClass = getEMIRowClass(emiDueStatus);
                const emiBadge = getEMIBadgeConfig(emiDueStatus);

                return (
                  <div
                    key={`${loan.loanType}-${loan.id}`}
                    className={`border rounded-xl hover:shadow-md transition-all ${emiDueStatus !== 'normal' ? emiRowClass : bgColor}`}
                  >
                    <div className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className={`h-12 w-12 bg-gradient-to-br ${gradientColors}`}>
                            <AvatarFallback className="bg-transparent text-white font-semibold">
                              {loan.customer?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900">{loan.identifier}</h4>
                              <Badge className={isOnline ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                                {loan.loanType}
                              </Badge>
                              {loan.status && (
                                <Badge className="bg-green-100 text-green-700">{loan.status}</Badge>
                              )}
                              {emiBadge && (
                                <Badge className={emiBadge.className}>{emiBadge.label}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.phone || loan.customer?.email}</p>
                            {loan.company && (
                              <p className="text-xs text-gray-400">Company: {loan.company.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.approvedAmount)}</p>
                            <p className="text-xs text-gray-500">{loan.interestRate}% • {loan.tenure} months</p>
                            {loan.emiAmount > 0 && (
                              <p className="text-xs text-emerald-600">EMI: {formatCurrency(loan.emiAmount)}/mo</p>
                            )}
                            {loan.nextEmi && (
                              <p className="text-xs text-gray-400">Next EMI: {formatDate(loan.nextEmi.dueDate)}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {canManageEmi && loan.nextEmi && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-500 hover:bg-emerald-600"
                                  onClick={() => handlePayEmi(loan)}
                                >
                                  <IndianRupee className="h-4 w-4 mr-1" />Pay EMI
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
                                  onClick={() => handleChangeEmiDate(loan)}
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => onDelete(loan)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className={isOnline ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'} onClick={() => onView(loan)}>
                              <Eye className="h-4 w-4 mr-1" />View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded A-Z Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-4 bg-white/50">
                            {/* Tabs for A-Z Details */}
                            <Tabs defaultValue="emi" className="w-full">
                              <TabsList className="grid w-full grid-cols-4 mb-4">
                                <TabsTrigger value="emi">EMI Schedule</TabsTrigger>
                                <TabsTrigger value="customer">Customer Details</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                                <TabsTrigger value="mirror">Mirror Info</TabsTrigger>
                              </TabsList>
                              
                              {/* EMI Schedule Tab */}
                              <TabsContent value="emi">
                                <h5 className="font-medium text-gray-700 mb-3">EMI Schedule</h5>
                            {loan.emiSchedules && loan.emiSchedules.length > 0 ? (
                              <div className="space-y-3">
                                {/* Toggle Settings for Loan */}
                                <div className="p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Settings className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">EMI Payment Options</span>
                                  </div>
                                  <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Switch
                                        checked={emiSettings[loan.id]?.allowPartialPayment ?? true}
                                        onCheckedChange={(checked) => updateEmiSetting(loan.id, 'allowPartialPayment', checked)}
                                      />
                                      <span className="text-xs text-gray-600">Allow Partial</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Switch
                                        checked={emiSettings[loan.id]?.allowInterestOnly ?? true}
                                        onCheckedChange={(checked) => updateEmiSetting(loan.id, 'allowInterestOnly', checked)}
                                      />
                                      <span className="text-xs text-gray-600">Allow Interest Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Switch
                                        checked={emiSettings[loan.id]?.autoAdjustDates ?? true}
                                        onCheckedChange={(checked) => updateEmiSetting(loan.id, 'autoAdjustDates', checked)}
                                      />
                                      <span className="text-xs text-gray-600">Auto-Adjust Dates</span>
                                    </label>
                                  </div>
                                </div>
                                
                                {/* EMI List */}
                                <div className="grid gap-2">
                                  {loan.emiSchedules.slice(0, 6).map((emi: any, idx: number) => {
                                    // INTEREST_ONLY_PAID is considered as paid
                                    const isPaid = emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID';
                                    const isInterestPaid = emi.paymentStatus === 'INTEREST_ONLY_PAID';
                                    return (
                                    <div 
                                      key={emi.id || idx}
                                      className={`flex items-center justify-between p-3 rounded-lg ${
                                        isPaid ? 'bg-green-50 border border-green-100' :
                                        emi.paymentStatus === 'OVERDUE' ? 'bg-red-50 border border-red-100' :
                                        emi.paymentStatus === 'PARTIALLY_PAID' ? 'bg-orange-50 border border-orange-100' :
                                        'bg-gray-50 border border-gray-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                          isPaid ? 'bg-green-200 text-green-700' :
                                          emi.paymentStatus === 'OVERDUE' ? 'bg-red-200 text-red-700' :
                                          emi.paymentStatus === 'PARTIALLY_PAID' ? 'bg-orange-200 text-orange-700' :
                                          'bg-gray-200 text-gray-700'
                                        }`}>
                                          #{emi.installmentNumber}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">{formatDate(emi.dueDate)}</p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs text-gray-500">
                                              {isInterestPaid ? 'Interest Paid' :
                                               isPaid ? 'Paid' : 
                                               emi.paymentStatus === 'OVERDUE' ? 'Overdue' :
                                               emi.paymentStatus === 'PARTIALLY_PAID' ? 'Partial' : 'Pending'}
                                            </p>
                                            {emi.paymentStatus === 'PARTIALLY_PAID' && emi.paidAmount && (
                                              <span className="text-xs text-orange-600">
                                                Remaining: {formatCurrency(emi.totalAmount - emi.paidAmount)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className="font-medium">{formatCurrency(emi.totalAmount)}</p>
                                          {emi.paidAmount && emi.paidAmount > 0 && !isPaid && (
                                            <p className="text-xs text-emerald-600">Paid: {formatCurrency(emi.paidAmount)}</p>
                                          )}
                                        </div>
                                        {canManageEmi && !isPaid && (
                                          <div className="flex gap-1">
                                            <Button 
                                              size="sm" 
                                              variant="ghost"
                                              className="h-7 w-7 p-0"
                                              onClick={() => handlePayEmi(loan, emi)}
                                              title="Pay EMI"
                                            >
                                              <IndianRupee className="h-3 w-3" />
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="ghost"
                                              className="h-7 w-7 p-0"
                                              onClick={() => handleChangeEmiDate(loan, emi)}
                                              title="Change Date"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="ghost"
                                              className="h-7 w-7 p-0"
                                              onClick={() => handleOpenEmiSettings(loan, emi)}
                                              title="Payment Settings"
                                            >
                                              <Settings className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );})}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No EMI schedules available</p>
                            )}
                              </TabsContent>
                              
                              {/* Customer Details Tab */}
                              <TabsContent value="customer">
                                <h5 className="font-medium text-gray-700 mb-3">Customer Details</h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Full Name</p>
                                    <p className="text-sm font-medium">{loan.customer?.name || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium">{loan.phone || loan.customer?.phone || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium">{loan.customer?.email || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">PAN Number</p>
                                    <p className="text-sm font-medium">{loan.panNumber || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Aadhaar Number</p>
                                    <p className="text-sm font-medium">{loan.aadhaarNumber || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Date of Birth</p>
                                    <p className="text-sm font-medium">{loan.dateOfBirth ? formatDate(loan.dateOfBirth) : 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Gender</p>
                                    <p className="text-sm font-medium">{loan.gender || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Marital Status</p>
                                    <p className="text-sm font-medium">{loan.maritalStatus || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Father's Name</p>
                                    <p className="text-sm font-medium">{loan.fatherName || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Mother's Name</p>
                                    <p className="text-sm font-medium">{loan.motherName || 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2 space-y-2">
                                    <p className="text-xs text-gray-500">Address</p>
                                    <p className="text-sm font-medium">{loan.address || 'N/A'}{loan.city ? `, ${loan.city}` : ''}{loan.state ? `, ${loan.state}` : ''} {loan.pincode || ''}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Employment Type</p>
                                    <p className="text-sm font-medium">{loan.employmentType || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Monthly Income</p>
                                    <p className="text-sm font-medium">{loan.monthlyIncome ? formatCurrency(loan.monthlyIncome) : 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2 space-y-2">
                                    <p className="text-xs text-gray-500">Purpose</p>
                                    <p className="text-sm font-medium">{loan.purpose || 'N/A'}</p>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              {/* Documents Tab */}
                              <TabsContent value="documents">
                                <h5 className="font-medium text-gray-700 mb-3">Documents & Signature</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {loan.panCardDoc && (
                                    <a href={loan.panCardDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                                      <FileText className="h-5 w-5 text-blue-600 mb-1" />
                                      <p className="text-xs font-medium text-blue-700">PAN Card</p>
                                    </a>
                                  )}
                                  {loan.aadhaarFrontDoc && (
                                    <a href={loan.aadhaarFrontDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition">
                                      <FileText className="h-5 w-5 text-green-600 mb-1" />
                                      <p className="text-xs font-medium text-green-700">Aadhaar Front</p>
                                    </a>
                                  )}
                                  {loan.aadhaarBackDoc && (
                                    <a href={loan.aadhaarBackDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition">
                                      <FileText className="h-5 w-5 text-green-600 mb-1" />
                                      <p className="text-xs font-medium text-green-700">Aadhaar Back</p>
                                    </a>
                                  )}
                                  {loan.photoDoc && (
                                    <a href={loan.photoDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition">
                                      <FileText className="h-5 w-5 text-purple-600 mb-1" />
                                      <p className="text-xs font-medium text-purple-700">Photo</p>
                                    </a>
                                  )}
                                  {loan.incomeProofDoc && (
                                    <a href={loan.incomeProofDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition">
                                      <FileText className="h-5 w-5 text-amber-600 mb-1" />
                                      <p className="text-xs font-medium text-amber-700">Income Proof</p>
                                    </a>
                                  )}
                                  {loan.addressProofDoc && (
                                    <a href={loan.addressProofDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 hover:bg-cyan-100 transition">
                                      <FileText className="h-5 w-5 text-cyan-600 mb-1" />
                                      <p className="text-xs font-medium text-cyan-700">Address Proof</p>
                                    </a>
                                  )}
                                  {loan.bankStatementDoc && (
                                    <a href={loan.bankStatementDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-teal-50 rounded-lg border border-teal-200 hover:bg-teal-100 transition">
                                      <FileText className="h-5 w-5 text-teal-600 mb-1" />
                                      <p className="text-xs font-medium text-teal-700">Bank Statement</p>
                                    </a>
                                  )}
                                  {loan.salarySlipDoc && (
                                    <a href={loan.salarySlipDoc} target="_blank" rel="noopener noreferrer" className="p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition">
                                      <FileText className="h-5 w-5 text-orange-600 mb-1" />
                                      <p className="text-xs font-medium text-orange-700">Salary Slip</p>
                                    </a>
                                  )}
                                  {loan.otherDocs && (
                                    <a href={loan.otherDocs} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                                      <FileText className="h-5 w-5 text-gray-600 mb-1" />
                                      <p className="text-xs font-medium text-gray-700">Other Docs</p>
                                    </a>
                                  )}
                                </div>
                                
                                {/* Digital Signature */}
                                {loan.digitalSignature && (
                                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <h6 className="text-sm font-medium text-emerald-700 mb-2">Digital Signature</h6>
                                    <img src={loan.digitalSignature} alt="Signature" className="max-h-20 border bg-white p-2 rounded" />
                                  </div>
                                )}
                                
                                {/* Bank Details */}
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <h6 className="text-sm font-medium text-blue-700 mb-2">Bank Details</h6>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-gray-500">Bank Name</p>
                                      <p className="font-medium">{loan.bankName || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Account Number</p>
                                      <p className="font-medium">{loan.bankAccountNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">IFSC Code</p>
                                      <p className="font-medium">{loan.bankIfsc || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* References */}
                                <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
                                  <h6 className="text-sm font-medium text-violet-700 mb-2">References</h6>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                      <p className="text-xs text-gray-500">Reference 1</p>
                                      <p className="font-medium">{loan.reference1Name || 'N/A'}</p>
                                      <p className="text-xs text-gray-600">{loan.reference1Phone} {loan.reference1Relation ? `(${loan.reference1Relation})` : ''}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-gray-500">Reference 2</p>
                                      <p className="font-medium">{loan.reference2Name || 'N/A'}</p>
                                      <p className="text-xs text-gray-600">{loan.reference2Phone} {loan.reference2Relation ? `(${loan.reference2Relation})` : ''}</p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              {/* Mirror Info Tab */}
                              <TabsContent value="mirror">
                                <h5 className="font-medium text-gray-700 mb-3">Mirror Loan Information</h5>
                                {loadingMirror ? (
                                  <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                                  </div>
                                ) : mirrorLoanData ? (
                                  <div className="space-y-4">
                                    {/* Mirror Loan Configuration */}
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                      <div className="flex items-center gap-2 mb-3">
                                        <RefreshCw className="h-5 w-5 text-purple-600" />
                                        <span className="font-semibold text-purple-800">Mirror Loan Active</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-xs text-gray-500">Mirror Company</p>
                                          <p className="font-medium">{mirrorLoanData.mirrorCompanyName || 'Company 1'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Mirror Interest Rate</p>
                                          <p className="font-medium text-green-600">{mirrorLoanData.mirrorInterestRate}% {mirrorLoanData.mirrorInterestType || 'REDUCING'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Original Interest Rate</p>
                                          <p className="font-medium text-gray-700">{mirrorLoanData.originalInterestRate}% {mirrorLoanData.originalInterestType || 'FLAT'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">EMI Amount</p>
                                          <p className="font-medium">₹{mirrorLoanData.originalEMIAmount?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Original Tenure</p>
                                          <p className="font-medium">{mirrorLoanData.originalTenure} months</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Mirror Tenure</p>
                                          <p className="font-medium text-green-600">{mirrorLoanData.mirrorTenure} months</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Extra EMIs</p>
                                          <p className="font-medium text-amber-600">{mirrorLoanData.extraEMICount} EMIs (Profit)</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Profit Summary */}
                                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                      <h6 className="font-medium text-amber-800 mb-2">Profit Summary (Company 3)</h6>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-xs text-gray-500">Extra EMI Profit</p>
                                          <p className="font-bold text-lg text-amber-600">
                                            ₹{(mirrorLoanData.extraEMICount * mirrorLoanData.originalEMIAmount).toLocaleString()}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Profit Received</p>
                                          <p className="font-bold text-lg text-green-600">
                                            ₹{(mirrorLoanData.totalProfitReceived || 0).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* EMI Schedule Comparison */}
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                        <h6 className="font-semibold text-gray-700">EMI Schedule Comparison</h6>
                                      </div>
                                      
                                      {/* Legend */}
                                      <div className="flex gap-4 px-4 py-2 bg-gray-50 text-xs border-b border-gray-100">
                                        <div className="flex items-center gap-1">
                                          <div className="w-3 h-3 rounded bg-purple-500"></div>
                                          <span>Mirror (Company 1 - {mirrorLoanData.mirrorInterestRate}% {mirrorLoanData.mirrorInterestType})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="w-3 h-3 rounded bg-blue-500"></div>
                                          <span>Original (Company 3 - {mirrorLoanData.originalInterestRate}% {mirrorLoanData.originalInterestType})</span>
                                        </div>
                                        {mirrorLoanData.extraEMICount > 0 && (
                                          <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-amber-500"></div>
                                            <span>Extra EMI (Company 3 Profit)</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Schedule Table */}
                                      <div className="max-h-80 overflow-y-auto">
                                        <table className="w-full text-sm">
                                          <thead className="sticky top-0 bg-gray-50">
                                            <tr>
                                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
                                              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Mirror EMI</th>
                                              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Mirror Interest</th>
                                              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Original EMI</th>
                                              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Original Interest</th>
                                              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Note</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {/* Mirror EMIs */}
                                            {mirrorLoanData.mirrorSchedule && mirrorLoanData.mirrorSchedule.map((emi: any, idx: number) => {
                                              const originalEmi = mirrorLoanData.originalSchedule?.[idx];
                                              return (
                                                <tr key={`mirror-${idx}`} className="border-b border-gray-100 hover:bg-purple-50">
                                                  <td className="px-4 py-2 font-medium text-purple-700">{emi.installmentNumber}</td>
                                                  <td className="px-4 py-2 text-right text-purple-600">₹{emi.emi?.toLocaleString()}</td>
                                                  <td className="px-4 py-2 text-right text-purple-500">₹{emi.interest?.toLocaleString()}</td>
                                                  <td className="px-4 py-2 text-right text-blue-600">₹{originalEmi?.emi?.toLocaleString() || '-'}</td>
                                                  <td className="px-4 py-2 text-right text-blue-500">₹{originalEmi?.interest?.toLocaleString() || '-'}</td>
                                                  <td className="px-4 py-2 text-center">
                                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Mirror</span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                            
                                            {/* Extra EMIs (Profit for Company 3) */}
                                            {mirrorLoanData.extraEMICount > 0 && mirrorLoanData.originalSchedule && 
                                              mirrorLoanData.originalSchedule.slice(mirrorLoanData.mirrorTenure).map((emi: any, idx: number) => (
                                                <tr key={`extra-${idx}`} className="border-b border-gray-100 bg-amber-50 hover:bg-amber-100">
                                                  <td className="px-4 py-2 font-medium text-amber-700">{emi.installmentNumber}</td>
                                                  <td className="px-4 py-2 text-right text-gray-400">-</td>
                                                  <td className="px-4 py-2 text-right text-gray-400">-</td>
                                                  <td className="px-4 py-2 text-right text-amber-600 font-medium">₹{emi.emi?.toLocaleString()}</td>
                                                  <td className="px-4 py-2 text-right text-amber-500">₹{emi.interest?.toLocaleString()}</td>
                                                  <td className="px-4 py-2 text-center">
                                                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium">PROFIT</span>
                                                  </td>
                                                </tr>
                                              ))
                                            }
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                    
                                    {/* Notes */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-gray-500 mt-0.5" />
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <p><strong>Mirror Loan:</strong> Customer pays same EMI, but Company 1 receives interest at {mirrorLoanData.mirrorInterestRate}% reducing rate.</p>
                                          <p><strong>Extra EMIs:</strong> After mirror tenure, remaining EMIs are pure profit for Company 3.</p>
                                          <p><strong>Total Interest Difference:</strong> Company 3 earns profit from the interest rate difference ({mirrorLoanData.originalInterestRate}% vs {mirrorLoanData.mirrorInterestRate}%).</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No mirror loan configured for this loan.</p>
                                    <p className="text-xs mt-1">Mirror loans are created during loan disbursement process.</p>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay EMI Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-500" />
              Pay EMI
            </DialogTitle>
            <DialogDescription>
              {selectedLoan?.identifier} - {selectedLoan?.customer?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedEmi && (
            <div className="space-y-4 py-4">
              {/* EMI Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">EMI Number</span>
                  <span className="font-medium">#{selectedEmi.installmentNumber || 'Current'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium">{formatDate(selectedEmi.dueDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedEmi.amount || 0)}</span>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-2">
                <Label className="font-medium">Payment Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentType === 'FULL_EMI' ? 'default' : 'outline'}
                    className={paymentType === 'FULL_EMI' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    onClick={() => setPaymentType('FULL_EMI')}
                  >
                    Full EMI
                  </Button>
                  <Button
                    type="button"
                    variant={paymentType === 'PARTIAL_PAYMENT' ? 'default' : 'outline'}
                    className={paymentType === 'PARTIAL_PAYMENT' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    onClick={() => setPaymentType('PARTIAL_PAYMENT')}
                  >
                    Partial
                  </Button>
                  <Button
                    type="button"
                    variant={paymentType === 'INTEREST_ONLY' ? 'default' : 'outline'}
                    className={paymentType === 'INTEREST_ONLY' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    onClick={() => setPaymentType('INTEREST_ONLY')}
                  >
                    Interest Only
                  </Button>
                </div>
              </div>

              {/* Partial Payment Fields */}
              {paymentType === 'PARTIAL_PAYMENT' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Partial Amount</Label>
                    <Input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="Enter amount..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>When will you pay the remaining amount?</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          {nextPaymentDate ? format(nextPaymentDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={nextPaymentDate}
                          onSelect={setNextPaymentDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p className="text-sm text-amber-700">
                        Subsequent EMI dates will be shifted based on your selected date.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Interest Only Info */}
              {paymentType === 'INTEREST_ONLY' && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Interest Only Payment</p>
                      <p className="mt-1">Only the interest portion will be paid. The principal will be added to next month's EMI.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label className="font-medium">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mirror Loan Payment Info Banner */}
              {selectedLoan?.mirrorCompanyId && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">Mirror Loan Payment</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This loan is mirrored to <strong>{mirrorLoanData?.mirrorCompanyName || 'Mirror Company'}</strong>.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Payment will be recorded in: {mirrorLoanData?.mirrorCompanyName || 'Mirror Company'}'s Bank/Cashbook</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Original loan ({selectedLoan?.company?.name || 'Company 3'}) is for record-keeping only.
                  </p>
                </div>
              )}

              {/* Payment Summary */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700">Amount to Collect</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCurrency(getPaymentDetails().amount)}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={processPayment}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change EMI Date Dialog */}
      <Dialog open={showEmiDateDialog} onOpenChange={setShowEmiDateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" />
              Change EMI Date
            </DialogTitle>
            <DialogDescription>
              {selectedLoan?.identifier} - EMI #{selectedEmi?.installmentNumber || 'Current'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Current Due Date</span>
                <span className="font-medium">
                  {selectedEmi?.dueDate ? formatDate(selectedEmi.dueDate) : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {newEmiDate ? format(newEmiDate, 'PPP') : 'Select new date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newEmiDate}
                    onSelect={setNewEmiDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input
                value={emiDateReason}
                onChange={(e) => setEmiDateReason(e.target.value)}
                placeholder="e.g., Customer request, financial hardship..."
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Changing the EMI date will shift this EMI's due date. Subsequent EMIs may also be affected.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmiDateDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-500 hover:bg-amber-600"
              onClick={updateEmiDate}
              disabled={processing || !newEmiDate}
            >
              {processing ? 'Updating...' : 'Update Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMI Payment Settings Dialog */}
      <Dialog open={showEmiSettingsDialog} onOpenChange={setShowEmiSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              EMI Payment Settings
            </DialogTitle>
            <DialogDescription>
              Configure payment options for EMI #{selectedEmi?.installmentNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Payment Options Toggles */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Payment Options</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Full Payment</Label>
                  <p className="text-xs text-gray-500">Allow customer to pay full EMI</p>
                </div>
                <Switch
                  checked={emiPaymentSettings?.enableFullPayment ?? true}
                  onCheckedChange={(checked) => 
                    setEmiPaymentSettings((prev: any) => ({ ...prev, enableFullPayment: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Partial Payment</Label>
                  <p className="text-xs text-gray-500">Allow customer to pay in parts</p>
                </div>
                <Switch
                  checked={emiPaymentSettings?.enablePartialPayment ?? true}
                  onCheckedChange={(checked) => 
                    setEmiPaymentSettings((prev: any) => ({ ...prev, enablePartialPayment: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Interest Only</Label>
                  <p className="text-xs text-gray-500">Allow paying only interest amount</p>
                </div>
                <Switch
                  checked={emiPaymentSettings?.enableInterestOnly ?? true}
                  onCheckedChange={(checked) => 
                    setEmiPaymentSettings((prev: any) => ({ ...prev, enableInterestOnly: checked }))
                  }
                />
              </div>
            </div>
            
            {/* Payment Page Selection */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Payment Page</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use Default Company Page</Label>
                  <p className="text-xs text-gray-500">Show company's default bank account</p>
                </div>
                <Switch
                  checked={emiPaymentSettings?.useDefaultCompanyPage ?? true}
                  onCheckedChange={(checked) => 
                    setEmiPaymentSettings((prev: any) => ({ ...prev, useDefaultCompanyPage: checked }))
                  }
                />
              </div>
              
              {!emiPaymentSettings?.useDefaultCompanyPage && (
                <div className="space-y-2">
                  <Label>Select Payment Page</Label>
                  <Select
                    value={emiPaymentSettings?.secondaryPaymentPageId || ''}
                    onValueChange={(value) => 
                      setEmiPaymentSettings((prev: any) => ({ ...prev, secondaryPaymentPageId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment page" />
                    </SelectTrigger>
                    <SelectContent>
                      {secondaryPaymentPages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {secondaryPaymentPages.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No secondary payment pages available. Create one from Cashier portal.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Info Box */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Important:</p>
                  <p>All transactions are recorded in the company's default bank account regardless of which payment page is displayed.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmiSettingsDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={saveEmiPaymentSettings}
              disabled={savingSettings}
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Loan Confirmation Dialog ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Loan
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{loanToDelete?.identifier}</strong> and its mirror loan (if any), along with ALL EMI records, payments, and accounting entries. <span className="text-red-600 font-semibold">This cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              All related accounting journal entries will be removed. Ledger balances will be recalculated automatically.
            </div>
            <div>
              <Label htmlFor="delete-note" className="text-sm font-medium">
                Note / Reason (will be sent to Super Admin)
              </Label>
              <Input
                id="delete-note"
                className="mt-1"
                placeholder="e.g. Duplicate entry, customer withdrew..."
                value={deleteNote}
                onChange={e => setDeleteNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLoan}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
