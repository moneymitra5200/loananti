'use client';

import { memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  IndianRupee, CheckCircle, Receipt, Percent, Upload, 
  FileCheck, User, Building, Wallet, AlertCircle, Loader2,
  Banknote, Landmark, ShieldMinus, AlertTriangle
} from 'lucide-react';

import { formatCurrency } from '@/utils/helpers';
import type { EMISchedule, EMIPaymentForm } from './types';

interface MirrorCompanyInfo {
  id: string;
  name: string;
  code: string;
}

interface EMIPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEMI: EMISchedule | null;
  emiPaymentForm: EMIPaymentForm;
  setEmiPaymentForm: React.Dispatch<React.SetStateAction<EMIPaymentForm>>;
  personalCredit: number;
  companyCredit: number;
  currentUserRole: string;
  proofPreview: string | null;
  payingEMI: boolean;
  onProofUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPay: () => Promise<void>;
  // Mirror loan info - when loan has mirror, payment goes to mirror company
  hasMirrorLoan?: boolean;
  mirrorCompany?: MirrorCompanyInfo | null;
  originalCompanyName?: string;
}

const EMIPaymentDialog = memo(function EMIPaymentDialog({
  open,
  onOpenChange,
  selectedEMI,
  emiPaymentForm,
  setEmiPaymentForm,
  personalCredit,
  companyCredit,
  currentUserRole,
  proofPreview,
  payingEMI,
  onProofUpload,
  onPay,
  hasMirrorLoan = false,
  mirrorCompany = null,
  originalCompanyName = 'Your Company'
}: EMIPaymentDialogProps) {
  // Calculate remaining amount
  const totalAmount = (selectedEMI?.emiAmount || 0) + (selectedEMI?.lateFee || 0);
  const alreadyPaid = selectedEMI?.paidAmount || 0;
  const remainingAmount = totalAmount - alreadyPaid;
  const remainingPrincipal = (selectedEMI?.principalAmount || 0) - (selectedEMI?.paidPrincipal || 0);
  const remainingInterest = (selectedEMI?.interestAmount || 0) - (selectedEMI?.paidInterest || 0);
  
  // Handle credit type change with auto payment mode
  const handleCreditTypeChange = (creditType: 'PERSONAL' | 'COMPANY') => {
    if (creditType === 'PERSONAL') {
      // Personal Credit: Only CASH allowed
      setEmiPaymentForm({
        ...emiPaymentForm,
        creditType: 'PERSONAL',
        paymentMode: 'CASH'
      });
    } else {
      // Company Credit: Default to ONLINE (standard bank transfer)
      setEmiPaymentForm({
        ...emiPaymentForm,
        creditType: 'COMPANY',
        paymentMode: 'ONLINE'
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            Pay EMI #{selectedEMI?.emiNumber}
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
                <div className="text-xs mt-2 pt-2 border-t">
                  Remaining: Principal ₹{formatCurrency(remainingPrincipal)} | Interest ₹{formatCurrency(remainingInterest)}
                </div>
              </div>
            ) : (
              <>
                Due Amount: ₹{formatCurrency(selectedEMI?.emiAmount || 0)}
                {selectedEMI?.lateFee && selectedEMI.lateFee > 0 && (
                  <span className="text-red-600"> + Late Fee: ₹{formatCurrency(selectedEMI.lateFee)}</span>
                )}
                {selectedEMI && (
                  <span className="block text-xs mt-1">Principal: ₹{formatCurrency(selectedEMI.principalAmount)} | Interest: ₹{formatCurrency(selectedEMI.interestAmount)}</span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Type Selection - Only for non-ACCOUNTANT roles */}
          {currentUserRole !== 'ACCOUNTANT' && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <Label className="text-purple-800 font-semibold mb-3 block">Payment Type *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={emiPaymentForm.paymentType === 'FULL' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${emiPaymentForm.paymentType === 'FULL' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                  onClick={() => {
                    setEmiPaymentForm({
                      ...emiPaymentForm,
                      paymentType: 'FULL',
                      amount: remainingAmount,
                      remainingAmount: 0,
                      remainingPaymentDate: ''
                    });
                  }}
                >
                  <CheckCircle className="h-4 w-4 mb-1" />
                  <span className="text-xs">Full EMI</span>
                </Button>
                <Button
                  type="button"
                  variant={emiPaymentForm.paymentType === 'PARTIAL' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${emiPaymentForm.paymentType === 'PARTIAL' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                  onClick={() => {
                    const defaultPartialAmount = Math.floor(remainingAmount / 2);
                    setEmiPaymentForm({
                      ...emiPaymentForm,
                      paymentType: 'PARTIAL',
                      amount: defaultPartialAmount,
                      remainingAmount: remainingAmount - defaultPartialAmount
                    });
                  }}
                >
                  <Receipt className="h-4 w-4 mb-1" />
                  <span className="text-xs">Partial</span>
                </Button>
                <Button
                  type="button"
                  variant={emiPaymentForm.paymentType === 'INTEREST_ONLY' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${emiPaymentForm.paymentType === 'INTEREST_ONLY' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                  onClick={() => {
                    setEmiPaymentForm({
                      ...emiPaymentForm,
                      paymentType: 'INTEREST_ONLY',
                      amount: remainingInterest
                    });
                  }}
                >
                  <Percent className="h-4 w-4 mb-1" />
                  <span className="text-xs">Interest Only</span>
                </Button>
                {/* Principal Only — interest is written off as Irrecoverable Debts */}
                <Button
                  type="button"
                  variant={emiPaymentForm.paymentType === 'PRINCIPAL_ONLY' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${
                    emiPaymentForm.paymentType === 'PRINCIPAL_ONLY'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'border-red-300 text-red-600 hover:bg-red-50'
                  }`}
                  onClick={() => {
                    setEmiPaymentForm({
                      ...emiPaymentForm,
                      paymentType: 'PRINCIPAL_ONLY',
                      amount: remainingPrincipal,
                      remainingAmount: 0,
                      remainingPaymentDate: ''
                    });
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mb-1" />
                  <span className="text-xs">Principal Only</span>
                </Button>
              </div>
            </div>
          )}

          {/* Partial Payment - When will rest be paid */}
          {emiPaymentForm.paymentType === 'PARTIAL' && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Label className="text-orange-800 font-semibold mb-2 block">When will the remaining amount be paid? *</Label>
              <Input
                type="date"
                value={emiPaymentForm.remainingPaymentDate}
                onChange={(e) => {
                  setEmiPaymentForm({
                    ...emiPaymentForm,
                    remainingPaymentDate: e.target.value,
                    remainingAmount: remainingAmount - emiPaymentForm.amount
                  });
                }}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-orange-600 mt-2">
                Remaining ₹{formatCurrency(emiPaymentForm.remainingAmount || (remainingAmount - emiPaymentForm.amount))} will be due on selected date.
              </p>
            </div>
          )}

          {/* Interest Only Payment Info */}
          {emiPaymentForm.paymentType === 'INTEREST_ONLY' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Interest Only Payment</span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                You are paying only the interest portion: ₹{formatCurrency(remainingInterest)}. 
                The principal portion (₹{formatCurrency(remainingPrincipal)}) will be deferred and carried forward to the next EMI.
              </p>
            </div>
          )}

          {/* Principal Only Payment Info */}
          {emiPaymentForm.paymentType === 'PRINCIPAL_ONLY' && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Principal Only Payment</span>
              </div>
              <p className="text-xs text-red-700 mt-2">
                Collecting only the principal: <strong>₹{formatCurrency(remainingPrincipal)}</strong>.
              </p>
              <p className="text-xs text-red-600 mt-1">
                Interest of <strong>₹{formatCurrency(remainingInterest)}</strong> will be written off as <em>Irrecoverable Debts</em> in the company books.
              </p>
              {hasMirrorLoan && mirrorCompany && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Mirror loan: interest written off in <strong>{mirrorCompany.name}</strong>'s books.
                </p>
              )}
            </div>
          )}

          {/* ── Penalty Waiver Section ───────────────────────────── */}
          {(selectedEMI?.lateFee || 0) > 0 && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
              <Label className="text-red-800 font-semibold mb-3 block flex items-center gap-2">
                <ShieldMinus className="h-4 w-4" />
                Penalty Management
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700">Total Penalty Accrued:</span>
                  <span className="font-bold text-red-800">₹{(selectedEMI?.lateFee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <Label className="text-xs text-red-700 mb-1 block">Penalty to Waive (₹) — Leave 0 to charge full penalty</Label>
                  <Input
                    type="number"
                    min={0}
                    max={selectedEMI?.lateFee || 0}
                    value={emiPaymentForm.penaltyWaiver}
                    onChange={e => {
                      const w = Math.min(parseFloat(e.target.value) || 0, selectedEMI?.lateFee || 0);
                      setEmiPaymentForm({ ...emiPaymentForm, penaltyWaiver: w });
                    }}
                    className="border-red-300 focus:border-red-500"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-red-200">
                  <span className="text-gray-600">Penalty Customer Pays:</span>
                  <span className="font-bold text-orange-700">
                    ₹{Math.max(0, (selectedEMI?.lateFee || 0) - emiPaymentForm.penaltyWaiver).toLocaleString('en-IN')}
                  </span>
                </div>
                {emiPaymentForm.penaltyWaiver > 0 && (
                  <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
                    ⚠️ Super Admin will be notified of the ₹{emiPaymentForm.penaltyWaiver.toLocaleString('en-IN')} penalty waiver.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mirror Loan Payment Info Banner */}
          {hasMirrorLoan && mirrorCompany && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Mirror Loan Payment</span>
              </div>
              <p className="text-sm text-blue-700">
                This loan is mirrored to <strong>{mirrorCompany.name}</strong>.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                <strong>Payment will be recorded in: {mirrorCompany.name}'s Bank/Cashbook</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Original loan ({originalCompanyName}) is for record-keeping only.
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
                  emiPaymentForm.creditType === 'PERSONAL' 
                    ? 'border-amber-500 bg-amber-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User className={`h-5 w-5 ${emiPaymentForm.creditType === 'PERSONAL' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${emiPaymentForm.creditType === 'PERSONAL' ? 'text-amber-800' : 'text-gray-600'}`}>
                    Personal Credit
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Banknote className="h-3 w-3" />
                    <span>CASH only</span>
                  </div>
                  <div className="text-gray-500">
                    Entry: {originalCompanyName} Cashbook
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
                  emiPaymentForm.creditType === 'COMPANY' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building className={`h-5 w-5 ${emiPaymentForm.creditType === 'COMPANY' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${emiPaymentForm.creditType === 'COMPANY' ? 'text-blue-800' : 'text-gray-600'}`}>
                    Company Credit
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Landmark className="h-3 w-3" />
                    <span>ONLINE or CASH</span>
                  </div>
                  <div className="text-gray-500">
                    Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name}'s Books` : `${originalCompanyName}'s Books`}
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
          {emiPaymentForm.creditType === 'PERSONAL' && (
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
                  <strong>Entry will be recorded in:</strong> {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name} Cashbook` : `${originalCompanyName} Cashbook`}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  +₹{formatCurrency(emiPaymentForm.amount)} will be added to your Personal Credit
                </p>
              </div>
            </div>
          )}

          {/* Company Credit - ONLINE or CASH */}
          {emiPaymentForm.creditType === 'COMPANY' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-blue-800 font-semibold mb-3 block">Payment Mode *</Label>
              <div className="grid grid-cols-2 gap-3">
              {/* ONLINE Option */}
                <button
                  type="button"
                  onClick={() => setEmiPaymentForm({ ...emiPaymentForm, paymentMode: 'ONLINE' })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    emiPaymentForm.paymentMode === 'ONLINE' 
                      ? 'border-blue-500 bg-blue-100' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className={`h-4 w-4 ${emiPaymentForm.paymentMode === 'ONLINE' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${emiPaymentForm.paymentMode === 'ONLINE' ? 'text-blue-800' : 'text-gray-600'}`}>
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name}` : 'Loan Company'}&apos;s Bank Account
                  </p>
                </button>

                {/* CASH Option */}
                <button
                  type="button"
                  onClick={() => setEmiPaymentForm({ ...emiPaymentForm, paymentMode: 'CASH' })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    emiPaymentForm.paymentMode === 'CASH' 
                      ? 'border-blue-500 bg-blue-100' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className={`h-4 w-4 ${emiPaymentForm.paymentMode === 'CASH' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${emiPaymentForm.paymentMode === 'CASH' ? 'text-blue-800' : 'text-gray-600'}`}>
                      CASH
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Entry: {hasMirrorLoan && mirrorCompany ? `${mirrorCompany.name}` : 'Loan Company'}&apos;s Cashbook
                  </p>
                </button>

                {/* SPLIT Option */}
                <button
                  type="button"
                  onClick={() => setEmiPaymentForm({ ...emiPaymentForm, paymentMode: 'SPLIT', splitCashAmount: 0, splitOnlineAmount: 0 })}
                  className={`p-3 rounded-lg border-2 text-left transition-all col-span-2 ${
                    emiPaymentForm.paymentMode === 'SPLIT' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-orange-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className={`h-4 w-4 ${emiPaymentForm.paymentMode === 'SPLIT' ? 'text-orange-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${emiPaymentForm.paymentMode === 'SPLIT' ? 'text-orange-800' : 'text-gray-600'}`}>
                      SPLIT (Part Cash + Part Online)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Penalty is included in the split total</p>
                </button>
              </div>

              {/* SPLIT: Cash + Online inputs */}
              {emiPaymentForm.paymentMode === 'SPLIT' && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-orange-700">
                    💡 Total to split: ₹{formatCurrency(emiPaymentForm.amount)} — enter cash and online portions.
                    {(selectedEMI?.lateFee || 0) > 0 && ` (includes net penalty ₹${Math.max(0, (selectedEMI?.lateFee || 0) - emiPaymentForm.penaltyWaiver).toLocaleString('en-IN')})`}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-emerald-700">💵 Cash Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={emiPaymentForm.splitCashAmount || ''}
                        onChange={(e) => {
                          const cash = parseFloat(e.target.value) || 0;
                          setEmiPaymentForm({
                            ...emiPaymentForm,
                            splitCashAmount: cash,
                            splitOnlineAmount: Math.max(0, emiPaymentForm.amount - cash)
                          });
                        }}
                        className="border-emerald-300 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-700">📱 Online Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={emiPaymentForm.splitOnlineAmount || ''}
                        onChange={(e) => {
                          const online = parseFloat(e.target.value) || 0;
                          setEmiPaymentForm({
                            ...emiPaymentForm,
                            splitOnlineAmount: online,
                            splitCashAmount: Math.max(0, emiPaymentForm.amount - online)
                          });
                        }}
                        className="border-blue-300 mt-1"
                      />
                    </div>
                  </div>
                  <div className={`text-xs font-medium flex justify-between px-1 ${
                    Math.abs(((emiPaymentForm.splitCashAmount || 0) + (emiPaymentForm.splitOnlineAmount || 0)) - emiPaymentForm.amount) < 1
                      ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    <span>Split Total: ₹{formatCurrency((emiPaymentForm.splitCashAmount || 0) + (emiPaymentForm.splitOnlineAmount || 0))}</span>
                    <span>Required: ₹{formatCurrency(emiPaymentForm.amount)}</span>
                  </div>
                </div>
              )}

              {/* Penalty Destination — only for non-SPLIT mode when penalty exists */}
              {emiPaymentForm.paymentMode !== 'SPLIT' && (selectedEMI?.lateFee || 0) > 0 && emiPaymentForm.penaltyWaiver < (selectedEMI?.lateFee || 0) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-xs text-red-700 font-semibold block mb-2">Penalty collected via</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEmiPaymentForm({ ...emiPaymentForm, penaltyPaymentMode: 'CASH' })}
                      className={`p-2 rounded border-2 text-sm font-medium transition-all ${
                        (emiPaymentForm.penaltyPaymentMode || 'CASH') === 'CASH'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <Banknote className="h-3 w-3 inline mr-1" />Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmiPaymentForm({ ...emiPaymentForm, penaltyPaymentMode: 'BANK' })}
                      className={`p-2 rounded border-2 text-sm font-medium transition-all ${
                        emiPaymentForm.penaltyPaymentMode === 'BANK'
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <Landmark className="h-3 w-3 inline mr-1" />Bank
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Net penalty ₹{Math.max(0, (selectedEMI?.lateFee || 0) - emiPaymentForm.penaltyWaiver).toLocaleString('en-IN')} → {(emiPaymentForm.penaltyPaymentMode || 'CASH') === 'BANK' ? 'Bank Account' : 'Cash Book'}
                  </p>
                </div>
              )}

              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Entry will be recorded in:</strong> {' '}
                  {hasMirrorLoan && mirrorCompany 
                    ? (emiPaymentForm.paymentMode === 'ONLINE' 
                      ? `${mirrorCompany.name}'s Bank Account` 
                      : emiPaymentForm.paymentMode === 'SPLIT'
                        ? `${mirrorCompany.name}'s Cash + Bank`
                        : `${mirrorCompany.name}'s Cashbook`)
                    : (emiPaymentForm.paymentMode === 'ONLINE' 
                      ? "Loan Company's Bank Account" 
                      : emiPaymentForm.paymentMode === 'SPLIT'
                        ? "Loan Company's Cash + Bank"
                        : "Loan Company's Cashbook")}
                </p>
                {emiPaymentForm.paymentMode === 'CASH' ? (
                  <p className="text-xs text-blue-600 mt-1">
                    +₹{formatCurrency(emiPaymentForm.amount)} will be added to Company Credit
                  </p>
                ) : emiPaymentForm.paymentMode === 'ONLINE' ? (
                  <p className="text-xs text-gray-500 mt-1">
                    ℹ️ Online payment — money goes to Bank. No credit balance change.
                  </p>
                ) : emiPaymentForm.paymentMode === 'SPLIT' ? (
                  <p className="text-xs text-orange-600 mt-1">
                    +₹{formatCurrency(emiPaymentForm.splitCashAmount || 0)} credit (cash portion only)
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Amount - Only editable for PARTIAL payment */}
          {emiPaymentForm.paymentType === 'PARTIAL' ? (
            <div>
              <Label>Payment Amount (₹) *</Label>
              <Input
                type="number"
                value={emiPaymentForm.amount}
                onChange={(e) => {
                  const newAmount = parseFloat(e.target.value) || 0;
                  setEmiPaymentForm({ 
                    ...emiPaymentForm, 
                    amount: newAmount,
                    remainingAmount: remainingAmount - newAmount
                  });
                }}
              />
              <p className="text-xs text-orange-600 mt-1">
                Remaining after payment: ₹{formatCurrency(remainingAmount - emiPaymentForm.amount)}
              </p>
            </div>
          ) : emiPaymentForm.paymentType === 'FULL' && currentUserRole !== 'ACCOUNTANT' ? (
            /* FULL EMI — allow staff to edit principal/interest split */
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-emerald-800 font-semibold">Payment Amount</Label>
                <span className="text-xl font-bold text-emerald-700">₹{formatCurrency(emiPaymentForm.amount)}</span>
              </div>
              <p className="text-xs text-emerald-600">You can edit the principal and interest breakdown (mirror loan just records the total paid, not the split)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Principal (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={emiPaymentForm.editedPrincipal ?? remainingPrincipal}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setEmiPaymentForm({ ...emiPaymentForm, editedPrincipal: p, editedInterest: Math.max(0, emiPaymentForm.amount - p) });
                    }}
                    className="mt-1 border-emerald-300"
                    placeholder={remainingPrincipal.toFixed(2)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Interest (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={emiPaymentForm.editedInterest ?? remainingInterest}
                    onChange={(e) => {
                      const i = parseFloat(e.target.value) || 0;
                      setEmiPaymentForm({ ...emiPaymentForm, editedInterest: i, editedPrincipal: Math.max(0, emiPaymentForm.amount - i) });
                    }}
                    className="mt-1 border-emerald-300"
                    placeholder={remainingInterest.toFixed(2)}
                  />
                </div>
              </div>
              {((emiPaymentForm.editedPrincipal !== undefined || emiPaymentForm.editedInterest !== undefined)) && (
                <p className="text-xs text-amber-600">
                  ⚠️ Edited split: P ₹{formatCurrency(emiPaymentForm.editedPrincipal ?? remainingPrincipal)} + I ₹{formatCurrency(emiPaymentForm.editedInterest ?? remainingInterest)} = ₹{formatCurrency((emiPaymentForm.editedPrincipal ?? remainingPrincipal) + (emiPaymentForm.editedInterest ?? remainingInterest))}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <Label className="text-gray-600">Payment Amount</Label>
                <span className="text-xl font-bold text-gray-900">₹{formatCurrency(emiPaymentForm.amount)}</span>
              </div>
            </div>
          )}


          {/* Reference */}
          <div>
            <Label>Transaction Reference</Label>
            <Input
              value={emiPaymentForm.paymentRef}
              onChange={(e) => setEmiPaymentForm({ ...emiPaymentForm, paymentRef: e.target.value })}
              placeholder="UTR/Transaction ID (optional)"
            />
          </div>

          {/* Remarks */}
          <div>
            <Label>Remarks</Label>
            <Textarea
              value={emiPaymentForm.remarks}
              onChange={(e) => setEmiPaymentForm({ ...emiPaymentForm, remarks: e.target.value })}
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
            disabled={payingEMI}
          >
            {payingEMI ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay ₹{formatCurrency(emiPaymentForm.amount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EMIPaymentDialog;
