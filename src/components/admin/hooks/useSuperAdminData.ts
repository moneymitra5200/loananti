'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any; companyId?: string;
}

interface UserItem {
  id: string; name: string; email: string; role: string; isActive: boolean; isLocked?: boolean; createdAt: string;
  phone?: string; company?: string | { id: string; name: string }; companyId?: string;
  agentId?: string; agent?: { id: string; name: string; agentCode: string };
}

interface CompanyItem {
  id: string; name: string; code: string; isActive: boolean;
}

export function useSuperAdminData() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loansRes, usersRes, companiesRes] = await Promise.all([
        fetch('/api/loan/list?role=SUPER_ADMIN'),
        fetch('/api/user'),
        fetch('/api/company'),
      ]);

      const [loansData, usersData, companiesData] = await Promise.all([
        loansRes.json(),
        usersRes.json(),
        companiesRes.json(),
      ]);

      setLoans(loansData.loans || []);
      setUsers(usersData.users || []);
      setCompanies(companiesData.companies || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLoans = useMemo(() => {
    if (!selectedCompanyId) return loans;
    return loans.filter(l => l.companyId === selectedCompanyId || l.company?.id === selectedCompanyId);
  }, [loans, selectedCompanyId]);

  const pendingForSA = useMemo(() => 
    filteredLoans.filter(l => l.status === 'SUBMITTED'), [filteredLoans]);
  
  const pendingForFinal = useMemo(() => 
    filteredLoans.filter(l => l.status === 'CUSTOMER_SESSION_APPROVED'), [filteredLoans]);
  
  const inProgressLoans = useMemo(() => 
    filteredLoans.filter(l => !['SUBMITTED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED', 'ACTIVE', 'REJECTED', 'DISBURSED'].includes(l.status)), 
    [filteredLoans]);
  
  const activeLoans = useMemo(() => 
    filteredLoans.filter(l => l.status === 'ACTIVE' || l.status === 'DISBURSED'), [filteredLoans]);

  const agents = useMemo(() => 
    users.filter(u => u.role === 'AGENT' && u.isActive), [users]);

  return {
    loans: filteredLoans,
    users,
    companies,
    agents,
    loading,
    selectedCompanyId,
    setSelectedCompanyId,
    pendingForSA,
    pendingForFinal,
    inProgressLoans,
    activeLoans,
    refetch: fetchData,
  };
}

export function useLoanSelection() {
  const [selectedLoanIds, setSelectedLoanIds] = useState<string[]>([]);

  const handleSelectLoan = useCallback((id: string) => {
    setSelectedLoanIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedLoanIds(prev => 
      prev.length === ids.length ? [] : ids
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLoanIds([]);
  }, []);

  return {
    selectedLoanIds,
    handleSelectLoan,
    handleSelectAll,
    clearSelection,
  };
}

export function useApprovalActions(refetch: () => void) {
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const openApprovalDialog = useCallback((loan: Loan, action: 'approve' | 'reject') => {
    setSelectedLoan(loan);
    setApprovalAction(action);
    setRemarks('');
    setShowApprovalDialog(true);
  }, []);

  const handleApproval = useCallback(async (companyId?: string) => {
    if (!selectedLoan) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          action: approvalAction === 'approve' ? 'sa_approve' : 'reject',
          role: 'SUPER_ADMIN',
          remarks,
          companyId: approvalAction === 'approve' ? companyId : undefined,
        }),
      });

      if (response.ok) {
        toast({ 
          title: 'Success', 
          description: `Loan ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully` 
        });
        setShowApprovalDialog(false);
        refetch();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to process', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [selectedLoan, approvalAction, remarks, refetch]);

  return {
    selectedLoan,
    setSelectedLoan,
    showApprovalDialog,
    setShowApprovalDialog,
    approvalAction,
    setApprovalAction,
    remarks,
    setRemarks,
    saving,
    openApprovalDialog,
    handleApproval,
  };
}
