'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, ArrowUpRight, ArrowDownRight, Calendar, Filter, Download,
  IndianRupee, Building2, Landmark, Wallet, CreditCard, Loader2,
  TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  referenceId: string;
  category: string;
  source: 'BANK' | 'CASHBOOK' | 'JOURNAL';
  bankName?: string;
  accountNumber?: string;
  createdAt: string;
}

interface DaybookSummary {
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  openingBalance: number;
  closingBalance: number;
  transactionCount: number;
}

interface DaybookSectionProps {
  companyId: string;
  companyName: string;
  companyCode: string;
}

export default function DaybookSection({ companyId, companyName, companyCode }: DaybookSectionProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<DaybookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');

  useEffect(() => {
    fetchTransactions();
  }, [companyId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        companyId,
        startDate,
        endDate,
        type: filterType,
        source: filterSource
      });
      
      const res = await fetch(`/api/company/daybook?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch daybook:', error);
      toast({ title: 'Error', description: 'Failed to fetch transactions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchTransactions();
  };

  const handleExport = () => {
    // Generate CSV
    const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Source', 'Balance After'];
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.type,
      t.amount,
      t.description,
      t.category,
      t.source,
      t.balanceAfter
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daybook_${companyName}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Success', description: 'Daybook exported successfully' });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'BANK':
        return <Landmark className="h-4 w-4 text-blue-600" />;
      case 'CASHBOOK':
        return <Wallet className="h-4 w-4 text-amber-600" />;
      case 'JOURNAL':
        return <BookOpen className="h-4 w-4 text-purple-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'bg-red-100 text-red-700',
      'EMI_PAYMENT': 'bg-green-100 text-green-700',
      'BANK_TRANSFER': 'bg-blue-100 text-blue-700',
      'CASH_TRANSACTION': 'bg-amber-100 text-amber-700',
      'JOURNAL_ENTRY': 'bg-purple-100 text-purple-700',
      'MIRROR_LOAN': 'bg-pink-100 text-pink-700',
      'EQUITY': 'bg-indigo-100 text-indigo-700',
      'PROCESSING_FEE': 'bg-teal-100 text-teal-700',
      'INTEREST': 'bg-orange-100 text-orange-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-600" />
            Daybook - {companyName}
          </h2>
          <p className="text-muted-foreground">Complete transaction history A to Z</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTransactions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="CREDIT">Credit Only</SelectItem>
                  <SelectItem value="DEBIT">Debit Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="CASHBOOK">Cashbook</SelectItem>
                  <SelectItem value="JOURNAL">Journal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full bg-purple-600 hover:bg-purple-700">
                <Filter className="h-4 w-4 mr-2" /> Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Total Credits</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalCredits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-gray-500">Total Debits</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalDebits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`bg-gradient-to-br ${summary.netFlow >= 0 ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-orange-50 to-amber-50 border-orange-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <IndianRupee className={`h-5 w-5 ${summary.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                <div>
                  <p className="text-xs text-gray-500">Net Flow</p>
                  <p className={`text-lg font-bold ${summary.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(summary.netFlow)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-lg font-bold text-gray-600">{summary.transactionCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500">Opening Bal</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(summary.openingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-gray-500">Closing Bal</p>
                  <p className="text-lg font-bold text-teal-600">{formatCurrency(summary.closingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Showing {transactions.length} transactions from {formatDate(startDate)} to {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found for the selected period</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {transactions.map((txn, index) => (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Type Icon */}
                      <div className={`p-3 rounded-full ${
                        txn.type === 'CREDIT' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {txn.type === 'CREDIT' 
                          ? <ArrowDownRight className="h-5 w-5 text-green-600" />
                          : <ArrowUpRight className="h-5 w-5 text-red-600" />
                        }
                      </div>
                      
                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{txn.description}</p>
                          <Badge className={getCategoryBadge(txn.category)}>
                            {txn.category.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(txn.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            {getSourceIcon(txn.source)}
                            {txn.source}
                          </span>
                          {txn.bankName && (
                            <span className="flex items-center gap-1">
                              <Landmark className="h-3 w-3" />
                              {txn.bankName} ({txn.accountNumber})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        txn.type === 'CREDIT' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {formatCurrency(txn.balanceAfter)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
