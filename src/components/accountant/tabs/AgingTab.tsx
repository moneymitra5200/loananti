'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, AlertTriangle, TrendingUp, TrendingDown, 
  RefreshCw, Filter, BarChart3, PieChart, Download,
  CheckCircle, XCircle, IndianRupee
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AgingTabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

interface AgingBucket {
  bucket: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
  loans: AgingLoan[];
}

interface AgingLoan {
  id: string;
  applicationNo: string;
  customerName: string;
  customerPhone: string;
  outstandingAmount: number;
  overdueAmount: number;
  daysOverdue: number;
  bucket: string;
  companyName: string;
  emiAmount: number;
  lastPaymentDate: string | null;
}

const BUCKET_COLORS: Record<string, string> = {
  '0-30': 'bg-green-500',
  '31-60': 'bg-yellow-500',
  '61-90': 'bg-orange-500',
  '91-180': 'bg-red-400',
  '181-365': 'bg-red-500',
  '365+': 'bg-red-700'
};

const BUCKET_LABELS: Record<string, string> = {
  '0-30': 'Standard (0-30 days)',
  '31-60': 'SMA-1 (31-60 days)',
  '61-90': 'SMA-2 (61-90 days)',
  '91-180': 'Sub-Standard (91-180 days)',
  '181-365': 'Doubtful (181-365 days)',
  '365+': 'Loss Asset (365+ days)'
};

function AgingTabComponent({ selectedCompanyIds, formatCurrency, formatDate }: AgingTabProps) {
  const [loading, setLoading] = useState(true);
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [totalLoans, setTotalLoans] = useState(0);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  useEffect(() => {
    fetchAgingData();
  }, [selectedCompanyIds]);

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const companyFilter = selectedCompanyIds.length > 0
        ? selectedCompanyIds.join(',')
        : 'all';
      
      const res = await fetch(`/api/accounting/aging-analysis?companyId=${companyFilter}`);
      const data = await res.json();
      
      if (data.success) {
        setAgingData(data.buckets || []);
        setTotalOverdue(data.totalOverdue || 0);
        setTotalLoans(data.totalLoans || 0);
      }
    } catch (error) {
      console.error('Error fetching aging data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = selectedBucket === 'all' 
    ? agingData.flatMap(b => b.loans)
    : agingData.find(b => b.bucket === selectedBucket)?.loans || [];

  const totalAmount = agingData.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-orange-500" />
            Aging Analysis
          </h2>
          <p className="text-gray-500 mt-1">
            Delinquency bucketing as per RBI norms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAgingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'summary' | 'detailed')}>
            <TabsList className="h-9">
              <TabsTrigger value="summary" className="text-xs px-3">Summary</TabsTrigger>
              <TabsTrigger value="detailed" className="text-xs px-3">Detailed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Overdue</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(totalOverdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Accounts</p>
                <p className="text-xl font-bold text-orange-700">{totalLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">NPA Accounts</p>
                <p className="text-xl font-bold text-purple-700">
                  {agingData.filter(b => ['91-180', '181-365', '365+'].includes(b.bucket)).reduce((sum, b) => sum + b.count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">NPA Amount</p>
                <p className="text-xl font-bold text-teal-700">
                  {formatCurrency(agingData.filter(b => ['91-180', '181-365', '365+'].includes(b.bucket)).reduce((sum, b) => sum + b.amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Buckets Visualization */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Delinquency Buckets</CardTitle>
          <CardDescription>Breakdown by days overdue</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {agingData.map((bucket, index) => (
                <motion.div
                  key={bucket.bucket}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBucket === bucket.bucket 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBucket(selectedBucket === bucket.bucket ? 'all' : bucket.bucket)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${BUCKET_COLORS[bucket.bucket]}`} />
                      <span className="font-medium">{BUCKET_LABELS[bucket.bucket]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{bucket.count} accounts</Badge>
                      <span className="font-bold">{formatCurrency(bucket.amount)}</span>
                    </div>
                  </div>
                  <Progress 
                    value={totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bucket.percentage.toFixed(1)}% of total overdue
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedBucket === 'all' ? 'All Accounts' : BUCKET_LABELS[selectedBucket]}
              </CardTitle>
              <Badge>{filteredLoans.length} accounts</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead className="text-center">Bucket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan, index) => (
                    <motion.tr
                      key={loan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.01 }}
                      className="border-b"
                    >
                      <TableCell className="font-medium">{loan.applicationNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.customerName}</p>
                          <p className="text-xs text-gray-500">{loan.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{loan.companyName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(loan.outstandingAmount)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{formatCurrency(loan.overdueAmount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{loan.daysOverdue}d</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${BUCKET_COLORS[loan.bucket]} text-white`}>
                          {loan.bucket}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Priority */}
      <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Collection Priority
          </CardTitle>
          <CardDescription>Focus on these buckets for maximum recovery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800">Immediate Action</h4>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {agingData.filter(b => ['91-180', '181-365', '365+'].includes(b.bucket)).reduce((sum, b) => sum + b.count, 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">NPA accounts (91+ days)</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800">High Priority</h4>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {agingData.find(b => b.bucket === '61-90')?.count || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">SMA-2 accounts (61-90 days)</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800">Watch List</h4>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {(agingData.find(b => b.bucket === '31-60')?.count || 0) + (agingData.find(b => b.bucket === '0-30')?.count || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">SMA-0 & SMA-1 accounts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(AgingTabComponent);
