'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Landmark, PiggyBank, AlertCircle, Loader2 } from 'lucide-react';
import { Company, BankAccount } from '../../types';
import { format } from 'date-fns';

interface EquityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCompany: Company | undefined;
  bankAccounts: BankAccount[];
  onSubmit: (data: EquityFormData) => Promise<void>;
}

export interface EquityFormData {
  cashAmount: number;
  bankAmount: number;
  bankAccountId?: string;
  date: Date;
  description: string;
}

export default function EquityDialog({
  open,
  onOpenChange,
  selectedCompany,
  bankAccounts,
  onSubmit
}: EquityDialogProps) {
  const [cashAmount, setCashAmount] = useState<string>('');
  const [bankAmount, setBankAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState<string>('Initial Capital Investment');
  const [loading, setLoading] = useState(false);

  const cashValue = parseFloat(cashAmount) || 0;
  const bankValue = parseFloat(bankAmount) || 0;
  const totalEquity = cashValue + bankValue;

  const handleSubmit = async () => {
    if (totalEquity <= 0) return;
    if (bankValue > 0 && !selectedBankId && bankAccounts.length > 0) {
      // Auto-select first bank if not selected
      setSelectedBankId(bankAccounts[0].id);
    }

    setLoading(true);
    try {
      await onSubmit({
        cashAmount: cashValue,
        bankAmount: bankValue,
        bankAccountId: bankValue > 0 ? (selectedBankId || bankAccounts[0]?.id) : undefined,
        date: new Date(date),
        description
      });
      
      // Reset form
      setCashAmount('');
      setBankAmount('');
      setDescription('Initial Capital Investment');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding equity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-600" />
            Add Owner's Equity / Capital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Double-Entry Accounting</p>
                  <p className="text-blue-700">
                    This will record your capital investment. The amount you add will be recorded as:
                  </p>
                  <ul className="mt-2 space-y-1 text-blue-700 list-disc list-inside">
                    <li>Debit: Bank Account (increases bank balance)</li>
                    <li>Debit: Cash in Hand (increases cash balance)</li>
                    <li>Credit: Owner's Capital (records equity)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cash Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Cash Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="number"
                placeholder="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="pl-8 text-lg"
              />
            </div>
            <p className="text-xs text-gray-500">Amount you're adding to Cash in Hand</p>
          </div>

          {/* Bank Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-600" />
              Bank Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="number"
                placeholder="0"
                value={bankAmount}
                onChange={(e) => setBankAmount(e.target.value)}
                className="pl-8 text-lg"
              />
            </div>
            {bankValue > 0 && bankAccounts.length > 0 && (
              <div className="mt-2">
                <Label className="text-sm">Select Bank Account</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bankName} - ****{bank.accountNumber.slice(-4)} (Balance: {formatCurrency(bank.currentBalance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-xs text-gray-500">Amount you're adding to Bank Account</p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date of Investment</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Initial Capital Investment"
            />
          </div>

          <Separator />

          {/* Summary */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cash in Hand:</span>
                  <span className="font-medium">{formatCurrency(cashValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bank Account:</span>
                  <span className="font-medium">{formatCurrency(bankValue)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-emerald-800">Total Owner's Equity:</span>
                  <span className="font-bold text-lg text-emerald-700">{formatCurrency(totalEquity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No Bank Account Warning */}
          {bankValue > 0 && bankAccounts.length === 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">No Bank Account Found</p>
                    <p>Please add a bank account first before adding bank equity, or set bank amount to 0.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={totalEquity <= 0 || loading || (bankValue > 0 && bankAccounts.length === 0)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <PiggyBank className="h-4 w-4 mr-2" />
                Add Equity: {formatCurrency(totalEquity)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
