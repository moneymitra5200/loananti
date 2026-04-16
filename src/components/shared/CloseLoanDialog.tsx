'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, CheckCircle, Loader2, IndianRupee, Calculator,
  TrendingDown, Wallet, Building2, Skull, XCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
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
    dueDate: Date;
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

// Close mode: normal foreclosure payment OR write off as total loss
type CloseMode = 'PAYMENT' | 'LOSS';

export default function CloseLoanDialog({
  open,
  onOpenChange,
  loanId,
  userId,
  companyId,
  isOfflineLoan = false,
  onLoanClosed
}: CloseLoanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [foreclosureData, setForeclosureData] = useState<ForeclosureData | null>(null);
  const [closeMode, setCloseMode] = useState<CloseMode>('PAYMENT');

  // Payment form
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [creditType, setCreditType] = useState<'PERSONAL' | 'COMPANY'>('COMPANY');
  const [bankAccountId, setBankAccountId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [remarks, setRemarks] = useState('');

  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    currentBalance: number;
    isDefault?: boolean;
  }>>([]);

  useEffect(() => {
    if (open && loanId) {
      fetchForeclosureData();
      fetchBankAccounts();
    }
    // Reset mode on open
    if (open) setCloseMode('PAYMENT');
  }, [open, loanId]);

  // Auto-select default bank account when bank accounts load
  useEffect(() => {
    if (bankAccounts.length > 0 && !bankAccountId) {
      const defaultBank = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
      if (defaultBank) setBankAccountId(defaultBank.id);
    }
  }, [bankAccounts]);

  const fetchForeclosureData = async () => {
    setLoading(true);
    try {
      const endpoint = isOfflineLoan
        ? `/api/offline-loan/close?loanId=${loanId}`
        : `/api/loan/close?loanId=${loanId}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setForeclosureData(data.foreclosure);
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error fetching foreclosure data:', error);
      toast({ title: 'Error', description: 'Failed to calculate foreclosure amount', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const qp = companyId ? `?companyId=${companyId}` : '';
      const response = await fetch(`/api/accounting/bank-accounts${qp}`);
      const data = await response.json();
      setBankAccounts(data.bankAccounts || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleCloseWithPayment = async () => {
    if (!foreclosureData) return;
    setSaving(true);
    try {
      const endpoint = isOfflineLoan ? '/api/offline-loan/close' : '/api/loan/close';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          userId,
          amount: foreclosureData.totalForeclosureAmount,
          paymentMode,
          creditType,
          bankAccountId: paymentMode !== 'CASH' ? bankAccountId : null,
          proofUrl,
          remarks,
          closeType: 'PAYMENT',
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Loan Closed', description: data.message });
        onOpenChange(false);
        onLoanClosed?.();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error closing loan:', error);
      toast({ title: 'Error', description: 'Failed to close loan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAsLoss = async () => {
    if (!foreclosureData) return;
    setSaving(true);
    try {
      const endpoint = isOfflineLoan ? '/api/offline-loan/close' : '/api/loan/close';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          userId,
          amount: 0,
          paymentMode: 'NONE',
          creditType: 'COMPANY',
          remarks: remarks || 'Loan written off as irrecoverable loss',
          closeType: 'LOSS',  // writes off all remaining as Irrecoverable Debts
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Loan Written Off', description: data.message });
        onOpenChange(false);
        onLoanClosed?.();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error writing off loan:', error);
      toast({ title: 'Error', description: 'Failed to write off loan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!foreclosureData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
            Close Loan — {foreclosureData.applicationNo}
          </DialogTitle>
          <DialogDescription>
            Select how to close this loan: collect foreclosure payment or write off as loss.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer Info */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{foreclosureData.customer.name}</p>
                  <p className="text-sm text-gray-500">{foreclosureData.customer.phone}</p>
                </div>
                <Badge variant="outline">
                  {foreclosureData.paidEMIs}/{foreclosureData.totalEMIs} EMIs Paid
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mirror Loan Info */}
          {foreclosureData.mirrorLoan?.isMirrorLoan && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-700">Mirror Loan</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Original Company:</p>
                    <p className="font-medium">{foreclosureData.mirrorLoan.originalCompany?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Mirror Company:</p>
                    <p className="font-medium">{foreclosureData.mirrorLoan.mirrorCompany?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">Principal</p>
                <p className="text-base font-bold text-blue-600">{formatCurrency(foreclosureData.totalPrincipal)}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">Interest</p>
                <p className="text-base font-bold text-amber-600">{formatCurrency(foreclosureData.totalInterest)}</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">Foreclosure Total</p>
                <p className="text-base font-bold text-emerald-600">{formatCurrency(foreclosureData.totalForeclosureAmount)}</p>
                <p className="text-xs text-emerald-600">Save {formatCurrency(foreclosureData.savings)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Close Mode Tabs */}
          <Tabs value={closeMode} onValueChange={(v) => setCloseMode(v as CloseMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="PAYMENT" className="flex-1 gap-2">
                <IndianRupee className="h-4 w-4" />
                Collect Payment
              </TabsTrigger>
              <TabsTrigger value="LOSS" className="flex-1 gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                <Skull className="h-4 w-4" />
                Mark as Loss
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Payment Mode UI */}
          {closeMode === 'PAYMENT' && (
            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Payment Details
              </h4>

              <div>
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMode !== 'CASH' && (
                <div>
                  <Label>Bank Account {bankAccounts.find(b => b.isDefault) ? '(★ = Default)' : ''}</Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.isDefault ? '★ ' : ''}{account.bankName} — ···{account.accountNumber?.slice(-4)} ({formatCurrency(account.currentBalance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Credit Type</Label>
                <p className="text-xs text-gray-500 mb-2">
                  {paymentMode === 'CASH'
                    ? 'Cash payments default to Company Credit'
                    : 'Non-Cash may use Personal Credit (proof required)'}
                </p>
                <RadioGroup
                  value={creditType}
                  onValueChange={(v) => setCreditType(v as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="COMPANY" id="company" />
                    <Label htmlFor="company" className="font-normal">Company Credit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PERSONAL" id="personal" />
                    <Label htmlFor="personal" className="font-normal">Personal Credit</Label>
                  </div>
                </RadioGroup>
              </div>

              {creditType === 'PERSONAL' && paymentMode !== 'CASH' && (
                <div>
                  <Label>Proof URL</Label>
                  <Input
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="Enter payment proof URL"
                  />
                </div>
              )}

              <div>
                <Label>Remarks</Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks"
                />
              </div>
            </div>
          )}

          {/* Loss Mode UI */}
          {closeMode === 'LOSS' && (
            <div className="space-y-4 border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-semibold flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                Write Off as Irrecoverable Debt
              </h4>
              <div className="text-sm text-red-700 space-y-1">
                <p>The following will be written off to <strong>Irrecoverable Debts</strong> (Loss in P&amp;L):</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white rounded border border-red-200 p-2 text-center">
                    <p className="text-xs text-gray-500">Principal Written Off</p>
                    <p className="font-bold text-red-600">{formatCurrency(foreclosureData.totalPrincipal)}</p>
                  </div>
                  <div className="bg-white rounded border border-red-200 p-2 text-center">
                    <p className="text-xs text-gray-500">Interest Written Off</p>
                    <p className="font-bold text-red-600">{formatCurrency(foreclosureData.totalInterest)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Total write-off: {formatCurrency(foreclosureData.originalRemainingAmount)}</p>
              </div>
              <div>
                <Label>Write-off Reason</Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Customer defaulted, uncontactable"
                />
              </div>
              <div className="p-3 bg-red-100 border border-red-300 rounded text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Warning:</strong> This action is irreversible. The entire remaining balance will be written off
                  as an Irrecoverable Debt expense in the P&amp;L. No cash is collected.
                </span>
              </div>
            </div>
          )}

          {/* Final Warning for Payment mode */}
          {closeMode === 'PAYMENT' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Irreversible Action</p>
                <p className="text-amber-700">
                  Once closed, the loan cannot be reopened. Foreclosure amount:{' '}
                  <strong>{formatCurrency(foreclosureData.totalForeclosureAmount)}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {closeMode === 'LOSS' ? (
            <Button
              onClick={handleCloseAsLoss}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Skull className="h-4 w-4 mr-2" />
              )}
              Write Off as Loss
            </Button>
          ) : (
            <Button
              onClick={handleCloseWithPayment}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Close Loan — {formatCurrency(foreclosureData.totalForeclosureAmount)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
