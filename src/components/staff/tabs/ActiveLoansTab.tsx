'use client';

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Banknote, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan } from './types';
import MirrorLoanPairView from '@/components/loan/MirrorLoanPairView';

interface ActiveLoansTabProps {
  activeLoans: Loan[];
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
}

function ActiveLoansTabComponent({ activeLoans, setSelectedLoanId, setShowLoanDetailPanel }: ActiveLoansTabProps) {
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, any>>({});
  const [expandedPairLoans, setExpandedPairLoans] = useState<Set<string>>(new Set());

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

  // Toggle expanded state for pair loans
  const togglePairExpanded = (loanId: string) => {
    setExpandedPairLoans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loanId)) {
        newSet.delete(loanId);
      } else {
        newSet.add(loanId);
      }
      return newSet;
    });
  };

  // Convert Loan to format expected by MirrorLoanPairView
  const convertToLoanData = (loan: Loan) => ({
    id: loan.id,
    identifier: loan.identifier || loan.applicationNo,
    customer: loan.customer,
    approvedAmount: loan.approvedAmount || 0,
    interestRate: loan.interestRate || 0,
    tenure: loan.tenure || 0,
    emiAmount: loan.emiAmount || 0,
    status: loan.status,
    loanType: loan.loanType,
    disbursementDate: loan.disbursementDate,
    createdAt: loan.createdAt,
    company: loan.company ? { 
      id: loan.company.id || '', 
      name: loan.company.name, 
      code: loan.company.code || '' 
    } : undefined,
    nextEmi: loan.nextEmi,
    emiSchedules: loan.emiSchedules
  });

  // Filter out mirror loans (they will be shown with original)
  const filteredLoans = activeLoans.filter(loan => {
    const mapping = mirrorMappings[loan.id];
    const isMirror = mapping?.mirrorLoanId === loan.id;
    return !isMirror;
  });

  // Render a single loan card
  const renderSingleLoanCard = (loan: Loan, index: number) => (
    <motion.div
      key={loan.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="p-4 border border-gray-100 rounded-xl bg-white hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500">
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {loan.customer?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-semibold text-gray-900">{loan.identifier}</h4>
          <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.phone || loan.customer?.email}</p>
          {loan.company && <p className="text-xs text-gray-400">Company: {loan.company.name}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.approvedAmount || 0)}</p>
          <p className="text-xs text-gray-500">{loan.interestRate}% • {loan.tenure} months</p>
          {(loan.emiAmount || 0) > 0 && <p className="text-xs text-emerald-600">EMI: {formatCurrency(loan.emiAmount || 0)}/mo</p>}
        </div>
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
        >
          <Eye className="h-4 w-4 mr-1" />View
        </Button>
      </div>
    </motion.div>
  );

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-emerald-600" />
          Active Loans
        </CardTitle>
        <CardDescription>All active loans - Click View to see details and pay EMI</CardDescription>
      </CardHeader>
      <CardContent>
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active loans found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredLoans.map((loan: Loan, index: number) => {
              const mapping = mirrorMappings[loan.id];

              // If this loan has a mirror mapping, render with parallel view
              if (mapping) {
                return (
                  <MirrorLoanPairView
                    key={loan.id}
                    originalLoan={convertToLoanData(loan)}
                    mirrorLoan={null}
                    mirrorMapping={{
                      displayColor: mapping.displayColor,
                      extraEMICount: mapping.extraEMICount,
                      mirrorInterestRate: mapping.mirrorInterestRate,
                      mirrorTenure: mapping.mirrorTenure,
                      mirrorEMIsPaid: mapping.mirrorEMIsPaid,
                      extraEMIsPaid: mapping.extraEMIsPaid
                    }}
                    onViewOriginal={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
                    onViewMirror={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
                    isExpanded={expandedPairLoans.has(loan.id)}
                    onToggleExpand={() => togglePairExpanded(loan.id)}
                  />
                );
              }

              // Regular loan card for non-mirrored loans
              return renderSingleLoanCard(loan, index);
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(ActiveLoansTabComponent);
