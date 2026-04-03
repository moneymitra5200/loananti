'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Banknote, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan } from './types';

interface ActiveLoansTabProps {
  activeLoans: Loan[];
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
}

function ActiveLoansTabComponent({ activeLoans, setSelectedLoanId, setShowLoanDetailPanel }: ActiveLoansTabProps) {
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
        {activeLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active loans found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activeLoans.map((loan: Loan, index: number) => (
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(ActiveLoansTabComponent);
