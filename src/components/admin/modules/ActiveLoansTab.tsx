'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Wallet, RefreshCw, Eye, Trash2, FileText, Receipt, DollarSign, Copy, Lock, 
  PlayCircle, Loader2, Calculator, AlertCircle, Clock
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';
import { getBlinkAlertType, getBlinkAlertConfig, getLighterColor, BlinkAlertConfig } from '@/utils/loanColors';
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
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

interface ActiveLoan {
  id: string;
  identifier: string;
  customer?: { name: string; phone: string };
  disbursedAmount?: number;
  approvedAmount?: number;
  emiAmount?: number;
  loanType: string;
  status: string;
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
  } | null;
  isInterestOnlyLoan?: boolean;
  emiSchedules?: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    totalAmount: number;
    paymentStatus: string;
  }>;
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
  setShowLoanDetailPanel
}: ActiveLoansTabProps) {
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

  const filteredActiveLoans = allActiveLoans.filter(loan => {
    if (activeLoanFilter === 'all') return true;
    return loan.loanType === activeLoanFilter.toUpperCase();
  });

  // Count interest-only loans
  const interestOnlyCount = allActiveLoans.filter(loan => loan.status === 'ACTIVE_INTEREST_ONLY').length;

  // Open Start Loan Dialog
  const openStartLoanDialog = async (loan: ActiveLoan) => {
    setSelectedLoanToStart(loan);
    setLoadingPreview(true);
    setShowStartLoanDialog(true);

    try {
      // Fetch loan details and EMI preview
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
        fetchAllActiveLoans(); // Refresh the list
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
    // Debounce EMI calculation
    setTimeout(() => calculateEmiPreview(), 300);
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

      {/* Active Loans List */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Active Loans
            {activeLoanFilter !== 'all' && (
              <Badge className={activeLoanFilter === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                {activeLoanFilter.toUpperCase()} ONLY
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {activeLoanFilter === 'all' ? 'All disbursed loans (online + offline)' :
             activeLoanFilter === 'online' ? 'Online loans from digital applications' :
             'Offline loans created manually'}
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
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredActiveLoans.map((loan, index) => {
                const isOnline = loan.loanType === 'ONLINE';
                const isMirror = loan.isMirrorLoan;
                const isOriginalMirror = loan.isOriginalMirrorLoan;
                const isInterestOnly = loan.status === 'ACTIVE_INTEREST_ONLY';
                
                // Get display color for mirror loan pairs
                const displayColor = loan.displayColor || loan.mirrorMapping?.displayColor || null;
                
                // Get blink alert type based on next EMI due date
                let blinkAlertType: 'OVERDUE' | 'ONE_DAY' | 'TWO_DAYS' | 'THREE_DAYS' | 'NORMAL' = 'NORMAL';
                let blinkConfig: BlinkAlertConfig | null = null;
                
                if (loan.nextEmi && loan.nextEmi.dueDate && loan.nextEmi.status !== 'PAID') {
                  blinkAlertType = getBlinkAlertType(loan.nextEmi.dueDate, false);
                  blinkConfig = getBlinkAlertConfig(blinkAlertType);
                }
                
                // Check all EMI schedules for the most urgent alert
                if (loan.emiSchedules && loan.emiSchedules.length > 0) {
                  const pendingEmis = loan.emiSchedules.filter(e => e.paymentStatus !== 'PAID' && e.paymentStatus !== 'INTEREST_ONLY_PAID');
                  for (const emi of pendingEmis) {
                    const emiAlertType = getBlinkAlertType(emi.dueDate, false);
                    // Priority: OVERDUE > ONE_DAY > TWO_DAYS > THREE_DAYS
                    if (emiAlertType === 'OVERDUE') {
                      blinkAlertType = 'OVERDUE';
                      blinkConfig = getBlinkAlertConfig('OVERDUE');
                      break;
                    } else if (emiAlertType === 'ONE_DAY' && blinkAlertType !== 'OVERDUE') {
                      blinkAlertType = 'ONE_DAY';
                      blinkConfig = getBlinkAlertConfig('ONE_DAY');
                    } else if (emiAlertType === 'TWO_DAYS' && blinkAlertType !== 'OVERDUE' && blinkAlertType !== 'ONE_DAY') {
                      blinkAlertType = 'TWO_DAYS';
                      blinkConfig = getBlinkAlertConfig('TWO_DAYS');
                    } else if (emiAlertType === 'THREE_DAYS' && blinkAlertType === 'NORMAL') {
                      blinkAlertType = 'THREE_DAYS';
                      blinkConfig = getBlinkAlertConfig('THREE_DAYS');
                    }
                  }
                }

                // Build CSS classes based on color and blink status
                let cardClasses = 'p-4 border rounded-xl hover:shadow-md transition-all';
                
                // Apply display color for mirror pairs or blink alert
                if (displayColor) {
                  const lighterColor = getLighterColor(displayColor, 0.15);
                  const borderColor = getLighterColor(displayColor, 0.8);
                  cardClasses += ` border-l-4`;
                } else if (blinkConfig && blinkAlertType !== 'NORMAL') {
                  cardClasses += ` blink-alert-${blinkAlertType === 'OVERDUE' ? 'overdue' : blinkAlertType === 'ONE_DAY' ? 'one-day' : blinkAlertType === 'TWO_DAYS' ? 'two-days' : 'three-days'}`;
                } else if (isInterestOnly) {
                  cardClasses += ' bg-amber-50 border-amber-200 border-l-4 border-l-amber-500';
                } else if (isMirror) {
                  cardClasses += ' bg-amber-50 border-amber-200 border-l-4 border-l-amber-500';
                } else if (isOriginalMirror) {
                  cardClasses += ' bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500';
                } else {
                  cardClasses += isOnline ? ' bg-blue-50 border-blue-100' : ' bg-purple-50 border-purple-100';
                }

                // Build avatar gradient
                let avatarGradient = '';
                if (displayColor) {
                  const darkerColor = displayColor; // Use the display color
                  avatarGradient = ''; // Will use inline style
                } else if (isInterestOnly) {
                  avatarGradient = 'from-amber-400 to-orange-500';
                } else if (isMirror) {
                  avatarGradient = 'from-amber-400 to-orange-500';
                } else if (isOriginalMirror) {
                  avatarGradient = 'from-emerald-400 to-teal-500';
                } else {
                  avatarGradient = isOnline ? 'from-blue-400 to-cyan-500' : 'from-purple-400 to-pink-500';
                }

                return (
                  <motion.div
                    key={`${loan.loanType}-${loan.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cardClasses}
                    style={displayColor ? {
                      backgroundColor: getLighterColor(displayColor, 0.15),
                      borderLeftColor: displayColor,
                      borderColor: getLighterColor(displayColor, 0.5)
                    } : undefined}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar 
                          className="h-12 w-12 bg-gradient-to-br"
                          style={displayColor ? {
                            background: `linear-gradient(135deg, ${displayColor} 0%, ${getLighterColor(displayColor, 0.7)} 100%)`
                          } : undefined}
                        >
                          <AvatarFallback className="bg-transparent text-white font-semibold">
                            {isMirror ? <Lock className="h-5 w-5" /> : loan.customer?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{loan.identifier}</h4>
                            {/* Color indicator for mirror pair */}
                            {displayColor && (isMirror || isOriginalMirror) && (
                              <Badge 
                                className="border-2 flex items-center gap-1"
                                style={{ 
                                  backgroundColor: getLighterColor(displayColor, 0.3),
                                  borderColor: displayColor,
                                  color: displayColor
                                }}
                              >
                                <span 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: displayColor }}
                                />
                                {(isMirror ? 'MIRROR' : 'ORIGINAL')}
                              </Badge>
                            )}
                            {isInterestOnly && (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                                <Calculator className="h-3 w-3 mr-1" />
                                INTEREST-ONLY PHASE
                              </Badge>
                            )}
                            {isMirror && !displayColor && (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                                <Copy className="h-3 w-3 mr-1" />
                                MIRROR LOAN (Read-Only)
                              </Badge>
                            )}
                            {isOriginalMirror && !displayColor && (
                              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                                <Copy className="h-3 w-3 mr-1" />
                                ORIGINAL (Has Mirror)
                              </Badge>
                            )}
                            <Badge className={isOnline ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                              {loan.loanType}
                            </Badge>
                            {loan.status && (
                              <Badge className={
                                isInterestOnly 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }>
                                {loan.status}
                              </Badge>
                            )}
                            {/* Blink Alert Badge */}
                            {blinkConfig && blinkAlertType !== 'NORMAL' && (
                              <Badge 
                                className="animate-pulse"
                                style={{ 
                                  backgroundColor: blinkConfig.bgColor,
                                  color: blinkConfig.color,
                                  border: `1px solid ${blinkConfig.borderColor}`
                                }}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {blinkConfig.label}
                              </Badge>
                            )}
                            {loan.nextEmi && loan.nextEmi.status === 'OVERDUE' && !blinkConfig && (
                              <Badge className="bg-red-100 text-red-700">OVERDUE</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                          {isInterestOnly && (
                            <p className="text-xs text-amber-600 mt-1">
                              Ready to start EMI payments
                            </p>
                          )}
                          {isMirror && loan.mirrorMapping && (
                            <p className="text-xs text-amber-600 mt-1">
                              Mirror of: {loan.mirrorMapping.originalLoanId.substring(0, 8)}... 
                              • Payment synced with original loan
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(loan.disbursedAmount || loan.approvedAmount || 0)}</p>
                          {loan.emiAmount && <p className="text-xs text-gray-500">EMI: {formatCurrency(loan.emiAmount)}/mo</p>}
                        </div>
                        <div className="flex gap-2">
                          {/* Start Loan Button for Interest-Only Loans */}
                          {isInterestOnly && (
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => openStartLoanDialog(loan)}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Start Loan
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Mirror loans are read-only - no delete allowed */}
                          {/* Interest-only loans CAN be deleted */}
                          {!isMirror && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => { setLoanToDelete(loan); setShowDeleteLoanDialog(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
    </div>
  );
}
