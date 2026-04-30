'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
interface Company { id: string; name: string; code: string; }

interface Props {
  role: 'CASHIER' | 'SUPER_ADMIN' | 'ACCOUNTANT';
  userId: string;
  companyId?: string;       // pre-selected company (optional)
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
}

export default function ExpenseRequestPanel({ role, userId, companyId: propCompanyId, triggerLabel, triggerClassName, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Company list (Admin/Accountant who have no pre-set company)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Bank/cash
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Form state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(propCompanyId || '');
  const [expenseType, setExpenseType] = useState('MISCELLANEOUS');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentSource, setPaymentSource] = useState<'CASH' | 'BANK'>('CASH');
  const [bankAccountId, setBankAccountId] = useState('');
  const [remarks, setRemarks] = useState('');

  const isCashier = role === 'CASHIER';
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // ── Load companies when modal opens (Admin/Accountant without a fixed company)
  useEffect(() => {
    if (!open || isCashier) return;
    setCompaniesLoading(true);
    fetch('/api/company')
      .then(r => r.json())
      .then(d => {
        const list: Company[] = d.companies || [];
        setCompanies(list);
        // Pre-select: use propCompanyId if given, else first company
        if (!selectedCompanyId && list.length > 0) {
          setSelectedCompanyId(propCompanyId || list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setCompaniesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Load bank accounts & cash balance whenever selectedCompany changes
  useEffect(() => {
    if (!open) return;
    const cid = isCashier ? propCompanyId : selectedCompanyId;
    if (!cid) { setBankAccounts([]); setCashBalance(null); return; }

    setBalancesLoading(true);
    setBankAccounts([]);
    setCashBalance(null);

    const load = async () => {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch(`/api/accounting/bank-accounts?companyId=${cid}`),
          fetch(`/api/cashbook?companyId=${cid}`),
        ]);
        if (bRes.ok) {
          const d = await bRes.json();
          const accs: BankAccount[] = d.bankAccounts || [];
          setBankAccounts(accs);
          const def = accs.find(a => a.isDefault) || accs[0];
          if (def) setBankAccountId(def.id);
          else setBankAccountId('');
        }
        if (cRes.ok) {
          const cd = await cRes.json();
          if (cd.success && cd.cashBook) setCashBalance(cd.cashBook.currentBalance);
        }
      } catch {}
      finally { setBalancesLoading(false); }
    };
    load();
  }, [open, selectedCompanyId, propCompanyId, isCashier]);

  // ── Reset form when modal closes
  const handleClose = useCallback(() => {
    setOpen(false);
    setResult(null);
    setExpenseType('MISCELLANEOUS');
    setDescription('');
    setAmount('');
    setPaymentSource('CASH');
    setRemarks('');
    // Keep selectedCompanyId so it remembers the last selection
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCompanyId = isCashier ? propCompanyId : selectedCompanyId;

    if (!isCashier && !effectiveCompanyId) {
      setResult({ ok: false, msg: 'Please select a company first.' });
      return;
    }
    if (!description.trim()) {
      setResult({ ok: false, msg: 'Description is required.' });
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setResult({ ok: false, msg: 'Enter a valid amount.' });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/expense-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          userId,
          companyId: effectiveCompanyId,
          expenseType,
          description,
          amount: parsedAmount,
          paymentSource,
          bankAccountId: paymentSource === 'BANK' ? bankAccountId : undefined,
          remarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const companyName = selectedCompany?.name || '';
        setResult({ ok: true, msg: data.message || `Expense posted${companyName ? ' to ' + companyName : ''}! Journal entry created.` });
        setDescription('');
        setAmount('');
        setRemarks('');
        onSuccess?.();
        setTimeout(() => handleClose(), 2400);
      } else {
        setResult({ ok: false, msg: data.error || 'Failed to post expense.' });
      }
    } catch {
      setResult({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedBankAcc = bankAccounts.find(a => a.id === bankAccountId);
  const canSubmit = !loading && (isCashier || !!selectedCompanyId);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName || 'flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-rose-200 hover:scale-105 transition-all duration-200 text-sm'}
      >
        <PlusCircle className="h-4 w-4" />
        {triggerLabel || (isCashier ? 'Request Expense' : 'Add Expense')}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-rose-500 to-red-600 px-5 py-4 text-white flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    {isCashier ? 'Submit Expense Request' : 'Record Expense'}
                  </h2>
                  <p className="text-rose-100 text-xs mt-0.5">
                    {isCashier
                      ? 'Request goes to Super Admin for approval'
                      : selectedCompany
                        ? `📒 Posting journal entry to: ${selectedCompany.name}`
                        : 'Select a company to post the expense'}
                  </p>
                </div>
                <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">

                {/* ── Company Selector (Admin / Accountant only) ── */}
                {!isCashier && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                      <Building2 className="h-3.5 w-3.5 inline mr-1" />
                      Company *
                    </label>
                    {companiesLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading companies…
                      </div>
                    ) : (
                      <select
                        value={selectedCompanyId}
                        onChange={e => setSelectedCompanyId(e.target.value)}
                        className="w-full border-2 border-rose-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-rose-50 font-medium text-gray-800"
                        required={!isCashier}
                      >
                        <option value="">— Select Company —</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedCompanyId && !companiesLoading && (
                      <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Journal entry will be recorded in <strong>{selectedCompany?.name}</strong> accounting
                      </p>
                    )}
                    {!selectedCompanyId && !companiesLoading && (
                      <p className="text-[11px] text-amber-500 mt-1">⚠ Select a company to enable posting</p>
                    )}
                  </div>
                )}

                {/* ── Expense Head ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Expense Head *</label>
                  <select
                    value={expenseType}
                    onChange={e => setExpenseType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50"
                    required
                  >
                    {EXPENSE_HEADS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>

                {/* ── Description ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Description *</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. Office rent for April 2025"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50"
                    required
                  />
                </div>

                {/* ── Amount ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50"
                      required
                    />
                  </div>
                </div>

                {/* ── Deduct From (Admin/Accountant only) ── */}
                {!isCashier && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Deduct From *</label>
                    {balancesLoading && selectedCompanyId ? (
                      <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading balances…
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentSource('CASH')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${paymentSource === 'CASH' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          <Banknote className="h-6 w-6" />
                          <span className="text-xs font-semibold">Cash Book</span>
                          {cashBalance !== null && (
                            <span className="text-[10px] opacity-70">₹{cashBalance.toLocaleString('en-IN')}</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSource('BANK')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${paymentSource === 'BANK' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          <Building2 className="h-6 w-6" />
                          <span className="text-xs font-semibold">Bank Account</span>
                          {selectedBankAcc && (
                            <span className="text-[10px] opacity-70">₹{selectedBankAcc.currentBalance.toLocaleString('en-IN')}</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Bank Account Selector ── */}
                {!isCashier && paymentSource === 'BANK' && bankAccounts.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Bank Account</label>
                    <select
                      value={bankAccountId}
                      onChange={e => setBankAccountId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-gray-50"
                    >
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} — ···{acc.accountNumber.slice(-4)} (₹{acc.currentBalance.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!isCashier && paymentSource === 'BANK' && bankAccounts.length === 0 && selectedCompanyId && !balancesLoading && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠ No bank accounts found for this company. Cash will be used.
                  </p>
                )}

                {/* ── Remarks ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Optional note..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none bg-gray-50 resize-none"
                  />
                </div>

                {/* ── Result Message ── */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                    >
                      {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                      {result.msg}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Submit ── */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-semibold shadow-md disabled:opacity-60 hover:shadow-rose-200 transition-all"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    : <><Send className="h-4 w-4" /> {isCashier ? 'Submit for Approval' : 'Post Expense'}</>
                  }
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
