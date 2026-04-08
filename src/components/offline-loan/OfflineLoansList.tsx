'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText, Search, IndianRupee, Calendar, User, Phone,
  ChevronLeft, ChevronRight, Eye, CheckCircle, Clock, AlertTriangle,
  Trash2, Building2, Undo2, Redo2, Wallet, Receipt, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import OfflineLoanDetailPanel from './OfflineLoanDetailPanel';
import ParallelLoanView from '@/components/loan/ParallelLoanView';

interface OfflineLoan {
  id: string;
  loanNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerEmail?: string;
  customerAadhaar?: string;
  customerPan?: string;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  status: string;
  disbursementDate: string;
  createdAt: string;
  createdByRole: string;
  createdById: string;
  loanType?: string;
  notes?: string;
  isInterestOnlyLoan?: boolean;
  interestOnlyMonthlyAmount?: number;
  totalInterestPaid?: number;
  isMirrorLoan?: boolean; // TRUE if this is a mirror loan (READ-ONLY)
  originalLoanId?: string; // Reference to original loan if this is a mirror
  displayColor?: string; // Display color for mirror pair
  company?: { id: string; name: string; code: string };
  summary: {
    totalEMIs: number;
    paidEMIs: number;
    pendingEMIs: number;
    overdueEMIs: number;
    lastPaidEMI?: string;
    nextDueEMI?: string;
  };
}

interface MirrorLoanMapping {
  id: string;
  originalLoanId: string;
  mirrorLoanId: string | null;
  originalCompanyId: string;
  mirrorCompanyId: string;
  displayColor: string | null;
  extraEMICount: number;
  mirrorTenure?: number;
  mirrorInterestRate?: number;
  mirrorEMIsPaid?: number;
  extraEMIsPaid?: number;
}

interface OfflineLoansListProps {
  userId?: string;
  userRole: string;
  onLoanSelect?: (loanId: string) => void;
  refreshKey?: number;
}

export default function OfflineLoansList({ userId, userRole, onLoanSelect, refreshKey }: OfflineLoansListProps) {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<OfflineLoan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, MirrorLoanMapping>>({});
  const [mirrorLoans, setMirrorLoans] = useState<Record<string, OfflineLoan>>({});

  // Detail view state
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<OfflineLoan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Undo/Redo actions
  const [undoableActions, setUndoableActions] = useState<any[]>([]);
  const [redoableActions, setRedoableActions] = useState<any[]>([]);

  useEffect(() => {
    fetchLoans();
    fetchCompanies();
    fetchActionableItems();
    fetchMirrorMappings();
  }, [userId, userRole, page, statusFilter, companyFilter, refreshKey]);

  const fetchMirrorMappings = async () => {
    try {
      const res = await fetch('/api/mirror-loan?action=all-mappings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.mappings) {
          const mappingMap: Record<string, MirrorLoanMapping> = {};
          const mirrorLoanIds: string[] = [];

          for (const mapping of data.mappings) {
            mappingMap[mapping.originalLoanId] = mapping;
            if (mapping.mirrorLoanId) {
              mappingMap[mapping.mirrorLoanId] = mapping;
              mirrorLoanIds.push(mapping.mirrorLoanId);
            }
          }
          setMirrorMappings(mappingMap);

          if (mirrorLoanIds.length > 0) {
            fetchMirrorLoanDetails(mirrorLoanIds);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch mirror mappings:', error);
    }
  };

  const fetchMirrorLoanDetails = async (loanIds: string[]) => {
    try {
      const mirrorLoansMap: Record<string, OfflineLoan> = {};
      for (const loanId of loanIds) {
        const res = await fetch(`/api/offline-loan?loanId=${loanId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.loan) {
            mirrorLoansMap[loanId] = data.loan;
          }
        }
      }
      setMirrorLoans(mirrorLoansMap);
    } catch (error) {
      console.error('Failed to fetch mirror loan details:', error);
    }
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);
      let url = `/api/offline-loan?page=${page}&limit=10`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (companyFilter !== 'all') url += `&companyId=${companyFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLoans(data.loans);
          setTotal(data.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/company?isActive=true');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchActionableItems = async () => {
    if (!userId) return;
    try {
      const [undoRes, redoRes] = await Promise.all([
        fetch(`/api/action-log?action=undoable&userId=${userId}`),
        fetch(`/api/action-log?action=redoable&userId=${userId}`)
      ]);

      if (undoRes.ok) {
        const data = await undoRes.json();
        setUndoableActions(data.actions || []);
      }
      if (redoRes.ok) {
        const data = await redoRes.json();
        setRedoableActions(data.actions || []);
      }
    } catch (error) {
      console.error('Failed to fetch actionable items:', error);
    }
  };

  const handleViewLoan = (loan: OfflineLoan) => {
    setSelectedLoanId(loan.id);
    setDetailOpen(true);
  };

  const handleDeleteClick = (loan: OfflineLoan) => {
    if (userRole !== 'SUPER_ADMIN') {
      toast({ title: 'Permission Denied', description: 'Only SuperAdmin can delete loans', variant: 'destructive' });
      return;
    }
    setLoanToDelete(loan);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async (force: boolean = false) => {
    if (!loanToDelete) return;
    try {
      setDeleting(true);
      let url = `/api/offline-loan?loanId=${loanToDelete.id}&userRole=${userRole}&userId=${userId}`;
      if (force) {
        url += '&force=true';
      }
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast({ title: 'Loan Deleted', description: data.message || `Loan ${loanToDelete.loanNumber} has been deleted` });
        setDeleteConfirmOpen(false);
        setLoanToDelete(null);
        fetchLoans();
        fetchActionableItems();
      } else if (data.hasPaidEMIs) {
        const confirmForce = window.confirm(
          `This loan has ${data.paidEMICount} paid EMI(s). Are you sure you want to delete it? This action cannot be undone easily.`
        );
        if (confirmForce) {
          await handleDeleteConfirm(true);
        } else {
          setDeleting(false);
        }
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete loan', variant: 'destructive' });
        setDeleting(false);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete loan', variant: 'destructive' });
      setDeleting(false);
    }
  };

  const handleUndo = async () => {
    if (undoableActions.length === 0) return;
    try {
      const action = undoableActions[0];
      const res = await fetch('/api/action-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', actionLogId: action.id, userId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast({ title: 'Action Undone', description: 'The action has been successfully undone' });
          fetchLoans();
          fetchActionableItems();
        }
      }
    } catch (error) {
      console.error('Undo error:', error);
      toast({ title: 'Error', description: 'Failed to undo action', variant: 'destructive' });
    }
  };

  const handleRedo = async () => {
    if (redoableActions.length === 0) return;
    try {
      const action = redoableActions[0];
      const res = await fetch('/api/action-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redo', actionLogId: action.id, userId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast({ title: 'Action Redone', description: 'The action has been successfully redone' });
          fetchLoans();
          fetchActionableItems();
        }
      }
    } catch (error) {
      console.error('Redo error:', error);
      toast({ title: 'Error', description: 'Failed to redo action', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Convert to the format expected by ParallelLoanView
  const convertToLoanData = (loan: OfflineLoan) => ({
    id: loan.id,
    loanNumber: loan.loanNumber,
    customerName: loan.customerName,
    customerPhone: loan.customerPhone,
    loanAmount: loan.loanAmount,
    interestRate: loan.interestRate,
    tenure: loan.tenure,
    emiAmount: loan.emiAmount,
    status: loan.status,
    disbursementDate: loan.disbursementDate,
    createdAt: loan.createdAt,
    company: loan.company,
    isInterestOnlyLoan: loan.isInterestOnlyLoan,
    interestOnlyMonthlyAmount: loan.interestOnlyMonthlyAmount,
    isMirrorLoan: loan.isMirrorLoan,
    originalLoanId: loan.originalLoanId,
    displayColor: loan.displayColor,
    summary: loan.summary
  });

  // Filter loans - show only original loans (not mirror loans separately)
  const filteredLoans = loans.filter(loan => {
    const matchesSearch =
      loan.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customerPhone.includes(searchQuery) ||
      loan.company?.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Check if this loan is a mirror loan using multiple methods:
    // 1. Direct isMirrorLoan field on the loan itself (most reliable for offline loans)
    // 2. Check if this loan's ID is stored as mirrorLoanId in a mapping
    const isMirrorFromField = loan.isMirrorLoan === true;
    const mapping = mirrorMappings[loan.id];
    const isMirrorFromMapping = mapping?.mirrorLoanId === loan.id;
    const isMirror = isMirrorFromField || isMirrorFromMapping;

    return matchesSearch && !isMirror;
  });

  // Separate active and closed loans
  const activeLoans = filteredLoans.filter(loan => loan.status !== 'CLOSED');
  const closedLoans = filteredLoans.filter(loan => loan.status === 'CLOSED');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded"></div>)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: OfflineLoan, index: number) => {
    const mapping = mirrorMappings[loan.id];

    // Try multiple methods to find the mirror loan:
    // 1. From mirrorLoans state (fetched from API)
    // 2. From local loans array (look for loan with originalLoanId = this loan's id and isMirrorLoan = true)
    let mirrorLoan = mapping?.mirrorLoanId ? mirrorLoans[mapping.mirrorLoanId] : null;

    // Fallback: Search in local loans array for mirror loan
    if (!mirrorLoan && !mapping?.mirrorLoanId) {
      mirrorLoan = loans.find(l =>
        l.isMirrorLoan === true &&
        l.originalLoanId === loan.id
      ) || null;
    }

    // Also check if mapping exists but mirrorLoanId is null - look for mirror in loans array
    if (!mirrorLoan && mapping && !mapping.mirrorLoanId) {
      mirrorLoan = loans.find(l =>
        l.isMirrorLoan === true &&
        l.originalLoanId === loan.id
      ) || null;
    }

    return (
      <ParallelLoanView
        key={loan.id}
        originalLoan={convertToLoanData(loan)}
        mirrorLoan={mirrorLoan ? convertToLoanData(mirrorLoan) : null}
        mirrorMapping={mapping ? {
          displayColor: mapping.displayColor,
          extraEMICount: mapping.extraEMICount,
          mirrorInterestRate: mapping.mirrorInterestRate,
          mirrorTenure: mapping.mirrorTenure,
          mirrorEMIsPaid: mapping.mirrorEMIsPaid,
          extraEMIsPaid: mapping.extraEMIsPaid,
          mirrorCompanyId: mapping.mirrorCompanyId,
          originalCompanyId: mapping.originalCompanyId
        } : (mirrorLoan ? {
          // Create a basic mapping from the mirror loan data
          displayColor: loan.displayColor || mirrorLoan.displayColor,
          extraEMICount: Math.max(0, loan.tenure - mirrorLoan.tenure),
          mirrorInterestRate: mirrorLoan.interestRate,
          mirrorTenure: mirrorLoan.tenure,
          mirrorEMIsPaid: 0,
          extraEMIsPaid: 0,
          mirrorCompanyId: mirrorLoan.company?.id,
          originalCompanyId: loan.company?.id
        } : null)}
        onViewOriginal={() => handleViewLoan(loan)}
        onViewMirror={() => mirrorLoan && handleViewLoan(mirrorLoan)}
        onPayEmi={(l, isOriginal) => handleViewLoan(isOriginal ? loan : mirrorLoan!)}
        userRole={userRole}
        showPayButton={true}
        showEmiProgress={true}
      />
    );
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" /> Offline Loans (Parallel View)
            </CardTitle>
            <div className="flex items-center gap-2">
              {undoableActions.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleUndo} className="bg-white/20 hover:bg-white/30">
                  <Undo2 className="h-4 w-4 mr-1" /> Undo
                </Button>
              )}
              {redoableActions.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleRedo} className="bg-white/20 hover:bg-white/30">
                  <Redo2 className="h-4 w-4 mr-1" /> Redo
                </Button>
              )}
              <Badge className="bg-white/20 text-white border-0">{total} Loans</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search by name, loan#, phone, company..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Companies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INTEREST_ONLY">Interest Only</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="DEFAULTED">Defaulted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-400"></div>
              <span>Original (Left)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-400"></div>
              <span>Mirror (Right)</span>
            </div>
          </div>

          {/* Loans List */}
          <ScrollArea className="h-[500px]">
            {filteredLoans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No offline loans found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Loans Section */}
                {activeLoans.length > 0 && statusFilter !== 'CLOSED' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-600 px-1 flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Active Loans ({activeLoans.length})
                    </h3>
                    <AnimatePresence>
                      {activeLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Closed Loans Section */}
                {closedLoans.length > 0 && (statusFilter === 'all' || statusFilter === 'CLOSED') && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-green-700 px-1 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Closed Loans ({closedLoans.length})
                    </h3>
                    <AnimatePresence>
                      {closedLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {total > 10 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 10)}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-Page Loan Detail Panel */}
      <OfflineLoanDetailPanel
        loanId={selectedLoanId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedLoanId(null);
        }}
        userId={userId}
        userRole={userRole}
        onPaymentSuccess={() => {
          fetchLoans();
        }}
        onLoanStarted={() => {
          fetchLoans();
        }}
        onLoanDeleted={() => {
          fetchLoans();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Loan?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete loan <strong>{loanToDelete?.loanNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDeleteConfirm(false)} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Loan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
