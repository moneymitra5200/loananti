'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currentBalance: number;
  isDefault: boolean;
  ifscCode?: string;
  companyId?: string;
  company?: { id: string; name: string; code: string; };
}

interface ActiveLoan {
  id: string;
  identifier: string;
  loanType: 'ONLINE' | 'OFFLINE';
  status: string;
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  customer?: { id?: string; name?: string; email?: string; phone?: string; };
  company?: { id: string; name: string; code: string; };
}

interface Company {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export function useAccountantData() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyParam = selectedCompanyId ? `?companyId=${selectedCompanyId}` : '';
      
      const [bankRes, loansRes, companiesRes] = await Promise.all([
        fetch(`/api/accounting/bank-accounts${companyParam}`),
        fetch(`/api/loan/all-active${companyParam}`),
        fetch('/api/company'),
      ]);

      const [bankData, loansData, companiesData] = await Promise.all([
        bankRes.json(),
        loansRes.json(),
        companiesRes.json(),
      ]);

      setBankAccounts(bankData.bankAccounts || []);
      setActiveLoans(loansData.loans || []);
      setCompanies(companiesData.companies || []);
    } catch (error) {
      console.error('Error fetching accountant data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const activeLoansCount = activeLoans.length;
    const totalLoanAmount = activeLoans.reduce((sum, loan) => sum + loan.approvedAmount, 0);
    
    return {
      totalBankBalance,
      activeLoansCount,
      totalLoanAmount,
    };
  }, [bankAccounts, activeLoans]);

  return {
    bankAccounts,
    activeLoans,
    companies,
    loading,
    selectedCompanyId,
    setSelectedCompanyId,
    stats,
    refetch: fetchData,
  };
}
