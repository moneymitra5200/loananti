'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownLeft, Loader2, Wallet, Landmark, AlertTriangle, CheckCircle2,
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
}

interface CapitalWithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName?: string;
  bankAccounts: BankAccount[];
  cashBalance?: number;
  createdById?: string;
  onSuccess?: () => void;
}

export default function CapitalWithdrawDialog({
  open,
  onClose,
  companyId,
  companyName,
  bankAccounts,
  cashBalance: initialCashBalance = 0,
  createdById,
  onSuccess,
}: CapitalWithdrawDialogProps) {
  const [cashAmount, setCashAmount] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [liveCashBalance, setLiveCashBalance] = useState(initialCashBalance);

  // Fetch live cash balance when dialog opens
  React.useEffect(() => {
    if (open && companyId) {
      fetch(`/api/accounting/cash-book?companyId=${companyId}`)
        .then(r => r.json())
        .then(d => {
          const bal = d?.cashBook?.currentBalance ?? d?.currentBalance ?? d?.balance ?? 0;
          setLiveCashBalance(bal);
        })
        .catch(() => {});
    }
  }, [open, companyId]);

  const cashBalance = liveCashBalance;


  const cash = parseFloat(cashAmount) || 0;
  const bank = parseFloat(bankAmount) || 0;
  const total = cash + bank;
  const selectedBank = bankAccounts.find((b) => b.id === bankAccountId);

  const handleSubmit = async () => {
    if (total <= 0) return;
    if (bank > 0 && !bankAccountId) return;

    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/accounting/withdraw-capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          cashAmount: cash,
          bankAmount: bank,
          bankAccountId: bankAccountId || undefined,
          date,
          description: description || "Owner's Capital Withdrawal",
          createdById,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, message: data.message });
        onSuccess?.();
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setResult({ success: false, message: data.error || 'Failed to process withdrawal' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCashAmount('');
    setBankAmount('');
    setBankAccountId('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setResult(null);
    onClose();
  };

  const isCashInsufficient = cash > 0 && cash > cashBalance;
  const isBankInsufficient = bank > 0 && selectedBank && bank > selectedBank.currentBalance;
  const canSubmit = total > 0 && !isCashInsufficient && !isBankInsufficient && !(bank > 0 && !bankAccountId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-orange-600" />
            </div>
            Capital Withdrawal
          </DialogTitle>
          {companyName && (
            <p className="text-sm text-muted-foreground">
              Withdrawing from: <strong>{companyName}</strong>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Info Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            <p className="font-medium mb-1">📋 What this does:</p>
            <p>Reduces the owner's capital account (equity) and deducts from cash/bank. Recorded as a capital drawing in books.</p>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Date of Withdrawal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Cash Amount */}
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-600" />
              Cash Withdrawal
              <Badge variant="outline" className="ml-auto text-xs">
                Available: ₹{cashBalance.toLocaleString('en-IN')}
              </Badge>
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              className={isCashInsufficient ? 'border-red-400' : ''}
            />
            {isCashInsufficient && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Insufficient cash balance
              </p>
            )}
          </div>

          {/* Bank Amount */}
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              Bank Withdrawal
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={bankAmount}
              onChange={(e) => setBankAmount(e.target.value)}
            />
            {bank > 0 && (
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className={!bankAccountId ? 'border-orange-400' : ''}>
                  <SelectValue placeholder="Select bank account..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{acc.bankName} – ****{acc.accountNumber.slice(-4)}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          ₹{acc.currentBalance.toLocaleString('en-IN')}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isBankInsufficient && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Insufficient bank balance (Available: ₹{selectedBank?.currentBalance.toLocaleString('en-IN')})
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Reason / Note (optional)</Label>
            <Textarea
              placeholder="e.g. Personal use, monthly salary withdrawal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Total */}
          {total > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-orange-900">Total Withdrawal</span>
                <span className="text-xl font-bold text-orange-700">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-orange-700">
                <div className="flex justify-between">
                  <span>Debit: Owner's Capital (reduces equity)</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                {cash > 0 && (
                  <div className="flex justify-between">
                    <span>Credit: Cash in Hand</span>
                    <span>₹{cash.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {bank > 0 && (
                  <div className="flex justify-between">
                    <span>Credit: Bank Account</span>
                    <span>₹{bank.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert className={result.success ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}>
              {result.success
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <AlertTriangle className="h-4 w-4 text-red-600" />}
              <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><ArrowDownLeft className="w-4 h-4" /> Withdraw Capital</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
