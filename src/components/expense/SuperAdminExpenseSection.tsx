'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, CheckCircle, XCircle, Clock, PlusCircle,
  Building2, Banknote, Loader2, RefreshCw, User,
  Eye, X, CreditCard, IndianRupee, TrendingDown, AlertCircle
} from 'lucide-react';
import ExpenseRequestPanel, { EXPENSE_HEADS } from '@/components/expense/ExpenseRequestPanel';

interface Company { id: string; name: string; code: string; }

interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  expenseType: string;
  description: string;
  amount: number;
  paymentMode: string;
  payeeName: string;
  categoryId: string;
  isApproved: boolean;
  payeeId: string;
  paymentReference: string | null;
  createdById: string;
  createdAt: string;
  approvedAt: string | null;
  approvedById: string | null;
  remarks: string | null;
  companyId?: string;
  // joined user info from enhanced GET
  requester?: { id: string; name: string; role: string } | null;
  approver?:  { id: string; name: string; role: string } | null;
}

interface Props {
  adminId: string;
  companyId?: string;
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200',        icon: XCircle },
};

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function headLabel(v: string) {
  return EXPENSE_HEADS.find(h => h.value === v)?.label || v;
}

/* ─── Detail Dialog ─── */
function ExpenseDetailDialog({ expense, onClose }: { expense: ExpenseRecord; onClose: () => void }) {
  const sc = STATUS_CONFIG[expense.categoryId as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
  const Icon = sc.icon;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-red-600 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="h-5 w-5" /> {expense.expenseNumber}</h2>
            <p className="text-rose-100 text-xs mt-0.5">{headLabel(expense.expenseType)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border font-medium ${sc.color}`}>
              <Icon className="h-4 w-4" />{sc.label}
            </span>
            <span className="text-2xl font-bold text-gray-900">{formatINR(expense.amount)}</span>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">Description</p>
            <p className="text-sm text-gray-800">{expense.description}</p>
          </div>

          {/* Grid info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-semibold mb-1">Requested By</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-blue-800">{expense.requester?.name || 'Unknown'}</span>
              </div>
              <p className="text-xs text-blue-400 mt-0.5">{expense.requester?.role || ''}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Payment Source</p>
              <div className="flex items-center gap-2">
                {expense.payeeName === 'BANK'
                  ? <><Building2 className="h-4 w-4 text-blue-600" /><span className="font-medium text-gray-800">Bank</span></>
                  : <><Banknote className="h-4 w-4 text-amber-600" /><span className="font-medium text-gray-800">Cash</span></>
                }
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Submitted</p>
              <p className="text-xs font-medium text-gray-800">{formatDate(expense.createdAt)}</p>
            </div>
            {expense.approvedAt && (
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-600 font-semibold mb-1">
                  {expense.categoryId === 'APPROVED' ? 'Approved' : 'Rejected'} By
                </p>
                <p className="text-xs font-medium text-gray-800">{expense.approver?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400">{formatDate(expense.approvedAt)}</p>
              </div>
            )}
          </div>

          {expense.remarks && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-600 font-semibold mb-1">Remarks / Reason</p>
              <p className="text-sm text-amber-800 italic">{expense.remarks}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Approve dialog with balances ─── */
function ApproveDialog({
  expense, onConfirm, onClose, loading
}: {
  expense: ExpenseRecord; onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [bankName, setBankName] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        if (expense.companyId) {
          const cRes = await fetch(`/api/cashbook?companyId=${expense.companyId}`);
          if (cRes.ok) {
            const cd = await cRes.json();
            if (cd.success && cd.cashBook) setCashBalance(cd.cashBook.currentBalance);
          }
          const bRes = await fetch(`/api/accounting/bank-accounts?companyId=${expense.companyId}`);
          if (bRes.ok) {
            const bd = await bRes.json();
            const accs = bd.bankAccounts || [];
            const def = expense.paymentReference
              ? accs.find((a: any) => a.id === expense.paymentReference)
              : (accs.find((a: any) => a.isDefault) || accs[0]);
            if (def) { setBankBalance(def.currentBalance); setBankName(def.bankName); }
          }
        }
      } catch {}
    };
    load();
  }, [expense.companyId, expense.paymentReference]);

  const isBank = expense.payeeName === 'BANK';
  const afterBalance = isBank && bankBalance !== null ? bankBalance - expense.amount
    : !isBank && cashBalance !== null ? cashBalance - expense.amount : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Approve Expense</h2>
          <p className="text-green-100 text-xs mt-0.5">{expense.expenseNumber} • {headLabel(expense.expenseType)}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Amount to Deduct</span>
            <span className="text-2xl font-bold text-red-600">{formatINR(expense.amount)}</span>
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
            <strong>{expense.requester?.name || 'Cashier'}</strong> requested this via{' '}
            <strong>{isBank ? (bankName || 'Bank') : 'Cash'}</strong>
          </div>

          {/* Balance preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 border ${isBank ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className={`h-3.5 w-3.5 ${isBank ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-xs font-semibold text-gray-500">Bank Balance</p>
              </div>
              <p className="text-sm font-bold text-gray-800">{bankBalance !== null ? formatINR(bankBalance) : '—'}</p>
              {isBank && afterBalance !== null && (
                <p className="text-xs text-red-500 mt-0.5">→ {formatINR(afterBalance)} after</p>
              )}
            </div>
            <div className={`rounded-xl p-3 border ${!isBank ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className={`h-3.5 w-3.5 ${!isBank ? 'text-amber-600' : 'text-gray-400'}`} />
                <p className="text-xs font-semibold text-gray-500">Cash Balance</p>
              </div>
              <p className="text-sm font-bold text-gray-800">{cashBalance !== null ? formatINR(cashBalance) : '—'}</p>
              {!isBank && afterBalance !== null && (
                <p className="text-xs text-red-500 mt-0.5">→ {formatINR(afterBalance)} after</p>
              )}
            </div>
          </div>

          {afterBalance !== null && afterBalance < 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Insufficient balance! This will go negative.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirm Approve
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function SuperAdminExpenseSection({ adminId, companyId: propCompanyId }: Props) {
  const [requests, setRequests]       = useState<ExpenseRecord[]>([]);
  const [history, setHistory]         = useState<ExpenseRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [historyTab, setHistoryTab]   = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey]   = useState(0);

  // Dialogs
  const [viewExpense, setViewExpense]     = useState<ExpenseRecord | null>(null);
  const [approvingExpense, setApprovingExpense] = useState<ExpenseRecord | null>(null);

  // Company selector — default empty = "All Companies (view only)"
  const [companies, setCompanies]         = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(propCompanyId || '');

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.json())
      .then(d => {
        const list: Company[] = d.companies || d.data || [];
        setCompanies(list);
        // Default: '' = All Companies (do NOT auto-select first)
        if (propCompanyId) setSelectedCompanyId(propCompanyId);
      })
      .catch(() => {});
  }, []);

  const activeCompanyId = selectedCompanyId || propCompanyId || '';
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const cParam = activeCompanyId ? `&companyId=${activeCompanyId}` : '';
        const [pendingRes, historyRes] = await Promise.all([
          fetch(`/api/expense-request?role=SUPER_ADMIN&status=PENDING${cParam}`),
          fetch(`/api/expense-request?status=ALL${cParam}&limit=200`),
        ]);
        const [pendingData, historyData] = await Promise.all([pendingRes.json(), historyRes.json()]);
        setRequests(pendingData.requests || []);
        const all: ExpenseRecord[] = historyData.requests || [];
        setHistory(all.filter(r => r.categoryId !== 'PENDING'));
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [refreshKey, activeCompanyId]);

  // Approve with balance confirmation dialog
  const openApprove = (req: ExpenseRecord) => setApprovingExpense(req);

  const confirmApprove = async () => {
    if (!approvingExpense) return;
    setActionLoading(approvingExpense.id + 'APPROVE');
    try {
      const res = await fetch('/api/expense-request', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvingExpense.id, action: 'APPROVE', adminId }),
      });
      const data = await res.json();
      if (data.success) {
        refresh();
        setApprovingExpense(null);
      }
    } catch {}
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + 'REJECT');
    try {
      const res = await fetch('/api/expense-request', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'REJECT', adminId, rejectionReason }),
      });
      const data = await res.json();
      if (data.success) { refresh(); setRejectingId(null); setRejectionReason(''); }
    } catch {}
    finally { setActionLoading(null); }
  };

  const filteredHistory = historyTab === 'ALL' ? history : history.filter(r => r.categoryId === historyTab);
  const totalApproved = history.filter(r => r.isApproved).reduce((s, r) => s + r.amount, 0);
  const totalPending  = requests.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-rose-600" /> Expense Management
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage expense requests from cashiers · Add direct expenses</p>
      </div>

      {/* Company Selector */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
        <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-700 mb-1">Select Company for Expense</p>
          <select
            value={selectedCompanyId}
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="">— All Companies (view all) —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <ExpenseRequestPanel
            role="SUPER_ADMIN"
            userId={adminId}
            companyId={activeCompanyId}
            triggerLabel="Add Direct Expense"
            onSuccess={refresh}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-medium">Pending Requests</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{requests.length}</p>
          <p className="text-xs text-amber-500 mt-0.5">{formatINR(totalPending)} awaiting</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium">Total Approved</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{history.filter(r => r.isApproved).length}</p>
          <p className="text-xs text-green-500 mt-0.5">{formatINR(totalApproved)} posted</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs text-red-600 font-medium">Rejected</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{history.filter(r => r.categoryId === 'REJECTED').length}</p>
          <p className="text-xs text-red-400 mt-0.5">Not posted</p>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" /> Pending Cashier Requests
            {requests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{requests.length}</span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-300" />
            <p className="font-medium">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {requests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{req.expenseNumber}</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full font-medium">{headLabel(req.expenseType)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-medium flex items-center gap-1 ${req.payeeName === 'BANK' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {req.payeeName === 'BANK' ? <Building2 className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                          {req.payeeName === 'BANK' ? 'Bank' : 'Cash'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mt-1 truncate">{req.description}</p>

                      {/* Requester info */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          Requested by{' '}
                          <span className="font-semibold text-gray-700">{req.requester?.name || req.payeeId || 'Unknown'}</span>
                          {req.requester?.role && <span className="text-gray-400"> ({req.requester.role})</span>}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{formatDate(req.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-xl font-bold text-gray-900">{formatINR(req.amount)}</p>
                      {rejectingId === req.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          <input type="text" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                            placeholder="Rejection reason (optional)"
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-red-400" />
                          <div className="flex gap-2">
                            <button onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleReject(req.id)} disabled={!!actionLoading}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 flex items-center gap-1">
                              {actionLoading === req.id + 'REJECT' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setViewExpense(req)}
                            className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button onClick={() => setRejectingId(req.id)}
                            className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                          <button onClick={() => openApprove(req)} disabled={!!actionLoading}
                            className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 transition-colors flex items-center gap-1">
                            {actionLoading === req.id + 'APPROVE' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Receipt className="h-4 w-4 text-gray-500" />Expense History</h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'APPROVED', 'REJECTED'] as const).map(s => (
              <button key={s} onClick={() => setHistoryTab(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${historyTab === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {s === 'ALL' ? 'All' : s === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No expense history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Head</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Requested By</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredHistory.map(r => {
                  const sc = STATUS_CONFIG[r.categoryId as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                  const Icon = sc.icon;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.expenseNumber}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-xs">{headLabel(r.expenseType)}</span></td>
                      <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{r.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-gray-400" />
                          <span>{r.requester?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs ${r.payeeName === 'BANK' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {r.payeeName === 'BANK' ? <Building2 className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                          {r.payeeName === 'BANK' ? 'Bank' : 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatINR(r.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium w-fit ${sc.color}`}>
                          <Icon className="h-3 w-3" />{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setViewExpense(r)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {viewExpense && <ExpenseDetailDialog expense={viewExpense} onClose={() => setViewExpense(null)} />}
      {approvingExpense && (
        <ApproveDialog
          expense={approvingExpense}
          onConfirm={confirmApprove}
          onClose={() => setApprovingExpense(null)}
          loading={actionLoading === approvingExpense.id + 'APPROVE'}
        />
      )}
    </div>
  );
}
