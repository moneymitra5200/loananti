'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Percent, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface InterestOnlyForm {
  customerId: string;
  principalAmount: number;
  interestRate: number;
  purpose: string;
  disbursementMode: string;
  disbursementDate: string;
  documents: Record<string, string>;
}

interface InterestOnlyDialogsProps {
  showInterestOnlyDialog: boolean;
  setShowInterestOnlyDialog: (show: boolean) => void;
  showStartEMIDialog: boolean;
  setShowStartEMIDialog: (show: boolean) => void;
  interestOnlyForm: InterestOnlyForm;
  setInterestOnlyForm: (form: InterestOnlyForm) => void;
  selectedInterestOnlyLoan: any;
  customers: any[];
  user: any;
  fetchInterestOnlyLoans: () => void;
}

export default function InterestOnlyDialogs({
  showInterestOnlyDialog,
  setShowInterestOnlyDialog,
  showStartEMIDialog,
  setShowStartEMIDialog,
  interestOnlyForm,
  setInterestOnlyForm,
  selectedInterestOnlyLoan,
  customers,
  user,
  fetchInterestOnlyLoans,
}: InterestOnlyDialogsProps) {
  const handleCreateInterestOnlyLoan = async () => {
    if (!interestOnlyForm.customerId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    if (interestOnlyForm.principalAmount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid principal amount', variant: 'destructive' });
      return;
    }
    
    try {
      const response = await fetch('/api/offline-loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdById: user?.id,
          createdByRole: user?.role,
          customerId: interestOnlyForm.customerId,
          loanAmount: interestOnlyForm.principalAmount,
          interestRate: interestOnlyForm.interestRate,
          tenure: 0,
          purpose: interestOnlyForm.purpose,
          disbursementMode: interestOnlyForm.disbursementMode,
          disbursementDate: interestOnlyForm.disbursementDate,
          isInterestOnly: true,
          documents: interestOnlyForm.documents,
          status: 'INTEREST_PHASE'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Interest-Only Loan created successfully!' });
        setShowInterestOnlyDialog(false);
        setInterestOnlyForm({
          customerId: '',
          principalAmount: 10000,
          interestRate: 12,
          purpose: '',
          disbursementMode: 'BANK_TRANSFER',
          disbursementDate: new Date().toISOString().split('T')[0],
          documents: {}
        });
        fetchInterestOnlyLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create loan', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create interest-only loan', variant: 'destructive' });
    }
  };

  const handleStartEMI = async () => {
    if (!selectedInterestOnlyLoan) return;
    
    const tenure = parseInt((document.getElementById('emi-tenure') as HTMLInputElement)?.value || '12');
    const rate = parseFloat((document.getElementById('emi-rate') as HTMLInputElement)?.value || selectedInterestOnlyLoan.interestRate || 12);
    
    try {
      const response = await fetch('/api/offline-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedInterestOnlyLoan.id,
          action: 'start-emi',
          tenure,
          interestRate: rate
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: 'EMI schedule activated successfully!' });
        setShowStartEMIDialog(false);
        fetchInterestOnlyLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to start EMI', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start EMI schedule', variant: 'destructive' });
    }
  };

  return (
    <>
      {/* Interest-Only Loan Dialog */}
      <Dialog open={showInterestOnlyDialog} onOpenChange={setShowInterestOnlyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              Create Interest-Only Loan
            </DialogTitle>
            <DialogDescription>
              Create a loan where customer pays only monthly interest until EMI is activated
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Select Customer *</Label>
              <Select value={interestOnlyForm.customerId} onValueChange={(v) => setInterestOnlyForm({...interestOnlyForm, customerId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.filter((c: any) => c.role === 'CUSTOMER').map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount (₹) *</Label>
                <Input 
                  type="number" 
                  value={interestOnlyForm.principalAmount} 
                  onChange={(e) => setInterestOnlyForm({...interestOnlyForm, principalAmount: parseFloat(e.target.value) || 0})}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (% p.a.) *</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={interestOnlyForm.interestRate} 
                  onChange={(e) => setInterestOnlyForm({...interestOnlyForm, interestRate: parseFloat(e.target.value) || 0})}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-purple-700 font-medium">Monthly Interest Payment:</span>
                <span className="text-2xl font-bold text-purple-600">
                  ₹{formatCurrency((interestOnlyForm.principalAmount * interestOnlyForm.interestRate / 100) / 12)}
                </span>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                Customer will pay this amount monthly until EMI is activated
              </p>
            </div>

            <div className="space-y-2">
              <Label>Purpose of Loan</Label>
              <Input 
                value={interestOnlyForm.purpose} 
                onChange={(e) => setInterestOnlyForm({...interestOnlyForm, purpose: e.target.value})}
                placeholder="e.g., Business expansion, Personal needs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disbursement Mode *</Label>
                <Select 
                  value={interestOnlyForm.disbursementMode} 
                  onValueChange={(v) => setInterestOnlyForm({...interestOnlyForm, disbursementMode: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Disbursement Date *</Label>
                <Input 
                  type="date" 
                  value={interestOnlyForm.disbursementDate} 
                  onChange={(e) => setInterestOnlyForm({...interestOnlyForm, disbursementDate: e.target.value})}
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">How Interest-Only Loans Work:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Phase 1:</strong> Customer pays only monthly interest</li>
                    <li><strong>Phase 2:</strong> Super Admin activates EMI when ready</li>
                    <li>Principal remains unchanged until EMI starts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInterestOnlyDialog(false)}>Cancel</Button>
            <Button className="bg-purple-500 hover:bg-purple-600" onClick={handleCreateInterestOnlyLoan}>
              Create Interest-Only Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start EMI Dialog */}
      <Dialog open={showStartEMIDialog} onOpenChange={setShowStartEMIDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Start EMI for Loan
            </DialogTitle>
            <DialogDescription>
              Convert interest-only loan to regular EMI schedule
            </DialogDescription>
          </DialogHeader>
          
          {selectedInterestOnlyLoan && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex justify-between">
                  <span className="text-purple-700">Principal Amount:</span>
                  <span className="font-semibold">₹{formatCurrency(selectedInterestOnlyLoan.principalAmount || selectedInterestOnlyLoan.requestedAmount)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-purple-700">Interest Already Paid:</span>
                  <span className="font-semibold text-green-600">₹{formatCurrency(selectedInterestOnlyLoan.totalInterestPaid || 0)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>EMI Tenure (months) *</Label>
                <Input type="number" placeholder="12" defaultValue={12} id="emi-tenure" />
              </div>
              
              <div className="space-y-2">
                <Label>New Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.1" placeholder="12" defaultValue={selectedInterestOnlyLoan.interestRate || 12} id="emi-rate" />
              </div>
              
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-800">
                  EMI will be calculated based on the principal amount and new tenure. The interest paid during the interest-only phase will be recorded separately.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartEMIDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleStartEMI}>
              Start EMI Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
