'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Wallet, RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan } from '../types';

interface ProgressTabProps {
  inProgressLoans: Loan[];
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function ProgressTab({
  inProgressLoans,
  getStatusBadge
}: ProgressTabProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />In Progress Applications
        </CardTitle>
        <CardDescription>Applications currently moving through the workflow</CardDescription>
      </CardHeader>
      <CardContent>
        {inProgressLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No applications in progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inProgressLoans.map((loan, index) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 border rounded-xl hover:bg-gray-50 transition-all bg-white border-gray-100"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 bg-gradient-to-br from-orange-400 to-amber-500">
                      <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                        {loan.customer?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                        {getStatusBadge(loan.status)}
                      </div>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{loan.requestedAmount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{loan.loanType}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <RefreshCw className="h-3 w-3" />
                      {formatDate(loan.createdAt)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
