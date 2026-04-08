'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MirrorLoan {
  id: string;
  applicationNo: string;
  mirrorCompany: { id: string; name: string; code: string };
  originalLoan: { applicationNo: string; company: { id: string; name: string } };
  disbursedAmount: number;
  disbursedAt: string;
  hasBankTransaction: boolean;
  hasCashEntry: boolean;
  needsFix: boolean;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  companyId: string;
}

export default function FixMirrorAccountingPage() {
  const [mirrorLoans, setMirrorLoans] = useState<MirrorLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<MirrorLoan | null>(null);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  // Fix form
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAmount, setBankAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);

  const fetchMirrorLoans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fix-mirror-accounting');
      const data = await response.json();
      if (data.success) {
        setMirrorLoans(data.mirrorLoans);
      }
    } catch (error) {
      console.error('Error fetching mirror loans:', error);
      toast({ title: 'Error', description: 'Failed to fetch mirror loans', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async (companyId: string) => {
    try {
      const response = await fetch(`/api/accounting/bank-accounts?companyId=${companyId}`);
      const data = await response.json();
      if (data.bankAccounts) {
        setBankAccounts(data.bankAccounts);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  useEffect(() => {
    fetchMirrorLoans();
  }, []);

  const openFixDialog = async (loan: MirrorLoan) => {
    setSelectedLoan(loan);
    setBankAmount(0);
    setCashAmount(loan.disbursedAmount);
    setBankAccountId('');
    await fetchBankAccounts(loan.mirrorCompany.id);
    setShowFixDialog(true);
  };

  const handleFix = async () => {
    if (!selectedLoan) return;
    
    if (bankAmount + cashAmount !== selectedLoan.disbursedAmount) {
      toast({ 
        title: 'Error', 
        description: `Bank + Cash amount must equal ${formatCurrency(selectedLoan.disbursedAmount)}`, 
        variant: 'destructive' 
      });
      return;
    }
    
    if (bankAmount > 0 && !bankAccountId) {
      toast({ title: 'Error', description: 'Please select a bank account', variant: 'destructive' });
      return;
    }
    
    setFixing(true);
    try {
      const response = await fetch('/api/fix-mirror-accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mirrorLoanId: selectedLoan.id,
          bankAccountId: bankAmount > 0 ? bankAccountId : null,
          bankAmount,
          cashAmount
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Mirror loan accounting fixed successfully!' });
        setShowFixDialog(false);
        fetchMirrorLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fix accounting', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fixing accounting:', error);
      toast({ title: 'Error', description: 'Failed to fix accounting', variant: 'destructive' });
    } finally {
      setFixing(false);
    }
  };

  const needsFixLoans = mirrorLoans.filter(l => l.needsFix);
  const okLoans = mirrorLoans.filter(l => !l.needsFix);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fix Mirror Loan Accounting</h1>
          <p className="text-gray-500">View and fix mirror loans with missing accounting entries</p>
        </div>
        <Button onClick={fetchMirrorLoans} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Loans needing fix */}
          {needsFixLoans.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Loans Needing Fix ({needsFixLoans.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {needsFixLoans.map(loan => (
                    <div key={loan.id} className="p-4 bg-white rounded-lg border border-red-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{loan.applicationNo}</span>
                          <Badge variant="outline" className="bg-red-100 text-red-700">No Accounting</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Mirror: {loan.mirrorCompany.name} | Original: {loan.originalLoan.applicationNo} ({loan.originalLoan.company.name})
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">{formatCurrency(loan.disbursedAmount)}</span>
                          <span className="text-gray-400 ml-2">disbursed on {formatDate(loan.disbursedAt)}</span>
                        </p>
                      </div>
                      <Button onClick={() => openFixDialog(loan)} className="bg-red-500 hover:bg-red-600">
                        Fix Accounting
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* OK loans */}
          {okLoans.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Loans with Correct Accounting ({okLoans.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {okLoans.map(loan => (
                    <div key={loan.id} className="p-4 bg-white rounded-lg border border-green-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{loan.applicationNo}</span>
                          {loan.hasBankTransaction && <Badge className="bg-blue-100 text-blue-700">Bank</Badge>}
                          {loan.hasCashEntry && <Badge className="bg-green-100 text-green-700">Cash</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">
                          Mirror: {loan.mirrorCompany.name} | Original: {loan.originalLoan.applicationNo}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">{formatCurrency(loan.disbursedAmount)}</span>
                          <span className="text-gray-400 ml-2">disbursed on {formatDate(loan.disbursedAt)}</span>
                        </p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No loans */}
          {mirrorLoans.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No mirror loans found
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Fix Dialog */}
      <Dialog open={showFixDialog} onOpenChange={setShowFixDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Mirror Loan Accounting</DialogTitle>
            <DialogDescription>
              Enter the split between Bank and Cash for this disbursement.
              Total: <strong>{selectedLoan && formatCurrency(selectedLoan.disbursedAmount)}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm"><strong>Mirror Loan:</strong> {selectedLoan?.applicationNo}</p>
              <p className="text-sm"><strong>Company:</strong> {selectedLoan?.mirrorCompany.name}</p>
              <p className="text-sm"><strong>Amount:</strong> {selectedLoan && formatCurrency(selectedLoan.disbursedAmount)}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Select Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber} (Bal: {formatCurrency(acc.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Amount</Label>
                <Input 
                  type="number" 
                  value={bankAmount} 
                  onChange={(e) => {
                    const bank = parseFloat(e.target.value) || 0;
                    setBankAmount(bank);
                    setCashAmount((selectedLoan?.disbursedAmount || 0) - bank);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Cash Amount</Label>
                <Input 
                  type="number" 
                  value={cashAmount}
                  onChange={(e) => {
                    const cash = parseFloat(e.target.value) || 0;
                    setCashAmount(cash);
                    setBankAmount((selectedLoan?.disbursedAmount || 0) - cash);
                  }}
                />
              </div>
            </div>
            
            {bankAmount + cashAmount !== (selectedLoan?.disbursedAmount || 0) && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                Total ({formatCurrency(bankAmount + cashAmount)}) must equal {selectedLoan && formatCurrency(selectedLoan.disbursedAmount)}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFixDialog(false)}>Cancel</Button>
            <Button onClick={handleFix} disabled={fixing} className="bg-green-500 hover:bg-green-600">
              {fixing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Fix Accounting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
