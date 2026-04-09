'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, Clock, Users, IndianRupee, TrendingUp, TrendingDown, 
  Eye, RefreshCw, Filter, Download, Calendar, Phone, Mail, FileText,
  AlertCircle, CheckCircle, XCircle, BarChart3, PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NPATabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

interface NPALoan {
  id: string;
  loanApplicationId: string;
  applicationNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  approvedAmount: number;
  outstandingAmount: number;
  emiAmount: number;
  overdueEMIs: number;
  daysOverdue: number;
  npaStatus: 'SMA0' | 'SMA1' | 'SMA2' | 'NPA';
  lastPaymentDate: string | null;
  companyId: string;
  companyName: string;
  totalOverdue: number;
  interestOverdue: number;
  principalOverdue: number;
  penaltyAmount: number;
}

interface NPAStats {
  totalNPA: number;
  totalSMA0: number;
  totalSMA1: number;
  totalSMA2: number;
  npaAmount: number;
  sma0Amount: number;
  sma1Amount: number;
  sma2Amount: number;
  totalOverdue: number;
  provisioningRequired: number;
  collectionEfficiency: number;
}

export default function NPATab({ selectedCompanyIds, formatCurrency, formatDate }: NPATabProps) {
  const [loading, setLoading] = useState(true);
  const [npaLoans, setNpaLoans] = useState<NPALoan[]>([]);
  const [npaStats, setNpaStats] = useState<NPAStats>({
    totalNPA: 0, totalSMA0: 0, totalSMA1: 0, totalSMA2: 0,
    npaAmount: 0, sma0Amount: 0, sma1Amount: 0, sma2Amount: 0,
    totalOverdue: 0, provisioningRequired: 0, collectionEfficiency: 0
  });
  const [filter, setFilter] = useState<'all' | 'SMA0' | 'SMA1' | 'SMA2' | 'NPA'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<NPALoan | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchNPAData();
  }, [selectedCompanyIds]);

  const fetchNPAData = async () => {
    setLoading(true);
    try {
      const companyFilter = selectedCompanyIds.length > 0
        ? selectedCompanyIds.join(',')
        : 'all';
      
      // Fetch all active loans with overdue EMIs
      const res = await fetch(`/api/accounting/npa-tracking?companyId=${companyFilter}`);
      const data = await res.json();
      
      if (data.success) {
        setNpaLoans(data.npaLoans || []);
        setNpaStats(data.stats || npaStats);
      }
    } catch (error) {
      console.error('Error fetching NPA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNPAStatusColor = (status: string) => {
    switch (status) {
      case 'SMA0': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SMA1': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'SMA2': return 'bg-red-100 text-red-800 border-red-200';
      case 'NPA': return 'bg-red-500 text-white border-red-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNPAStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      'SMA0': { className: 'bg-yellow-100 text-yellow-800', label: 'SMA-0 (0-30 days)' },
      'SMA1': { className: 'bg-orange-100 text-orange-800', label: 'SMA-1 (31-60 days)' },
      'SMA2': { className: 'bg-red-100 text-red-800', label: 'SMA-2 (61-90 days)' },
      'NPA': { className: 'bg-red-500 text-white', label: 'NPA (90+ days)' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const filteredLoans = npaLoans
    .filter(loan => filter === 'all' || loan.npaStatus === filter)
    .filter(loan => 
      searchQuery === '' || 
      loan.applicationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customerPhone.includes(searchQuery)
    );

  const totalOverdueAmount = filteredLoans.reduce((sum, l) => sum + l.totalOverdue, 0);
  const totalOutstanding = filteredLoans.reduce((sum, l) => sum + l.outstandingAmount, 0);

  // Calculate provisioning as per RBI norms
  const calculateProvisioning = (loans: NPALoan[]) => {
    let total = 0;
    loans.forEach(loan => {
      let provisionPercent = 0;
      switch (loan.npaStatus) {
        case 'SMA0': provisionPercent = 0; break;
        case 'SMA1': provisionPercent = 0; break;
        case 'SMA2': provisionPercent = 0; break;
        case 'NPA': provisionPercent = 0.15; break; // 15% for substandard
      }
      // Additional provisioning for doubtful assets (NPA for 1+ year)
      if (loan.daysOverdue > 365) provisionPercent = 0.25;
      if (loan.daysOverdue > 730) provisionPercent = 1.00; // 100% for loss assets
      total += loan.outstandingAmount * provisionPercent;
    });
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            NPA Tracking & Classification
          </h2>
          <p className="text-gray-500 mt-1">
            Non-Performing Assets classification as per RBI norms (90+ days overdue)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNPAData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* NPA Classification Info Card */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-800">RBI NPA Classification Norms</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">Standard</Badge>
                  <span>0-30 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">SMA-1</Badge>
                  <span>31-60 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">SMA-2</Badge>
                  <span>61-90 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white">NPA</Badge>
                  <span>90+ days</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">SMA-0</p>
                <p className="text-xl font-bold text-yellow-700">{npaStats.totalSMA0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">SMA-1</p>
                <p className="text-xl font-bold text-orange-700">{npaStats.totalSMA1}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">SMA-2</p>
                <p className="text-xl font-bold text-red-700">{npaStats.totalSMA2}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">NPA (90+)</p>
                <p className="text-xl font-bold text-red-700">{npaStats.totalNPA}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">NPA Amount</p>
                <p className="text-lg font-bold text-purple-700">{formatCurrency(npaStats.npaAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Provisioning</p>
                <p className="text-lg font-bold text-gray-700">{formatCurrency(npaStats.provisioningRequired)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by Loan ID, Customer Name, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
              >
                All
              </Button>
              <Button
                variant={filter === 'SMA0' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('SMA0')}
                className={filter === 'SMA0' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                SMA-0
              </Button>
              <Button
                variant={filter === 'SMA1' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('SMA1')}
                className={filter === 'SMA1' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                SMA-1
              </Button>
              <Button
                variant={filter === 'SMA2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('SMA2')}
                className={filter === 'SMA2' ? 'bg-red-400 hover:bg-red-500' : ''}
              >
                SMA-2
              </Button>
              <Button
                variant={filter === 'NPA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('NPA')}
                className={filter === 'NPA' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                NPA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NPA Loans Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>NPA Accounts ({filteredLoans.length})</span>
            <div className="text-sm font-normal text-gray-500">
              Total Overdue: {formatCurrency(totalOverdueAmount)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No NPA accounts found</p>
              <p className="text-sm mt-1">All loans are performing well!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Overdue EMI</TableHead>
                    <TableHead className="text-center">Days Overdue</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan, index) => (
                    <motion.tr
                      key={loan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b ${
                        loan.npaStatus === 'NPA' ? 'bg-red-50' : 
                        loan.npaStatus === 'SMA2' ? 'bg-orange-50' : 
                        loan.npaStatus === 'SMA1' ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <TableCell className="font-medium">{loan.applicationNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{loan.customerName}</p>
                          <p className="text-xs text-gray-500">{loan.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{loan.companyName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(loan.outstandingAmount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(loan.totalOverdue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`${
                          loan.daysOverdue > 90 ? 'border-red-500 text-red-700' :
                          loan.daysOverdue > 60 ? 'border-orange-500 text-orange-700' :
                          'border-yellow-500 text-yellow-700'
                        }`}>
                          {loan.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getNPAStatusBadge(loan.npaStatus)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLoan(loan);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              NPA Account Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of delinquent loan account
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-6 py-4">
              {/* Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-500">Loan ID</Label>
                    <p className="font-semibold">{selectedLoan.applicationNo}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Customer Name</Label>
                    <p className="font-semibold">{selectedLoan.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Phone</Label>
                    <p className="font-semibold">{selectedLoan.customerPhone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Email</Label>
                    <p className="font-semibold text-sm">{selectedLoan.customerEmail}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-500">Approved Amount</Label>
                    <p className="font-semibold">{formatCurrency(selectedLoan.approvedAmount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Outstanding Amount</Label>
                    <p className="font-semibold text-red-600">{formatCurrency(selectedLoan.outstandingAmount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">EMI Amount</Label>
                    <p className="font-semibold">{formatCurrency(selectedLoan.emiAmount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">NPA Status</Label>
                    <div className="mt-1">{getNPAStatusBadge(selectedLoan.npaStatus)}</div>
                  </div>
                </div>
              </div>
              
              {/* Overdue Breakdown */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-3">Overdue Breakdown</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Overdue</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(selectedLoan.totalOverdue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Principal Overdue</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedLoan.principalOverdue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Interest Overdue</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedLoan.interestOverdue)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-red-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Overdue EMIs</p>
                    <p className="font-semibold">{selectedLoan.overdueEMIs} EMIs</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Days Overdue</p>
                    <p className="font-semibold text-red-600">{selectedLoan.daysOverdue} days</p>
                  </div>
                </div>
              </div>
              
              {/* Last Payment */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Last Payment</h4>
                <p className="text-gray-600">
                  {selectedLoan.lastPaymentDate 
                    ? formatDate(selectedLoan.lastPaymentDate)
                    : 'No payment recorded'
                  }
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
