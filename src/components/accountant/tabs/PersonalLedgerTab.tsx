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
  CheckCircle, BookOpen, ArrowLeft, TrendingDown, AlertTriangle, Building2,
  Download, FileSpreadsheet, FileImage, FileText, Printer, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportPersonalLedgerCSV, exportAsPDF, exportAsImage, exportAsWord, printToPDF } from '@/utils/accountingExport';


import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PersonalLedgerTabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  refreshKey?: number;
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
  // Pre-computed values from journal-entry-based API
  description?: string;
  principalPaid?: number;
  interestPaid?: number;
  principalDisbursed?: number;
  totalPayment?: number | null;
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
  debit?: number;
  credit?: number;
  remainingBalance: number;
  referenceType: string;
  emiNumber?: number;
}

function PersonalLedgerTabComponent({ selectedCompanyIds, formatCurrency, formatDate, refreshKey = 0 }: PersonalLedgerTabProps) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerBasic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBasic | null>(null);
  const [loanStatements, setLoanStatements] = useState<LoanStatement[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanStatement | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  // Control account total for Loans Receivable
  const [totalLoansReceivable, setTotalLoansReceivable] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [selectedCompanyIds, refreshKey]);

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
        const res = await fetch(`/api/accounting/personal-ledger?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        const data = await res.json();
        if (data.success) allCustomers = data.borrowers || [];
      } else {
        // Fetch per company (mirror-aware) and merge
        const fetches = selectedCompanyIds.map(cid =>
          fetch(`/api/accounting/personal-ledger?companyId=${cid}&_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          }).then(r => r.json())
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
      // Control account total
      const ctrl = allCustomers.reduce((s, c) => s + c.totalOutstanding, 0);
      setTotalLoansReceivable(ctrl);
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
      const companyParam = selectedCompanyIds.length === 1 ? `&companyId=${selectedCompanyIds[0]}` : '';
      const res = await fetch(`/api/accounting/personal-ledger?customerId=${customerId}${companyParam}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
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

  // ─── Build loan statements from Journal Entries ───────────────────────────
  // The API now returns pre-computed outstanding / totalPaid from actual
  // JournalEntry records. Processing Fee is NOT returned (it doesn't touch
  // Loans Receivable). We just map the data to display rows.
  const buildLoanStatements = (customerSummary: any, entries: LedgerEntry[]): LoanStatement[] => {
    if (!customerSummary) return [];

    const allLoans = [
      ...(customerSummary.onlineLoans  || []).map((l: any) => ({ ...l, loanType: 'ONLINE'  as const })),
      ...(customerSummary.offlineLoans || []).map((l: any) => ({ ...l, loanType: 'OFFLINE' as const })),
    ];

    return allLoans.map(loan => {
      // Filter entries for this loan — entries already come from journal entries
      const loanEntries = entries
        .filter(e => e.loanId === loan.id || e.loanNumber === loan.loanNumber)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const cleanText = (txt?: string) => {
        if (!txt) return '';
        return txt.replace(/\(Last EMI.*?vs Regular EMI.*?\)/gi, '')
                  .replace(/mirror/gi, '')
                  .replace(/MR-/gi, '')
                  .replace(/-\s*\(\)/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
      };

      const rows: StatementRow[] = [];
      let runningBalance = 0;

      // Sort and process all loan entries chronologically
      for (const entry of loanEntries) {
        if (entry.referenceType === 'LOAN_DISBURSEMENT' || entry.referenceType === 'MIRROR_LOAN_DISBURSEMENT') {
          const amount = (entry.lines || []).find(l => ['1200', '1201', '1210'].includes(l.accountCode))?.debitAmount || loan.amount || loan.loanAmount || 0;
          runningBalance = amount;
          rows.push({
            date: entry.date,
            description: `Loan Disbursed — ${loan.loanNumber}`,
            totalPayment: null,
            interestPaid: null,
            principalPaid: null,
            debit: amount,
            credit: 0,
            remainingBalance: runningBalance,
            referenceType: 'LOAN_DISBURSEMENT'
          });
          continue;
        }

        // Never show processing fee in the loan statement
        if (entry.referenceType === 'PROCESSING_FEE_COLLECTION' || entry.referenceType === 'PROCESSING_FEE') {
          continue;
        }

        // Check if there is interest income (code 4110/4100 etc) credited in this entry (cash-basis indicator)
        const interestIncomeLine = (entry.lines || []).find(l => ['4110', '4100', '4001', '4002'].includes(l.accountCode) && l.creditAmount > 0);
        const interestIncomeAmount = interestIncomeLine ? interestIncomeLine.creditAmount : 0;

        // Calculate debits and credits to Loans Receivable (1200/1201/1210) and Interest Receivable (1301)
        const lrDebit = (entry.lines || []).filter(l => ['1200', '1201', '1210', '1301'].includes(l.accountCode)).reduce((s, l) => s + l.debitAmount, 0);
        const lrCredit = (entry.lines || []).filter(l => ['1200', '1201', '1210', '1301'].includes(l.accountCode)).reduce((s, l) => s + l.creditAmount, 0);

        if (entry.referenceType === 'INTEREST_ACCRUAL') {
          // Real accrual: record the Debit to Interest Receivable (1301)
          // Fallback chain: lrDebit (from 1301 line) → interestPaid (from 4110 Cr API field)
          //                 → principalDisbursed (API stores 1301 Dr amount here)
          //                 → interestIncomeAmount (4110 Cr directly on this entry)
          const interestAmt = lrDebit
            || entry.interestPaid
            || entry.principalDisbursed
            || interestIncomeAmount
            || 0;
          if (interestAmt > 0) {
            runningBalance += interestAmt;
            rows.push({
              date: entry.date,
              description: `To-INTEREST Normal Dr. Int. (Accrued)`,
              totalPayment: null,
              interestPaid: interestAmt,
              principalPaid: null,
              debit: interestAmt,
              credit: 0,
              remainingBalance: runningBalance,
              referenceType: 'INTEREST_CHARGE',
              emiNumber: entry.emiNumber
            });
          }
        } else {
          // This is a payment or write-off entry.
          //
          // Detect interest component from two possible sources:
          //   • interestIncomeAmount  – cash-basis: interest goes directly to 4110 (Interest Income)
          //   • interest1301Credit    – accrual-basis: interest clears via 1301 (Interest Receivable)
          //
          // When accrual-basis: the INTEREST_ACCRUAL journal already showed the Dr row above.
          //   We do NOT add another Dr row — we just show the payment Cr row.
          // When cash-basis: no prior accrual row exists, so we show:
          //   Row 1 → synthetic interest Dr  (To-INTEREST)
          //   Row 2 → payment Cr             (By-CASH)

          const interest1301Credit = (entry.lines || [])
            .filter(l => l.accountCode === '1301' && l.creditAmount > 0)
            .reduce((s, l) => s + l.creditAmount, 0);

          // Effective interest for display (fallback to API field)
          const effectiveInterestAmt = interestIncomeAmount || interest1301Credit || entry.interestPaid || 0;

          // Show synthetic interest Dr ONLY for cash-basis (no prior accrual row)
          // Accrual-basis: interest1301Credit > 0 means an INTEREST_ACCRUAL JE already ran
          if (interestIncomeAmount > 0) {
            // Cash-basis: interest income hits 4110 directly on this EMI payment
            runningBalance += interestIncomeAmount;
            rows.push({
              date: entry.date,
              description: `To-INTEREST Normal Dr. Int.`,
              totalPayment: null,
              interestPaid: interestIncomeAmount,
              principalPaid: null,
              debit: interestIncomeAmount,
              credit: 0,
              remainingBalance: runningBalance,
              referenceType: 'INTEREST_CHARGE',
              emiNumber: entry.emiNumber
            });
          }

          // Payment Cr rows (split into Principal and Interest as requested)
          const principalCredit = (entry.lines || []).filter(l => ['1200', '1201', '1210'].includes(l.accountCode)).reduce((s, l) => s + l.creditAmount, 0);
          
          if (principalCredit > 0 || effectiveInterestAmt > 0) {
            const paymentMethod = entry.narration?.toLowerCase().includes('bank') || entry.narration?.toLowerCase().includes('online') ? 'By-TRANSFER' : 'By-CASH';
            let desc = entry.description || buildRowDescription(entry);

            if (effectiveInterestAmt > 0) {
              runningBalance -= effectiveInterestAmt;
              rows.push({
                date: entry.date,
                description: `${paymentMethod} — ${cleanText(desc)} (Interest)`,
                totalPayment: effectiveInterestAmt,
                interestPaid: effectiveInterestAmt,
                principalPaid: 0,
                debit: 0,
                credit: effectiveInterestAmt,
                remainingBalance: runningBalance,
                referenceType: entry.referenceType,
                emiNumber: entry.emiNumber
              });
            }

            if (principalCredit > 0) {
              runningBalance -= principalCredit;
              rows.push({
                date: entry.date,
                description: `${paymentMethod} — ${cleanText(desc)} (Principal)`,
                totalPayment: principalCredit,
                interestPaid: 0,
                principalPaid: principalCredit,
                debit: 0,
                credit: principalCredit,
                remainingBalance: runningBalance,
                referenceType: entry.referenceType,
                emiNumber: entry.emiNumber
              });
            }
          }
        }
      }

      // Use pre-computed API values if the loan summary has them (from journal entries)
      const apiOutstanding       = loan.outstanding       ?? null;
      const apiTotalPaid         = loan.totalPaid         ?? null;
      const apiTotalInterestPaid = loan.totalInterestPaid ?? null;
      const apiTotalPrincipalPaid= loan.totalPrincipalPaid?? null;

      // Note: we only sum the credit lines that are actual payments
      const actualPayments = rows.filter(r => r.credit && r.credit > 0);
      const rowTotalPaid          = actualPayments.reduce((s, r) => s + (r.credit || 0), 0);
      const rowTotalInterestPaid  = actualPayments.reduce((s, r) => s + (r.interestPaid || 0), 0);
      const rowTotalPrincipalPaid = actualPayments.reduce((s, r) => s + (r.principalPaid || 0), 0);

      // The final row's remaining balance is the most accurate because it guarantees
      // we account for the initial loan amount disbursement correctly.
      const lastRowBalance = rows.length > 0 ? rows[rows.length - 1].remainingBalance : (loan.amount || loan.loanAmount || 0);

      return {
        loanId:            loan.id,
        loanNumber:        loan.loanNumber,
        loanType:          loan.loanType,
        loanAmount:        loan.amount || loan.loanAmount || 0,
        interestRate:      loan.interestRate || 0,
        tenure:            loan.tenure || 0,
        status:            loan.status,
        disbursementDate:  loan.disbursementDate,
        isMirror:          loan.isMirror || false,
        rows,
        outstanding:       lastRowBalance,
        totalPaid:         rowTotalPaid,
        totalInterestPaid: rowTotalInterestPaid,
        totalPrincipalPaid:rowTotalPrincipalPaid,
      };
    });
  };

  const buildRowDescription = (entry: LedgerEntry): string => {
    const type = entry.referenceType;
    if (type === 'PENALTY_COLLECTION')    return 'Late Penalty';
    if (type === 'INTEREST_ONLY_PAYMENT') return `EMI #${entry.emiNumber || '?'} — Interest Only`;
    if (type === 'PARTIAL_EMI_PAYMENT')   return `EMI #${entry.emiNumber || '?'} — Partial Payment`;
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
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setSelectedLoan(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loans
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              Loan Statement — {selectedCustomer.name}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              {selectedLoan.loanNumber} • {selectedLoan.loanType}
              {selectedLoan.isMirror && <Badge className="text-xs bg-purple-100 text-purple-700">Mirror Loan</Badge>}
            </p>
          </div>
          {/* Date Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">From:</span>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-sm" />
            <span className="text-xs text-gray-500">To:</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-sm" />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</Button>
          </div>
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download Ledger As</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                let filteredRows = selectedLoan.rows;
                if (startDate || endDate) {
                  filteredRows = selectedLoan.rows.filter(r => {
                    if (!r.date) return true;
                    const d = new Date(r.date);
                    let valid = true;
                    if (startDate) valid = valid && d >= new Date(startDate);
                    if (endDate) valid = valid && d <= new Date(endDate);
                    return valid;
                  });
                }
                exportPersonalLedgerCSV(
                  filteredRows.map(r => ({
                    date: r.date ? format(new Date(r.date), 'dd/MM/yyyy HH:mm:ss') : '', narration: r.description, referenceNo: r.referenceType,
                    debit: r.totalPayment || 0, credit: 0
                  })),
                  `${selectedCustomer.name}_${selectedLoan.loanNumber}`,
                  selectedCompanyIds[0] || ''
                );
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel / CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsPDF('personal-ledger-stmt', `Ledger_${selectedCustomer.name}`, `Loan Statement — ${selectedCustomer.name}`)}>
                <FileText className="h-4 w-4 mr-2 text-red-600" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsImage('personal-ledger-stmt', `Ledger_${selectedCustomer.name}`)}>
                <FileImage className="h-4 w-4 mr-2 text-blue-600" /> Image (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsWord('personal-ledger-stmt', `Ledger_${selectedCustomer.name}`, `Loan Statement — ${selectedCustomer.name}`)}>
                <FileText className="h-4 w-4 mr-2 text-indigo-600" /> Word (.doc)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => printToPDF('personal-ledger-stmt', `Loan Statement — ${selectedCustomer.name}`)}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <Card className="border shadow-sm overflow-hidden" id="personal-ledger-stmt">
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
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Particulars</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Chq No.</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Value Date</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Debit</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Credit</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let filteredRows = selectedLoan.rows;
                  if (startDate || endDate) {
                    filteredRows = selectedLoan.rows.filter(r => {
                      if (!r.date) return true;
                      const d = new Date(r.date);
                      let valid = true;
                      if (startDate) valid = valid && d >= new Date(startDate);
                      if (endDate) valid = valid && d <= new Date(endDate);
                      return valid;
                    });
                  }
                  return filteredRows.map((row, idx) => {
                    const isFirst = idx === 0;
                  return (
                    <tr
                      key={idx}
                      className={`border-b transition-colors ${
                        isFirst ? 'bg-blue-50/50 hover:bg-blue-100/50'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50'
                        : 'bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <TableCell className="text-sm py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{format(new Date(row.date), 'dd MMM yyyy')}</span>
                          <span className="text-xs text-slate-500">{format(new Date(row.date), 'HH:mm:ss')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`text-sm font-medium ${isFirst ? 'text-slate-900' : 'text-slate-800'}`}>
                          {row.description}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 py-2">
                        {/* Empty Chq No. for now, or could map to reference */}
                        —
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 py-2 whitespace-nowrap">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {row.debit && row.debit > 0
                          ? <span className="font-medium text-slate-800">{row.debit.toFixed(2)}</span>
                          : <span className="text-slate-300">0.00</span>}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {row.credit && row.credit > 0
                          ? <span className="font-medium text-slate-800">{row.credit.toFixed(2)}</span>
                          : <span className="text-slate-300">0.00</span>}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className={`font-semibold text-sm ${row.remainingBalance <= 0 ? 'text-green-600' : 'text-slate-900'}`}>
                          {row.remainingBalance.toFixed(2)} Dr
                        </span>
                      </TableCell>
                    </tr>
                  );
                });
              })()}
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
              <div
                key={loan.loanId}
                className="cursor-pointer hover:scale-[1.01] transition-transform"
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
              </div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><User className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Debtors</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Loans Receivable Control Account — sum of all personal ledger outstanding */}
        <Card className="border-2 border-blue-400 shadow-md bg-blue-50 col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><IndianRupee className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Loans Receivable A/c</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(totalLoansReceivable)}</p>
                <p className="text-[10px] text-blue-500 mt-0.5">Control Account (Personal Ledger Sum)</p>
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
                    <tr
                      key={customer.id}
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
                    </tr>
                  ))}                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(PersonalLedgerTabComponent);
