'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Info, Percent } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import type { Loan, SessionForm, CalculatedEMI } from '../types';

interface SanctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  sessionForm: SessionForm;
  setSessionForm: (form: SessionForm) => void;
  calculatedEMI: CalculatedEMI | null;
  saving: boolean;
  onCreateSanction: () => void;
}

export default function SanctionDialog({
  open,
  onOpenChange,
  selectedLoan,
  sessionForm,
  setSessionForm,
  calculatedEMI,
  saving,
  onCreateSanction
}: SanctionDialogProps) {
  // Check if this is an INTEREST_ONLY loan
  const isInterestOnlyLoan = selectedLoan?.loanType === 'INTEREST_ONLY';
  
  // Calculate monthly interest for INTEREST_ONLY loans
  const monthlyInterest = isInterestOnlyLoan && sessionForm.approvedAmount && sessionForm.interestRate
    ? (sessionForm.approvedAmount * sessionForm.interestRate / 100) / 12
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Create Loan Sanction
            {isInterestOnlyLoan && (
              <Badge className="bg-purple-100 text-purple-700 ml-2">INTEREST ONLY</Badge>
            )}
          </DialogTitle>
          <DialogDescription>{selectedLoan?.applicationNo} - {selectedLoan?.customer?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Approved Amount (₹) *</Label>
              <Input type="number" value={sessionForm.approvedAmount} onChange={(e) => setSessionForm({...sessionForm, approvedAmount: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <Label>Interest Rate (% p.a.) *</Label>
              <Input type="number" step="0.1" value={sessionForm.interestRate} onChange={(e) => setSessionForm({...sessionForm, interestRate: parseFloat(e.target.value) || 0})} />
            </div>
            {/* Tenure field - hidden for INTEREST_ONLY loans */}
            {!isInterestOnlyLoan && (
              <div>
                <Label>Tenure (months) *</Label>
                <Input type="number" value={sessionForm.tenure} onChange={(e) => setSessionForm({...sessionForm, tenure: parseInt(e.target.value) || 0})} />
              </div>
            )}
            <div>
              <Label>Interest Type *</Label>
              <Select value={sessionForm.interestType} onValueChange={(value: 'FLAT' | 'REDUCING') => setSessionForm({...sessionForm, interestType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interest type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">FLAT - Fixed interest on principal</SelectItem>
                  <SelectItem value="REDUCING">REDUCING - Interest on outstanding balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              {isInterestOnlyLoan 
                ? 'This is an INTEREST ONLY loan. Customer pays monthly interest until loan is started.'
                : 'Processing fee is automatically calculated based on the loan product settings.'
              }
            </AlertDescription>
          </Alert>

          {/* INTEREST_ONLY Loan - Show Monthly Interest */}
          {isInterestOnlyLoan && sessionForm.approvedAmount > 0 && sessionForm.interestRate > 0 && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Monthly Interest Payment
                  </h4>
                  <Badge className="bg-purple-100 text-purple-700">
                    INTEREST ONLY
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <p className="text-purple-600">Monthly Interest Amount</p>
                    <p className="text-3xl font-bold text-purple-700">{formatCurrency(monthlyInterest)}</p>
                    <p className="text-xs text-purple-500 mt-1">Customer pays this amount every month until loan starts</p>
                  </div>
                  <div>
                    <p className="text-purple-600">Principal Amount</p>
                    <p className="text-lg font-semibold text-purple-700">{formatCurrency(sessionForm.approvedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-purple-600">Interest Rate</p>
                    <p className="text-lg font-semibold text-purple-700">{sessionForm.interestRate}% p.a.</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                  <p className="text-xs text-purple-700">
                    <strong>Note:</strong> Principal repayment will start when admin clicks "Start Loan" button. 
                    At that time, tenure and EMI will be configured.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regular Loan - Show EMI Calculation */}
          {!isInterestOnlyLoan && calculatedEMI && (
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-emerald-800">EMI Calculation</h4>
                  <Badge className={sessionForm.interestType === 'FLAT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                    {sessionForm.interestType === 'FLAT' ? 'FLAT Interest' : 'REDUCING Interest'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-emerald-600">Monthly EMI</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calculatedEMI.emi)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600">Total Interest</p>
                    <p className="text-lg font-semibold text-emerald-700">{formatCurrency(calculatedEMI.totalInterest)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600">Total Amount</p>
                    <p className="text-lg font-semibold text-emerald-700">{formatCurrency(calculatedEMI.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600">Principal</p>
                    <p className="text-lg font-semibold text-emerald-700">{formatCurrency(sessionForm.approvedAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>Special Conditions</Label>
            <Textarea placeholder="Any special terms or conditions..." value={sessionForm.specialConditions} onChange={(e) => setSessionForm({...sessionForm, specialConditions: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={isInterestOnlyLoan ? "bg-purple-500 hover:bg-purple-600" : "bg-emerald-500 hover:bg-emerald-600"} onClick={onCreateSanction} disabled={saving}>
            {saving ? 'Creating...' : 'Create Sanction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
