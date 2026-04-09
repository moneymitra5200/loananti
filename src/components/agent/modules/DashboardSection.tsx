'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, ClipboardCheck, FileText } from 'lucide-react';
import { formatDate, formatCurrency } from '@/utils/helpers';
import type { Loan } from '../types';

interface DashboardSectionProps {
  loans: Loan[];
  pendingForAgent: Loan[];
  formCompleted: Loan[];
  setActiveTab: (tab: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function DashboardSection({
  loans,
  pendingForAgent,
  formCompleted,
  setActiveTab,
  getStatusBadge
}: DashboardSectionProps) {
  return (
    <div className="space-y-6">
      {/* Action Cards */}
      {(pendingForAgent.length > 0 || formCompleted.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {pendingForAgent.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800">{pendingForAgent.length} Pending Approvals</h4>
                    <p className="text-sm text-orange-600">Review and assign staff</p>
                  </div>
                  <Button onClick={() => setActiveTab('pending')}>Review</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {formCompleted.length > 0 && (
            <Card className="border-violet-200 bg-violet-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                    <ClipboardCheck className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-violet-800">{formCompleted.length} Sanctions to Create</h4>
                    <p className="text-sm text-violet-600">Create loan sanction for customer approval</p>
                  </div>
                  <Button className="bg-violet-500 hover:bg-violet-600" onClick={() => setActiveTab('session')}>Create</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No loan activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {loans.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-cyan-100 text-cyan-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{loan.applicationNo}</p>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(loan.status)}
                    <p className="font-semibold">{formatCurrency(loan.requestedAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
