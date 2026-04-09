'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
}

interface UserItem {
  id: string; name: string; email: string; role: string; isActive: boolean; isLocked?: boolean; createdAt: string;
  phone?: string; company?: string; companyId?: string; companyObj?: { id: string; name: string };
  agentId?: string; agent?: { id: string; name: string; agentCode: string }; agentCode?: string; 
  staffCode?: string; cashierCode?: string; accountantCode?: string;
}

interface CompanyItem {
  id: string; name: string; code: string; isActive: boolean;
}

export function useSuperAdminData(user: any) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [allActiveLoans, setAllActiveLoans] = useState<any[]>([]);
  const [activeLoanStats, setActiveLoanStats] = useState<any>({});
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loansRes, usersRes, companiesRes, productsRes, activeRes, settingsRes] = await Promise.all([
        fetch('/api/loan/list?role=SUPER_ADMIN'),
        fetch('/api/user'),
        fetch('/api/company?isActive=true'),
        fetch('/api/cms/product'),
        fetch('/api/loan/all-active'),
        fetch('/api/settings')
      ]);

      const [loansData, usersData, companiesData, productsData, activeData, settingsData] = await Promise.all([
        loansRes.json(),
        usersRes.json(),
        companiesRes.json(),
        productsRes.json(),
        activeRes.json(),
        settingsRes.json()
      ]);

      setLoans(loansData.loans || []);
      setCompanies(companiesData.companies || []);
      setProducts(productsData.products || []);
      setAllActiveLoans(activeData.loans || []);
      setActiveLoanStats(activeData.stats || {});
      
      if (settingsData.settings) {
        setSettings((prev: any) => ({ ...prev, ...settingsData.settings }));
      }
      
      if (usersData.users) {
        setUsers(usersData.users.map((u: any) => ({
          id: u.id, name: u.name || 'Unknown', email: u.email, role: u.role, isActive: u.isActive,
          createdAt: u.createdAt, phone: u.phone, company: u.company?.name, companyId: u.companyId,
          companyObj: u.company, agentId: u.agentId, agent: u.agent, agentCode: u.agentCode,
          staffCode: u.staffCode, cashierCode: u.cashierCode, accountantCode: u.accountantCode
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createUser = async (userForm: any) => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: 'User Created', description: `${userForm.name} created successfully` });
        fetchData();
        return true;
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create user', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/user?id=${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'User Deleted', description: 'User deleted successfully' });
        fetchData();
        return true;
      }
      toast({ title: 'Error', description: data.error || 'Failed to delete user', variant: 'destructive' });
      return false;
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
      return false;
    }
  };

  const approveLoan = async (loanId: string, action: 'approve' | 'reject', companyId?: string, remarks?: string) => {
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId, action, remarks, role: 'SUPER_ADMIN',
          userId: user?.id || 'system', companyId
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: action === 'approve' ? 'Loan Approved' : 'Loan Rejected' });
        fetchData();
        return true;
      }
      toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      return false;
    } catch (error) {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' });
      return false;
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      });
      if (response.ok) {
        toast({ title: 'Settings Saved' });
        return true;
      }
      return false;
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
      return false;
    }
  };

  const resetSystem = async (options?: any) => {
    try {
      const response = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          confirmReset: 'RESET_SYSTEM', 
          userId: user?.id,
          options: options // Pass reset options including accounting
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'System Reset Complete', description: 'All selected data has been reset' });
        fetchData();
        return true;
      }
      toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      return false;
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reset system', variant: 'destructive' });
      return false;
    }
  };

  return {
    loans, users, companies, products, allActiveLoans, activeLoanStats, settings, loading,
    fetchData, createUser, deleteUser, approveLoan, saveSettings, resetSystem, setSettings
  };
}
