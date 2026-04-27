'use client';

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle, XCircle, Eye, Wallet, User, Phone, Mail,
  MapPin, Calendar, FileText, Hash, Briefcase, Building2, Landmark,
  ChevronDown, ChevronUp, Loader2, FileImage, ExternalLink,
  Home, IndianRupee, Users2, AlertTriangle, Copy, RefreshCw,
  ArrowRightLeft, Banknote, CreditCard
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import EMISettingsButton from '@/components/shared/EMISettingsButton';

// Types
interface EMISchedule {
  id: string;
  emiNumber: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  outstandingPrincipal: number;
  status: string;
  paidAmount: number;
  paidDate: string | null;
  paymentMode: string | null;
  paymentRef: string | null;
  proofUrl: string | null;
  lateFee: number;
}

interface MirrorLoanInfo {
  id: string;
  applicationNo: string;
  companyId: string;
  company: { id: string; name: string; code: string };
  emiSchedules: EMISchedule[];
}

interface MirrorMapping {
  id: string;
  mirrorType: string;
  extraEMICount: number;
  leftoverAmount: number;
  mirrorInterestRate: number;
  mirrorTenure: number;
  originalTenure: number;
  originalEMIAmount: number;
  mirrorEMIAmount: number;
}

interface LoanDetails {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  createdAt: string;
  companyId?: string;
  company?: { id: string; name: string; code: string; interestType?: string };
  customer?: { id: string; name: string; email: string; phone: string };
  sessionForm?: {
    approvedAmount: number;
    interestRate: number;
    interestType: string;
    tenure: number;
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
  };
  emiSchedules?: EMISchedule[];
  // Customer details
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
}

interface SecondaryPaymentPage {
  id: string;
  name: string;
  description?: string;
  upiId?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ifscCode?: string;
  roleType?: string;
}

interface Props {
  loanId: string;
  onClose: () => void;
  onRefresh: () => void;
  userId: string;
  userRole: string;
}

const formatCurrencyLocal = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    PENDING: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
    PAID: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Paid' },
    OVERDUE: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Overdue' },
    PARTIALLY_PAID: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Partial' },
    INTEREST_ONLY_PAID: { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Interest Paid' },
    WAIVED: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Waived' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

function ActiveLoanDetailView({ loanId, onClose, onRefresh, userId, userRole }: Props) {
  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [originalEMIs, setOriginalEMIs] = useState<EMISchedule[]>([]);
  const [mirrorLoans, setMirrorLoans] = useState<MirrorLoanInfo[]>([]);
  const [mirrorMappings, setMirrorMappings] = useState<MirrorMapping[]>([]);
  const [secondaryPaymentPages, setSecondaryPaymentPages] = useState<SecondaryPaymentPage[]>([]);

  // EMI Payment states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedEMI, setSelectedEMI] = useState<EMISchedule | null>(null);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paying, setPaying] = useState(false);
  const [creditType, setCreditType] = useState<'PERSONAL' | 'COMPANY'>('COMPANY');
  const [personalCredit, setPersonalCredit] = useState(0);
  const [companyCredit, setCompanyCredit] = useState(0);

  // Extra EMI Dialog states
  const [showExtraEMIDialog, setShowExtraEMIDialog] = useState(false);
  const [extraEMIs, setExtraEMIs] = useState<EMISchedule[]>([]);
  const [selectedSecondaryPage, setSelectedSecondaryPage] = useState<string>('');
  const [processingExtraEMI, setProcessingExtraEMI] = useState(false);

  useEffect(() => {
    fetchLoanDetails();
    fetchSecondaryPaymentPages();
    fetchUserCredit();
  }, [loanId]);

  const fetchUserCredit = async () => {
    try {
      const response = await fetch(`/api/user/credit?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setPersonalCredit(data.personalCredit || 0);
        setCompanyCredit(data.companyCredit || 0);
      }
    } catch (error) {
      console.error('Error fetching user credit:', error);
    }
  };

  const fetchLoanDetails = async (minimal = false) => {
    setLoading(!minimal);
    try {
      // Use minimal mode for quick refresh after payment
      const response = await fetch(`/api/loan/details?loanId=${loanId}${minimal ? '&minimal=true' : ''}`);
      const data = await response.json();

      if (data.success && data.loan) {
        setLoanDetails(data.loan);

        // Transform EMI schedules
        if (data.loan.emiSchedules) {
          const transformed = data.loan.emiSchedules.map((s: any) => ({
            id: s.id,
            emiNumber: s.installmentNumber,
            dueDate: s.dueDate,
            emiAmount: s.totalAmount,
            principalAmount: s.principalAmount,
            interestAmount: s.interestAmount,
            outstandingPrincipal: s.outstandingPrincipal,
            status: s.paymentStatus,
            paidAmount: s.paidAmount || 0,
            paidDate: s.paidDate,
            paymentMode: s.paymentMode,
            paymentRef: s.paymentReference,
            proofUrl: s.proofUrl,
            lateFee: s.penaltyAmount || 0,
          }));
          setOriginalEMIs(transformed);
        }
      }

      // Only fetch mirror loan info on initial load (not minimal refresh)
      if (!minimal) {
        // Fetch mirror loan info
        const mirrorResponse = await fetch(`/api/mirror-loan?loanId=${loanId}`);
        const mirrorData = await mirrorResponse.json();

        if (mirrorData.success) {
          // If this loan has mirror loans
          if (mirrorData.mirrorLoans && mirrorData.mirrorLoans.length > 0) {
            setMirrorMappings(mirrorData.mirrorLoans.map((m: any) => ({
              id: m.id,
              mirrorType: m.mirrorType,
              extraEMICount: m.extraEMICount || 0,
              leftoverAmount: m.leftoverAmount || 0,
              mirrorInterestRate: m.mirrorInterestRate,
              mirrorTenure: m.mirrorTenure,
              originalTenure: m.originalTenure,
              originalEMIAmount: m.originalEMIAmount,
              mirrorEMIAmount: m.mirrorEMIAmount,
            })));

            // Fetch mirror loan EMI schedules
            const mirrorLoanDetails = await Promise.all(
              mirrorData.mirrorLoans.map(async (m: any) => {
                const res = await fetch(`/api/loan/details?loanId=${m.loanApplication.id}&minimal=true`);
                const d = await res.json();
                return {
                  id: m.loanApplication.id,
                  applicationNo: m.loanApplication.applicationNo,
                  companyId: m.loanApplication.companyId,
                  company: m.loanApplication.company,
                  emiSchedules: d.loan?.emiSchedules?.map((s: any) => ({
                    id: s.id,
                    emiNumber: s.installmentNumber,
                    dueDate: s.dueDate,
                    emiAmount: s.totalAmount,
                    principalAmount: s.principalAmount,
                    interestAmount: s.interestAmount,
                    outstandingPrincipal: s.outstandingPrincipal,
                    status: s.paymentStatus,
                    paidAmount: s.paidAmount || 0,
                    paidDate: s.paidDate,
                    paymentMode: s.paymentMode,
                    paymentRef: s.paymentReference,
                    proofUrl: s.proofUrl,
                    lateFee: s.penaltyAmount || 0,
                  })) || [],
                };
              })
            );
            setMirrorLoans(mirrorLoanDetails);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      toast.error('Failed to fetch loan details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecondaryPaymentPages = async () => {
    try {
      const response = await fetch('/api/secondary-payment-pages');
      const data = await response.json();
      if (data.success) {
        setSecondaryPaymentPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching secondary payment pages:', error);
    }
  };

  // Calculate extra EMIs
  const getExtraEMIs = () => {
    if (mirrorMappings.length === 0) return [];

    const mapping = mirrorMappings[0];
    if (mapping.extraEMICount === 0) return [];

    // Extra EMIs are the last N EMIs of original loan
    const totalOriginalEMIs = originalEMIs.length;
    const mirrorEMICount = totalOriginalEMIs - mapping.extraEMICount;

    return originalEMIs.filter(emi => emi.emiNumber > mirrorEMICount);
  };

  const isExtraEMI = (emiNumber: number) => {
    const extras = getExtraEMIs();
    return extras.some(e => e.emiNumber === emiNumber);
  };

  // Check if loan has mirror
  const hasMirrorLoan = mirrorLoans.length > 0;
  const mirrorCompany = mirrorLoans[0]?.company || null;

  // Handle EMI payment
  const handlePayEMI = (emi: EMISchedule) => {
    // Check if this is an extra EMI
    if (isExtraEMI(emi.emiNumber)) {
      setExtraEMIs([emi]);
      setShowExtraEMIDialog(true);
      return;
    }

    setSelectedEMI(emi);
    setPaymentMode('CASH');
    setPaymentRef('');
    setPaymentRemarks('');
    setCreditType('COMPANY');
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (!selectedEMI || !loanDetails) return;

    setPaying(true);
    try {
      // ── Route through POST /api/emi/pay (FormData) — same route as LoanDetailPanel ──
      // The old PUT /api/emi has no PRINCIPAL_ONLY journal, no mirror sync → causes silent failures.
      const formData = new FormData();
      formData.append('emiId', selectedEMI.id);
      formData.append('loanId', loanDetails.id);
      formData.append('amount', String(selectedEMI.emiAmount + (selectedEMI.lateFee || 0)));
      formData.append('paymentMode', paymentMode);
      formData.append('paymentType', 'FULL_EMI');
      formData.append('paidBy', userId);
      formData.append('remarks', paymentRemarks || '');
      formData.append('creditType', creditType);
      formData.append('isAdvancePayment', 'false');

      const response = await fetch('/api/emi/pay', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`EMI #${selectedEMI.emiNumber} paid successfully`);
        setShowPaymentDialog(false);
        fetchLoanDetails(true);
        onRefresh();
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };


  // Handle extra EMI payment — secondary page is OPTIONAL (only used if pages are configured)
  const handleExtraEMIPayment = async () => {
    // No mandatory secondary page check — if no pages configured, proceed without one
    setProcessingExtraEMI(true);
    try {
      // Process each extra EMI
      for (const emi of extraEMIs) {
        const response = await fetch('/api/emi', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emiId: emi.id,
            loanId: loanDetails?.id,
            paidAmount: emi.emiAmount + (emi.lateFee || 0),
            paymentMode: 'EXTRA_EMI',
            paymentRef: selectedSecondaryPage ? `Secondary Page: ${selectedSecondaryPage}` : 'Direct Collection',
            remarks: selectedSecondaryPage ? `Extra EMI paid via secondary payment page` : `Extra EMI direct collection`,
            userId,
            // Only pass secondaryPaymentPageId if one was selected
            ...(selectedSecondaryPage ? { secondaryPaymentPageId: selectedSecondaryPage } : {}),
            syncMirror: false, // Don't sync - these are extra EMIs
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to pay EMI #${emi.emiNumber}`);
        }
      }

      toast.success(`${extraEMIs.length} Extra EMI(s) paid successfully`);
      setShowExtraEMIDialog(false);
      // Use minimal refresh for fast update
      fetchLoanDetails(true);
      onRefresh();
    } catch (error) {
      console.error('Error processing extra EMI:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process extra EMI');
    } finally {
      setProcessingExtraEMI(false);
    }
  };

  // EMI Card Component
  const EMICard = ({ emi, isMirror = false, mirrorCompany = null }: { emi: EMISchedule; isMirror?: boolean; mirrorCompany?: any }) => {
    const extra = isExtraEMI(emi.emiNumber);

    return (
      <motion.div
        className={`p-4 border rounded-xl transition-all ${
          emi.status === 'PAID' ? 'bg-green-50 border-green-200' :
          emi.status === 'OVERDUE' ? 'bg-red-50 border-red-200' :
          emi.status === 'PARTIALLY_PAID' ? 'bg-orange-50 border-orange-200' :
          emi.status === 'INTEREST_ONLY_PAID' ? 'bg-purple-50 border-purple-200' :
          extra ? 'bg-purple-50 border-purple-300' :
          'bg-white border-gray-100'
        }`}
        whileHover={{ scale: isMirror ? 1 : 1.01 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              emi.status === 'PAID' ? 'bg-green-200' :
              emi.status === 'OVERDUE' ? 'bg-red-200' :
              emi.status === 'PARTIALLY_PAID' ? 'bg-orange-200' :
              emi.status === 'INTEREST_ONLY_PAID' ? 'bg-purple-200' :
              extra ? 'bg-purple-200' :
              'bg-gray-100'
            }`}>
              {emi.status === 'PAID' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <span className="font-semibold text-sm">{emi.emiNumber}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">EMI #{emi.emiNumber}</p>
                {getStatusBadge(emi.status)}
                {extra && (
                  <Badge className="bg-purple-500 text-white">Extra EMI</Badge>
                )}
                {isMirror && (
                  <Badge className="bg-blue-500 text-white text-xs">
                    <ArrowRightLeft className="h-3 w-3 mr-1" /> Auto-Synced
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">Due: {formatDate(emi.dueDate)}</p>
              {emi.lateFee > 0 && (
                <p className="text-xs text-red-600">Late Fee: {formatCurrencyLocal(emi.lateFee)}</p>
              )}
              {emi.status === 'PAID' && (
                <p className="text-xs text-green-600">Paid: {formatDate(emi.paidDate!)} via {emi.paymentMode}</p>
              )}
              {emi.status === 'INTEREST_ONLY_PAID' && (
                <p className="text-xs text-purple-600">
                  ✓ Interest paid. New EMI created for Principal + Interest.
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{formatCurrencyLocal(emi.emiAmount)}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Principal: {formatCurrencyLocal(emi.principalAmount)}</p>
              <p>Interest: {formatCurrencyLocal(emi.interestAmount)}</p>
            </div>
            {emi.status === 'PAID' && emi.paidAmount && (
              <p className="text-xs text-green-600 font-medium mt-1">
                ✓ Paid: {formatCurrencyLocal(emi.paidAmount)}
              </p>
            )}
            {!isMirror && emi.status !== 'PAID' && emi.status !== 'INTEREST_ONLY_PAID' && (
              <div className="flex gap-2 mt-2 justify-end">
                {loanDetails?.companyId && (
                  <EMISettingsButton
                    emiScheduleId={emi.id}
                    loanApplicationId={loanDetails.id}
                    companyId={loanDetails.companyId}
                    userId={userId}
                  />
                )}
                <Button
                  size="sm"
                  className={` ${extra ? 'bg-purple-500 hover:bg-purple-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                  onClick={() => handlePayEMI(emi)}
                >
                  <IndianRupee className="h-4 w-4 mr-1" />
                  {extra ? 'Pay Extra' : 'Pay'}
                </Button>
              </div>
            )}
            {isMirror && emi.status !== 'PAID' && emi.status !== 'INTEREST_ONLY_PAID' && (
              <div className="text-xs text-blue-600 mt-2">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                Will auto-sync when original is paid
              </div>
            )}
            {isMirror && emi.status === 'INTEREST_ONLY_PAID' && (
              <div className="text-xs text-purple-600 mt-2">
                ✓ Interest synced from original loan
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-gray-600">Loading loan details...</p>
        </div>
      </div>
    );
  }

  if (!loanDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-gray-600">Loan not found</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  const totalExtraEMIs = getExtraEMIs();
  const paidOriginalEMIs = originalEMIs.filter(e => e.status === 'PAID').length;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{loanDetails.applicationNo}</h2>
                <p className="text-emerald-100">
                  {loanDetails.customer?.name} • {loanDetails.company?.name || 'Company 3 (Cash)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-white/20 text-white text-sm px-3 py-1">
                {loanDetails.status}
              </Badge>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-100">Loan Amount</p>
              <p className="text-lg font-bold">{formatCurrencyLocal(loanDetails.sessionForm?.approvedAmount || loanDetails.requestedAmount)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-100">EMI</p>
              <p className="text-lg font-bold">{formatCurrencyLocal(loanDetails.sessionForm?.emiAmount || 0)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-100">Tenure</p>
              <p className="text-lg font-bold">{loanDetails.sessionForm?.tenure} mo</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-100">Progress</p>
              <p className="text-lg font-bold">{paidOriginalEMIs}/{originalEMIs.length}</p>
            </div>
          </div>
        </div>

        {/* Extra EMI Alert */}
        {totalExtraEMIs.length > 0 && (
          <div className="bg-purple-50 border-b border-purple-200 p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="font-semibold text-purple-800">
                  This loan has {totalExtraEMIs.length} Extra EMI(s) beyond mirror loan
                </p>
                <p className="text-sm text-purple-600">
                  Extra EMIs require secondary payment page for accounting
                </p>
              </div>
              <Button
                className="bg-purple-500 hover:bg-purple-600"
                onClick={() => {
                  setExtraEMIs(totalExtraEMIs.filter(e => e.status !== 'PAID'));
                  setShowExtraEMIDialog(true);
                }}
              >
                Pay Extra EMIs
              </Button>
            </div>
          </div>
        )}

        {/* Content - Dual EMI Lists */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original EMI List */}
              <div>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="bg-emerald-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-emerald-800">
                      <Wallet className="h-5 w-5" />
                      Original Loan EMIs
                    </CardTitle>
                    <CardDescription>
                      {loanDetails.company?.name || 'Company 3'} • {loanDetails.sessionForm?.interestType || 'FLAT'} Rate
                      {loanDetails.company?.interestType === 'FLAT' || !loanDetails.company?.interestType ? (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Cash Mode</span>
                      ) : null}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {originalEMIs.map((emi) => (
                        <EMICard key={emi.id} emi={emi} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mirror EMI Lists */}
              <div className="space-y-6">
                {mirrorLoans.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-gray-600">
                        <ArrowRightLeft className="h-5 w-5" />
                        Mirror Loans
                      </CardTitle>
                      <CardDescription>
                        No mirror loans configured for this loan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 text-center text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Mirror loans will appear here when configured</p>
                    </CardContent>
                  </Card>
                ) : (
                  mirrorLoans.map((mirrorLoan, idx) => (
                    <Card key={mirrorLoan.id} className="border-0 shadow-sm">
                      <CardHeader className="bg-blue-50 border-b">
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                          <Building2 className="h-5 w-5" />
                          Mirror Loan - {mirrorLoan.company?.name}
                        </CardTitle>
                        <CardDescription>
                          {mirrorMappings[idx]?.mirrorType === 'COMPANY_1_15_PERCENT' ? '15% REDUCING' : 'Same Rate REDUCING'}
                          • {mirrorLoan.emiSchedules.length} EMIs
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Read Only</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {mirrorLoan.emiSchedules.map((emi) => (
                            <EMICard key={emi.id} emi={emi} isMirror mirrorCompany={mirrorLoan.company} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* EMI Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Pay EMI #{selectedEMI?.emiNumber}
            </DialogTitle>
            <DialogDescription>
              Amount: {selectedEMI && formatCurrencyLocal(selectedEMI.emiAmount + (selectedEMI.lateFee || 0))}
              {selectedEMI?.lateFee && selectedEMI.lateFee > 0 && (
                <span className="text-red-600 ml-2">(includes {formatCurrencyLocal(selectedEMI.lateFee)} late fee)</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Mirror Loan Payment Info Banner */}
            {hasMirrorLoan && mirrorCompany && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Mirror Loan Payment</span>
                </div>
                <p className="text-sm text-blue-700">
                  This loan is mirrored to <strong>{mirrorCompany.name}</strong>.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Payment will be recorded in: {mirrorCompany.name}&apos;s Bank/Cashbook</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Original loan ({loanDetails?.company?.name || 'Company 3'}) is for record-keeping only.
                </p>
              </div>
            )}

            {/* Credit Type Selection */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
              <Label className="text-slate-800 font-semibold mb-3 block">
                <Wallet className="h-4 w-4 inline mr-2" />
                Credit Type *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Personal Credit Option */}
                <button
                  type="button"
                  onClick={() => {
                    setCreditType('PERSONAL');
                    setPaymentMode('CASH');
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    creditType === 'PERSONAL'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className={`h-5 w-5 ${creditType === 'PERSONAL' ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold ${creditType === 'PERSONAL' ? 'text-amber-800' : 'text-gray-600'}`}>
                      Personal Credit
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Banknote className="h-3 w-3" />
                      <span>CASH only</span>
                    </div>
                    <div className="text-gray-500">
                      Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name} Cashbook` : 'Company 3 Cashbook'}
                    </div>
                    <div className="font-medium text-amber-700">
                      Current: ₹{formatCurrencyLocal(personalCredit)}
                    </div>
                  </div>
                </button>

                {/* Company Credit Option */}
                <button
                  type="button"
                  onClick={() => {
                    setCreditType('COMPANY');
                    setPaymentMode('CASH');
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    creditType === 'COMPANY'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className={`h-5 w-5 ${creditType === 'COMPANY' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold ${creditType === 'COMPANY' ? 'text-blue-800' : 'text-gray-600'}`}>
                      Company Credit
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Landmark className="h-3 w-3" />
                      <span>ONLINE or CASH</span>
                    </div>
                    <div className="text-gray-500">
                      Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name}'s Books` : "Loan Company's Books"}
                    </div>
                    <div className="font-medium text-blue-700">
                      Current: ₹{formatCurrencyLocal(companyCredit)}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Mode - Based on Credit Type */}
            {creditType === 'PERSONAL' && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-amber-800 font-semibold">Payment Mode</Label>
                    <p className="text-xs text-amber-600 mt-1">
                      Personal Credit only supports CASH payment
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-lg border border-amber-300">
                    <Banknote className="h-5 w-5 text-amber-700" />
                    <span className="font-semibold text-amber-800">CASH</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <strong>Entry will be recorded in:</strong> {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name} Cashbook` : 'Company 3 Cashbook'}
                  </p>
                </div>
              </div>
            )}

            {creditType === 'COMPANY' && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-blue-800 font-semibold mb-3 block">Payment Mode *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* ONLINE Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('ONLINE')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      paymentMode === 'ONLINE'
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className={`h-4 w-4 ${paymentMode === 'ONLINE' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${paymentMode === 'ONLINE' ? 'text-blue-800' : 'text-gray-600'}`}>
                        ONLINE
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name}'s Bank` : "Loan Company's Bank"}
                    </p>
                  </button>

                  {/* CASH Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      paymentMode === 'CASH'
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className={`h-4 w-4 ${paymentMode === 'CASH' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${paymentMode === 'CASH' ? 'text-blue-800' : 'text-gray-600'}`}>
                        CASH
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name}'s Cashbook` : "Loan Company's Cashbook"}
                    </p>
                  </button>
                </div>
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Entry will be recorded in:</strong>{' '}
                    {hasMirrorLoan && mirrorCompany
                      ? (paymentMode === 'ONLINE'
                        ? `${mirrorCompany.name}'s Bank Account`
                        : `${mirrorCompany.name}'s Cashbook`)
                      : (paymentMode === 'ONLINE'
                        ? "Loan Company's Bank Account"
                        : "Loan Company's Cashbook")}
                  </p>
                </div>
              </div>
            )}

            {/* Reference Number - Only for ONLINE payment */}
            {paymentMode === 'ONLINE' && (
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Enter transaction reference / UTR number"
                  className="bg-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                placeholder="Add any remarks..."
                rows={2}
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={processPayment} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extra EMI Payment Dialog */}
      <Dialog open={showExtraEMIDialog} onOpenChange={setShowExtraEMIDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <AlertTriangle className="h-5 w-5" />
              Pay Extra EMIs
            </DialogTitle>
            <DialogDescription>
              These EMIs are beyond the mirror loan tenure and are pure profit.
              {secondaryPaymentPages.length > 0
                ? ' Optionally select a secondary payment page for accounting.'
                : ' Payment will be recorded as direct collection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Extra EMI List */}
            <div className="space-y-2">
              <Label>Extra EMIs to Pay</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
                {extraEMIs.filter(e => e.status !== 'PAID').map((emi) => (
                  <div key={emi.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <span className="font-medium">EMI #{emi.emiNumber}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatDate(emi.dueDate)}</span>
                    </div>
                    <span className="font-bold text-purple-700">{formatCurrencyLocal(emi.emiAmount)}</span>
                  </div>
                ))}
                {extraEMIs.filter(e => e.status !== 'PAID').length === 0 && (
                  <p className="text-center text-gray-500 py-2">All extra EMIs are paid</p>
                )}
              </div>
              <p className="text-sm font-medium text-purple-700">
                Total: {formatCurrencyLocal(extraEMIs.filter(e => e.status !== 'PAID').reduce((sum, e) => sum + e.emiAmount, 0))}
              </p>
            </div>

            {/* Secondary Payment Page Selection — only shown if pages are configured */}
            {secondaryPaymentPages.length > 0 && (
              <div className="space-y-2">
                <Label>Secondary Payment Page <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Select value={selectedSecondaryPage} onValueChange={setSelectedSecondaryPage}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a payment page (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {secondaryPaymentPages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {page.name}
                          {page.bankName && <span className="text-xs text-gray-500">({page.bankName})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSecondaryPage ? (
                  <p className="text-xs text-gray-500">
                    Payment will be recorded via this secondary page for separate accounting.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    If not selected, payment will be recorded as direct collection.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtraEMIDialog(false)}>Cancel</Button>
            <Button
              className="bg-purple-500 hover:bg-purple-600"
              onClick={handleExtraEMIPayment}
              disabled={processingExtraEMI || extraEMIs.filter(e => e.status !== 'PAID').length === 0}
            >
              {processingExtraEMI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Pay {extraEMIs.filter(e => e.status !== 'PAID').length} Extra EMI(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(ActiveLoanDetailView);
