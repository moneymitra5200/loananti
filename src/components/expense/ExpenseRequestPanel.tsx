'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, X, Loader2, CheckCircle, AlertCircle, Banknote, Building2, Receipt, Send } from 'lucide-react';

export const EXPENSE_HEADS = [
  { value: 'SALARY',            label: 'Salary & Wages' },
  { value: 'OFFICE_RENT',       label: 'Office Rent' },
  { value: 'MARKETING',         label: 'Marketing & Advertising' },
  { value: 'COMMISSION',        label: 'Commission' },
  { value: 'SOFTWARE',          label: 'Software & Subscriptions' },
  { value: 'BANK_CHARGES',      label: 'Bank Charges' },
  { value: 'UTILITIES',         label: 'Utilities (Water / Electricity)' },
  { value: 'TRAVEL',            label: 'Travel & Conveyance' },
  { value: 'OFFICE_SUPPLIES',   label: 'Office Supplies & Stationery' },
  { value: 'TELECOMMUNICATION', label: 'Telecommunication' },
  { value: 'PROFESSIONAL_FEES', label: 'Professional Fees (Legal / CA)' },
  { value: 'INSURANCE',         label: 'Insurance' },
  { value: 'TAX_PAID',          label: 'Tax & Government Fees' },
  { value: 'MAINTENANCE',       label: 'Repairs & Maintenance' },
  { value: 'CONVEYANCE',        label: 'Conveyance & Petrol' },
  { value: 'ADVERTISEMENT',     label: 'Advertisement' },
  { value: 'MISCELLANEOUS',     label: 'Miscellaneous' },
];

interface BankAccount { id: string; bankName: string; accountNumber: string; currentBalance: number; isDefault: boolean; }

interface Props {
  role: 'CASHIER' | 'SUPER_ADMIN' | 'ACCOUNTANT';
  userId: string;
  companyId?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
}

export default function ExpenseRequestPanel({ role, userId, companyId, triggerLabel, triggerClassName, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState({
    expenseType: 'MISCELLANEOUS',
    description: '',
    amount: '',
    paymentSource: 'CASH' as 'BANK' | 'CASH',
    bankAccountId: '',
    remarks: '',
  });

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const bUrl = companyId ? `/api/accounting/bank-accounts?companyId=${companyId}` : '/api/accounting/bank-accounts';
        const bRes = await fetch(bUrl);
        if (bRes.ok) {
          const d = await bRes.json();
          const accs: BankAccount[] = d.bankAccounts || [];
          setBankAccounts(accs);
          const def = accs.find(a => a.isDefault) || accs[0];
          if (def) setForm(f => ({ ...f, bankAccountId: def.id }));
        }
        const cUrl = companyId ? `/api/cashbook?companyId=${companyId}` : '/api/cashbook';
        const cRes = await fetch(cUrl);
        if (cRes.ok) {
          const cd = await cRes.json();
          if (cd.success && cd.cashBook) setCashBalance(cd.cashBook.currentBalance);
        }
      } catch {}
    };
    load();
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/expense-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role, userId, companyId,
          expenseType: form.expenseType,
          description: form.description,
          amount: parseFloat(form.amount),
          paymentSource: form.paymentSource,
          bankAccountId: form.paymentSource === 'BANK' ? form.bankAccountId : undefined,
          remarks: form.remarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ ok: true, msg: data.message || 'Done!' });
        setForm({ expenseType: 'MISCELLANEOUS', description: '', amount: '', paymentSource: 'CASH', bankAccountId: '', remarks: '' });
        onSuccess?.();
        setTimeout(() => { setOpen(false); setResult(null); }, 2200);
      } else {
        setResult({ ok: false, msg: data.error || 'Failed' });
      }
    } catch {
      setResult({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const isCashier = role === 'CASHIER';
  const selectedBank = bankAccounts.find(a => a.id === form.bankAccountId);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={triggerClassName || 'flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-rose-200 hover:scale-105 transition-all duration-200 text-sm'}>
        <PlusCircle className="h-4 w-4" />
        {triggerLabel || (isCashier ? 'Request Expense' : 'Add Expense')}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-red-600 px-5 py-4 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="h-5 w-5" />{isCashier ? 'Submit Expense Request' : 'Record Expense'}</h2>
                  <p className="text-rose-100 text-xs mt-0.5">{isCashier ? 'Request goes to Super Admin for approval' : 'Posted directly to accounting'}</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Expense Head *</label>
                  <select value={form.expenseType} onChange={e => setForm(f => ({ ...f, expenseType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50" required>
                    {EXPENSE_HEADS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Description *</label>
                  <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Office rent for April 2025"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50" required />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
                    <input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50" required />
                  </div>
                </div>

                {/* Deduct From — only shown to Admin/Accountant, not Cashier */}
                {!isCashier && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Deduct From *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setForm(f => ({ ...f, paymentSource: 'CASH' }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${form.paymentSource === 'CASH' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <Banknote className="h-6 w-6" />
                        <span className="text-xs font-semibold">Cash Book</span>
                        {cashBalance !== null && <span className="text-[10px] opacity-70">₹{cashBalance.toLocaleString('en-IN')}</span>}
                      </button>
                      <button type="button" onClick={() => setForm(f => ({ ...f, paymentSource: 'BANK' }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${form.paymentSource === 'BANK' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <Building2 className="h-6 w-6" />
                        <span className="text-xs font-semibold">Bank Account</span>
                        {selectedBank && <span className="text-[10px] opacity-70">₹{selectedBank.currentBalance.toLocaleString('en-IN')}</span>}
                      </button>
                    </div>
                  </div>
                )}

                {!isCashier && form.paymentSource === 'BANK' && bankAccounts.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Bank Account</label>
                    <select value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-gray-50">
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.bankName} — ···{acc.accountNumber.slice(-4)} (₹{acc.currentBalance.toLocaleString('en-IN')})</option>
                      ))}
                    </select>
                  </div>
                )}
                {!isCashier && form.paymentSource === 'BANK' && bankAccounts.length === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠ No bank accounts found. Cash will be used.</p>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Remarks</label>
                  <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="Optional note..." rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50 resize-none" />
                </div>

                <AnimatePresence>
                  {result && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                      {result.msg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-semibold shadow-md disabled:opacity-60 hover:shadow-rose-200 transition-all">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <><Send className="h-4 w-4" /> {isCashier ? 'Submit for Approval' : 'Post Expense'}</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
