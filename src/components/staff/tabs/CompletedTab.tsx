'use client';

import React, { memo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Edit, Eye, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan } from './types';

interface CompletedTabProps {
  completedLoans: Loan[];
  getStatusBadge: (status: string) => React.ReactNode;
  onEditLoan?: (loan: Loan) => void;
  onViewLoan?: (loan: Loan) => void;
}

function CompletedTabComponent({ completedLoans, getStatusBadge, onEditLoan, onViewLoan }: CompletedTabProps) {
  // Group loans by status
  const pendingDisbursement = completedLoans.filter(l => 
    ['SESSION_CREATED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED'].includes(l.status)
  );
  const formCompleted = completedLoans.filter(l => l.status === 'LOAN_FORM_COMPLETED');
  
  return (
    <div className="space-y-6">
      {/* Forms Completed - Awaiting Sanction */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Forms Completed
          </CardTitle>
          <CardDescription>Loan forms you have submitted (awaiting sanction from Agent)</CardDescription>
        </CardHeader>
        <CardContent>
          {formCompleted.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No completed forms awaiting sanction</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formCompleted.map((loan, index) => (
                <motion.div 
                  key={loan.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.03 }}
                  className="p-4 border border-violet-100 rounded-xl bg-violet-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 bg-violet-100">
                      <AvatarFallback className="text-violet-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{loan.applicationNo}</h4>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                      <p className="text-xs text-gray-400">Submitted: {formatDate(loan.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                      <Clock className="h-3 w-3 mr-1" />Awaiting Sanction
                    </Badge>
                    <p className="font-semibold">{formatCurrency(loan.requestedAmount)}</p>
                    {onViewLoan && (
                      <Button size="sm" variant="outline" onClick={() => onViewLoan(loan)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEditLoan && (
                      <Button size="sm" variant="outline" className="border-violet-300 text-violet-600" onClick={() => onEditLoan(loan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Disbursement */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Pending Disbursement
          </CardTitle>
          <CardDescription>Loans approved and waiting for disbursement (no edit allowed)</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDisbursement.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No loans pending disbursement</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDisbursement.map((loan, index) => (
                <motion.div 
                  key={loan.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.03 }}
                  className="p-4 border border-blue-100 rounded-xl bg-blue-50/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 bg-blue-100">
                      <AvatarFallback className="text-blue-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{loan.applicationNo}</h4>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                      <p className="text-xs text-gray-400">Amount: {formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(loan.status)}
                    {onViewLoan && (
                      <Button size="sm" variant="outline" onClick={() => onViewLoan(loan)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(CompletedTabComponent);
