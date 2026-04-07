'use client';

import React, { memo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, FileText, Receipt, CreditCard, Wallet, Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import ParallelLoanView from '@/components/loan/ParallelLoanView';
import type { ActiveLoansTabProps, ActiveLoan } from './types';

interface MirrorLoanData {
  id: string;
  applicationNo?: string;
  identifier?: string;
  status?: string;
  loanType?: string;
  disbursedAmount?: number;
  approvedAmount?: number;
  disbursementDate?: string;
  createdAt?: string;
  interestRate?: number;
  tenure?: number;
  emiAmount?: number;
  company?: { id?: string; name: string; code?: string };
  customer?: { id?: string; name?: string; phone?: string; email?: string };
  sessionForm?: {
    approvedAmount?: number;
    interestRate?: number;
    tenure?: number;
    emiAmount?: number;
    disbursementDate?: string;
  };
}

interface MirrorMapping {
  id: string;
  originalLoanId: string;
  mirrorLoanId: string | null;
  originalCompanyId: string;
  mirrorCompanyId: string;
  displayColor: string | null;
  extraEMICount: number | null;
  mirrorTenure: number | null;
  originalTenure: number | null;
  originalInterestRate: number | null;
  mirrorInterestRate: number | null;
  mirrorEMIsPaid: number | null;
  extraEMIsPaid: number | null;
  originalEMIAmount: number | null;
  mirrorLoan: MirrorLoanData | null;
  originalLoan: ActiveLoan | null;
  mirrorCompany: { id: string; name: string; code: string } | null;
  originalCompany: { id: string; name: string; code: string } | null;
}

function ActiveLoansTabComponent({
  activeLoans,
  loanStats,
  loanFilter,
  setLoanFilter,
  fetchDashboardData,
  formatCurrency,
  formatDate,
}: ActiveLoansTabProps) {
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, MirrorMapping>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch mirror mappings on mount
  useEffect(() => {
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const mappingMap: Record<string, MirrorMapping> = {};
            for (const mapping of data.mappings) {
              mappingMap[mapping.originalLoanId] = mapping;
              if (mapping.mirrorLoanId) {
                mappingMap[mapping.mirrorLoanId] = mapping;
              }
            }
            setMirrorMappings(mappingMap);
          }
        }
      } catch (error) {
        console.error('Failed to fetch mirror mappings:', error);
      }
    };

    fetchMirrorMappings();
  }, []);

  // Convert ActiveLoan to format expected by ParallelLoanView
  const convertToLoanData = (loan: ActiveLoan) => ({
    id: loan.id,
    identifier: loan.identifier,
    customer: loan.customer,
    customerName: loan.customer?.name,
    customerPhone: loan.customer?.phone,
    approvedAmount: loan.approvedAmount,
    interestRate: loan.interestRate,
    tenure: loan.tenure,
    emiAmount: loan.emiAmount,
    status: loan.status,
    loanType: loan.loanType,
    disbursementDate: loan.disbursementDate ? new Date(loan.disbursementDate).toISOString() : undefined,
    createdAt: loan.createdAt ? new Date(loan.createdAt).toISOString() : new Date().toISOString(),
    company: loan.company,
    nextEmi: loan.nextEmi ? {
      ...loan.nextEmi,
      dueDate: loan.nextEmi.dueDate ? new Date(loan.nextEmi.dueDate).toISOString() : ''
    } : undefined
  });

  // Convert MirrorLoanData to format expected by ParallelLoanView
  const convertMirrorToLoanData = (mirrorLoan: MirrorLoanData | null, mapping: MirrorMapping, originalLoan: ActiveLoan) => {
    // If there's an actual mirror loan record, use it
    if (mirrorLoan) {
      return {
        id: mirrorLoan.id,
        identifier: mirrorLoan.identifier || mirrorLoan.applicationNo,
        applicationNo: mirrorLoan.applicationNo,
        customer: mirrorLoan.customer,
        customerName: mirrorLoan.customer?.name,
        customerPhone: mirrorLoan.customer?.phone,
        approvedAmount: mirrorLoan.approvedAmount || mirrorLoan.disbursedAmount || mirrorLoan.sessionForm?.approvedAmount || 0,
        interestRate: mapping.mirrorInterestRate || mirrorLoan.interestRate || mirrorLoan.sessionForm?.interestRate || 0,
        tenure: mapping.mirrorTenure || mirrorLoan.tenure || mirrorLoan.sessionForm?.tenure || 0,
        emiAmount: mapping.originalEMIAmount || mirrorLoan.emiAmount || mirrorLoan.sessionForm?.emiAmount || 0,
        status: mirrorLoan.status || 'ACTIVE',
        loanType: mirrorLoan.loanType,
        disbursementDate: mirrorLoan.disbursementDate || mirrorLoan.sessionForm?.disbursementDate,
        createdAt: mirrorLoan.createdAt || '',
        company: mirrorLoan.company ? {
          id: mirrorLoan.company.id || '',
          name: mirrorLoan.company.name,
          code: mirrorLoan.company.code || ''
        } : mapping.mirrorCompany ? {
          id: mapping.mirrorCompany.id,
          name: mapping.mirrorCompany.name,
          code: mapping.mirrorCompany.code
        } : undefined,
        nextEmi: undefined
      };
    }
    
    // If no mirror loan record exists (offline loans), create a virtual mirror loan from mapping data
    if (mapping && mapping.mirrorCompanyId) {
      return {
        id: `virtual-mirror-${mapping.id}`,
        identifier: `MIRROR-${originalLoan.identifier}`,
        applicationNo: `MIRROR-${originalLoan.identifier}`,
        customer: originalLoan.customer,
        customerName: originalLoan.customer?.name,
        customerPhone: originalLoan.customer?.phone,
        approvedAmount: originalLoan.approvedAmount || 0,
        interestRate: mapping.mirrorInterestRate || 15,
        tenure: mapping.mirrorTenure || 0,
        emiAmount: mapping.originalEMIAmount || 0,
        status: 'ACTIVE',
        loanType: originalLoan.loanType,
        disbursementDate: originalLoan.disbursementDate ? new Date(originalLoan.disbursementDate).toISOString() : undefined,
        createdAt: originalLoan.createdAt ? new Date(originalLoan.createdAt).toISOString() : new Date().toISOString(),
        company: mapping.mirrorCompany ? {
          id: mapping.mirrorCompany.id,
          name: mapping.mirrorCompany.name,
          code: mapping.mirrorCompany.code
        } : undefined,
        nextEmi: undefined
      };
    }
    
    return null;
  };

  // Filter loans
  const filteredLoans = activeLoans.filter(loan => {
    // Loan type filter
    if (loanFilter !== 'all' && loan.loanType !== loanFilter.toUpperCase()) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && loan.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        loan.identifier?.toLowerCase().includes(query) ||
        loan.customer?.name?.toLowerCase().includes(query) ||
        loan.customer?.phone?.includes(query) ||
        loan.company?.name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Exclude mirror loans from being shown separately
    const mapping = mirrorMappings[loan.id];
    const isMirror = mapping?.mirrorLoanId === loan.id;
    
    return !isMirror;
  });

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: ActiveLoan, index: number) => {
    const mapping = mirrorMappings[loan.id];
    
    // Get the actual mirror loan data from the mapping, or create virtual one from mapping data
    const mirrorLoanData = mapping ? convertMirrorToLoanData(mapping.mirrorLoan, mapping, loan) : null;
    
    return (
      <ParallelLoanView
        key={loan.id}
        originalLoan={convertToLoanData(loan)}
        mirrorLoan={mirrorLoanData}
        mirrorMapping={mapping ? {
          displayColor: mapping.displayColor,
          extraEMICount: mapping.extraEMICount,
          mirrorInterestRate: mapping.mirrorInterestRate,
          mirrorTenure: mapping.mirrorTenure,
          mirrorEMIsPaid: mapping.mirrorEMIsPaid,
          extraEMIsPaid: mapping.extraEMIsPaid,
          mirrorCompanyId: mapping.mirrorCompanyId,
          originalCompanyId: mapping.originalCompanyId
        } : null}
        onViewOriginal={() => console.log('View original:', loan.id)}
        onViewMirror={() => console.log('View mirror:', loan.id)}
        showPayButton={false}
        showEmiProgress={true}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Active Loans (Parallel View)</h1>
          <p className="text-muted-foreground">All disbursed and active loans - Original on left, Mirror on right</p>
        </div>
        <Button variant="outline" onClick={() => fetchDashboardData()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Loan Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Online Loans</p>
                <p className="text-2xl font-bold">{loanStats.totalOnline}</p>
              </div>
              <FileText className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs mt-2 opacity-75">{formatCurrency(loanStats.totalOnlineAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Offline Loans</p>
                <p className="text-2xl font-bold">{loanStats.totalOffline}</p>
              </div>
              <Receipt className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs mt-2 opacity-75">{formatCurrency(loanStats.totalOfflineAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Active</p>
                <p className="text-2xl font-bold">{loanStats.totalOnline + loanStats.totalOffline}</p>
              </div>
              <CreditCard className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(loanStats.totalOnlineAmount + loanStats.totalOfflineAmount)}</p>
              </div>
              <Wallet className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder="Search by name, loan#, phone, company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Type:</span>
            <Button
              size="sm"
              variant={loanFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setLoanFilter('all')}
            >
              All ({loanStats.totalOnline + loanStats.totalOffline})
            </Button>
            <Button
              size="sm"
              variant={loanFilter === 'online' ? 'default' : 'outline'}
              className={loanFilter === 'online' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setLoanFilter('online')}
            >
              <FileText className="h-4 w-4 mr-1" /> Online ({loanStats.totalOnline})
            </Button>
            <Button
              size="sm"
              variant={loanFilter === 'offline' ? 'default' : 'outline'}
              className={loanFilter === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              onClick={() => setLoanFilter('offline')}
            >
              <Receipt className="h-4 w-4 mr-1" /> Offline ({loanStats.totalOffline})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400"></div>
          <span>Original (Left)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-400"></div>
          <span>Mirror (Right)</span>
        </div>
      </div>

      {/* Loans List in Parallel View */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredLoans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active loans found</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {filteredLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(ActiveLoansTabComponent);
