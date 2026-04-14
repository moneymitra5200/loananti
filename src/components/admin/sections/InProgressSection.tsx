'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; company?: any;
}

interface InProgressSectionProps {
  loans: Loan[];
  onView: (loan: Loan) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    SA_APPROVED: { className: 'bg-emerald-100 text-emerald-700', label: 'SA Approved' },
    COMPANY_APPROVED: { className: 'bg-purple-100 text-purple-700', label: 'Company Approved' },
    AGENT_APPROVED: { className: 'bg-blue-100 text-blue-700', label: 'Agent Approved' },
    SESSION_CREATED: { className: 'bg-amber-100 text-amber-700', label: 'Session Created' },
    CUSTOMER_SESSION_APPROVED: { className: 'bg-teal-100 text-teal-700', label: 'Customer Approved' },
    LOAN_FORM_COMPLETED: { className: 'bg-indigo-100 text-indigo-700', label: 'Form Completed' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

function InProgressSectionComponent({ loans, onView }: InProgressSectionProps) {
  return (
    <div className="w-full">
      {loans.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No applications in progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan, index) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 bg-gradient-to-br from-amber-400 to-orange-500">
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
                    {loan.company && <p className="text-xs text-gray-400">{loan.company.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                  </div>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => onView(loan)}>
                    <Eye className="h-3 w-3 mr-1" />View
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(InProgressSectionComponent);

