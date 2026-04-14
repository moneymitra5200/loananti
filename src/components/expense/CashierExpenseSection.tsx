'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, CheckCircle, XCircle, Clock, Loader2, Banknote, Building2, TrendingDown, RefreshCw } from 'lucide-react';
import ExpenseRequestPanel, { EXPENSE_HEADS } from '@/components/expense/ExpenseRequestPanel';

interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  expenseType: string;
  description: string;
  amount: number;
  payeeName: string;
  categoryId: string;
  isApproved: boolean;
  createdAt: string;
  approvedAt: string | null;
  remarks: string | null;
}

interface Props {
  cashierId: string;
  companyId?: string;
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending Review', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  APPROVED: { label: 'Approved',       color: 'text-green-700 bg-green-50 border-green-200',  icon: CheckCircle },
  REJECTED: { label: 'Rejected',       color: 'text-red-700 bg-red-50 border-red-200',         icon: XCircle },
};

function formatINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function formatDate(s: string) { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function headLabel(v: string) { return EXPENSE_HEADS.find(h => h.value === v)?.label || v; }

export default function CashierExpenseSection({ cashierId, companyId }: Props) {
  const [requests, setRequests] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/expense-request?role=CASHIER&userId=${cashierId}&status=ALL`);
        const data = await res.json();
        setRequests(data.requests || []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [cashierId, refreshKey]);

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.categoryId === filter);

  const total = requests.length;
  const pending = requests.filter(r => r.categoryId === 'PENDING').length;
  const approved = requests.filter(r => r.categoryId === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-rose-600" /> Expense Requests
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Submit expense requests · Track approval status</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><RefreshCw className="h-4 w-4" /></button>
          <ExpenseRequestPanel
            role="CASHIER"
            userId={cashierId}
            companyId={companyId}
            triggerLabel="Request Expense"
            onSuccess={refresh}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-blue-600 font-medium">Total Requests</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{total}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-medium">Awaiting Approval</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium">Approved</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{approved}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
        <Receipt className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
        <div className="text-sm text-rose-700">
          <p className="font-semibold">How it works</p>
          <p className="mt-0.5 text-rose-600 text-xs">Submit an expense request → Super Admin reviews and approves/rejects → Once approved, the amount is deducted from the selected Bank/Cash account and posted to accounting.</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-gray-800">My Requests</h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${filter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {s === 'ALL' ? 'All' : s === 'PENDING' ? '⏱ Pending' : s === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-sm">No expense requests found</p>
            <p className="text-xs mt-1">Click "Request Expense" to submit your first request</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map((req, i) => {
                const sc = STATUS_CONFIG[req.categoryId as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                const Icon = sc.icon;
                return (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{req.expenseNumber}</span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full font-medium">{headLabel(req.expenseType)}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex items-center gap-1 ${req.payeeName === 'BANK' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {req.payeeName === 'BANK' ? <Building2 className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                            {req.payeeName === 'BANK' ? 'Bank' : 'Cash'}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mt-1 truncate">{req.description}</p>
                        {req.remarks && <p className="text-gray-400 text-xs italic mt-0.5">Remark: "{req.remarks}"</p>}
                        {req.categoryId === 'REJECTED' && req.remarks && (
                          <p className="text-red-500 text-xs mt-0.5 font-medium">Rejection reason: {req.remarks}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">{formatDate(req.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="text-xl font-bold text-gray-900">{formatINR(req.amount)}</p>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-semibold ${sc.color}`}>
                          <Icon className="h-3 w-3" />{sc.label}
                        </span>
                        {req.approvedAt && (
                          <p className="text-gray-400 text-[10px]">{req.categoryId === 'APPROVED' ? 'Approved' : 'Processed'}: {formatDate(req.approvedAt)}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
