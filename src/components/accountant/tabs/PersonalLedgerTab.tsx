'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, RefreshCw, User, Phone, IndianRupee,
  CheckCircle, BookOpen, ArrowLeft, TrendingDown, AlertTriangle, Building2
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

interface LedgerEntry {
  id: string;
  date: string;
  referenceType: string;
  referenceId: string;
  narration: string;
  loanId: string;
  loanNumber: string;
  emiNumber?: number;
  lines: {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    narration: string;
  }[];
}

interface LoanStatement {
  loanId: string;
  loanNumber: string;
  loanType: string;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  status: string;
  disbursementDate: string | null;
  isMirror: boolean;
  rows: StatementRow[];
  outstanding: number;
  totalPaid: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
}

interface StatementRow {
  date: string;
  description: string;
  totalPayment: number | null;
  interestPaid: number | null;
  principalPaid: number | null;
  remainingBalance: number;
  referenceType: string;
  emiNumber?: number;
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

  // ─── Fetch customer list (mirror-aware) ────────────────────────────────────
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Use ONE company at a time if selected, otherwise 'all'
      const companyParam = selectedCompanyIds.length > 0 ? selectedCompanyIds[0] : 'all';
      // If multiple companies selected and we need to merge, collect from each
      let allCustomers: CustomerBasic[] = [];

      if (selectedCompanyIds.length === 0) {
        // Fetch all — no company filter
        const res = await fetch(`/api/accounting/personal-ledger`);
        const data = await res.json();
        if (data.success) allCustomers = data.borrowers || [];
      } else {
        // Fetch per company (mirror-aware) and merge
        const fetches = selectedCompanyIds.map(cid =>
          fetch(`/api/accounting/personal-ledger?companyId=${cid}`).then(r => r.json())
        );
        const results = await Promise.all(fetches);
        const seen = new Set<string>();
        for (const data of results) {
          if (!data.success) continue;
          for (const b of (data.borrowers || [])) {
            if (!seen.has(b.id)) { seen.add(b.id); allCustomers.push(b); }
            else {
              // Merge totals
              const ex = allCustomers.find(c => c.id === b.id)!;
              ex.totalLoans       += b.totalLoans;
              ex.totalOutstanding += b.totalOutstanding;
              ex.totalPaid        += b.totalPaid;
            }
          }
        }
      }

      allCustomers.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch loan ledger for one customer ────────────────────────────────────
  const fetchLoanStatements = async (customerId: string) => {
    setLoadingLedger(true);
    setLoanStatements([]);
    setSelectedLoan(null);
    try {
      const res = await fetch(`/api/accounting/personal-ledger?customerId=${customerId}`);
      const data = await res.json();

      if (!data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to fetch ledger', variant: 'destructive' });
        return;
      }

      const statements = buildLoanStatements(data.customerSummary, data.entries || []);
      setLoanStatements(statements);
      if (statements.length === 1) setSelectedLoan(statements[0]);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch personal ledger', variant: 'destructive' });
    } finally {
      setLoadingLedger(false);
    }
  };

  // ─── Build loan statements from new real-data API format ──────────────────
  const buildLoanStatements = (customerSummary: any, entries: LedgerEntry[]): LoanStatement[] => {
    if (!customerSummary) return [];

    const allLoans = [
      ...(customerSummary.onlineLoans  || []).map((l: any) => ({ ...l, loanType: 'ONLINE'  as const })),
      ...(customerSummary.offlineLoans || []).map((l: any) => ({ ...l, loanType: 'OFFLINE' as const })),
    ];

    return allLoans.map(loan => {
      // Filter entries for this loan
      const loanEntries = entries.filter(e => e.loanId === loan.id || e.loanNumber === loan.loanNumber);

      const rows: StatementRow[] = [];
      let runningBalance = loan.amount;

      // Row 0: Disbursement
      const disbEntry = loanEntries.find(e => e.referenceType === 'LOAN_DISBURSEMENT');
      rows.push({
        date: disbEntry?.date || loan.disbursementDate || new Date().toISOString(),
        description: `Loan Disbursed — ${loan.loanNumber}`,
        totalPayment: null,
        interestPaid: null,
        principalPaid: null,
        remainingBalance: loan.amount,
        referenceType: 'LOAN_DISBURSEMENT'
      });

      // Sort remaining entries chronologically (skip disbursement)
      const paymentEntries = loanEntries
        .filter(e => e.referenceType !== 'LOAN_DISBURSEMENT')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const entry of paymentEntries) {
        // Sum up from lines
        let principalPaid = 0;
        let interestPaid  = 0;
        let otherCredit   = 0;

        for (const line of entry.lines) {
          const code = line.accountCode || '';
          if (['1200', '1201', '1210'].includes(code)) {
            principalPaid += line.creditAmount;   // Loans Receivable reduced
          } else if (['4110', '4100', '4001', '4002'].includes(code)) {
            interestPaid  += line.creditAmount;   // Interest income
          } else if (['4121'].includes(code)) {
            otherCredit   += line.creditAmount;   // Processing fee income
          }
        }

        const totalPayment = principalPaid + interestPaid + otherCredit;
        if (totalPayment <= 0) continue;

        runningBalance = Math.max(0, runningBalance - principalPaid);

        rows.push({
          date: entry.date,
          description: buildRowDescription(entry),
          totalPayment,
          interestPaid,
          principalPaid,
          remainingBalance: runningBalance,
          referenceType: entry.referenceType,
          emiNumber: entry.emiNumber
        });
      }

      const totalPaid          = rows.reduce((s, r) => s + (r.totalPayment    || 0), 0);
      const totalInterestPaid  = rows.reduce((s, r) => s + (r.interestPaid    || 0), 0);
      const totalPrincipalPaid = rows.reduce((s, r) => s + (r.principalPaid   || 0), 0);

      return {
        loanId:           loan.id,
        loanNumber:       loan.loanNumber,
        loanType:         loan.loanType,
        loanAmount:       loan.amount,
        interestRate:     loan.interestRate || 0,
        tenure:           loan.tenure || 0,
        status:           loan.status,
        disbursementDate: loan.disbursementDate,
        isMirror:         loan.isMirror || false,
        rows,
        outstanding:      Math.max(0, loan.amount - totalPrincipalPaid),
        totalPaid,
        totalInterestPaid,
        totalPrincipalPaid
      };
    });
  };

  const buildRowDescription = (entry: LedgerEntry): string => {
    const type = entry.referenceType;
    if (type === 'PROCESSING_FEE_COLLECTION')  return 'Processing Fee Collected';
    if (type === 'PENALTY_COLLECTION')          return 'Late Penalty';
    if (type === 'INTEREST_ONLY_PAYMENT')       return `EMI #${entry.emiNumber || '?'} — Interest Only`;
    if (type === 'PARTIAL_EMI_PAYMENT')         return `EMI #${entry.emiNumber || '?'} — Partial Payment`;
    if (type === 'EMI_PAYMENT' || type === 'MIRROR_EMI_PAYMENT') {
      return entry.emiNumber ? `Monthly EMI #${entry.emiNumber}` : 'EMI Payment';
    }
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

  const totalOutstanding = customers.reduce((s, c) => s + c.totalOutstanding, 0);
  const totalCollected   = customers.reduce((s, c) => s + c.totalPaid, 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 3 — Loan Statement Detail
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedCustomer && selectedLoan) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedLoan(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loans
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Loan Statement — {selectedCustomer.name}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              {selectedLoan.loanNumber} • {selectedLoan.loanType}
              {selectedLoan.isMirror && <Badge className="text-xs bg-purple-100 text-purple-700">Mirror Loan</Badge>}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-medium">Loan Amount</p>
              <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedLoan.loanAmount)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-medium">Total Collected</p>
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

        {/* Statement Table */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Loan Repayment Ledger (Khata)
              <Badge className="ml-auto bg-white/20 text-white text-xs">
                {selectedLoan.rows.length - 1} Transaction{selectedLoan.rows.length !== 2 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b-2">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Description</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Total</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Interest</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Principal</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedLoan.rows.map((row, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b transition-colors ${
                        isFirst ? 'bg-blue-50 hover:bg-blue-100 font-semibold'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50'
                        : 'bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <TableCell className="text-sm py-3">{formatDate(row.date)}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          {isFirst
                            ? <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            : <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          }
                          <span className={`text-sm ${isFirst ? 'text-blue-800 font-semibold' : 'text-gray-800'}`}>
                            {row.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {row.totalPayment !== null
                          ? <span className="font-semibold text-emerald-700">{formatCurrency(row.totalPayment)}</span>
                          : <span className="text-gray-400 text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {row.interestPaid !== null && row.interestPaid > 0
                          ? <span className="text-amber-700">{formatCurrency(row.interestPaid)}</span>
                          : row.interestPaid === null
                            ? <span className="text-gray-400 text-sm">—</span>
                            : <span className="text-gray-400 text-sm">₹0</span>}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {row.principalPaid !== null && row.principalPaid > 0
                          ? <span className="text-blue-700 font-medium">{formatCurrency(row.principalPaid)}</span>
                          : row.principalPaid === null
                            ? <span className="text-gray-400 text-sm">—</span>
                            : <span className="text-gray-400 text-sm">₹0</span>}
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

          {/* Footer totals */}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 2 — Loan Selection (after choosing customer)
  // ═══════════════════════════════════════════════════════════════════════════
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
            {loanStatements.map(loan => (
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
                        <p className="text-xs text-gray-500 mt-0.5">
                          {loan.loanType} Loan • {loan.tenure} months @ {loan.interestRate}%
                          {loan.isMirror && <span className="ml-1 text-purple-600">[Mirror]</span>}
                        </p>
                      </div>
                      <Badge variant={loan.status === 'ACTIVE' || loan.status === 'DISBURSED' ? 'default' : 'secondary'} className="text-xs">
                        {loan.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-gray-400">Loan</p>
                        <p className="font-semibold text-blue-700">{formatCurrency(loan.loanAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Collected</p>
                        <p className="font-semibold text-green-700">{formatCurrency(loan.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Outstanding</p>
                        <p className={`font-semibold ${loan.outstanding > 0 ? 'text-red-700' : 'text-green-600'}`}>
                          {formatCurrency(loan.outstanding)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-400">{loan.rows.length - 1} transaction{loan.rows.length !== 2 ? 's' : ''} recorded</p>
                      <span className="text-xs text-emerald-600 font-medium">View Ledger →</span>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 1 — Customer List
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-500" />
            Personal Ledger (Khata)
          </h2>
          <p className="text-gray-500 mt-1">Customer-wise loan statements — mirror-aware per company</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><User className="h-5 w-5 text-emerald-600" /></div>
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
              <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div>
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
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Collected</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(totalCollected)}</p>
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
              onChange={e => setSearchQuery(e.target.value)}
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
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No customers found</p>
              <p className="text-gray-400 text-sm mt-1">
                {customers.length === 0
                  ? 'No active loans found for the selected company'
                  : 'No matching customers for your search'}
              </p>
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
                              <Phone className="h-3 w-3" /> {customer.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{customer.totalLoans} loan{customer.totalLoans !== 1 ? 's' : ''}</Badge>
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
