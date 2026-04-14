'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, CheckCircle, XCircle, Clock, PlusCircle,
  ChevronDown, ChevronUp, Building2, Banknote,
  Loader2, Filter, RefreshCw, AlertCircle, TrendingDown
} from 'lucide-react';
import ExpenseRequestPanel, { EXPENSE_HEADS } from '@/components/expense/ExpenseRequestPanel';

interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  expenseType: string;
  description: string;
  amount: number;
  paymentMode: string;
  payeeName: string; // stores payment source: BANK | CASH
  categoryId: string; // PENDING | APPROVED | REJECTED
  isApproved: boolean;
  payeeId: string;     // cashier user id
  paymentReference: string | null; // bank account id
  createdById: string;
  createdAt: string;
  approvedAt: string | null;
  approvedById: string | null;
  remarks: string | null;
}

interface Props {
  adminId: string;
  companyId?: string;
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200',         icon: XCircle },
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

export default function SuperAdminExpenseSection({ adminId, companyId }: Props) {
  const [requests, setRequests] = useState<ExpenseRecord[]>([]);
  const [history, setHistory] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Fetch pending requests from cashiers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pendingRes, historyRes] = await Promise.all([
          fetch(`/api/expense-request?role=SUPER_ADMIN&status=PENDING${companyId ? `&companyId=${companyId}` : ''}`),
          fetch(`/api/expense-request?status=ALL${companyId ? `&companyId=${companyId}` : ''}&limit=200`),
        ]);
        const [pendingData, historyData] = await Promise.all([pendingRes.json(), historyRes.json()]);
        setRequests(pendingData.requests || []);
        const all: ExpenseRecord[] = historyData.requests || [];
        setHistory(all.filter(r => r.categoryId !== 'PENDING'));
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [refreshKey, companyId]);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(id + action);
    try {
      const res = await fetch('/api/expense-request', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, adminId, rejectionReason: action === 'REJECT' ? rejectionReason : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        refresh();
        if (action === 'REJECT') { setRejectingId(null); setRejectionReason(''); }
      }
    } catch {}
    finally { setActionLoading(null); }
  };

  const filteredHistory = historyTab === 'ALL' ? history : history.filter(r => r.categoryId === historyTab);

  const totalApproved = history.filter(r => r.isApproved).reduce((s, r) => s + r.amount, 0);
  const totalPending = requests.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-rose-600" /> Expense Management
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage expense requests from cashiers · Add direct expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <ExpenseRequestPanel
            role="SUPER_ADMIN"
            userId={adminId}
            companyId={companyId}
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

      {/* Pending Requests Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" /> Pending Cashier Requests
            {requests.length > 0 && <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{requests.length}</span>}
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
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                  className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{req.expenseNumber}</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full font-medium">{headLabel(req.expenseType)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-medium flex items-center gap-1 ${req.payeeName === 'BANK' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {req.payeeName === 'BANK' ? <Building2 className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                          {req.payeeName === 'BANK' ? 'Bank' : 'Cash'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1 truncate">{req.description}</p>
                      {req.remarks && <p className="text-gray-400 text-xs mt-0.5 italic">"{req.remarks}"</p>}
                      <p className="text-gray-400 text-xs mt-1">{formatDate(req.createdAt)}</p>
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
                            <button onClick={() => handleAction(req.id, 'REJECT')} disabled={!!actionLoading}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 flex items-center gap-1">
                              {actionLoading === req.id + 'REJECT' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />} Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setRejectingId(req.id)}
                            className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                          <button onClick={() => handleAction(req.id, 'APPROVE')} disabled={!!actionLoading}
                            className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 transition-colors flex items-center gap-1">
                            {actionLoading === req.id + 'APPROVE' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} Approve
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

      {/* History Section */}
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
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
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
                      <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{r.description}</td>
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
                      <td className="px-4 py-3 text-xs text-gray-400 italic max-w-[140px] truncate">{r.remarks || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
