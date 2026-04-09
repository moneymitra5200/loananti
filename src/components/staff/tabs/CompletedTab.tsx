'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, FileText } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan } from './types';

interface CompletedTabProps {
  completedLoans: Loan[];
  getStatusBadge: (status: string) => React.ReactNode;
}

function CompletedTabComponent({ completedLoans, getStatusBadge }: CompletedTabProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Completed Forms
        </CardTitle>
        <CardDescription>Loan forms you have completed</CardDescription>
      </CardHeader>
      <CardContent>
        {completedLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No completed forms yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedLoans.map((loan, index) => (
              <motion.div 
                key={loan.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: index * 0.03 }}
                className="p-4 border border-gray-100 rounded-xl bg-white flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-green-100">
                    <AvatarFallback className="text-green-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{loan.applicationNo}</h4>
                    <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(loan.status)}
                  <p className="font-semibold">{formatCurrency(loan.requestedAmount)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CompletedTabComponent);
