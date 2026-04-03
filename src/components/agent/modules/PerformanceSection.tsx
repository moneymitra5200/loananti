'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';
import type { Loan, Staff } from '../types';

interface PerformanceSectionProps {
  loans: Loan[];
  staffList: Staff[];
  pendingForAgent: Loan[];
  formCompleted: Loan[];
  inProgress: Loan[];
  sanctionCreated: Loan[];
  activeLoans: Loan[];
}

export default function PerformanceSection({
  loans,
  staffList,
  pendingForAgent,
  formCompleted,
  inProgress,
  sanctionCreated,
  activeLoans
}: PerformanceSectionProps) {
  return (
    <div className="space-y-6">
      {/* Performance Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Processed</p>
                <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{activeLoans.length + sanctionCreated.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{pendingForAgent.length + formCompleted.length + inProgress.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Staff Members</p>
                <p className="text-2xl font-bold text-cyan-600">{staffList.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Performance Overview
          </CardTitle>
          <CardDescription>Your loan processing statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Approval Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Approval Rate</span>
                <span className="text-sm text-gray-500">
                  {loans.length > 0 ? Math.round(((activeLoans.length + sanctionCreated.length) / loans.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${loans.length > 0 ? Math.round(((activeLoans.length + sanctionCreated.length) / loans.length) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Processing Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Processing Rate</span>
                <span className="text-sm text-gray-500">
                  {loans.length > 0 ? Math.round(((loans.length - pendingForAgent.length) / loans.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${loans.length > 0 ? Math.round(((loans.length - pendingForAgent.length) / loans.length) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Loan Type Distribution */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Loan Type Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(loans.reduce((acc, loan) => {
                  acc[loan.loanType] = (acc[loan.loanType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([type, count]) => (
                  <div key={type} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">{type}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No activity data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(new Set(loans.map(l => new Date(l.createdAt).getMonth()))).slice(0, 6).map(month => {
                const monthLoans = loans.filter(l => new Date(l.createdAt).getMonth() === month);
                const monthName = new Date(2024, month).toLocaleString('default', { month: 'long' });
                return (
                  <div key={month} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-20 text-sm font-medium text-gray-700">{monthName}</div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${(monthLoans.length / loans.length) * 100}%` }}
                      />
                    </div>
                    <div className="w-12 text-sm text-gray-600 text-right">{monthLoans.length}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
