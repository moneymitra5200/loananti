'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar, IndianRupee, Clock, AlertTriangle, CheckCircle,
  Phone, MapPin, User, Wallet, CreditCard, Banknote, Receipt,
  Upload, FileCheck, Building2, Info, X, ImageIcon, Settings,
  Search, Calculator
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import EMISettingsButton from '@/components/shared/EMISettingsButton';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface EMIItem {
  id: string;
  installmentNumber: number;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  dueDate: string;
  paymentStatus: string;
  paidAmount: number;
  penaltyAmount?: number;
  daysOverdue?: number;
  loanApplicationId?: string;
  loanApplication?: {
    id: string;
    applicationNo: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    companyId?: string;
  };
  offlineLoan?: {
    id: string;
    loanNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    companyId?: string;
  };
}

interface EMICollectionSectionProps {
  userId: string;
  userRole: string;
  onPaymentComplete?: () => void;
}

export default function EMICollectionSection({ userId, userRole, onPaymentComplete }: EMICollectionSectionProps) {
  const { settings } = useSystemSettings();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [emis, setEmis] = useState<{ online: EMIItem[]; offline: EMIItem[] }>({ online: [], offline: [] });
  const [summary, setSummary] = useState({
    online: { count: 0, totalAmount: 0, totalPrincipal: 0, totalInterest: 0 },
    offline: { count: 0, totalAmount: 0, totalPrincipal: 0, totalInterest: 0 },
    combined: { count: 0, totalAmount: 0, totalPrincipal: 0, totalInterest: 0 }
  });

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<EMIItem | null>(null);
  const [selectedType, setSelectedType] = useState<'online' | 'offline'>('offline');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [creditType, setCreditType] = useState<'COMPANY' | 'PERSONAL'>('COMPANY');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [chequeNumber, setChequeNumber] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paying, setPaying] = useState(false);
  const [payingAmount, setPayingAmount] = useState<number>(0);
  const [penaltyWaiver, setPenaltyWaiver] = useState<number>(0);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEmisByDate();
  }, [selectedDate, userId, userRole]);

  const fetchEmisByDate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/emi-reminder?action=by-date&date=${selectedDate}&userId=${userId}&userRole=${userRole}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmis({ online: data.onlineEmis, offline: data.offlineEmis });
          setSummary(data.summary);
        }
      }
    } catch (error) {
      console.error('Failed to fetch EMIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayEmi = async () => {
    if (!selectedEmi) return;

    const handlePaymentSuccess = () => {
      // Reset form
      setPaymentDialogOpen(false);
      setProofFile(null);
      setChequeNumber('');
      setUtrNumber('');
      setRemarks('');
      setCreditType('COMPANY');
      setPaymentMode('CASH');
      setPayingAmount(0);
      setPenaltyWaiver(0);

      fetchEmisByDate();
      onPaymentComplete?.();

      toast({
        title: 'Payment Collected',
        description: `EMI collected successfully.`,
      });
    };

    // Validate proof requirement
    const requiresProof = paymentMode !== 'CASH' || creditType === 'PERSONAL';
    if (requiresProof && !proofFile) {
      toast({
        title: 'Proof Required',
        description: `Please upload proof for ${paymentMode !== 'CASH' ? paymentMode.toLowerCase() : 'personal'} transactions`,
        variant: 'destructive'
      });
      return;
    }

    // Validate cheque number for cheque payments
    if (paymentMode === 'CHEQUE' && !chequeNumber) {
      toast({
        title: 'Cheque Number Required',
        description: 'Please enter the cheque number',
        variant: 'destructive'
      });
      return;
    }

    // Validate UTR for online payments
    if ((paymentMode === 'ONLINE' || paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER') && !utrNumber) {
      toast({
        title: 'UTR/Reference Required',
        description: 'Please enter the UTR or transaction reference number',
        variant: 'destructive'
      });
      return;
    }

    try {
      setPaying(true);

      // Upload proof if provided
      let proofDocumentPath = null;
      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('documentType', 'emi-proof');

        const uploadRes = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          proofDocumentPath = uploadData.url;
        }
      }

      // Create credit transaction with dual credit system
      const customerName = selectedType === 'offline'
        ? selectedEmi.offlineLoan?.customerName
        : `${selectedEmi.loanApplication?.firstName || ''} ${selectedEmi.loanApplication?.lastName || ''}`.trim();
      const customerPhone = selectedType === 'offline'
        ? selectedEmi.offlineLoan?.customerPhone
        : selectedEmi.loanApplication?.phone;
      const loanNo = selectedType === 'offline'
        ? selectedEmi.offlineLoan?.loanNumber
        : selectedEmi.loanApplication?.applicationNo;

      // Create credit transaction
      const creditRes = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: payingAmount,
          paymentMode,
          creditType,
          sourceType: 'EMI_PAYMENT',
          loanApplicationId: selectedType === 'online' ? selectedEmi.loanApplication?.id : null,
          emiScheduleId: selectedEmi.id,
          customerId: selectedType === 'online' ? selectedEmi.loanApplication?.id : null,
          installmentNumber: selectedEmi.installmentNumber,
          customerName,
          customerPhone,
          loanApplicationNo: loanNo,
          emiDueDate: selectedEmi.dueDate,
          emiAmount: payingAmount,
          chequeNumber: paymentMode === 'CHEQUE' ? chequeNumber : null,
          utrNumber: ['ONLINE', 'UPI', 'BANK_TRANSFER'].includes(paymentMode) ? utrNumber : null,
          proofDocument: proofDocumentPath,
          proofType: proofFile?.type,
          description: `EMI #${selectedEmi.installmentNumber} collection`,
          remarks
        })
      });

      const creditData = await creditRes.json();

      if (!creditData.success) {
        throw new Error(creditData.error || 'Failed to update credit');
      }

      if (selectedType === 'offline') {
        const res = await fetch('/api/offline-loan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'pay-emi',
            emiId: selectedEmi.id,
            userId,
            paymentMode,
            paymentType: payingAmount < selectedEmi.totalAmount ? 'PARTIAL' : 'FULL',
            amount: payingAmount,
            penaltyWaiver
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            handlePaymentSuccess();
          }
        } else {
          const error = await res.json();
          throw new Error(error.error || 'Failed to process payment');
        }
      } else {
        // Online Loan
        const formData = new FormData();
        formData.append('emiId', selectedEmi.id);
        if (selectedEmi.loanApplication?.id) {
          formData.append('loanId', selectedEmi.loanApplication.id);
        }
        formData.append('amount', payingAmount.toString());
        if (payingAmount < selectedEmi.totalAmount) {
          formData.append('paymentType', 'PARTIAL_PAYMENT');
          formData.append('partialAmount', payingAmount.toString());
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 7);
          formData.append('nextPaymentDate', nextDate.toISOString()); // Default padding for partial
        } else {
          formData.append('paymentType', 'FULL_EMI');
        }
        formData.append('paymentMode', paymentMode);
        formData.append('paidBy', userId);
        formData.append('creditType', creditType);
        formData.append('remarks', remarks);
        if (penaltyWaiver > 0) {
          formData.append('penaltyWaiver', penaltyWaiver.toString());
        }

        if (proofFile) {
          formData.append('proof', proofFile);
        }
        if (chequeNumber) {
          formData.append('paymentReference', chequeNumber);
        }
        if (utrNumber) {
          formData.append('paymentReference', utrNumber);
        }

        const res = await fetch('/api/emi/pay', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            handlePaymentSuccess();
          }
        } else {
          const error = await res.json();
          throw new Error(error.error || 'Failed to process payment');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payment',
        variant: 'destructive'
      });
    } finally {
      setPaying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const openPaymentDialog = (emi: EMIItem, type: 'online' | 'offline') => {
    setSelectedEmi(emi);
    setSelectedType(type);
    const balanceDue = (emi.totalAmount + (emi.penaltyAmount || 0)) - (emi.paidAmount || 0);
    setPayingAmount(balanceDue > 0 ? balanceDue : 0);
    setPenaltyWaiver(0);
    setPaymentDialogOpen(true);
  };

  const getCreditInfo = () => {
    if (paymentMode === 'CASH' && creditType === 'COMPANY') {
      return {
        type: 'Company Credit',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        description: 'This CASH payment will increase your company credit.'
      };
    } else {
      return {
        type: 'Personal Credit',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        description: 'This transaction will increase your personal credit. You need to settle with Super Admin.'
      };
    }
  };

  const renderEmiCard = (emi: EMIItem, type: 'online' | 'offline') => {
    const customerName = type === 'offline'
      ? emi.offlineLoan?.customerName
      : `${emi.loanApplication?.firstName || ''} ${emi.loanApplication?.lastName || ''}`.trim();
    const loanNumber = type === 'offline'
      ? emi.offlineLoan?.loanNumber
      : emi.loanApplication?.applicationNo;
    const phone = type === 'offline'
      ? emi.offlineLoan?.customerPhone
      : emi.loanApplication?.phone;
    const address = type === 'offline'
      ? emi.offlineLoan?.customerAddress
      : emi.loanApplication?.address;

    // Calculate EMI Due Proximity Logic
    const emiDueDate = new Date(emi.dueDate);
    const today = new Date();
    // Reset time to avoid hours difference
    emiDueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = emiDueDate.getTime() - today.getTime();
    const daysToDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let alertClass = "border border-gray-100 bg-white hover:shadow-md transition-shadow";
    if (daysToDue <= settings.colorRedDaysOverdue) {
      alertClass = "border-2 border-red-500 bg-red-50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse";
    } else if (daysToDue <= settings.colorYellowDays) {
      alertClass = "border-2 border-yellow-500 bg-yellow-50 shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse";
    } else if (daysToDue <= settings.colorGreenDays) {
      alertClass = "border-2 border-green-500 bg-green-50 shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse";
    }

    return (
      <motion.div
        key={emi.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg ${alertClass}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={type === 'offline' ? 'secondary' : 'outline'}>
                {type === 'offline' ? 'Offline' : 'Online'}
              </Badge>
              <span className="text-sm font-medium text-gray-600">EMI #{emi.installmentNumber}</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">{customerName}</span>
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-3 w-3" />
                <span>{loanNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <span>{phone}</span>
              </div>
              {address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{address}</span>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Principal: <span className="font-medium text-gray-600">{formatCurrency(emi.principalAmount)}</span>
                </span>
                <span className="text-xs text-gray-400">
                  Interest: <span className="font-medium text-gray-600">{formatCurrency(emi.interestAmount)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(emi.totalAmount + (emi.penaltyAmount || 0) - (emi.paidAmount || 0))}</p>
            {emi.penaltyAmount ? (
              <p className="text-xs text-red-500 font-medium">+ {formatCurrency(emi.penaltyAmount)} Penalty</p>
            ) : null}
            <p className="text-xs text-gray-500">Due: {formatDate(emi.dueDate)}</p>
            <div className="flex gap-2 mt-2 justify-end">
              {type === 'online' && emi.loanApplication?.companyId && (
                <EMISettingsButton
                  emiScheduleId={emi.id}
                  loanApplicationId={emi.loanApplication.id}
                  companyId={emi.loanApplication.companyId}
                  userId={userId}
                />
              )}
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => openPaymentDialog(emi, type)}
              >
                <IndianRupee className="h-4 w-4 mr-1" />
                Pay
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const creditInfo = getCreditInfo();
  const requiresProof = paymentMode !== 'CASH' || creditType === 'PERSONAL';

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              EMI Collection
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Date Selection Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Date</Label>
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={fetchEmisByDate}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-3 mb-4">
            {/* Combined Total */}
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Total Collection for {formatDate(selectedDate)}</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.combined.totalAmount)}</p>
                  <p className="text-xs text-emerald-500 mt-1">{summary.combined.count} EMIs</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-3 w-3" />
                      <span>Principal: <span className="font-medium text-gray-700">{formatCurrency(summary.combined.totalPrincipal)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-3 w-3" />
                      <span>Interest: <span className="font-medium text-gray-700">{formatCurrency(summary.combined.totalInterest)}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Online/Offline Breakdown */}
            {(summary.online.count > 0 || summary.offline.count > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Online Loans</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(summary.online.totalAmount)}</p>
                  <p className="text-xs text-blue-500">{summary.online.count} EMIs</p>
                  <div className="text-xs text-gray-500 mt-1">
                    P: {formatCurrency(summary.online.totalPrincipal)} | I: {formatCurrency(summary.online.totalInterest)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium">Offline Loans</p>
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(summary.offline.totalAmount)}</p>
                  <p className="text-xs text-purple-500">{summary.offline.count} EMIs</p>
                  <div className="text-xs text-gray-500 mt-1">
                    P: {formatCurrency(summary.offline.totalPrincipal)} | I: {formatCurrency(summary.offline.totalInterest)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EMI List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              {summary.combined.count === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No EMIs to collect on {formatDate(selectedDate)}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emis.offline.map(emi => renderEmiCard(emi, 'offline'))}
                  {emis.online.map(emi => renderEmiCard(emi, 'online'))}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Collect EMI Payment</DialogTitle>
            <DialogDescription>
              Select payment mode and credit type. Only CASH increases company credit.
            </DialogDescription>
          </DialogHeader>

          {selectedEmi && (
            <div className="space-y-4 pt-4">
              {/* EMI Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">EMI Number</span>
                  <span className="font-medium text-blue-700">#{selectedEmi.installmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Original EMI Amount</span>
                  <span className="font-medium">{formatCurrency(selectedEmi.totalAmount)}</span>
                </div>
                {selectedEmi.penaltyAmount ? (
                  <div className="flex justify-between text-red-600">
                    <span className="font-medium">Penalty Amount ({selectedEmi.daysOverdue || 0} days)</span>
                    <span className="font-medium">+{formatCurrency(selectedEmi.penaltyAmount)}</span>
                  </div>
                ) : null}
                {selectedEmi.paidAmount ? (
                  <div className="flex justify-between text-emerald-600">
                    <span className="font-medium">Already Paid</span>
                    <span className="font-medium">-{formatCurrency(selectedEmi.paidAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-700 font-bold">Remaining Due</span>
                  <span className="font-bold text-lg text-rose-600">
                    {formatCurrency((selectedEmi.totalAmount + (selectedEmi.penaltyAmount || 0)) - (selectedEmi.paidAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Due Date</span>
                  <span className="font-medium text-xs bg-gray-200 px-2 py-0.5 rounded">{formatDate(selectedEmi.dueDate)}</span>
                </div>
              </div>

              {/* Paying Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paying Amount *</Label>
                  <Input
                    type="number"
                    value={payingAmount}
                    onChange={(e) => setPayingAmount(parseFloat(e.target.value) || 0)}
                    className="font-bold text-lg h-12"
                  />
                </div>
                {selectedEmi.penaltyAmount ? (
                  <div className="space-y-2">
                    <Label className="text-red-600">Waiver (Penalty Discount)</Label>
                    <Input
                      type="number"
                      value={penaltyWaiver}
                      onChange={(e) => setPenaltyWaiver(parseFloat(e.target.value) || 0)}
                      className="font-bold text-lg h-12 text-red-600 border-red-200"
                    />
                  </div>
                ) : null}
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMode === 'CASH' ? 'default' : 'outline'}
                    className={paymentMode === 'CASH' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    onClick={() => setPaymentMode('CASH')}
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === 'ONLINE' ? 'default' : 'outline'}
                    className={paymentMode === 'ONLINE' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                    onClick={() => setPaymentMode('ONLINE')}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Online
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === 'CHEQUE' ? 'default' : 'outline'}
                    className={paymentMode === 'CHEQUE' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    onClick={() => setPaymentMode('CHEQUE')}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Cheque
                  </Button>
                </div>
              </div>

              {/* Credit Type Selection - Only for CASH payments */}
              {paymentMode === 'CASH' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Credit Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={creditType === 'COMPANY' ? 'default' : 'outline'}
                      className={creditType === 'COMPANY' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                      onClick={() => setCreditType('COMPANY')}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Company Credit
                    </Button>
                    <Button
                      type="button"
                      variant={creditType === 'PERSONAL' ? 'default' : 'outline'}
                      className={creditType === 'PERSONAL' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                      onClick={() => setCreditType('PERSONAL')}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Personal Credit
                    </Button>
                  </div>
                </div>
              )}

              {/* Cheque Details */}
              {paymentMode === 'CHEQUE' && (
                <div className="space-y-2">
                  <Label>Cheque Number *</Label>
                  <Input
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="Enter cheque number"
                  />
                </div>
              )}

              {/* UTR for Online */}
              {['ONLINE', 'UPI', 'BANK_TRANSFER'].includes(paymentMode) && (
                <div className="space-y-2">
                  <Label>UTR / Transaction Reference *</Label>
                  <Input
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter UTR or reference number"
                  />
                </div>
              )}

              {/* Proof Upload */}
              {requiresProof && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Proof Document *
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  </Label>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label
                      htmlFor="proof-upload"
                      className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      {proofFile ? (
                        <div className="flex items-center gap-2">
                          {proofFile.type.startsWith('image/') ? (
                            <ImageIcon className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileCheck className="h-5 w-5 text-emerald-500" />
                          )}
                          <span className="text-sm font-medium">{proofFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={(e) => {
                              e.preventDefault();
                              setProofFile(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                          <span className="text-sm text-gray-500">Click to upload proof</span>
                          <p className="text-xs text-gray-400">Image or PDF</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                />
              </div>

              {/* Credit Info */}
              <div className={`${creditInfo.bgColor} p-3 rounded-lg`}>
                <div className="flex items-start gap-2">
                  <Info className={`h-4 w-4 mt-0.5 ${creditInfo.color}`} />
                  <div>
                    <p className={`text-sm font-medium ${creditInfo.color}`}>
                      {creditInfo.type}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {creditInfo.description}
                    </p>
                    <p className="text-sm font-bold mt-1">
                      Amount: {formatCurrency(payingAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setProofFile(null);
                    setChequeNumber('');
                    setUtrNumber('');
                    setRemarks('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={handlePayEmi}
                  disabled={paying}
                >
                  {paying ? 'Processing...' : 'Confirm & Collect'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
