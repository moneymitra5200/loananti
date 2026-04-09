'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Search, RefreshCw, Download, Eye,
  User, Phone, Mail, MapPin, IndianRupee,
  Calendar, CreditCard, TrendingUp, AlertTriangle,
  CheckCircle, Clock, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

interface BorrowerLedgerTabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

interface Borrower {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: number;
  totalOutstanding: number;
  totalPaid: number;
  totalInterestPaid: number;
  nextEMIDate: string | null;
  nextEMIAmount: number;
  creditScore: number;
  npaStatus: string;
  loans: BorrowerLoan[];
}

interface BorrowerLoan {
  id: string;
  applicationNo: string;
  loanType: string;
  approvedAmount: number;
  outstandingAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  emiPaid: number;
  emiPending: number;
  status: string;
  companyName: string;
  disbursementDate: string;
  lastPaymentDate: string | null;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
}

function BorrowerLedgerTabComponent({ selectedCompanyIds, formatCurrency, formatDate }: BorrowerLedgerTabProps) {
  const [loading, setLoading] = useState(true);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    fetchBorrowers();
  }, [selectedCompanyIds]);

  const fetchBorrowers = async () => {
    setLoading(true);
    try {
      const companyFilter = selectedCompanyIds.length > 0
        ? selectedCompanyIds.join(',')
        : 'all';
      
      const res = await fetch(`/api/accounting/borrower-ledger?companyId=${companyFilter}`);
      const data = await res.json();
      
      if (data.success) {
        setBorrowers(data.borrowers || []);
      }
    } catch (error) {
      console.error('Error fetching borrowers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrowerTransactions = async (borrowerId: string) => {
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/accounting/borrower-ledger?borrowerId=${borrowerId}`);
      const data = await res.json();
      
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleViewBorrower = async (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setShowDetailDialog(true);
    await fetchBorrowerTransactions(borrower.id);
  };

  const filteredBorrowers = borrowers.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.phone.includes(searchQuery) ||
    b.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = borrowers.reduce((sum, b) => sum + b.totalOutstanding, 0);
  const totalPaid = borrowers.reduce((sum, b) => sum + b.totalPaid, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-6 w-6 text-purple-500" />
            Borrower Ledger
          </h2>
          <p className="text-gray-500 mt-1">
            Customer-wise loan and payment statements
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBorrowers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Borrowers</p>
                <p className="text-xl font-bold">{borrowers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Outstanding</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Collected</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">NPA Borrowers</p>
                <p className="text-xl font-bold text-orange-700">
                  {borrowers.filter(b => b.npaStatus === 'NPA').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Borrowers Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Borrower Accounts ({filteredBorrowers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead className="text-center">Loans</TableHead>
                    <TableHead className="text-right">Total Borrowed</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-center">Next EMI</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBorrowers.map((borrower, index) => (
                    <motion.tr
                      key={borrower.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.01 }}
                      className="border-b hover:bg-gray-50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{borrower.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {borrower.phone}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{borrower.totalLoans} loans</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(borrower.totalBorrowed)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(borrower.totalOutstanding)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(borrower.totalPaid)}
                      </TableCell>
                      <TableCell className="text-center">
                        {borrower.nextEMIDate ? (
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(borrower.nextEMIAmount)}</p>
                            <p className="text-xs text-gray-500">{formatDate(borrower.nextEMIDate)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {borrower.npaStatus === 'NPA' ? (
                          <Badge className="bg-red-500 text-white">NPA</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewBorrower(borrower)}
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

      {/* Borrower Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              Borrower Ledger - {selectedBorrower?.name}
            </DialogTitle>
            <DialogDescription>
              Complete loan and payment statement
            </DialogDescription>
          </DialogHeader>

          {selectedBorrower && (
            <ScrollArea className="flex-1">
              <div className="space-y-6 py-4">
                {/* Borrower Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedBorrower.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedBorrower.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedBorrower.address || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Total Loans: {selectedBorrower.totalLoans}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Outstanding: {formatCurrency(selectedBorrower.totalOutstanding)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Interest Paid: {formatCurrency(selectedBorrower.totalInterestPaid)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Loans List */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Loan Accounts ({selectedBorrower.loans.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedBorrower.loans.map(loan => (
                      <div key={loan.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{loan.applicationNo}</p>
                            <p className="text-sm text-gray-500">{loan.companyName}</p>
                          </div>
                          <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'outline'}>
                            {loan.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-500">Approved</p>
                            <p className="font-medium">{formatCurrency(loan.approvedAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Outstanding</p>
                            <p className="font-medium text-red-600">{formatCurrency(loan.outstandingAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">EMI</p>
                            <p className="font-medium">{formatCurrency(loan.emiAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">EMI Status</p>
                            <p className="font-medium">{loan.emiPaid}/{loan.emiPaid + loan.emiPending}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Transaction History */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Transaction History
                  </h4>
                  {loadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Principal</TableHead>
                          <TableHead className="text-right">Interest</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map(txn => (
                          <TableRow key={txn.id}>
                            <TableCell>{formatDate(txn.date)}</TableCell>
                            <TableCell>
                              <Badge variant={txn.type === 'PAYMENT' ? 'default' : 'outline'}>
                                {txn.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{txn.description}</TableCell>
                            <TableCell className="text-right">{formatCurrency(txn.principal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(txn.interest)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(txn.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No transactions found
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(BorrowerLedgerTabComponent);
