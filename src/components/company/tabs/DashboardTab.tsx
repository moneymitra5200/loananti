'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import type { Loan, Stats } from './types';

interface DashboardTabProps {
  stats: Stats;
  pendingForCompany: Loan[];
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({ stats, pendingForCompany, onNavigate }: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Loan Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                {stats.pending}
              </div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                {stats.inProgress}
              </div>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                {stats.active}
              </div>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-red-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                {stats.rejected}
              </div>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Pending */}
      {pendingForCompany.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Pending Approvals</CardTitle>
              <Button variant="outline" size="sm" onClick={() => onNavigate('pending')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingForCompany.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{loan.applicationNo}</p>
                    <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{(loan.requestedAmount)?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
