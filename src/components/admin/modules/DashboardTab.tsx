'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, DollarSign, Users, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface DashboardTabProps {
  stats: { label: string; value: string | number; icon: any; color: string; bg: string }[];
  pendingForSA: any[];
  pendingForFinal: any[];
  activeLoans: any[];
  highRiskLoans: any[];
  users: any[];
  companies: any[];
  totalDisbursed: number;
  totalRequested: number;
}

export default function DashboardTab({ 
  stats, pendingForSA, pendingForFinal, activeLoans, highRiskLoans, users, companies, totalDisbursed, totalRequested 
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Disbursed</p>
                <p className="text-3xl font-bold">{formatCurrency(totalDisbursed)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Pending Approvals</p>
                <p className="text-3xl font-bold">{pendingForSA.length + pendingForFinal.length}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingForSA.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-orange-700">New Applications</span>
                <Badge className="bg-orange-100 text-orange-700">{pendingForSA.length}</Badge>
              </div>
            )}
            {pendingForFinal.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">Ready for Final Approval</span>
                <Badge className="bg-green-100 text-green-700">{pendingForFinal.length}</Badge>
              </div>
            )}
            {highRiskLoans.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-red-700">High Risk Applications</span>
                <Badge className="bg-red-100 text-red-700">{highRiskLoans.length}</Badge>
              </div>
            )}
            {pendingForSA.length === 0 && pendingForFinal.length === 0 && highRiskLoans.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Active Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-emerald-700">Active Loans</span>
              <Badge className="bg-emerald-100 text-emerald-700">{activeLoans.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Companies</span>
              <Badge className="bg-blue-100 text-blue-700">{companies.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-700">Total Applications</span>
              <Badge className="bg-purple-100 text-purple-700">{pendingForSA.length + activeLoans.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
