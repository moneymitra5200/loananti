'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle, Loader2, IndianRupee, Calculator, TrendingDown,
  Skull, CheckCircle, Building, Banknote, CreditCard, Wallet, Info,
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface CloseLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  userId: string;
  companyId?: string;
  isOfflineLoan?: boolean;
  onLoanClosed?: () => void;
}

interface ForeclosureData {
  loanId: string;
  applicationNo: string;
  customer: { id: string; name: string; phone: string };
  unpaidEMICount: number;
  totalEMIs: number;
  paidEMIs: number;
  originalRemainingAmount: number;
  totalPrincipal: number;
  totalInterest: number;
  totalForeclosureAmount: number;
  savings: number;
  interestRate: number;
  emiDetails: Array<{
    installmentNumber: number;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    principalToPay: number;
    interestToPay: number;
    monthHasStarted: boolean;
    amountToPay: number;
  }>;
  mirrorLoan: {
    isMirrorLoan: boolean;
    mirrorCompany?: { id: string; name: string; code: string };
    originalCompany?: { id: string; name: string; code: string };
  } | null;
}

const PAYMENT_MODES = [
  { value: 'CASH',          label: 'Cash',          icon: Banknote },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer',  icon: Building },
  { value: 'UPI',           label: 'UPI',            icon: CreditCard },
  { value: 'CHEQUE',        label: 'Cheque',         icon: CreditCard },
];

export default function CloseLoanDialog({
  open, onOpenChange, loanId, userId, companyId, isOfflineLoan = false, onLoanClosed,
}: CloseLoanDialogProps) {
  const [loading,          setLoading]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [data,             setData]             = useState<ForeclosureData | null>(null);
  const [mode,             setMode]             = useState<'PAYMENT' | 'LOSS'>('PAYMENT');
  const [paymentMode,      setPaymentMode]      = useState('CASH');
  const [creditType,       setCreditType]       = useState<'COMPANY' | 'PERSONAL'>('COMPANY');
  const [remarks,          setRemarks]          = useState('');

  // ────────────────────────────────────────────────────────────────────────────
  // Load foreclosure calculation
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !loanId) return;
    setData(null);
    setMode('PAYMENT');
    setPaymentMode('CASH');
    setCreditType('COMPANY');
    setRemarks('');
    fetchForeclosure();
  }, [open, loanId]);

  const fetchForeclosure = async () => {
    setLoading(true);
    try {
      const endpoint = isOfflineLoan
        ? `/api/offline-loan/close?loanId=${loanId}`
        : `/api/loan/close?loanId=${loanId}`;
      const res  = await fetch(endpoint);
      const json = await res.json();
      if (json.success) {
        setData(json.foreclosure);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to load foreclosure data', variant: 'destructive' });
        onOpenChange(false);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load foreclosure data', variant: 'destructive' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Submit
  // ────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const endpoint = isOfflineLoan ? '/api/offline-loan/close' : '/api/loan/close';
      const body: Record<string, unknown> = {
        loanId,
        userId,
        companyId,
        closeType: mode,
        remarks,
      };
      if (mode === 'PAYMENT') {
        body.paymentMode = paymentMode;
        body.creditType  = creditType;
      }

      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast({
          title:       mode === 'LOSS' ? '✅ Loan Written Off as Loss' : '✅ Loan Closed',
          description: json.message,
        });
        if (!json.accountingOk && json.accountingWarnings?.length > 0) {
          setTimeout(() => {
            toast({
              title:       '⚠️ Accounting Entry Incomplete',
              description: `Loan closed but accounting failed: ${json.accountingWarnings[0]}. Contact admin.`,
              variant:     'destructive',
            });
          }, 600);
        }
        onLoanClosed?.();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to close loan', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to close loan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Derived display values
  // ────────────────────────────────────────────────────────────────────────────
  const foreAmt   = data?.totalForeclosureAmount ?? 0;
  const totalP    = data?.totalPrincipal ?? 0;
  const totalI    = data?.totalInterest  ?? 0;
  const lossAmt   = (data?.totalPrincipal ?? 0) + (data?.totalInterest ?? 0);
  // For LOSS, interest written off = total remaining interest on all EMIs
  const interestWriteOff = data?.emiDetails?.reduce((s, e) => s + e.interestToPay, 0) ?? totalI;
  const principalWriteOff = data?.emiDetails?.reduce((s, e) => s + e.principalToPay, 0) ?? totalP;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Calculator className="h-5 w-5 text-red-500" />
            Close Loan
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {data
              ? `${data.applicationNo} · ${data.paidEMIs}/${data.totalEMIs} EMIs paid · ${data.unpaidEMICount} remaining`
              : 'Loading foreclosure data…'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <div className="px-6 pb-6 space-y-5">

            {/* ── Mirror badge ── */}
            {data.mirrorLoan?.isMirrorLoan && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>Mirror Loan:</strong> {data.mirrorLoan.originalCompany?.name} →{' '}
                  {data.mirrorLoan.mirrorCompany?.name}.
                  Closing this loan will also close the mirror loan.
                </span>
              </div>
            )}

            {/* ── Summary cards (same style as EMI payment dialog) ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-500 font-medium mb-1">Principal</p>
                <p className="text-lg font-bold text-blue-700">₹{formatCurrency(totalP)}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-500 font-medium mb-1">Interest</p>
                <p className="text-lg font-bold text-orange-700">₹{formatCurrency(totalI)}</p>
                {totalI === 0 && (
                  <p className="text-[10px] text-orange-400">Waived (future)</p>
                )}
              </div>
              <div className={`rounded-xl p-3 text-center ${mode === 'LOSS' ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-xs font-medium mb-1 ${mode === 'LOSS' ? 'text-red-500' : 'text-green-500'}`}>
                  {mode === 'LOSS' ? 'Write-Off Total' : 'Collect'}
                </p>
                <p className={`text-lg font-bold ${mode === 'LOSS' ? 'text-red-700' : 'text-green-700'}`}>
                  ₹{formatCurrency(mode === 'LOSS' ? lossAmt : foreAmt)}
                </p>
                {mode === 'PAYMENT' && data.savings > 0.01 && (
                  <p className="text-[10px] text-green-400">Save ₹{formatCurrency(data.savings)}</p>
                )}
              </div>
            </div>

            {/* ── EMI breakdown ── */}
            {data.emiDetails.length > 0 && (
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                  <IndianRupee className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">EMI Breakdown</span>
                </div>
                <div className="divide-y">
                  {data.emiDetails.map(e => (
                    <div key={e.installmentNumber} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">EMI #{e.installmentNumber}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(e.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {!e.monthHasStarted && (
                            <span className="ml-1 text-blue-400">(future — interest waived)</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800">₹{formatCurrency(e.amountToPay)}</p>
                        <p className="text-xs text-gray-400">P:₹{formatCurrency(e.principalToPay)} I:₹{formatCurrency(e.interestToPay)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* ── Mode selector (same tab style as EMI dialog) ── */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Close Method</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('PAYMENT')}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    mode === 'PAYMENT'
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <CheckCircle className={`h-4 w-4 mb-1 ${mode === 'PAYMENT' ? 'text-green-500' : 'text-gray-400'}`} />
                  <p className="text-sm font-bold text-gray-800">Collect Payment</p>
                  <p className="text-xs text-gray-400">Collect ₹{formatCurrency(foreAmt)}</p>
                </button>
                <button
                  onClick={() => setMode('LOSS')}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    mode === 'LOSS'
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Skull className={`h-4 w-4 mb-1 ${mode === 'LOSS' ? 'text-red-500' : 'text-gray-400'}`} />
                  <p className="text-sm font-bold text-gray-800">Mark as Loss</p>
                  <p className="text-xs text-gray-400">Write off ₹{formatCurrency(lossAmt)}</p>
                </button>
              </div>
            </div>

            {/* ── LOSS: write-off detail ── */}
            {mode === 'LOSS' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-bold text-red-700">Irrecoverable Loss Write-Off</p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Principal write-off:</span>
                    <span className="font-bold text-red-700">₹{formatCurrency(principalWriteOff)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest write-off:</span>
                    <span className="font-bold text-red-700">₹{formatCurrency(interestWriteOff)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span className="text-red-700">Total written off:</span>
                    <span className="text-red-700">₹{formatCurrency(lossAmt)}</span>
                  </div>
                </div>
                <p className="text-xs text-red-500 mt-2">
                  Entire balance (P + I) recorded as "Irrecoverable Debts" in P&amp;L. No cash collected.
                  Loan closed immediately.
                </p>
              </div>
            )}

            {/* ── PAYMENT: payment mode ── */}
            {mode === 'PAYMENT' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMode(value)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                          paymentMode === value
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Credit Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'COMPANY',  label: 'Company Credit',  icon: Building },
                      { value: 'PERSONAL', label: 'Personal Credit', icon: Wallet   },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setCreditType(value as 'COMPANY' | 'PERSONAL')}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                          creditType === value
                            ? 'border-purple-400 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Remarks ── */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                className="mt-1 resize-none text-sm"
                rows={2}
                placeholder={mode === 'LOSS' ? 'Reason for write-off…' : 'Optional remarks…'}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            {/* ── Warning ── */}
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <strong>Irreversible Action.</strong>{' '}
                {mode === 'LOSS'
                  ? `Writing off ₹${formatCurrency(lossAmt)} as total loss. This cannot be undone.`
                  : `Foreclosure amount ₹${formatCurrency(foreAmt)}. Loan cannot be reopened once closed.`}
                {data.mirrorLoan?.isMirrorLoan && ' Mirror loan will also be closed automatically.'}
              </p>
            </div>

          </div>
        ) : null}

        {/* ── Footer ── */}
        <DialogFooter className="px-6 pb-6 pt-0 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || loading || !data}
            className={`flex-1 ${mode === 'LOSS'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'}`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
            ) : mode === 'LOSS' ? (
              <><Skull className="h-4 w-4 mr-2" /> Write Off ₹{formatCurrency(lossAmt)}</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-2" /> Close Loan · ₹{formatCurrency(foreAmt)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
