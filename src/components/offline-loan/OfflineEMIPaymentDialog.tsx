'use client';

import { memo, useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  IndianRupee, CheckCircle, Receipt, Percent,
  User, Building, Wallet, AlertCircle, Loader2,
  Banknote, Landmark, AlertTriangle, SplitSquareHorizontal,
  Upload, X, FileText, ImageIcon, Zap, Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EMI {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  outstandingPrincipal: number;
  paidAmount: number;
  paidPrincipal: number;
  paidInterest: number;
  paymentStatus: string;
  lateFee?: number;
  loanAmount?: number; // For penalty calculation
}

interface OfflineEMIPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Single EMI mode
  selectedEMI?: EMI | null;
  // Multi-EMI mode
  selectedEMIs?: EMI[];
  loanId: string;
  userId: string;
  userRole: string;
  personalCredit: number;
  companyCredit: number;
  onPaymentSuccess: () => void;
  isInterestOnlyLoan?: boolean;
  interestOnlyAmount?: number;
  // Loan-level info for advance detection
  mirrorTenure?: number | null;
  isMirrored?: boolean;
  loanCompanyName?: string;
  mirrorCompanyName?: string;
  loanAmount?: number; // For penalty calculation
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

function isAdvancePayment(emi: EMI): boolean {
  const now = new Date();
  const due = new Date(emi.dueDate);
  return (
    now.getFullYear() < due.getFullYear() ||
    (now.getFullYear() === due.getFullYear() && now.getMonth() < due.getMonth())
  );
}

/**
 * Calculate penalty info based on loan amount
 * Formula: loan_amount / 1000 = penalty per day (N lakh = N*100/day)
 */
function calculatePenaltyInfo(dueDate: string, loanAmount: number): { daysOverdue: number; calculatedPenalty: number; ratePerDay: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / msPerDay));
  const ratePerDay = Math.round(loanAmount / 1000);
  const calculatedPenalty = daysOverdue * ratePerDay;
  
  return { daysOverdue, calculatedPenalty, ratePerDay };
}

/**
 * Check if EMI is overdue (due date has passed)
 */
function isEMIOverdue(emi: EMI): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(emi.dueDate);
  due.setHours(0, 0, 0, 0);
  return today > due || emi.paymentStatus === 'OVERDUE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const OfflineEMIPaymentDialog = memo(function OfflineEMIPaymentDialog({
  open,
  onOpenChange,
  selectedEMI,
  selectedEMIs,
  loanId,
  userId,
  userRole,
  personalCredit,
  companyCredit,
  onPaymentSuccess,
  isInterestOnlyLoan = false,
  interestOnlyAmount = 0,
  mirrorTenure,
  isMirrored,
  loanCompanyName = 'Loan Company',
  mirrorCompanyName = 'Mirror Company',
  loanAmount: propLoanAmount,
}: OfflineEMIPaymentDialogProps) {

  // ── Determine if bulk/multi mode ───────────────────────────────────────────
  const isMultiMode = !!(selectedEMIs && selectedEMIs.length > 1);
  const emis: EMI[] = isMultiMode ? selectedEMIs! : selectedEMI ? [selectedEMI] : [];
  const emi = emis[0] ?? null; // primary/reference EMI

  // ── Amounts ────────────────────────────────────────────────────────────────
  const computeAmounts = () => {
    if (isInterestOnlyLoan) {
      return {
        totalAmount: interestOnlyAmount,
        alreadyPaid: 0,
        remaining: interestOnlyAmount,
        remainingPrincipal: 0,
        remainingInterest: interestOnlyAmount,
      };
    }
    if (isMultiMode) {
      let total = 0;
      for (const e of emis) {
        // BUG-8 fix: use remaining amounts, not full amounts (accounts for partial payments)
        const remPrincipal = e.principalAmount - (e.paidPrincipal || 0);
        const remTotal     = e.totalAmount     - (e.paidAmount    || 0);
        total += isAdvancePayment(e) ? remPrincipal : remTotal;
      }
      return { totalAmount: total, alreadyPaid: 0, remaining: total, remainingPrincipal: total, remainingInterest: 0 };
    }
    const totalAmt = emi?.totalAmount ?? 0;
    const paid = emi?.paidAmount ?? 0;
    return {
      totalAmount: totalAmt,
      alreadyPaid: paid,
      remaining: totalAmt - paid,
      remainingPrincipal: (emi?.principalAmount ?? 0) - (emi?.paidPrincipal ?? 0),
      remainingInterest: (emi?.interestAmount ?? 0) - (emi?.paidInterest ?? 0),
    };
  };
  const { totalAmount, alreadyPaid, remaining, remainingPrincipal, remainingInterest } = computeAmounts();

  // ── Advance detection ──────────────────────────────────────────────────────
  // RULE: Single EMI = always pay full amount (NO advance logic)
  //       Multi-EMI (Select All) = check each EMI and apply advance logic for future
  // So we NEVER apply advance logic for single EMI payments
  const isAdvance = false; // Always false for single EMI - pay full amount

  // ── State ──────────────────────────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'PRINCIPAL_ONLY'>('FULL');
  const [amount, setAmount] = useState(0);

  // Payment mode: ONLINE | CASH | SPLIT
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'SPLIT'>('CASH');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitOnlineAmount, setSplitOnlineAmount] = useState('');

  const [creditType, setCreditType] = useState<'PERSONAL' | 'COMPANY'>('COMPANY');
  const [paymentRef, setPaymentRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paying, setPaying] = useState(false);
  const [remainingPaymentDate, setRemainingPaymentDate] = useState('');

  // Penalty - calculated automatically, but EDITABLE
  const [editedPenaltyAmount, setEditedPenaltyAmount] = useState<string>(''); // User can edit the penalty
  const [penaltyWaiver, setPenaltyWaiver] = useState(0);
  // NOTE: penalty always uses the SAME payment mode as the EMI (no separate selector)

  // Proof upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const defaultType = isInterestOnlyLoan ? 'INTEREST_ONLY' : (isAdvance ? 'FULL' : 'FULL');
      setPaymentType(defaultType);
      setAmount(isAdvance ? (emi?.principalAmount ?? remaining) : remaining);
      setPaymentMode('CASH');
      setSplitCashAmount('');
      setSplitOnlineAmount('');
      setCreditType('COMPANY');
      setPaymentRef('');
      setRemarks(isMultiMode
        ? `Payment for ${emis.length} EMI(s): #${emis.map(e => e.installmentNumber).join(', #')}`
        : '');
      setRemainingPaymentDate('');
      setEditedPenaltyAmount(''); // Reset edited penalty
      setPenaltyWaiver(0);
      setProofFile(null);
      setProofPreview(null);
    }
  }, [open, selectedEMI?.id, selectedEMIs?.length]);

  // ── Credit type handler ────────────────────────────────────────────────────
  const handleCreditTypeChange = (type: 'PERSONAL' | 'COMPANY') => {
    setCreditType(type);
    if (type === 'PERSONAL') setPaymentMode('CASH');
  };

  // ── Payment type handler ───────────────────────────────────────────────────
  const handlePaymentTypeChange = (type: 'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'PRINCIPAL_ONLY') => {
    setPaymentType(type);
    if (type === 'FULL') setAmount(remaining);
    else if (type === 'INTEREST_ONLY') setAmount(remainingInterest);
    else if (type === 'PRINCIPAL_ONLY') setAmount(remainingPrincipal);
    else setAmount(Math.floor(remaining / 2));
  };

  // ── Proof upload ───────────────────────────────────────────────────────────
  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Max 10MB', variant: 'destructive' });
      return;
    }
    setProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else setProofPreview(null);
  };

  // ── Computed values ────────────────────────────────────────────────────────
  // Calculate penalty info automatically - ALWAYS visible when EMI is overdue
  const loanAmountForPenalty = propLoanAmount || emi?.loanAmount || emi?.outstandingPrincipal || 0;
  const penaltyInfo = emi ? calculatePenaltyInfo(emi.dueDate, loanAmountForPenalty) : { daysOverdue: 0, calculatedPenalty: 0, ratePerDay: 0 };
  const isPenaltyOverdue = emi ? isEMIOverdue(emi) : false;

  // Penalty amount: use edited value if set, otherwise calculated
  const penaltyAmount = editedPenaltyAmount !== '' ? parseFloat(editedPenaltyAmount) || 0 : penaltyInfo.calculatedPenalty;
  const netPenalty = Math.max(0, penaltyAmount - penaltyWaiver);

  const isOnlineMode = paymentMode === 'ONLINE';
  const isSplitMode = paymentMode === 'SPLIT';

  const splitCash = parseFloat(splitCashAmount) || 0;
  const splitOnline = parseFloat(splitOnlineAmount) || 0;
  const splitTotal = splitCash + splitOnline;

  // Which company books will the entry go to (UI label)
  const getEntryCompany = (emiNum: number = emi?.installmentNumber ?? 1): string => {
    if (isMirrored && mirrorTenure && emiNum <= mirrorTenure) return mirrorCompanyName;
    return loanCompanyName;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onPay = async () => {
    if (!userId || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    if (paymentType === 'PARTIAL' && !remainingPaymentDate) {
      toast({ title: 'Error', description: 'Please select when the remaining will be paid', variant: 'destructive' });
      return;
    }
    if (isSplitMode && Math.abs(splitTotal - amount) > 1) {
      toast({ title: 'Split Mismatch', description: `Cash ₹${splitCash} + Online ₹${splitOnline} = ₹${splitTotal}, but payment amount is ₹${amount}`, variant: 'destructive' });
      return;
    }

    setPaying(true);
    try {
      // Upload proof if provided
      let proofUrl = '';
      if (proofFile) {
        const fd = new FormData();
        fd.append('file', proofFile);
        fd.append('documentType', 'emi_proof');
        fd.append('loanId', loanId);
        fd.append('uploadedBy', userId);
        try {
          const upRes = await fetch('/api/upload/document', { method: 'POST', body: fd });
          const upData = await upRes.json();
          if (upData.success && upData.url) proofUrl = upData.url;
        } catch { /* non-critical */ }
      }

      const isInterestOnlyPayment = isInterestOnlyLoan || paymentType === 'INTEREST_ONLY';
      const action = isInterestOnlyPayment ? 'pay-interest-only-loan' : 'pay-emi';

      if (isMultiMode) {
        // ── MULTI-EMI: pay each one sequentially ──────────────────────────
        let successCount = 0;
        let totalCreditAdded = 0;
        for (const e of emis) {
          const advance = isAdvancePayment(e);
          const amtToPay = advance ? e.principalAmount : (e.totalAmount - e.paidAmount);
          const body: Record<string, unknown> = {
            action: 'pay-emi', userId, userRole,
            paymentMode: isSplitMode ? 'CASH' : paymentMode,
            paymentReference: paymentRef,
            creditType, proofUrl, remarks,
            emiId: e.id, paymentType: 'FULL', amount: amtToPay,
            isAdvancePayment: advance,
            penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
            penaltyPaymentMode: netPenalty > 0 ? (paymentMode === 'ONLINE' ? 'BANK' : 'CASH') : undefined,
            ...(isSplitMode && { isSplitPayment: true, splitCashAmount: splitCash / emis.length, splitOnlineAmount: splitOnline / emis.length }),
          };
          const res = await fetch('/api/offline-loan', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
          const data = await res.json();
          if (data.success) { successCount++; totalCreditAdded += data.creditAdded || 0; }
        }
        if (successCount > 0) {
          toast({ title: `✅ ${successCount}/${emis.length} EMIs Paid`, description: `₹${fmt(totalCreditAdded)} credit added.` });
          onOpenChange(false);
          onPaymentSuccess();
        } else {
          toast({ title: 'Error', description: 'All payments failed', variant: 'destructive' });
        }
        return;
      }

      // ── SINGLE EMI ────────────────────────────────────────────────────────
      const body: Record<string, unknown> = {
        action, userId, userRole,
        paymentMode: isSplitMode ? 'CASH' : paymentMode,
        paymentReference: paymentRef,
        creditType, proofUrl, remarks,
        // Single EMI: Always pay full amount - NO advance logic
        isAdvancePayment: false,
        penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
        penaltyWaiver: penaltyWaiver > 0 ? penaltyWaiver : undefined,
        // Penalty same mode as EMI: ONLINE→BANK, CASH/SPLIT→CASH
        penaltyPaymentMode: netPenalty > 0 ? (paymentMode === 'ONLINE' ? 'BANK' : 'CASH') : undefined,
        ...(isSplitMode && { isSplitPayment: true, splitCashAmount: splitCash, splitOnlineAmount: splitOnline }),
      };

      if (isInterestOnlyPayment) {
        body.loanId = loanId;
        body.paymentType = 'INTEREST_ONLY';
        body.amount = amount;
      } else {
        body.emiId = emi?.id;
        body.paymentType = paymentType;
        body.amount = amount;
        if (paymentType === 'PARTIAL') body.remainingPaymentDate = remainingPaymentDate;
      }

      const res = await fetch('/api/offline-loan', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        let desc = `₹${fmt(amount)} collected. Credit added to ${creditType} account.`;
        if (netPenalty > 0) desc += ` + ₹${fmt(netPenalty)} penalty.`;
        toast({ title: '✅ Payment Successful!', description: desc });
        onOpenChange(false);
        onPaymentSuccess();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process payment', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: 'Error', description: 'Failed to process payment', variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  if (emis.length === 0 && !isInterestOnlyLoan) return null;

  const advanceBreakdown = isMultiMode ? emis.reduce((acc, e) => {
    const adv = isAdvancePayment(e);
    return { advance: acc.advance + (adv ? 1 : 0), full: acc.full + (adv ? 0 : 1) };
  }, { advance: 0, full: 0 }) : null;

  // ────────────────────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            {isInterestOnlyLoan
              ? 'Pay Interest Only'
              : isMultiMode
                ? `Pay ${emis.length} EMIs`
                : `Pay EMI #${emi?.installmentNumber}`}
          </DialogTitle>
          <DialogDescription>
            {isMultiMode ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>EMIs Selected:</span><span className="font-medium">{emis.length}</span></div>
                {advanceBreakdown && advanceBreakdown.advance > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Advance EMIs (principal only):</span>
                    <span>{advanceBreakdown.advance}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Total:</span>
                  <span>₹{fmt(remaining)}</span>
                </div>
              </div>
            ) : alreadyPaid > 0 ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Total EMI:</span><span className="font-medium">₹{fmt(totalAmount)}</span></div>
                <div className="flex justify-between text-green-600"><span>Already Paid:</span><span>₹{fmt(alreadyPaid)}</span></div>
                <div className="flex justify-between text-orange-600 font-semibold"><span>Remaining:</span><span>₹{fmt(remaining)}</span></div>
                {!isInterestOnlyLoan && <div className="text-xs pt-1 border-t">P: ₹{fmt(remainingPrincipal)} | I: ₹{fmt(remainingInterest)}</div>}
              </div>
            ) : (
              <>
                Due: ₹{fmt(totalAmount)}
                {!isInterestOnlyLoan && emi && (
                  <span className="block text-xs mt-1">P: ₹{fmt(emi.principalAmount)} | I: ₹{fmt(emi.interestAmount)}</span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loan Type Info - Offline, Mirror Status */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-gray-600 hover:bg-gray-700 text-white">
              📁 Offline Loan
            </Badge>
            {isMirrored && (
              <Badge className="bg-purple-500 hover:bg-purple-600">
                🔄 Mirror Loan
              </Badge>
            )}
            {!isMirrored && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                ✅ Original Loan
              </Badge>
            )}
          </div>

          {/* ── ADVANCE PAYMENT BANNER ── */}
          {isAdvance && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Advance Payment Detected</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  This EMI is due on {new Date(emi!.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.
                  Only the principal (₹{fmt(emi!.principalAmount - (emi!.paidPrincipal || 0))}) will be collected — no interest charged for advance payments.
                </p>
              </div>
            </div>
          )}

          {/* ── PAYMENT TYPE ── (single, non-interest-only) */}
          {!isInterestOnlyLoan && !isMultiMode && userRole !== 'ACCOUNTANT' && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <Label className="text-purple-800 font-semibold mb-3 block">Payment Type *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { type: 'FULL', label: 'Full', icon: <CheckCircle className="h-4 w-4 mr-1" />, color: 'bg-emerald-500 hover:bg-emerald-600' },
                  { type: 'PARTIAL', label: 'Partial', icon: <Receipt className="h-4 w-4 mr-1" />, color: 'bg-orange-500 hover:bg-orange-600' },
                  { type: 'INTEREST_ONLY', label: 'Interest', icon: <Percent className="h-4 w-4 mr-1" />, color: 'bg-blue-500 hover:bg-blue-600' },
                  { type: 'PRINCIPAL_ONLY', label: 'Principal', icon: <AlertTriangle className="h-4 w-4 mr-1" />, color: 'bg-red-500 hover:bg-red-600 text-white' },
                ] as const).map(({ type, label, icon, color }) => (
                  <Button key={type} type="button"
                    variant={paymentType === type ? 'default' : 'outline'}
                    className={paymentType === type ? color : (type === 'PRINCIPAL_ONLY' ? 'border-red-300 text-red-700 hover:bg-red-50' : '')}
                    onClick={() => handlePaymentTypeChange(type)}>
                    {icon}{label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* ── PARTIAL: due date picker ── */}
          {paymentType === 'PARTIAL' && !isMultiMode && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Label className="text-orange-800 font-semibold mb-2 block">When will the remaining be paid? *</Label>
              <Input type="date" value={remainingPaymentDate}
                onChange={(e) => setRemainingPaymentDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
              <p className="text-xs text-orange-600 mt-2">
                Remaining ₹{fmt(Math.max(0, remaining - amount))} will be due on selected date.
              </p>
            </div>
          )}

          {/* ── INTEREST ONLY info banner ── */}
          {(paymentType === 'INTEREST_ONLY' || isInterestOnlyLoan) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Interest Only Payment</span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Collecting only the interest: ₹{fmt(remainingInterest || interestOnlyAmount)}.
                  {remainingPrincipal > 0 && <> Principal ₹{fmt(remainingPrincipal)} is deferred — carried forward to the next EMI.</>}
              </p>
            </div>
          )}

          {/* ── PRINCIPAL ONLY info banner ── */}
          {paymentType === 'PRINCIPAL_ONLY' && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Principal Only Payment</span>
              </div>
              <p className="text-xs text-red-600 mt-2">
                Only principal ₹{fmt(remainingPrincipal)} collected.
                Interest ₹{fmt(remainingInterest)} will be written off as Irrecoverable Debt.
              </p>
            </div>
          )}

          {/* ── CREDIT TYPE ── */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            <Label className="text-slate-800 font-semibold mb-3 block">
              <Wallet className="h-4 w-4 inline mr-2" />Credit Type *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Personal */}
              <button type="button" onClick={() => handleCreditTypeChange('PERSONAL')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  creditType === 'PERSONAL' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <User className={`h-5 w-5 ${creditType === 'PERSONAL' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold text-sm ${creditType === 'PERSONAL' ? 'text-amber-800' : 'text-gray-600'}`}>Personal Credit</span>
                </div>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="flex items-center gap-1"><Banknote className="h-3 w-3" /><span>CASH only</span></div>
                  <div className="text-gray-500">Entry: Company 3 Cashbook</div>
                  <div className={`font-medium ${creditType === 'PERSONAL' ? 'text-amber-700' : ''}`}>Current: ₹{fmt(personalCredit)}</div>
                </div>
              </button>
              {/* Company */}
              <button type="button" onClick={() => handleCreditTypeChange('COMPANY')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  creditType === 'COMPANY' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Building className={`h-5 w-5 ${creditType === 'COMPANY' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold text-sm ${creditType === 'COMPANY' ? 'text-blue-800' : 'text-gray-600'}`}>Company Credit</span>
                </div>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="flex items-center gap-1"><Landmark className="h-3 w-3" /><span>ONLINE or CASH</span></div>
                  <div className="text-gray-500">Entry: {getEntryCompany()}&apos;s Books</div>
                  <div className={`font-medium ${creditType === 'COMPANY' ? 'text-blue-700' : ''}`}>Current: ₹{fmt(companyCredit)}</div>
                </div>
              </button>
            </div>
          </div>

          {/* ── PAYMENT MODE ── */}
          {creditType === 'PERSONAL' ? (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-amber-800 font-semibold">Payment Mode</Label>
                  <p className="text-xs text-amber-600 mt-1">Personal Credit only supports CASH</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-lg border border-amber-300">
                  <Banknote className="h-5 w-5 text-amber-700" />
                  <span className="font-semibold text-amber-800">CASH</span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                <p className="text-xs text-amber-700"><strong>Entry in:</strong> Company 3 Cashbook</p>
                <p className="text-xs text-amber-600 mt-1">+₹{fmt(amount)} added to Personal Credit</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-blue-800 font-semibold mb-3 block">Payment Mode *</Label>
              <div className="grid grid-cols-3 gap-2">
                {/* ONLINE */}
                <button type="button" onClick={() => setPaymentMode('ONLINE')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMode === 'ONLINE' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className={`h-4 w-4 ${paymentMode === 'ONLINE' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium text-xs ${paymentMode === 'ONLINE' ? 'text-blue-800' : 'text-gray-600'}`}>ONLINE</span>
                  </div>
                  <p className="text-xs text-gray-500">Bank Account</p>
                </button>
                {/* CASH */}
                <button type="button" onClick={() => setPaymentMode('CASH')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMode === 'CASH' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className={`h-4 w-4 ${paymentMode === 'CASH' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium text-xs ${paymentMode === 'CASH' ? 'text-blue-800' : 'text-gray-600'}`}>CASH</span>
                  </div>
                  <p className="text-xs text-gray-500">Cashbook</p>
                </button>
                {/* SPLIT */}
                <button type="button" onClick={() => setPaymentMode('SPLIT')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMode === 'SPLIT' ? 'border-purple-500 bg-purple-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <SplitSquareHorizontal className={`h-4 w-4 ${paymentMode === 'SPLIT' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className={`font-medium text-xs ${paymentMode === 'SPLIT' ? 'text-purple-800' : 'text-gray-600'}`}>SPLIT</span>
                  </div>
                  <p className="text-xs text-gray-500">Cash + Online</p>
                </button>
              </div>

              {/* Split inputs */}
              {isSplitMode && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                  <p className="text-xs font-medium text-purple-700">Split Part Cash + Part Online (penalty included)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-600">Cash Amount (₹)</Label>
                      <Input type="number" value={splitCashAmount}
                        onChange={(e) => setSplitCashAmount(e.target.value)}
                        placeholder="e.g. 500" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Online Amount (₹)</Label>
                      <Input type="number" value={splitOnlineAmount}
                        onChange={(e) => setSplitOnlineAmount(e.target.value)}
                        placeholder="e.g. 700" />
                    </div>
                  </div>
                  <p className={`text-xs font-medium ${Math.abs(splitTotal - amount) > 1 ? 'text-red-500' : 'text-green-600'}`}>
                    Total: ₹{fmt(splitTotal)} {Math.abs(splitTotal - amount) > 1 ? `⚠ Doesn't match ₹${fmt(amount)}` : '✓'}
                  </p>
                </div>
              )}

              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Entry in:</strong> {paymentMode === 'ONLINE' ? `${getEntryCompany()}'s Bank Account` : paymentMode === 'SPLIT' ? `Cash: Cashbook + Online: Bank` : `${getEntryCompany()}'s Cashbook`}
                </p>
                <p className="text-xs text-blue-600 mt-1">+₹{fmt(amount)} added to Company Credit</p>
              </div>
            </div>
          )}

          {/* ── PAYMENT AMOUNT ── */}
          <div>
            <Label>Payment Amount (₹) *</Label>
            <Input type="number" value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>

          {/* ── PENALTY UI - ALWAYS visible, ACTIVE only after EMI due date ── */}
          {!isInterestOnlyLoan && !isMultiMode && (
            <div className={`p-4 rounded-lg border-2 space-y-3 ${isPenaltyOverdue ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`h-5 w-5 ${isPenaltyOverdue ? 'text-rose-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-500'}`}>
                  Penalty {isPenaltyOverdue ? 'for Overdue EMI' : '(Not Applicable)'}
                </span>
                <span className={`ml-auto px-2 py-1 text-xs font-medium rounded ${isPenaltyOverdue ? 'bg-rose-200 text-rose-800' : 'bg-gray-200 text-gray-600'}`}>
                  {isPenaltyOverdue ? `${penaltyInfo.daysOverdue} day(s) overdue` : 'Due date not passed'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className={isPenaltyOverdue ? 'text-rose-600' : 'text-gray-400'}>Penalty Rate</span>
                  <span className={`font-medium ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>
                    ₹{penaltyInfo.ratePerDay}/day
                    <span className="text-xs text-gray-500 ml-1">
                      ({fmt(loanAmountForPenalty)} loan = ₹{penaltyInfo.ratePerDay}/day)
                    </span>
                  </span>
                </div>

                {/* EDITABLE Penalty Amount - only when overdue */}
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <Label className={`text-sm font-medium ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>
                    Penalty Amount {isPenaltyOverdue ? '(Editable)' : '- Disabled until due date passes'}
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={isPenaltyOverdue ? (editedPenaltyAmount !== '' ? editedPenaltyAmount : penaltyInfo.calculatedPenalty) : 0}
                        onChange={(e) => isPenaltyOverdue && setEditedPenaltyAmount(e.target.value)}
                        placeholder={String(penaltyInfo.calculatedPenalty || 0)}
                        min="0"
                        className="pl-8"
                        disabled={!isPenaltyOverdue}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditedPenaltyAmount('')}
                      className="text-xs"
                      disabled={!isPenaltyOverdue}
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isPenaltyOverdue ? (
                      <>
                        Calculated: ₹{penaltyInfo.calculatedPenalty || 0} ({penaltyInfo.daysOverdue} days × ₹{penaltyInfo.ratePerDay}/day)
                        {editedPenaltyAmount !== '' && <span className="text-amber-600"> - Custom value set</span>}
                      </>
                    ) : (
                      'Penalty will be calculated automatically when EMI becomes overdue'
                    )}
                  </p>
                </div>

                {/* Penalty Waiver Input - only when overdue */}
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <Label className={`text-sm ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>Waive Penalty (Optional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={isPenaltyOverdue ? penaltyWaiver : 0}
                        onChange={(e) => isPenaltyOverdue && setPenaltyWaiver(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        max={penaltyAmount}
                        className="pl-8"
                        disabled={!isPenaltyOverdue}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      Max: ₹{fmt(penaltyAmount)}
                    </span>
                  </div>
                  {penaltyWaiver > penaltyAmount && (
                    <p className="text-xs text-rose-500 mt-1">Waiver cannot exceed penalty amount</p>
                  )}
                </div>

                {/* Net Penalty After Waiver */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                  <span className={`font-medium ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>Penalty to Collect</span>
                  <span className={`font-bold text-lg ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>
                    ₹{fmt(isPenaltyOverdue ? netPenalty : 0)}
                    {isPenaltyOverdue && penaltyWaiver > 0 && (
                      <span className="text-xs text-green-600 ml-1">
                        (waived: ₹{fmt(penaltyWaiver)})
                      </span>
                    )}
                  </span>
                </div>
                {/* Penalty uses same mode as EMI — no separate selector */}
                {isPenaltyOverdue && netPenalty > 0 && (
                  <p className="text-xs text-rose-500 mt-2 italic">
                    Penalty will be collected via <strong>{paymentMode === 'ONLINE' ? 'Bank' : 'Cash'}</strong> (same as EMI payment mode)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── PROOF UPLOAD ── */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <Label className="text-gray-800 font-semibold block">
              <Upload className="h-4 w-4 inline mr-2" />Payment Proof
              {(creditType === 'PERSONAL' || isOnlineMode) && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <p className="text-xs text-gray-500">
              {creditType === 'PERSONAL' || isOnlineMode
                ? 'Required for Personal Credit or Online payments.'
                : 'Optional — upload bank receipt or screenshot.'}
            </p>
            {proofFile ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                {proofPreview
                  ? <img src={proofPreview} alt="proof" className="h-16 w-16 object-cover rounded" />
                  : <FileText className="h-10 w-10 text-gray-400" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{proofFile.name}</p>
                  <p className="text-xs text-gray-500">{(proofFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={() => { setProofFile(null); setProofPreview(null); }}
                  className="p-1 rounded hover:bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload (JPG, PNG, PDF — max 10MB)</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleProofUpload} />
          </div>

          {/* ── REFERENCE ── */}
          <div>
            <Label>Transaction Reference</Label>
            <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="UTR/Transaction ID (optional)" />
          </div>

          {/* ── REMARKS ── */}
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onPay} disabled={paying}>
            {paying ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-2" />Pay ₹{fmt(amount)}{netPenalty > 0 ? ` + ₹${fmt(netPenalty)} penalty` : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default OfflineEMIPaymentDialog;
