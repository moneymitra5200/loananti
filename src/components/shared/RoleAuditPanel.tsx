'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Activity, RefreshCw, Undo2, Eye, Clock, Search, Filter,
  ChevronLeft, ChevronRight, Download, AlertTriangle, CheckCircle,
  XCircle, Shield, User, Building2, FileText, CreditCard, Settings, Banknote
} from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  module: string;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
  loanApplication?: { id: string; applicationNo: string } | null;
}

interface ActionEntry {
  id: string;
  userId: string;
  userRole: string;
  actionType: string;
  module: string;
  recordId: string;
  recordType: string;
  description: string;
  previousData?: string | null;
  newData?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  isUndone: boolean;
  isRedone: boolean;
  createdAt: string;
  undoneAt?: string | null;
}

interface Props {
  /** Current user's ID — used to scope audit logs (omit for Super Admin to see all) */
  userId?: string;
  /** Current user's role — used for display and ownership rules */
  userRole: string;
  /** If true, no userId filter → Super Admin sees everything */
  isAdmin?: boolean;
  /** If true, the Undo Actions tab is hidden */
  hideUndo?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, React.ElementType> = {
  AUTH: Shield, USER: User, COMPANY: Building2, LOAN: FileText,
  PAYMENT: CreditCard, OFFLINE_LOAN: Banknote, EMI_PAYMENT: Banknote,
  ONLINE_LOAN: Banknote, LOAN_CLOSE: XCircle, SETTLEMENT: CreditCard,
  SYSTEM: Settings, DEFAULT: Activity,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  LOGIN:  'bg-purple-100 text-purple-700 border-purple-200',
  LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
  APPROVE:'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECT: 'bg-red-100 text-red-700 border-red-200',
  DISBURSE:'bg-cyan-100 text-cyan-700 border-cyan-200',
  PAY:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  VERIFY: 'bg-amber-100 text-amber-700 border-amber-200',
  DEFAULT:'bg-gray-100 text-gray-700 border-gray-200',
};

const getActionColor = (action: string) => ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;
const getModuleIcon  = (mod: string): React.ElementType => MODULE_ICONS[mod] || MODULE_ICONS.DEFAULT;

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RoleAuditPanel({ userId, userRole, isAdmin = false, hideUndo = false }: Props) {
  const [tab, setTab] = useState<'history' | 'undo'>('history');

  // Audit log state
  const [logs, setLogs]           = useState<AuditEntry[]>([]);
  const [modules, setModules]     = useState<string[]>([]);
  const [actions, setActions]     = useState<string[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [selectedLog, setSelectedLog]   = useState<AuditEntry | null>(null);

  // Action log (undo) state
  const [undoActions, setUndoActions]   = useState<ActionEntry[]>([]);
  const [undoLoading, setUndoLoading]   = useState(false);
  const [undoingId, setUndoingId]       = useState<string | null>(null);

  // ── Fetch Audit Logs ─────────────────────────────────────────────────────────
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (!isAdmin && userId) params.set('userId', userId);
      if (filterModule) params.set('module', filterModule);
      if (filterAction) params.set('action', filterAction);

      const res  = await fetch(`/api/audit?${params}`);
      const data = await res.json();

      setLogs(data.logs || []);
      setModules(data.modules || []);
      setActions(data.actions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
    } finally {
      setAuditLoading(false);
    }
  }, [page, filterModule, filterAction, userId, isAdmin]);

  // ── Fetch Undoable Actions ───────────────────────────────────────────────────
  const fetchUndoActions = useCallback(async () => {
    if (!userId && !isAdmin) return;
    setUndoLoading(true);
    try {
      // Always use the undoable endpoint — for admin omit userId to get all users' actions
      const params = new URLSearchParams({ action: 'undoable' });
      if (userId) params.set('userId', userId);
      if (userRole) params.set('userRole', userRole);
      const res  = await fetch(`/api/action-log?${params}`);
      const data = await res.json();
      // Filter defensively in case backend returns already-undone items
      setUndoActions((data.actions || []).filter((a: ActionEntry) => a.canUndo && !a.isUndone));
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch undoable actions', variant: 'destructive' });
    } finally {
      setUndoLoading(false);
    }
  }, [userId, userRole, isAdmin]);

  useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);
  useEffect(() => { if (tab === 'undo') fetchUndoActions(); }, [tab, fetchUndoActions]);

  // ── Handle Undo ──────────────────────────────────────────────────────────────
  const handleUndo = async (actionLog: ActionEntry) => {
    if (!userId && !isAdmin) return;
    setUndoingId(actionLog.id);
    try {
      const res = await fetch('/api/action-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Pass acting userId + userRole so super admin can undo others' actions
        body: JSON.stringify({
          action: 'undo',
          actionLogId: actionLog.id,
          userId: userId || actionLog.userId,
          userRole
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: '✅ Action Undone', description: `"${actionLog.description}" has been reversed.` });
        fetchUndoActions();
        fetchAuditLogs();
      } else {
        toast({ title: 'Cannot Undo', description: data.error || 'This action cannot be undone.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to undo action', variant: 'destructive' });
    } finally {
      setUndoingId(null);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const filtered = logs.filter(l =>
      l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const csv = [
      ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Description', 'IP'].join(','),
      ...filtered.map(l => [
        new Date(l.createdAt).toISOString(),
        l.user?.name || 'System',
        l.user?.role || 'N/A',
        l.action, l.module,
        `"${l.description.replace(/"/g, '""')}"`,
        l.ipAddress || 'N/A',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Audit log exported as CSV' });
  };

  // ── Filtered log list ────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(l =>
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0 shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {isAdmin ? 'System-Wide Audit Log' : 'My Activity & Audit Log'}
                </h3>
                <p className="text-sm text-slate-300">
                  {isAdmin
                    ? 'Complete audit trail for all users and roles'
                    : `Your full action history as ${userRole}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={fetchAuditLogs} className="bg-white/10 hover:bg-white/20 text-white border-0">
                <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={exportCSV} className="bg-white/10 hover:bg-white/20 text-white border-0">
                <Download className="h-4 w-4 mr-1.5" />Export CSV
              </Button>
            </div>
          </div>

          {/* Tab switcher */}
          {!hideUndo && (
            <div className="flex gap-2 mt-4">
              {(['history', 'undo'] as const).map(t => (
                <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {t === 'history' ? (
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Audit History ({total})</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Undo2 className="h-3.5 w-3.5" />Undo Actions ({undoActions.length})</span>
                )}
              </button>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── TAB: HISTORY ── */}
      {tab === 'history' && (
        <>
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative col-span-2 md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterModule || 'all'} onValueChange={v => { setPage(1); setFilterModule(v === 'all' ? '' : v); }}>
                  <SelectTrigger><SelectValue placeholder="All modules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAction || 'all'} onValueChange={v => { setPage(1); setFilterAction(v === 'all' ? '' : v); }}>
                  <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Filter className="h-4 w-4" />
                  {total.toLocaleString()} total records
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log Table */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Time</TableHead>
                        {isAdmin && <TableHead>User</TableHead>}
                        <TableHead>Action</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map(log => {
                        const ModIcon = getModuleIcon(log.module);
                        return (
                          <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="whitespace-nowrap text-xs text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDate(log.createdAt)}
                              </div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{log.user?.name || 'System'}</p>
                                  <p className="text-xs text-gray-400">{log.user?.role}</p>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge className={`text-xs ${getActionColor(log.action)}`}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <ModIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{log.module}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate" title={log.description}>{log.description}</p>
                              {log.loanApplication && (
                                <p className="text-xs text-blue-500 mt-0.5">Loan: {log.loanApplication.applicationNo}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{log.ipAddress || 'N/A'}</code>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedLog(log)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── TAB: UNDO ACTIONS ── */}
      {tab === 'undo' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-600" />
              Undoable Actions
            </CardTitle>
            <CardDescription>
              Actions taken in the last 24 hours that can be reversed. Undo will restore the previous state exactly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {undoLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-7 w-7 animate-spin text-gray-300" />
              </div>
            ) : undoActions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                <p className="font-medium">No undoable actions</p>
                <p className="text-sm mt-1">All recent actions are final or have already been undone.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {undoActions.map(action => {
                  const ModIcon = getModuleIcon(action.module);
                  return (
                    <div key={action.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 bg-amber-100 rounded-lg shrink-0 mt-0.5">
                          <ModIcon className="h-4 w-4 text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{action.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-xs ${getActionColor(action.actionType)}`}>{action.actionType}</Badge>
                            <span className="text-xs text-gray-400">{action.module}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{formatDate(action.createdAt)}</span>
                          </div>
                          {action.previousData && (
                            <p className="text-xs text-gray-500 mt-1.5 bg-white rounded px-2 py-1 border border-gray-100 truncate">
                              Will restore: {(() => {
                                try { const d = JSON.parse(action.previousData); return Object.entries(d).slice(0, 2).map(([k,v]) => `${k}=${v}`).join(', '); }
                                catch { return action.previousData.substring(0, 60); }
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400"
                        disabled={undoingId === action.id}
                        onClick={() => handleUndo(action)}
                      >
                        {undoingId === action.id
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <><Undo2 className="h-3.5 w-3.5 mr-1.5" />Undo</>
                        }
                      </Button>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 text-center pt-2">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Undo actions are available for 24 hours only. After that, changes are permanent.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Log Details Dialog ── */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>Complete information about this activity</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Timestamp', value: formatDate(selectedLog.createdAt) },
                  { label: 'Module', value: selectedLog.module },
                  { label: 'IP Address', value: selectedLog.ipAddress || 'N/A' },
                  { label: 'Loan', value: selectedLog.loanApplication?.applicationNo || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Action</p>
                  <Badge className={getActionColor(selectedLog.action)}>{selectedLog.action}</Badge>
                </div>
                {isAdmin && selectedLog.user && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Performed By</p>
                    <p className="text-sm font-medium">{selectedLog.user.name}</p>
                    <p className="text-xs text-gray-400">{selectedLog.user.email} · {selectedLog.user.role}</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm">{selectedLog.description}</p>
              </div>

              {selectedLog.oldValue && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-600 font-medium mb-1">Previous Value (Before Change)</p>
                  <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border text-red-700">
                    {(() => { try { return JSON.stringify(JSON.parse(selectedLog.oldValue!), null, 2); } catch { return selectedLog.oldValue; } })()}
                  </pre>
                </div>
              )}
              {selectedLog.newValue && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">New Value (After Change)</p>
                  <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border text-green-700">
                    {(() => { try { return JSON.stringify(JSON.parse(selectedLog.newValue!), null, 2); } catch { return selectedLog.newValue; } })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
