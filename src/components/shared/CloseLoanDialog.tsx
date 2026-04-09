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
import { 
  AlertTriangle, CheckCircle, Loader2, IndianRupee, Calculator,
  TrendingDown, Wallet, CreditCard, Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface CloseLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  userId: string;
  companyId?: string;
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

export default function CloseLoanDialog({
  open,
  onOpenChange,
  loanId,
  userId,
  companyId,
  onLoanClosed
}: CloseLoanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [foreclosureData, setForeclosureData] = useState<ForeclosureData | null>(null);
  
  // Payment form
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [creditType, setCreditType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');
  const [bankAccountId, setBankAccountId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [remarks, setRemarks] = useState('');

  // Bank accounts for selection
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    currentBalance: number;
  }>>([]);

  useEffect(() => {
    if (open && loanId) {
      fetchForeclosureData();
      fetchBankAccounts();
    }
  }, [open, loanId]);

  const fetchForeclosureData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loan/close?loanId=${loanId}`);
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
      const response = await fetch('/api/accounting/bank-accounts');
      const data = await response.json();
      setBankAccounts(data.bankAccounts || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleCloseLoan = async () => {
    if (!foreclosureData) return;

    setSaving(true);
    try {
      const response = await fetch('/api/loan/close', {
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
          remarks
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({ 
          title: 'Loan Closed', 
          description: data.message 
        });
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
            Close Loan - {foreclosureData.applicationNo}
          </DialogTitle>
          <DialogDescription>
            Foreclosure calculation with interest savings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Foreclosure Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Original Remaining</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(foreclosureData.originalRemainingAmount)}
                </p>
                <p className="text-xs text-gray-500">{foreclosureData.unpaidEMICount} EMIs</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Foreclosure Amount</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(foreclosureData.totalForeclosureAmount)}
                </p>
                <p className="text-xs text-green-600">You save {formatCurrency(foreclosureData.savings)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border">
              <p className="text-sm text-gray-500">Principal to Pay</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(foreclosureData.totalPrincipal)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border">
              <p className="text-sm text-gray-500">Interest to Pay</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(foreclosureData.totalInterest)}</p>
              <p className="text-xs text-gray-500">Only for current month EMI</p>
            </div>
          </div>

          <Separator />

          {/* EMI Breakdown */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              EMI Breakdown
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {foreclosureData.emiDetails.map((emi, idx) => (
                <div key={idx} className={`p-3 rounded-lg text-sm ${emi.monthHasStarted ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">EMI #{emi.installmentNumber}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatDate(emi.dueDate)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(emi.amountToPay)}</p>
                      {emi.monthHasStarted ? (
                        <p className="text-xs text-amber-600">P: {formatCurrency(emi.principalToPay)} + I: {formatCurrency(emi.interestToPay)}</p>
                      ) : (
                        <p className="text-xs text-green-600">Principal only (no interest)</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Options */}
          <div className="space-y-4">
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
                <Label>Select Bank Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.bankName}</span>
                          <span className="text-xs text-gray-500">({formatCurrency(account.currentBalance)})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Type
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                {paymentMode === 'CASH' 
                  ? 'CASH payments go to Company Credit' 
                  : 'Non-CASH payments go to Personal Credit (proof required)'}
              </p>
              <RadioGroup 
                value={creditType} 
                onValueChange={(v) => setCreditType(v as any)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PERSONAL" id="personal" />
                  <Label htmlFor="personal" className="font-normal">Personal Credit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="COMPANY" id="company" />
                  <Label htmlFor="company" className="font-normal">Company Credit</Label>
                </div>
              </RadioGroup>
            </div>

            {creditType === 'PERSONAL' && paymentMode !== 'CASH' && (
              <div>
                <Label>Proof URL</Label>
                <Input 
                  value={proofUrl} 
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="Enter proof document URL"
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

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Important</p>
              <p className="text-amber-700">
                Once the loan is closed, it cannot be reopened. The foreclosure amount will be credited to your 
                <span className="font-medium"> {creditType === 'PERSONAL' ? 'Personal' : 'Company'} Credit</span>.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCloseLoan} 
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Close Loan - {formatCurrency(foreclosureData.totalForeclosureAmount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
