'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, CheckCircle, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Loan } from './types';

interface PendingTabProps {
  pendingForAgent: Loan[];
  getStatusBadge: (status: string) => React.ReactNode;
  onViewLoan: (loan: Loan) => void;
}

export default function PendingTab({ pendingForAgent, getStatusBadge, onViewLoan }: PendingTabProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          Pending Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingForAgent.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No pending applications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingForAgent.map((loan, index) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-500">
                      <AvatarFallback className="bg-transparent text-white font-semibold">
                        {loan.customer?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        ₹{(loan.sessionForm?.approvedAmount || loan.requestedAmount)?.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {loan.sessionForm?.tenure || loan.requestedTenure} mo @ {loan.sessionForm?.interestRate || loan.requestedInterestRate}%
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onViewLoan(loan)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
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
