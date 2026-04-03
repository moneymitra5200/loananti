'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileEdit, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan } from './types';

interface PendingTabProps {
  pendingLoans: Loan[];
  openLoanFormDialog: (loan: Loan) => void;
}

function PendingTabComponent({ pendingLoans, openLoanFormDialog }: PendingTabProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-orange-600" />
          Pending Loan Forms
        </CardTitle>
        <CardDescription>Applications waiting for you to complete the loan form</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No pending loan forms to complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingLoans.map((loan, index) => (
              <motion.div 
                key={loan.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: index * 0.03 }}
                className="p-4 border border-gray-100 rounded-xl bg-white hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-gradient-to-br from-orange-400 to-red-500">
                    <AvatarFallback className="bg-transparent text-white font-semibold">
                      {loan.customer?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                    <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                    <p className="text-xs text-gray-500">{loan.loanType}</p>
                  </div>
                  <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => openLoanFormDialog(loan)}>
                    <FileEdit className="h-4 w-4 mr-2" />Fill Form
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

export default memo(PendingTabComponent);
