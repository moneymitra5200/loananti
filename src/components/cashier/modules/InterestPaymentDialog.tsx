'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Percent, Loader2, CheckCircle, Upload, FileCheck, 
  AlertCircle, DollarSign, Calendar, History, Wallet, User, Building
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface InterestPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: any;
  userId: string;
  personalCredit: number;
  companyCredit: number;
  onSuccess: () => void;
}

interface InterestPayment {
  id: string;
  amount: number;
  paymentMode: string;
  receiptNumber: string;
  createdAt: string;
  remarks: string | null;
}

export default function InterestPaymentDialog({
  open,
  onOpenChange,
  loan,
  userId,
  personalCredit,
  companyCredit,
  onSuccess
}: InterestPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<InterestPayment[]>([]);
  const [monthlyInterestAmount, setMonthlyInterestAmount] = useState(0);
  const [totalInterestPaid, setTotalInterestPaid] = useState(0);
  
  // Form state
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [creditType, setCreditType] = useState<'COMPANY' | 'PERSONAL'>('COMPANY');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Fetch interest payment history
  useEffect(() => {
    if (open && loan?.id) {
      fetchInterestPaymentHistory();
      // Calculate and set default monthly interest
      const principal = loan.sessionForm?.approvedAmount || loan.requestedAmount || loan.approvedAmount;
      const rate = loan.sessionForm?.interestRate || loan.interestRate || 12;
      const monthlyInterest = (principal * rate / 100) / 12;
      setMonthlyInterestAmount(Math.round(monthlyInterest * 100) / 100);
      setAmount(Math.round(monthlyInterest * 100) / 100);
    }
  }, [open, loan]);
  
  const fetchInterestPaymentHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loan/interest-payment?loanId=${loan.id}`);
      const data = await response.json();
      if (data.success) {
        setPaymentHistory(data.payments || []);
        setTotalInterestPaid(data.loan?.totalInterestOnlyPaid || 0);
      }
    } catch (error) {
      console.error('Error fetching interest payment history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProofPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };
  
  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode);
    // Auto-switch credit type based on payment mode
    // CASH → COMPANY (no proof required)
    // Other modes → PERSONAL (proof required)
    if (mode === 'CASH') {
      setCreditType('COMPANY');
      setProofFile(null);
      setProofPreview(null);
    } else {
      setCreditType('PERSONAL');
    }
  };
  
  const handleCollectInterest = async () => {
    if (!amount || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    
    // Check proof requirement for non-CASH payments
    if (creditType === 'PERSONAL' && !proofFile) {
      toast({ title: 'Error', description: 'Proof is required for non-CASH payments', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('loanId', loan.id);
      formData.append('amount', amount.toString());
      formData.append('paymentMode', paymentMode);
      formData.append('collectedBy', userId);
      formData.append('remarks', remarks);
      if (proofFile) {
        formData.append('proof', proofFile);
      }
      
      const response = await fetch('/api/loan/interest-payment', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({ 
          title: 'Interest Collected', 
          description: `₹${formatCurrency(amount)} interest collected. Receipt: ${data.payment.receiptNumber}` 
        });
        
        // Reset form
        setAmount(monthlyInterestAmount);
        setRemarks('');
        setProofFile(null);
        setProofPreview(null);
        
        // Refresh history
        fetchInterestPaymentHistory();
        
        // Notify parent
        onSuccess();
      } else {
        toast({ 
          title: 'Error', 
          description: data.error || data.message || 'Failed to collect interest', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Error collecting interest:', error);
      toast({ title: 'Error', description: 'Failed to process interest payment', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };
  
  if (!loan) return null;
  
  const principal = loan.sessionForm?.approvedAmount || loan.requestedAmount || loan.approvedAmount;
  const interestRate = loan.sessionForm?.interestRate || loan.interestRate || 12;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            Collect Monthly Interest
          </DialogTitle>
          <DialogDescription>
            Collect interest payment for interest-only loan
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Loan Summary */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Loan No.</p>
                <p className="font-semibold">{loan.applicationNo || loan.identifier}</p>
              </div>
              <div>
                <p className="text-gray-500">Principal</p>
                <p className="font-semibold">{formatCurrency(principal)}</p>
              </div>
              <div>
                <p className="text-gray-500">Interest Rate</p>
                <p className="font-semibold">{interestRate}%</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Interest</p>
                <p className="font-semibold text-purple-600">{formatCurrency(monthlyInterestAmount)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Interest Collected</span>
                <Badge className="bg-purple-100 text-purple-700">{formatCurrency(totalInterestPaid)}</Badge>
              </div>
            </div>
          </div>
          
          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm">Recent Collections</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {paymentHistory.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                    <div>
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      <span className="text-gray-500 ml-2">via {payment.paymentMode}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(payment.createdAt)}</p>
                      <p className="text-xs text-gray-400">{payment.receiptNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Credit Rules Info */}
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div className="text-xs text-emerald-700">
                <p className="font-semibold">Credit Collection Rules:</p>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li><strong>CASH payment:</strong> Increases Company Credit (no proof required)</li>
                  <li><strong>UPI/Bank/Cheque:</strong> Increases Personal Credit (proof required)</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Payment Mode */}
          <div>
            <Label>Payment Mode *</Label>
            <Select value={paymentMode} onValueChange={handlePaymentModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash (→ Company Credit)</SelectItem>
                <SelectItem value="UPI">UPI (→ Personal Credit)</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer (→ Personal Credit)</SelectItem>
                <SelectItem value="CHEQUE">Cheque (→ Personal Credit)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Credit Selection */}
          <div className={`p-4 rounded-lg border ${creditType === 'PERSONAL' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
            <Label className={`${creditType === 'PERSONAL' ? 'text-amber-800' : 'text-blue-800'} font-semibold mb-2 block`}>
              Credit Will Increase To (Auto-selected based on payment mode)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={creditType === 'PERSONAL' ? 'default' : 'outline'}
                className={creditType === 'PERSONAL' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                onClick={() => setCreditType('PERSONAL')}
                disabled={paymentMode === 'CASH'}
              >
                <User className="h-4 w-4 mr-2" />
                Personal
                <span className="ml-2 text-xs">₹{formatCurrency(personalCredit + (creditType === 'PERSONAL' ? amount : 0))}</span>
              </Button>
              <Button
                type="button"
                variant={creditType === 'COMPANY' ? 'default' : 'outline'}
                className={creditType === 'COMPANY' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                onClick={() => setCreditType('COMPANY')}
                disabled={paymentMode !== 'CASH'}
              >
                <Building className="h-4 w-4 mr-2" />
                Company
                <span className="ml-2 text-xs">₹{formatCurrency(companyCredit + (creditType === 'COMPANY' ? amount : 0))}</span>
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Current: Personal ₹{formatCurrency(personalCredit)} | Company ₹{formatCurrency(companyCredit)}
            </p>
          </div>
          
          {/* Amount */}
          <div>
            <Label>Interest Amount (₹) *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAmount(monthlyInterestAmount)}
              >
                Set Default
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Expected monthly interest: ₹{formatCurrency(monthlyInterestAmount)}
            </p>
          </div>
          
          {/* Proof Upload - Only required for non-CASH payments */}
          {creditType === 'PERSONAL' && (
            <div>
              <Label className="flex items-center gap-1">
                Payment Proof *
                <span className="text-xs text-gray-500">(Required for Personal Credit)</span>
              </Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="interest-proof-upload"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleProofUpload}
                />
                <label htmlFor="interest-proof-upload" className="cursor-pointer">
                  {proofPreview ? (
                    <img src={proofPreview} alt="Proof Preview" className="max-h-32 mx-auto rounded" />
                  ) : proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <FileCheck className="h-8 w-8" />
                      <p>{proofFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload proof</p>
                      <p className="text-xs text-gray-400">Image or PDF (max 10MB)</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}
          
          {/* No proof needed message for CASH + COMPANY */}
          {paymentMode === 'CASH' && creditType === 'COMPANY' && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">No proof required for CASH payment with Company Credit</span>
              </div>
            </div>
          )}
          
          {/* Remarks */}
          <div>
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="bg-purple-500 hover:bg-purple-600"
            onClick={handleCollectInterest}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Collect ₹{formatCurrency(amount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
