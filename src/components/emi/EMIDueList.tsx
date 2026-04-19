'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from '@/components/ui/card';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calendar, IndianRupee, Clock, AlertTriangle, CheckCircle,
  Phone, MapPin, User, Wallet, CreditCard, Banknote, Receipt,
  Upload, FileCheck, Building2, Info, X, ImageIcon,
  ChevronDown, ChevronUp, Bell, AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/utils/helpers';

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

interface EMIDueListProps {
  userId: string;
  userRole: string;
  onPaymentComplete?: () => void;
}

export default function EMIDueList({ userId, userRole, onPaymentComplete }: EMIDueListProps) {
  const [loading, setLoading] = useState(true);
  const [todayEmis, setTodayEmis] = useState<{ online: EMIItem[]; offline: EMIItem[] }>({ online: [], offline: [] });
  const [tomorrowEmis, setTomorrowEmis] = useState<{ online: EMIItem[]; offline: EMIItem[] }>({ online: [], offline: [] });
  const [overdueEmis, setOverdueEmis] = useState<{ online: EMIItem[]; offline: EMIItem[] }>({ online: [], offline: [] });
  
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
  const [penaltyPaymentMode, setPenaltyPaymentMode] = useState<'CASH' | 'BANK'>('CASH');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitOnlineAmount, setSplitOnlineAmount] = useState<number>(0);
  const [nextPaymentDate, setNextPaymentDate] = useState<string>('');
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<string[]>(['today', 'tomorrow', 'overdue']);

  // Role-based permissions
  const canWaivePenalty = userRole === 'SUPER_ADMIN' || userRole === 'CASHIER';

  useEffect(() => {
    fetchDueEmis();
  }, [userId, userRole]);

  const fetchDueEmis = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTodayEmis(data.todayEmis || { online: [], offline: [] });
          setTomorrowEmis(data.tomorrowEmis || { online: [], offline: [] });
          setOverdueEmis(data.overdueEmis || { online: [], offline: [] });
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
      setPaymentDialogOpen(false);
      setProofFile(null);
      setChequeNumber('');
      setUtrNumber('');
      setRemarks('');
      setCreditType('COMPANY');
      setPaymentMode('CASH');
      setPenaltyWaiver(0);
      setPenaltyPaymentMode('CASH');
      setSplitCashAmount(0);
      setSplitOnlineAmount(0);
      setPayingAmount(0);
      setNextPaymentDate('');
      
      fetchDueEmis();
      onPaymentComplete?.();
      
      toast({
        title: 'Payment Collected',
        description: 'EMI collected successfully.',
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

      if (selectedType === 'offline') {
        const res = await fetch('/api/offline-loan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'pay-emi',
            emiId: selectedEmi.id,
            userId,
            userRole,
            creditType,
            paymentMode,
            paymentType: payingAmount < selectedEmi.totalAmount ? 'PARTIAL' : 'FULL',
            amount: payingAmount,
            penaltyWaiver: canWaivePenalty ? penaltyWaiver : 0
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
          const partialNextDate = nextPaymentDate
            ? new Date(nextPaymentDate).toISOString()
            : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString(); })();
          formData.append('nextPaymentDate', partialNextDate);
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
        if (selectedEmi.penaltyAmount && selectedEmi.penaltyAmount > 0) {
          formData.append('penaltyAmount', selectedEmi.penaltyAmount.toString());
          formData.append('penaltyPaymentMode', paymentMode === 'SPLIT' ? 'CASH' : penaltyPaymentMode);
        }
        if (paymentMode === 'SPLIT') {
          formData.append('splitCashAmount', splitCashAmount.toString());
          formData.append('splitOnlineAmount', splitOnlineAmount.toString());
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

  const openPaymentDialog = (emi: EMIItem, type: 'online' | 'offline') => {
    setSelectedEmi(emi);
    setSelectedType(type);
    const balanceDue = (emi.totalAmount + (emi.penaltyAmount || 0)) - (emi.paidAmount || 0);
    setPayingAmount(balanceDue > 0 ? balanceDue : 0);
    setPenaltyWaiver(0);
    setPenaltyPaymentMode('CASH');
    setSplitCashAmount(0);
    setSplitOnlineAmount(0);
    setNextPaymentDate('');
    setPaymentDialogOpen(true);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderEmiItem = (emi: EMIItem, type: 'online' | 'offline') => {
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

    return (
      <motion.div
        key={emi.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        onClick={() => openPaymentDialog(emi, type)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={type === 'offline' ? 'secondary' : 'outline'} className="text-xs">
                {type === 'offline' ? 'Offline' : 'Online'}
              </Badge>
              <span className="text-xs text-gray-500">EMI #{emi.installmentNumber}</span>
            </div>
            <p className="font-medium text-gray-900 truncate">{customerName}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                <span className="truncate">{loanNumber}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{phone}</span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-gray-900">{formatCurrency(emi.totalAmount)}</p>
            {emi.penaltyAmount ? (
              <p className="text-xs text-red-500 font-medium">+ {formatCurrency(emi.penaltyAmount)} Penalty</p>
            ) : null}
            <p className="text-xs text-gray-500">{formatDate(emi.dueDate)}</p>
            <Button
              size="sm"
              className="mt-2 bg-emerald-500 hover:bg-emerald-600 h-7"
              onClick={(e) => {
                e.stopPropagation();
                openPaymentDialog(emi, type);
              }}
            >
              <IndianRupee className="h-3 w-3 mr-1" />
              Pay
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    emis: { online: EMIItem[]; offline: EMIItem[] },
    sectionKey: string,
    bgColor: string,
    borderColor: string,
    iconColor: string
  ) => {
    const totalCount = emis.online.length + emis.offline.length;
    const totalAmount = [...emis.online, ...emis.offline].reduce((sum, e) => sum + e.totalAmount, 0);
    const isExpanded = expandedSections.includes(sectionKey);

    if (totalCount === 0) return null;

    return (
      <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full px-4 py-3 flex items-center justify-between ${bgColor} hover:opacity-90 transition-opacity`}
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-gray-800">{title}</span>
            <Badge className="bg-white/80 text-gray-700">{totalCount} EMIs</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-800">{formatCurrency(totalAmount)}</span>
            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </div>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3 bg-gray-50 space-y-2 max-h-[400px] overflow-y-auto">
                {emis.offline.map(emi => renderEmiItem(emi, 'offline'))}
                {emis.online.map(emi => renderEmiItem(emi, 'online'))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const creditInfo = paymentMode === 'CASH' && creditType === 'COMPANY'
    ? { type: 'Company Credit', color: 'text-emerald-600', bgColor: 'bg-emerald-50', description: 'This CASH payment will increase your company credit.' }
    : { type: 'Personal Credit', color: 'text-amber-600', bgColor: 'bg-amber-50', description: 'This transaction will increase your personal credit.' };

  const requiresProof = paymentMode !== 'CASH' || creditType === 'PERSONAL';

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              EMI Due List
            </CardTitle>
            <Badge className="bg-white/20 text-white">
              {todayEmis.online.length + todayEmis.offline.length + 
               tomorrowEmis.online.length + tomorrowEmis.offline.length + 
               overdueEmis.online.length + overdueEmis.offline.length} Total
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overdue Section - First Priority */}
              {renderSection(
                'Overdue EMIs',
                <AlertTriangle className="h-5 w-5 text-red-600" />,
                overdueEmis,
                'overdue',
                'bg-red-50',
                'border-red-200',
                'text-red-600'
              )}
              
              {/* Today Section - Second Priority */}
              {renderSection(
                'Today\'s Due EMIs',
                <Clock className="h-5 w-5 text-orange-600" />,
                todayEmis,
                'today',
                'bg-orange-50',
                'border-orange-200',
                'text-orange-600'
              )}
              
              {/* Tomorrow Section - Third Priority */}
              {renderSection(
                'Tomorrow\'s Due EMIs',
                <Calendar className="h-5 w-5 text-yellow-600" />,
                tomorrowEmis,
                'tomorrow',
                'bg-yellow-50',
                'border-yellow-200',
                'text-yellow-600'
              )}

              {/* Empty State */}
              {(todayEmis.online.length + todayEmis.offline.length + 
                tomorrowEmis.online.length + tomorrowEmis.offline.length + 
                overdueEmis.online.length + overdueEmis.offline.length) === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No EMIs due</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                {selectedEmi.penaltyAmount && canWaivePenalty ? (
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
                <div className="grid grid-cols-4 gap-2">
                  {['CASH', 'ONLINE', 'CHEQUE', 'SPLIT'].map(mode => (
                    <Button
                      key={mode}
                      type="button"
                      variant={paymentMode === mode ? 'default' : 'outline'}
                      className={paymentMode === mode ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                      onClick={() => setPaymentMode(mode)}
                    >
                      {mode === 'CASH' && <Banknote className="h-4 w-4 mr-1" />}
                      {mode === 'ONLINE' && <CreditCard className="h-4 w-4 mr-1" />}
                      {mode === 'CHEQUE' && <Receipt className="h-4 w-4 mr-1" />}
                      {mode === 'SPLIT' && <Wallet className="h-4 w-4 mr-1" />}
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </Button>
                  ))}
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

              {/* Proof Upload */}
              {requiresProof && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Proof Document *
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  </Label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={handlePayEmi}
                  disabled={paying}
                >
                  {paying ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Collect ₹{payingAmount.toFixed(0)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
