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
  FileText, Search, RefreshCw, Download, Eye, ChevronRight,
  User, Phone, Mail, MapPin, IndianRupee,
  Calendar, CreditCard, TrendingUp, AlertTriangle, Building,
  CheckCircle, Clock, BarChart3, ArrowUpRight, ArrowDownRight,
  BookOpen, Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface PersonalLedgerTabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalLoans: number;
  totalOutstanding: number;
  totalPaid: number;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  referenceType: string;
  narration: string;
  paymentMode: string;
  createdBy: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
  }>;
  loanReceivableChange: number;
  runningBalance: number;
}

function PersonalLedgerTabComponent({ selectedCompanyIds, formatCurrency, formatDate }: PersonalLedgerTabProps) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [customerSummary, setCustomerSummary] = useState<any>(null);
  const [totals, setTotals] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
  }, [selectedCompanyIds]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Use borrower-ledger API for customer list, then we'll fetch personal ledger for each
      const companyFilter = selectedCompanyIds.length > 0
        ? selectedCompanyIds.join(',')
        : 'all';
      
      const res = await fetch(`/api/accounting/borrower-ledger?companyId=${companyFilter}`);
      const data = await res.json();
      
      if (data.success) {
        setCustomers(data.borrowers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalLedger = async (customerId: string) => {
    setLoadingEntries(true);
    try {
      const res = await fetch(`/api/accounting/personal-ledger?customerId=${customerId}`);
      const data = await res.json();
      
      if (data.success) {
        setJournalEntries(data.entries || []);
        setCustomerSummary(data.customerSummary);
        setTotals(data.totals);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch ledger',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching personal ledger:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch personal ledger',
        variant: 'destructive'
      });
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleViewLedger = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowLedgerDialog(true);
    await fetchPersonalLedger(customer.id);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + c.totalOutstanding, 0);
  const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0);

  // Get reference type badge color
  const getRefTypeBadge = (refType: string) => {
    const colors: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'bg-blue-500 text-white',
      'EMI_PAYMENT': 'bg-green-500 text-white',
      'PENALTY_COLLECTION': 'bg-red-500 text-white',
      'PROCESSING_FEE_COLLECTION': 'bg-purple-500 text-white',
      'INTEREST_COLLECTION': 'bg-amber-500 text-white',
      'MIRROR_EMI_PAYMENT': 'bg-indigo-500 text-white',
      'PRINCIPAL_ONLY_PAYMENT': 'bg-orange-500 text-white',
    };
    return colors[refType] || 'bg-gray-500 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-500" />
            Personal Ledger (Khata)
          </h2>
          <p className="text-gray-500 mt-1">
            Customer-wise complete journal entries - Real Accounting
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCustomers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-xl font-bold">{customers.length}</p>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ledger Entries</p>
                <p className="text-xl font-bold">{customers.reduce((s, c) => s + c.totalLoans, 0)}</p>
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
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Customer Accounts ({filteredCustomers.length})</CardTitle>
          <CardDescription>Click "View Ledger" to see all journal entries</CardDescription>
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
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Loans</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.01 }}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewLedger(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{customer.totalLoans} loans</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(customer.totalOutstanding)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(customer.totalPaid)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost">
                          View Ledger <ChevronRight className="h-4 w-4 ml-1" />
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

      {/* Personal Ledger Dialog */}
      <Dialog open={showLedgerDialog} onOpenChange={setShowLedgerDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              Personal Ledger - {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Complete journal entries for this customer (Real Accounting)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              {customerSummary && (
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{customerSummary.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{customerSummary.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">Total Loans: {customerSummary.onlineLoans?.length + customerSummary.offlineLoans?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold">Outstanding: {formatCurrency(totals?.currentOutstanding || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loans List */}
              {customerSummary && (customerSummary.onlineLoans?.length > 0 || customerSummary.offlineLoans?.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Loan Accounts
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customerSummary.onlineLoans?.map((loan: any) => (
                      <div key={loan.id} className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{loan.loanNumber}</p>
                            <p className="text-sm text-gray-500">Online Loan</p>
                          </div>
                          <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'outline'}>
                            {loan.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Amount:</span> {formatCurrency(loan.amount)}
                        </div>
                      </div>
                    ))}
                    {customerSummary.offlineLoans?.map((loan: any) => (
                      <div key={loan.id} className="p-3 border rounded-lg bg-gray-50 border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{loan.loanNumber}</p>
                            <p className="text-sm text-gray-500">Offline Loan</p>
                          </div>
                          <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'outline'}>
                            {loan.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Amount:</span> {formatCurrency(loan.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Journal Entries Table */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Journal Entries ({journalEntries.length})
                </h4>
                {loadingEntries ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : journalEntries.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Date</TableHead>
                          <TableHead>Entry #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalEntries.map((entry, idx) => {
                          const totalDebit = entry.lines.reduce((s, l) => s + l.debitAmount, 0);
                          const totalCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0);
                          return (
                            <TableRow key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                              <TableCell className="text-xs font-mono">{entry.entryNumber}</TableCell>
                              <TableCell>
                                <Badge className={getRefTypeBadge(entry.referenceType)}>
                                  {entry.referenceType?.replace(/_/g, ' ').slice(0, 15)}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="text-sm truncate">{entry.narration}</p>
                                <p className="text-xs text-gray-500">by {entry.createdBy}</p>
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {totalDebit > 0 ? formatCurrency(totalDebit) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                {totalCredit > 0 ? formatCurrency(totalCredit) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                <span className={entry.runningBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {formatCurrency(Math.abs(entry.runningBalance))}
                                  {entry.runningBalance > 0 ? ' Dr' : ' Cr'}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No journal entries found for this customer</p>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              {totals && journalEntries.length > 0 && (
                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 text-emerald-800">Ledger Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Entries</p>
                        <p className="text-xl font-bold">{totals.totalEntries}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Debits</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(totals.totalDebits)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Credits</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(totals.totalCredits)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Current Outstanding</p>
                        <p className="text-xl font-bold text-emerald-700">{formatCurrency(totals.currentOutstanding)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(PersonalLedgerTabComponent);
