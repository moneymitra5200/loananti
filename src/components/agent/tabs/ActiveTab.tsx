'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, Eye, Clock, Search, RefreshCw, FileText, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Loan } from './types';
import ParallelLoanView from '@/components/loan/ParallelLoanView';

interface ActiveTabProps {
  activeLoans: Loan[];
  onViewLoan: (loan: Loan) => void;
  onRefresh?: () => void;
}

export default function ActiveTab({ activeLoans, onViewLoan, onRefresh }: ActiveTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, any>>({});

  // Fetch mirror mappings on mount
  useEffect(() => {
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const mappingMap: Record<string, any> = {};
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

  // Filter loans
  const filteredLoans = activeLoans.filter(loan => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        loan.applicationNo?.toLowerCase().includes(query) ||
        loan.customer?.name?.toLowerCase().includes(query) ||
        loan.customer?.phone?.includes(query);
      if (!matchesSearch) return false;
    }
    
    // Exclude mirror loans from being shown separately
    const mapping = mirrorMappings[loan.id];
    const isMirror = mapping?.mirrorLoanId === loan.id;
    
    return !isMirror;
  });

  // Convert Loan to format expected by ParallelLoanView
  const convertToLoanData = (loan: Loan) => ({
    id: loan.id,
    identifier: loan.applicationNo,
    applicationNo: loan.applicationNo,
    customer: loan.customer,
    customerName: loan.customer?.name,
    customerPhone: loan.customer?.phone,
    approvedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
    interestRate: loan.sessionForm?.interestRate || 0,
    tenure: loan.sessionForm?.tenure || 0,
    emiAmount: loan.sessionForm?.emiAmount || 0,
    status: loan.status,
    loanType: loan.loanType,
    createdAt: loan.createdAt,
    company: loan.company
  });

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: Loan, index: number) => {
    const mapping = mirrorMappings[loan.id];
    
    return (
      <ParallelLoanView
        key={loan.id}
        originalLoan={convertToLoanData(loan)}
        mirrorLoan={null}
        mirrorMapping={mapping ? {
          displayColor: mapping.displayColor,
          extraEMICount: mapping.extraEMICount,
          mirrorInterestRate: mapping.mirrorInterestRate,
          mirrorTenure: mapping.mirrorTenure,
          mirrorEMIsPaid: mapping.mirrorEMIsPaid,
          extraEMIsPaid: mapping.extraEMIsPaid
        } : null}
        onViewOriginal={() => onViewLoan(loan)}
        onViewMirror={() => onViewLoan(loan)}
        onPayEmi={() => onViewLoan(loan)}
        showPayButton={true}
        showEmiProgress={false}
      />
    );
  };

  // Stats
  const stats = {
    total: filteredLoans.length,
    online: filteredLoans.filter(l => l.loanType === 'ONLINE').length,
    offline: filteredLoans.filter(l => l.loanType === 'OFFLINE').length
  };

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Active Loans (Parallel View)
          </CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-50 border text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-center">
            <p className="text-xs text-blue-600 flex items-center justify-center gap-1">
              <FileText className="h-3 w-3" /> Online
            </p>
            <p className="text-lg font-bold text-blue-700">{stats.online}</p>
          </div>
          <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 text-center">
            <p className="text-xs text-purple-600 flex items-center justify-center gap-1">
              <Receipt className="h-3 w-3" /> Offline
            </p>
            <p className="text-lg font-bold text-purple-700">{stats.offline}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            className="pl-10" 
            placeholder="Search by name, loan#, phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active loans</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <AnimatePresence>
              {filteredLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
