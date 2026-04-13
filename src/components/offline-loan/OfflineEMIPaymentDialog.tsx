'use client';

import { memo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  IndianRupee, CheckCircle, Receipt, Percent, 
  User, Building, Wallet, AlertCircle, Loader2,
  Banknote, Landmark
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
}

interface OfflineEMIPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEMI: EMI | null;
  loanId: string;
  userId: string;
  userRole: string;
  personalCredit: number;
  companyCredit: number;
  onPaymentSuccess: () => void;
  isInterestOnlyLoan?: boolean;
  interestOnlyAmount?: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const OfflineEMIPaymentDialog = memo(function OfflineEMIPaymentDialog({
  open,
  onOpenChange,
  selectedEMI,
  loanId,
  userId,
  userRole,
  personalCredit,
  companyCredit,
  onPaymentSuccess,
  isInterestOnlyLoan = false,
  interestOnlyAmount = 0
}: OfflineEMIPaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL' | 'INTEREST_ONLY'>('FULL');
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('CASH');
  const [creditType, setCreditType] = useState<'PERSONAL' | 'COMPANY'>('COMPANY');
  const [paymentRef, setPaymentRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paying, setPaying] = useState(false);
  const [remainingPaymentDate, setRemainingPaymentDate] = useState('');
  // Staff-editable principal/interest split for journal entry
  const [editedPrincipal, setEditedPrincipal] = useState<string>('');
  const [editedInterest, setEditedInterest] = useState<string>('');

  // Calculate amounts
  const totalAmount = isInterestOnlyLoan ? interestOnlyAmount : (selectedEMI?.totalAmount || 0);
  const alreadyPaid = selectedEMI?.paidAmount || 0;
  const remainingAmount = totalAmount - alreadyPaid;
  const remainingPrincipal = isInterestOnlyLoan ? 0 : ((selectedEMI?.principalAmount || 0) - (selectedEMI?.paidPrincipal || 0));
  const remainingInterest = isInterestOnlyLoan ? interestOnlyAmount : ((selectedEMI?.interestAmount || 0) - (selectedEMI?.paidInterest || 0));

  // Reset form when dialog opens
  useEffect(() => {
    if (open && selectedEMI) {
      setPaymentType('FULL');
      setAmount(remainingAmount);
      setPaymentMode('CASH');
      setCreditType('COMPANY');
      setPaymentRef('');
      setRemarks('');
      setRemainingPaymentDate('');
      // Default split = EMI's own principal + interest
      setEditedPrincipal(String(selectedEMI.principalAmount ?? ''));
      setEditedInterest(String(selectedEMI.interestAmount ?? ''));
    }
  }, [open, selectedEMI, remainingAmount]);

  // Handle credit type change with auto payment mode
  const handleCreditTypeChange = (type: 'PERSONAL' | 'COMPANY') => {
    if (type === 'PERSONAL') {
      // Personal Credit: Only CASH allowed
      setCreditType('PERSONAL');
      setPaymentMode('CASH');
    } else {
      // Company Credit: Default to CASH (user can change to ONLINE)
      setCreditType('COMPANY');
      setPaymentMode('CASH');
    }
  };

  // Handle payment type change
  const handlePaymentTypeChange = (type: 'FULL' | 'PARTIAL' | 'INTEREST_ONLY') => {
    setPaymentType(type);
    if (type === 'FULL') {
      setAmount(remainingAmount);
    } else if (type === 'INTEREST_ONLY') {
      setAmount(remainingInterest);
    } else {
      setAmount(Math.floor(remainingAmount / 2));
    }
  };

  // Process payment
  const onPay = async () => {
    if (!userId || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    // Validate partial payment date
    if (paymentType === 'PARTIAL' && !remainingPaymentDate) {
      toast({ title: 'Error', description: 'Please select when the remaining amount will be paid', variant: 'destructive' });
      return;
    }

    setPaying(true);
    try {
      // Determine API action
      const isInterestOnlyPayment = isInterestOnlyLoan || paymentType === 'INTEREST_ONLY';
      const action = isInterestOnlyPayment ? 'pay-interest-only-loan' : 'pay-emi';

      const requestBody: Record<string, unknown> = {
        action,
        userId,
        userRole,
        paymentMode,
        paymentReference: paymentRef,
        creditType,
        remarks,
        amount
      };

      if (isInterestOnlyPayment) {
        requestBody.loanId = loanId;
        requestBody.paymentType = 'INTEREST_ONLY';
      } else {
        requestBody.emiId = selectedEMI?.id;
        requestBody.paymentType = paymentType;
        if (paymentType === 'PARTIAL') {
          requestBody.remainingPaymentDate = remainingPaymentDate;
        }
        // Include staff-edited principal/interest split if provided
        if (paymentType === 'FULL' && editedPrincipal !== '' && editedInterest !== '') {
          requestBody.principalComponent = parseFloat(editedPrincipal) || 0;
          requestBody.interestComponent  = parseFloat(editedInterest)  || 0;
        }
      }

      const res = await fetch('/api/offline-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: '✅ Payment Successful!',
          description: `₹${formatCurrency(amount)} collected. Credit added to ${creditType} account.`,
        });
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

  if (!selectedEMI && !isInterestOnlyLoan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            {isInterestOnlyLoan ? 'Pay Interest Only' : `Pay EMI #${selectedEMI?.installmentNumber}`}
          </DialogTitle>
          <DialogDescription>
            {alreadyPaid > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Total EMI:</span>
                  <span className="font-medium">₹{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Already Paid:</span>
                  <span className="font-medium">₹{formatCurrency(alreadyPaid)}</span>
                </div>
                <div className="flex justify-between text-orange-600 font-semibold">
                  <span>Remaining:</span>
                  <span>₹{formatCurrency(remainingAmount)}</span>
                </div>
                {!isInterestOnlyLoan && (
                  <div className="text-xs mt-2 pt-2 border-t">
                    Remaining: Principal ₹{formatCurrency(remainingPrincipal)} | Interest ₹{formatCurrency(remainingInterest)}
                  </div>
                )}
              </div>
            ) : (
              <>
                Due Amount: ₹{formatCurrency(totalAmount)}
                {!isInterestOnlyLoan && selectedEMI && (
                  <span className="block text-xs mt-1">Principal: ₹{formatCurrency(selectedEMI.principalAmount)} | Interest: ₹{formatCurrency(selectedEMI.interestAmount)}</span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Type Selection - Only for regular loans */}
          {!isInterestOnlyLoan && userRole !== 'ACCOUNTANT' && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <Label className="text-purple-800 font-semibold mb-3 block">Payment Type *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentType === 'FULL' ? 'default' : 'outline'}
                  className={paymentType === 'FULL' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  onClick={() => handlePaymentTypeChange('FULL')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Full
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'PARTIAL' ? 'default' : 'outline'}
                  className={paymentType === 'PARTIAL' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  onClick={() => handlePaymentTypeChange('PARTIAL')}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Partial
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'INTEREST_ONLY' ? 'default' : 'outline'}
                  className={paymentType === 'INTEREST_ONLY' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  onClick={() => handlePaymentTypeChange('INTEREST_ONLY')}
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Interest
                </Button>
              </div>
            </div>
          )}

          {/* Partial Payment - When will rest be paid */}
          {paymentType === 'PARTIAL' && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Label className="text-orange-800 font-semibold mb-2 block">When will the remaining amount be paid? *</Label>
              <Input
                type="date"
                value={remainingPaymentDate}
                onChange={(e) => setRemainingPaymentDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-orange-600 mt-2">
                Remaining ₹{formatCurrency(remainingAmount - amount)} will be due on selected date.
              </p>
            </div>
          )}

          {/* Interest Only Payment Info */}
          {(paymentType === 'INTEREST_ONLY' || isInterestOnlyLoan) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Interest Only Payment</span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                You are paying only the interest portion: ₹{formatCurrency(remainingInterest || interestOnlyAmount)}.
              </p>
            </div>
          )}

          {/* ========================================== */}
          {/* CREDIT TYPE SELECTION - MAIN CHOICE */}
          {/* ========================================== */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            <Label className="text-slate-800 font-semibold mb-3 block">
              <Wallet className="h-4 w-4 inline mr-2" />
              Credit Type *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Personal Credit Option */}
              <button
                type="button"
                onClick={() => handleCreditTypeChange('PERSONAL')}
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
                    Entry: Company 3 Cashbook
                  </div>
                  <div className="font-medium text-amber-700">
                    Current: ₹{formatCurrency(personalCredit)}
                  </div>
                </div>
              </button>

              {/* Company Credit Option */}
              <button
                type="button"
                onClick={() => handleCreditTypeChange('COMPANY')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  creditType === 'COMPANY' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building className={`h-5 w-5 ${creditType === 'COMPANY' ? 'text-blue-600' : 'text-gray-400'}`} />
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
                    Entry: Loan Company's Books
                  </div>
                  <div className="font-medium text-blue-700">
                    Current: ₹{formatCurrency(companyCredit)}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* PAYMENT MODE - BASED ON CREDIT TYPE */}
          {/* ========================================== */}
          
          {/* Personal Credit - CASH only (fixed) */}
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
                  <strong>Entry will be recorded in:</strong> Company 3 Cashbook
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  +₹{formatCurrency(amount)} will be added to your Personal Credit
                </p>
              </div>
            </div>
          )}

          {/* Company Credit - ONLINE or CASH */}
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
                    Entry: Loan Company's Bank Account
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
                    Entry: Loan Company's Cashbook
                  </p>
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Entry will be recorded in:</strong> {' '}
                  {paymentMode === 'ONLINE' 
                    ? "Loan Company's Bank Account" 
                    : "Loan Company's Cashbook"}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  +₹{formatCurrency(amount)} will be added to Company Credit
                </p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <Label>Payment Amount (₹) *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Principal / Interest Split Edit — FULL payment only, not interest-only loan */}
          {paymentType === 'FULL' && !isInterestOnlyLoan && selectedEMI && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
              <Label className="text-indigo-800 font-semibold block">
                📊 Edit Principal / Interest Split
              </Label>
              <p className="text-xs text-indigo-600">
                Adjust how this payment is split between principal and interest in the accounting books.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Principal (₹)</Label>
                  <Input
                    type="number"
                    value={editedPrincipal}
                    onChange={(e) => setEditedPrincipal(e.target.value)}
                    placeholder={String(selectedEMI.principalAmount)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Interest (₹)</Label>
                  <Input
                    type="number"
                    value={editedInterest}
                    onChange={(e) => setEditedInterest(e.target.value)}
                    placeholder={String(selectedEMI.interestAmount)}
                  />
                </div>
              </div>
              {editedPrincipal !== '' && editedInterest !== '' && (
                <p className="text-xs text-indigo-500">
                  Split total: ₹{(parseFloat(editedPrincipal || '0') + parseFloat(editedInterest || '0')).toLocaleString('en-IN')}
                  {Math.abs((parseFloat(editedPrincipal || '0') + parseFloat(editedInterest || '0')) - amount) > 1 && (
                    <span className="text-amber-600 ml-2">⚠ Does not match payment amount ₹{amount}</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Reference */}
          <div>
            <Label>Transaction Reference</Label>
            <Input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="UTR/Transaction ID (optional)"
            />
          </div>

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
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={onPay}
            disabled={paying}
          >
            {paying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay ₹{formatCurrency(amount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default OfflineEMIPaymentDialog;
