'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, RefreshCw, User, Phone, IndianRupee,
  CheckCircle, BookOpen, Receipt, ArrowLeft, Printer,
  TrendingDown, Clock, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface PersonalLedgerTabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

interface CustomerBasic {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalLoans: number;
  totalOutstanding: number;
  totalPaid: number;
}

interface LoanStatement {
  loanId: string;
  loanNumber: string;
  loanType: 'ONLINE' | 'OFFLINE';
  loanAmount: number;
  interestRate: number;
  tenure: number;
  status: string;
  disbursementDate: string;
  rows: StatementRow[];
  outstanding: number;
  totalPaid: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
}

interface StatementRow {
  date: string;
  description: string;
  totalPayment: number | null;   // null = initial loan row
  interestPaid: number | null;
  principalPaid: number | null;
  remainingBalance: number;
  referenceType: string;
  emiNumber?: number;
  isPenalty?: boolean;
  penaltyAmount?: number;
}

function PersonalLedgerTabComponent({ selectedCompanyIds, formatCurrency, formatDate }: PersonalLedgerTabProps) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerBasic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBasic | null>(null);
  const [loanStatements, setLoanStatements] = useState<LoanStatement[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanStatement | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [selectedCompanyIds]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const companyFilter = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : 'all';
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

  const fetchLoanStatements = async (customerId: string) => {
    setLoadingLedger(true);
    setLoanStatements([]);
    setSelectedLoan(null);
    try {
      const res = await fetch(`/api/accounting/personal-ledger?customerId=${customerId}`);
      const data = await res.json();

      if (data.success) {
        // Transform API response into loan statement format
        const statements = buildLoanStatements(data);
        setLoanStatements(statements);
        if (statements.length === 1) setSelectedLoan(statements[0]); // auto-select if only one loan
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch ledger', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch personal ledger', variant: 'destructive' });
    } finally {
      setLoadingLedger(false);
    }
  };

  /**
   * Convert raw API journal entries into clean loan statement rows
   * Format: Initial Loan → EMI payments (Principal | Interest | Remaining Balance)
   */
  const buildLoanStatements = (data: any): LoanStatement[] => {
    const customer = data.customerSummary;
    if (!customer) return [];

    const allLoans = [
      ...(customer.onlineLoans || []).map((l: any) => ({ ...l, loanType: 'ONLINE' as const })),
      ...(customer.offlineLoans || []).map((l: any) => ({ ...l, loanType: 'OFFLINE' as const }))
    ];

    const entries: any[] = data.entries || [];

    return allLoans.map((loan) => {
      // Get journal entries related to this loan
      const loanEntries = entries.filter((e: any) =>
        e.referenceId === loan.id ||
        (e.narration && e.narration.includes(loan.loanNumber))
      );

      const rows: StatementRow[] = [];
      let runningBalance = loan.amount;

      // Row 1: Initial Loan (Disbursement)
      rows.push({
        date: loan.disbursementDate || new Date().toISOString(),
        description: `Initial Loan - ${loan.loanNumber}`,
        totalPayment: null,
        interestPaid: null,
        principalPaid: null,
        remainingBalance: loan.amount,
        referenceType: 'LOAN_DISBURSEMENT'
      });

      // Process entries in chronological order
      const sortedEntries = [...loanEntries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (const entry of sortedEntries) {
        if (entry.referenceType === 'LOAN_DISBURSEMENT') continue; // skip disbursement — already shown

        // Determine interest paid and principal paid from journal lines
        let interestPaid = 0;
        let principalPaid = 0;
        let penaltyCollected = 0;

        for (const line of (entry.lines || [])) {
          const code = line.accountCode;
          if (['4001', '4002', '4100'].includes(code)) {
            // Income / Interest accounts — credit = interest earned from customer
            interestPaid += line.creditAmount;
          } else if (['5001', '5002', '5100'].includes(code)) {
            // Penalty income
            penaltyCollected += line.creditAmount;
          } else if (['1200', '1201', '1210'].includes(code)) {
            // Loans Receivable — credit = principal repaid
            principalPaid += line.creditAmount;
          }
        }

        const totalPayment = principalPaid + interestPaid + penaltyCollected;
        if (totalPayment <= 0) continue;

        runningBalance = Math.max(0, runningBalance - principalPaid);

        const emiMatch = entry.narration?.match(/EMI #?(\d+)/i);
        const emiNumber = emiMatch ? parseInt(emiMatch[1]) : undefined;

        const isPenalty = entry.referenceType === 'PENALTY_COLLECTION' || penaltyCollected > 0;
        const description = buildDescription(entry, emiNumber, isPenalty, penaltyCollected);

        rows.push({
          date: entry.date,
          description,
          totalPayment,
          interestPaid,
          principalPaid,
          remainingBalance: runningBalance,
          referenceType: entry.referenceType,
          emiNumber,
          isPenalty,
          penaltyAmount: penaltyCollected
        });
      }

      const totalPaid = rows.reduce((s, r) => s + (r.totalPayment || 0), 0);
      const totalInterestPaid = rows.reduce((s, r) => s + (r.interestPaid || 0), 0);
      const totalPrincipalPaid = rows.reduce((s, r) => s + (r.principalPaid || 0), 0);

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        loanType: loan.loanType,
        loanAmount: loan.amount,
        interestRate: loan.interestRate || 0,
        tenure: loan.tenure || 0,
        status: loan.status,
        disbursementDate: loan.disbursementDate,
        rows,
        outstanding: Math.max(0, loan.amount - totalPrincipalPaid),
        totalPaid,
        totalInterestPaid,
        totalPrincipalPaid
      };
    });
  };

  const buildDescription = (entry: any, emiNumber?: number, isPenalty?: boolean, penaltyAmount?: number): string => {
    const type = entry.referenceType;
    if (type === 'PROCESSING_FEE_COLLECTION') return 'Processing Fee';
    if (type === 'PENALTY_COLLECTION') return `Late Penalty — ${penaltyAmount ? `₹${penaltyAmount.toFixed(0)}` : ''}`;
    if (type === 'EMI_PAYMENT' || type === 'MIRROR_EMI_PAYMENT') {
      let desc = emiNumber ? `Monthly EMI #${emiNumber}` : 'Monthly EMI';
      if (penaltyAmount && penaltyAmount > 0) desc += ` + Penalty`;
      return desc;
    }
    if (type === 'PRINCIPAL_ONLY_PAYMENT') return 'Extra Principal Payment';
    return entry.narration?.replace(/mirror/gi, '').trim() || type?.replace(/_/g, ' ') || 'Payment';
  };

  const handleSelectCustomer = async (customer: CustomerBasic) => {
    setSelectedCustomer(customer);
    await fetchLoanStatements(customer.id);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + c.totalOutstanding, 0);
  const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0);

  // --- LOAN STATEMENT VIEW (after choosing customer + loan) ---
  if (selectedCustomer && selectedLoan) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setSelectedLoan(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loans
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Loan Statement — {selectedCustomer.name}
            </h2>
            <p className="text-sm text-gray-500">{selectedLoan.loanNumber} • {selectedLoan.loanType}</p>
          </div>
        </div>

        {/* Loan Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-medium">Loan Amount</p>
              <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedLoan.loanAmount)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-medium">Total Paid</p>
              <p className="text-lg font-bold text-green-800">{formatCurrency(selectedLoan.totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-4">
              <p className="text-xs text-red-600 font-medium">Outstanding Balance</p>
              <p className="text-lg font-bold text-red-800">{formatCurrency(selectedLoan.outstanding)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-4">
              <p className="text-xs text-amber-600 font-medium">Interest Earned</p>
              <p className="text-lg font-bold text-amber-800">{formatCurrency(selectedLoan.totalInterestPaid)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Statement Table — Exactly like the bank passbook format from user's photo */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Loan Repayment Statement
              <Badge className="ml-auto bg-white/20 text-white text-xs">
                {selectedLoan.rows.length - 1} Payment{selectedLoan.rows.length !== 2 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b-2">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider">Total Payment</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider">Interest Paid</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider">Principal Paid</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedLoan.rows.map((row, idx) => {
                  const isFirstRow = idx === 0;
                  const isPenaltyRow = row.isPenalty && row.principalPaid === 0;
                  return (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b transition-colors ${
                        isFirstRow
                          ? 'bg-blue-50 hover:bg-blue-100 font-semibold'
                          : isPenaltyRow
                          ? 'bg-red-50 hover:bg-red-100'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <TableCell className="text-sm py-3">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          {isFirstRow && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                          {!isFirstRow && isPenaltyRow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                          {!isFirstRow && !isPenaltyRow && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                          <span className={`text-sm ${isFirstRow ? 'text-blue-800 font-semibold' : isPenaltyRow ? 'text-red-700' : 'text-gray-800'}`}>
                            {row.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {row.totalPayment !== null ? (
                          <span className="font-semibold text-emerald-700">{formatCurrency(row.totalPayment)}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {row.interestPaid !== null && row.interestPaid > 0 ? (
                          <span className="text-amber-700">{formatCurrency(row.interestPaid)}</span>
                        ) : row.interestPaid === null ? (
                          <span className="text-gray-400 text-sm">—</span>
                        ) : (
                          <span className="text-gray-400 text-sm">₹0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {row.principalPaid !== null && row.principalPaid > 0 ? (
                          <span className="text-blue-700 font-medium">{formatCurrency(row.principalPaid)}</span>
                        ) : row.principalPaid === null ? (
                          <span className="text-gray-400 text-sm">—</span>
                        ) : (
                          <span className="text-gray-400 text-sm">₹0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className={`font-bold text-base ${row.remainingBalance <= 0 ? 'text-green-600' : 'text-slate-800'}`}>
                          {formatCurrency(row.remainingBalance)}
                        </span>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals Footer */}
          <div className="bg-slate-800 text-white px-6 py-4">
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">Total Collected</p>
                <p className="text-xl font-bold text-white">{formatCurrency(selectedLoan.totalPaid)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">Interest Earned</p>
                <p className="text-xl font-bold text-amber-300">{formatCurrency(selectedLoan.totalInterestPaid)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">Outstanding</p>
                <p className={`text-xl font-bold ${selectedLoan.outstanding <= 0 ? 'text-green-400' : 'text-red-300'}`}>
                  {formatCurrency(selectedLoan.outstanding)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // --- LOAN SELECTION VIEW (after choosing customer, before choosing loan) ---
  if (selectedCustomer && !selectedLoan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setSelectedCustomer(null); setLoanStatements([]); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> All Customers
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-500" />
              {selectedCustomer.name}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {selectedCustomer.phone || 'No phone'}
            </p>
          </div>
        </div>

        {loadingLedger ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : loanStatements.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="text-center py-16">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No loans found for this customer</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loanStatements.map((loan) => (
              <motion.div
                key={loan.loanId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                className="cursor-pointer"
                onClick={() => setSelectedLoan(loan)}
              >
                <Card className="border shadow-sm hover:shadow-md hover:border-emerald-300 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900">{loan.loanNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{loan.loanType} Loan • {loan.tenure} months @ {loan.interestRate}%</p>
                      </div>
                      <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {loan.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-gray-400">Loan</p>
                        <p className="font-semibold text-blue-700">{formatCurrency(loan.loanAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="font-semibold text-green-700">{formatCurrency(loan.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Outstanding</p>
                        <p className={`font-semibold ${loan.outstanding > 0 ? 'text-red-700' : 'text-green-600'}`}>{formatCurrency(loan.outstanding)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-400">{loan.rows.length - 1} EMI payment{loan.rows.length !== 2 ? 's' : ''} recorded</p>
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        View Statement →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- CUSTOMER LIST VIEW ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-500" />
            Personal Ledger (Khata)
          </h2>
          <p className="text-gray-500 mt-1">Customer-wise loan statements — Tap a customer to view their ledger</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCustomers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Outstanding</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
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

      {/* Customer Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Customer Accounts ({filteredCustomers.length})</CardTitle>
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
                  <TableRow className="bg-gray-50">
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
                      className="border-b hover:bg-emerald-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm">
                            {customer.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone || 'No phone'}
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
                        <Button size="sm" variant="ghost" className="text-emerald-600">
                          View Ledger →
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
    </div>
  );
}

export default memo(PersonalLedgerTabComponent);
