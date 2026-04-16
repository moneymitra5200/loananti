'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Receipt, ArrowDownCircle, ArrowUpCircle, PiggyBank, Banknote } from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────
// ADD EXPENSE DIALOG
// Dr: Expense Account  Cr: Cash / Bank
// ─────────────────────────────────────────────────────────────────
export function AddExpenseDialog({
  open, onOpenChange, companyId, userId, bankAccounts, onSuccess
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  companyId: string; userId: string;
  bankAccounts: Array<{ id: string; bankName: string; accountNumber: string; currentBalance: number }>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    expenseType: 'MISCELLANEOUS', description: '', amount: '',
    paymentMode: 'CASH', bankAccountId: '', date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const EXPENSE_TYPES = [
    { value: 'SALARY', label: 'Salary & Wages' },
    { value: 'OFFICE_RENT', label: 'Office Rent' },
    { value: 'UTILITIES', label: 'Electricity / Utilities' },
    { value: 'MARKETING', label: 'Marketing & Advertisement' },
    { value: 'PROFESSIONAL_FEES', label: 'Professional Fees (CA, Legal)' },
    { value: 'BANK_CHARGES', label: 'Bank Charges' },
    { value: 'TRAVEL', label: 'Travel / Conveyance' },
    { value: 'MAINTENANCE', label: 'Repairs & Maintenance' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'MISCELLANEOUS', label: 'Miscellaneous / Other Expenses' },
  ];

  const handleSave = async () => {
    if (!form.description || !form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please fill description and valid amount'); return;
    }
    if (form.paymentMode !== 'CASH' && !form.bankAccountId) {
      toast.error('Please select a bank account'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), paymentDate: form.date, companyId, createdById: userId }),
      });
      const data = await res.json();
      if (data.success || data.expense) {
        toast.success('Expense recorded successfully');
        onOpenChange(false);
        setForm({ expenseType: 'MISCELLANEOUS', description: '', amount: '', paymentMode: 'CASH', bankAccountId: '', date: new Date().toISOString().split('T')[0] });
        onSuccess();
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record expense');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-red-600" /> Add Expense</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Dr: Expense A/c</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Cr: Cash / Bank</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Expense Type *</Label>
            <Select value={form.expenseType} onValueChange={v => setForm(f => ({ ...f, expenseType: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description *</Label>
            <Input className="mt-1" placeholder="e.g., June salary for Ramesh" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" className="mt-1" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Paid From *</Label>
            <Select value={form.paymentMode} onValueChange={v => setForm(f => ({ ...f, paymentMode: v, bankAccountId: '' }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">💵 Cash in Hand</SelectItem>
                <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                <SelectItem value="UPI">📱 UPI / Online</SelectItem>
                <SelectItem value="CHEQUE">📄 Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.paymentMode !== 'CASH' && bankAccounts.length > 0 && (
            <div>
              <Label>Bank Account *</Label>
              <Select value={form.bankAccountId} onValueChange={v => setForm(f => ({ ...f, bankAccountId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>{bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.bankName} (...{b.accountNumber.slice(-4)}) — Bal: ₹{b.currentBalance.toLocaleString('en-IN')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Record Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// RECORD BORROWING DIALOG
// Dr: Cash / Bank  Cr: Borrowed Funds (Liability)
// ─────────────────────────────────────────────────────────────────
export function RecordBorrowingDialog({
  open, onOpenChange, companyId, userId, bankAccounts, onSuccess
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  companyId: string; userId: string;
  bankAccounts: Array<{ id: string; bankName: string; accountNumber: string; currentBalance: number }>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    sourceName: '', sourceType: 'BANK_LOAN', amount: '',
    receivedIn: 'CASH', bankAccountId: '', interestRate: '',
    dueDate: '', date: new Date().toISOString().split('T')[0], description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.sourceName || !form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please fill lender name and valid amount'); return;
    }
    if (form.receivedIn !== 'CASH' && !form.bankAccountId) {
      toast.error('Please select bank account'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/borrowed-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId, sourceName: form.sourceName, sourceType: form.sourceType,
          amount: parseFloat(form.amount), interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
          dueDate: form.dueDate || null, description: form.description,
          borrowedDate: form.date, bankAccountId: form.receivedIn !== 'CASH' ? form.bankAccountId : null,
          createdById: userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Borrowing recorded successfully');
        onOpenChange(false);
        setForm({ sourceName: '', sourceType: 'BANK_LOAN', amount: '', receivedIn: 'CASH', bankAccountId: '', interestRate: '', dueDate: '', date: new Date().toISOString().split('T')[0], description: '' });
        onSuccess();
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record borrowing');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowDownCircle className="h-5 w-5 text-amber-600" /> Record Money Borrowed</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Dr: Cash / Bank</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Cr: Borrowed Funds (Liability)</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lender / Source Name *</Label>
              <Input className="mt-1" placeholder="e.g., SBI Bank, Ramesh Shah" value={form.sourceName} onChange={e => setForm(f => ({ ...f, sourceName: e.target.value }))} />
            </div>
            <div>
              <Label>Type of Borrowing *</Label>
              <Select value={form.sourceType} onValueChange={v => setForm(f => ({ ...f, sourceType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_LOAN">Bank Loan</SelectItem>
                  <SelectItem value="BORROWED_FUNDS">Individual / Friend</SelectItem>
                  <SelectItem value="INVESTOR_CAPITAL">Investor Capital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount Borrowed (₹) *</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" className="mt-1" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Interest Rate % (optional)</Label>
              <Input type="number" className="mt-1" placeholder="e.g., 12" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} />
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input type="date" className="mt-1" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Received In *</Label>
            <Select value={form.receivedIn} onValueChange={v => setForm(f => ({ ...f, receivedIn: v, bankAccountId: '' }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">💵 Cash in Hand</SelectItem>
                <SelectItem value="BANK">🏦 Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.receivedIn !== 'CASH' && bankAccounts.length > 0 && (
            <div>
              <Label>Bank Account *</Label>
              <Select value={form.bankAccountId} onValueChange={v => setForm(f => ({ ...f, bankAccountId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>{bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.bankName} (...{b.accountNumber.slice(-4)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Description / Notes</Label>
            <Textarea className="mt-1" rows={2} placeholder="Purpose of borrowing or any notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Record Borrowing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// REPAY BORROWED MONEY DIALOG
// Dr: Borrowed Funds + Interest Paid  Cr: Cash / Bank
// ─────────────────────────────────────────────────────────────────
export function RepayBorrowingDialog({
  open, onOpenChange, companyId, userId, bankAccounts, onSuccess
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  companyId: string; userId: string;
  bankAccounts: Array<{ id: string; bankName: string; accountNumber: string; currentBalance: number }>;
  onSuccess: () => void;
}) {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState({ principal: '', interest: '', payFrom: 'CASH', bankAccountId: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      fetch(`/api/accounting/borrowed-money?companyId=${companyId}`)
        .then(r => r.json())
        .then(d => setBorrowings((d.borrowedEntries || []).filter((b: any) => b.status !== 'FULLY_PAID')));
    }
  }, [open, companyId]);

  const selBorrow = borrowings.find(b => b.id === selected);

  const handleSave = async () => {
    if (!selected || !form.principal || parseFloat(form.principal) <= 0) {
      toast.error('Select a loan and enter repayment amount'); return;
    }
    if (form.payFrom !== 'CASH' && !form.bankAccountId) {
      toast.error('Select bank account'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/borrowed-money', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId, borrowedMoneyId: selected,
          principalAmount: parseFloat(form.principal),
          interestAmount: parseFloat(form.interest) || 0,
          repaymentDate: form.date,
          bankAccountId: form.payFrom !== 'CASH' ? form.bankAccountId : null,
          description: `Repayment to ${selBorrow?.sourceName}`,
          createdById: userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Repayment recorded successfully');
        onOpenChange(false);
        setSelected(''); setForm({ principal: '', interest: '', payFrom: 'CASH', bankAccountId: '', date: new Date().toISOString().split('T')[0] });
        onSuccess();
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record repayment');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowUpCircle className="h-5 w-5 text-blue-600" /> Repay Borrowed Money</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Dr: Borrowed Funds</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Cr: Cash / Bank</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Select Loan to Repay *</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {borrowings.length === 0 ? <SelectItem value="none" disabled>No active borrowings</SelectItem>
                  : borrowings.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.sourceName} — ₹{(b.amount - b.amountRepaid).toLocaleString('en-IN')} outstanding
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {selBorrow && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p><b>Lender:</b> {selBorrow.sourceName} | <b>Total:</b> ₹{selBorrow.amount.toLocaleString('en-IN')}</p>
              <p><b>Repaid so far:</b> ₹{selBorrow.amountRepaid.toLocaleString('en-IN')} | <b>Outstanding:</b> ₹{(selBorrow.amount - selBorrow.amountRepaid).toLocaleString('en-IN')}</p>
              {selBorrow.interestRate && <p><b>Interest Rate:</b> {selBorrow.interestRate}% p.a.</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Principal to Repay (₹) *</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} />
            </div>
            <div>
              <Label>Interest to Pay (₹)</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={form.interest} onChange={e => setForm(f => ({ ...f, interest: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pay From *</Label>
              <Select value={form.payFrom} onValueChange={v => setForm(f => ({ ...f, payFrom: v, bankAccountId: '' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">💵 Cash</SelectItem>
                  <SelectItem value="BANK">🏦 Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" className="mt-1" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          {form.payFrom !== 'CASH' && (
            <div>
              <Label>Bank Account *</Label>
              <Select value={form.bankAccountId} onValueChange={v => setForm(f => ({ ...f, bankAccountId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>{bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.bankName} (...{b.accountNumber.slice(-4)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Record Repayment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADD CAPITAL DIALOG
// Dr: Cash / Bank  Cr: Owner's Capital (Equity)
// ─────────────────────────────────────────────────────────────────
export function AddCapitalDialog({
  open, onOpenChange, companyId, userId, bankAccounts, onSuccess
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  companyId: string; userId: string;
  bankAccounts: Array<{ id: string; bankName: string; accountNumber: string; currentBalance: number }>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    cashAmount: '', bankAmount: '', bankAccountId: '',
    description: "Owner's Capital Investment", date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cash = parseFloat(form.cashAmount) || 0;
    const bank = parseFloat(form.bankAmount) || 0;
    if (cash + bank <= 0) { toast.error('Enter at least one amount'); return; }
    if (bank > 0 && !form.bankAccountId) { toast.error('Select bank account for bank amount'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/add-equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, cashAmount: cash, bankAmount: bank, bankAccountId: form.bankAccountId || null, date: form.date, description: form.description, createdById: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Capital added successfully');
        onOpenChange(false);
        setForm({ cashAmount: '', bankAmount: '', bankAccountId: '', description: "Owner's Capital Investment", date: new Date().toISOString().split('T')[0] });
        onSuccess();
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add capital');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-purple-600" /> Add Owner's Capital</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Dr: Cash / Bank</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Cr: Owner's Capital (Equity)</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cash Amount (₹)</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={form.cashAmount} onChange={e => setForm(f => ({ ...f, cashAmount: e.target.value }))} />
            </div>
            <div>
              <Label>Bank Amount (₹)</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={form.bankAmount} onChange={e => setForm(f => ({ ...f, bankAmount: e.target.value }))} />
            </div>
          </div>
          {parseFloat(form.bankAmount) > 0 && (
            <div>
              <Label>Bank Account *</Label>
              <Select value={form.bankAccountId} onValueChange={v => setForm(f => ({ ...f, bankAccountId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>{bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.bankName} (...{b.accountNumber.slice(-4)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Date *</Label>
            <Input type="date" className="mt-1" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Add Capital
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
