'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Wallet, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Search, Filter, Download, Calendar, IndianRupee,
  TrendingUp, TrendingDown, FileText, AlertCircle, CheckCircle,
  Banknote, Receipt, BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface CashBookTabProps {
  selectedCompanyIds: string[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

interface CashBookEntry {
  id: string;
  companyId: string;
  entryDate: Date | string;
  voucherNo: string;
  description: string;
  reference: string | null;
  referenceType: string | null;
  cashIn: number;
  cashOut: number;
  balance: number;
  loanId: string | null;
  customerId: string | null;
  notes: string | null;
  company?: {
    id: string;
    name: string;
    code: string;
    isCashBookOnly?: boolean;
  };
  createdAt: Date | string;
}

interface CashBookStats {
  totalEntries: number;
  totalCashIn: number;
  totalCashOut: number;
  currentBalance: number;
  byType: Record<string, { count: number; totalIn: number; totalOut: number }>;
  byCompany: any[];
}

const ENTRY_TYPES = [
  { value: 'EXTRA_EMI', label: 'Extra EMI Payment', color: 'bg-green-100 text-green-800' },
  { value: 'PROFIT_ENTRY', label: 'Profit Entry', color: 'bg-purple-100 text-purple-800' },
  { value: 'EXPENSE', label: 'Expense', color: 'bg-red-100 text-red-800' },
  { value: 'OPENING', label: 'Opening Balance', color: 'bg-blue-100 text-blue-800' },
  { value: 'MANUAL', label: 'Manual Entry', color: 'bg-gray-100 text-gray-800' },
];

function CashBookTabComponent({ selectedCompanyIds, formatCurrency, formatDate }: CashBookTabProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [stats, setStats] = useState<CashBookStats>({
    totalEntries: 0,
    totalCashIn: 0,
    totalCashOut: 0,
    currentBalance: 0,
    byType: {},
    byCompany: []
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CashBookEntry | null>(null);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    referenceType: 'MANUAL',
    cashIn: 0,
    cashOut: 0,
    reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchCashBookData();
  }, [selectedCompanyIds, dateRange.startDate, dateRange.endDate]);

  const fetchCashBookData = async () => {
    setLoading(true);
    try {
      const companyFilter = selectedCompanyIds.length > 0
        ? selectedCompanyIds.join(',')
        : 'all';

      let url = `/api/accounting/cash-book?companyId=${companyFilter}`;
      if (dateRange.startDate) url += `&startDate=${dateRange.startDate}`;
      if (dateRange.endDate) url += `&endDate=${dateRange.endDate}`;
      if (filterType && filterType !== 'all') url += `&type=${filterType}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setEntries(data.entries || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching cash book data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.description || (newEntry.cashIn === 0 && newEntry.cashOut === 0)) {
      return;
    }

    try {
      const companyId = selectedCompanyIds.length === 1 ? selectedCompanyIds[0] : null;
      if (!companyId) {
        alert('Please select a single company to add entry');
        return;
      }

      const res = await fetch('/api/accounting/cash-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          ...newEntry,
          entryDate: newEntry.entryDate
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddDialog(false);
        setNewEntry({
          entryDate: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          referenceType: 'MANUAL',
          cashIn: 0,
          cashOut: 0,
          reference: '',
          notes: ''
        });
        fetchCashBookData();
      }
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  };

  const getEntryTypeBadge = (type: string | null) => {
    const config = ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[4];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filteredEntries = entries.filter(e => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        e.description.toLowerCase().includes(query) ||
        e.voucherNo.toLowerCase().includes(query) ||
        (e.reference && e.reference.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    let csv = 'Voucher No,Date,Description,Type,Cash In,Cash Out,Balance\n';
    entries.forEach(e => {
      csv += `${e.voucherNo},${formatDate(e.entryDate)},"${e.description}",${e.referenceType || 'MANUAL'},${e.cashIn},${e.cashOut},${e.balance}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-book-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-green-500" />
            Cash Book
          </h2>
          <p className="text-gray-500 mt-1">
            Track Extra EMI payments and profit entries for profit center companies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCashBookData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cash In</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(stats.totalCashIn)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cash Out</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(stats.totalCashOut)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(stats.currentBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Entries</p>
                <p className="text-xl font-bold text-blue-700">{stats.totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Type Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Entry Type Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ENTRY_TYPES.map(type => {
              const typeStats = stats.byType[type.value] || { count: 0, totalIn: 0, totalOut: 0 };
              return (
                <div
                  key={type.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    filterType === type.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
                >
                  <Badge className={type.color}>{type.label}</Badge>
                  <p className="text-2xl font-bold mt-2">{typeStats.count}</p>
                  <p className="text-sm text-gray-500">
                    {typeStats.totalIn > 0 && `+${formatCurrency(typeStats.totalIn)}`}
                    {typeStats.totalOut > 0 && ` -${formatCurrency(typeStats.totalOut)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by voucher, description, or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-36"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-36"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cash Book Entries ({filteredEntries.length})</span>
            {filterType !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterType('all')}>
                Clear Filter
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No cash book entries found</p>
              <p className="text-sm mt-1">Add your first entry to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Cash In</TableHead>
                    <TableHead className="text-right">Cash Out</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry, index) => (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowDetailDialog(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm">{entry.voucherNo}</TableCell>
                      <TableCell>{formatDate(entry.entryDate)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                      <TableCell>{getEntryTypeBadge(entry.referenceType)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {entry.cashIn > 0 ? formatCurrency(entry.cashIn) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {entry.cashOut > 0 ? formatCurrency(entry.cashOut) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(entry.balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.company?.name || 'N/A'}</Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Add Cash Book Entry
            </DialogTitle>
            <DialogDescription>
              Record a new cash transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Entry Date</Label>
              <Input
                type="date"
                value={newEntry.entryDate}
                onChange={(e) => setNewEntry(prev => ({ ...prev, entryDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                placeholder="Enter description..."
                value={newEntry.description}
                onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Entry Type</Label>
              <Select
                value={newEntry.referenceType}
                onValueChange={(val) => setNewEntry(prev => ({ ...prev, referenceType: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cash In</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newEntry.cashIn || ''}
                  onChange={(e) => setNewEntry(prev => ({
                    ...prev,
                    cashIn: parseFloat(e.target.value) || 0,
                    cashOut: 0
                  }))}
                />
              </div>
              <div>
                <Label>Cash Out</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newEntry.cashOut || ''}
                  onChange={(e) => setNewEntry(prev => ({
                    ...prev,
                    cashOut: parseFloat(e.target.value) || 0,
                    cashIn: 0
                  }))}
                />
              </div>
            </div>

            <div>
              <Label>Reference (Optional)</Label>
              <Input
                placeholder="Loan ID, Invoice No, etc."
                value={newEntry.reference}
                onChange={(e) => setNewEntry(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleAddEntry}
              disabled={!newEntry.description || (newEntry.cashIn === 0 && newEntry.cashOut === 0)}
            >
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cash Book Entry Details</DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Voucher No</Label>
                  <p className="font-mono">{selectedEntry.voucherNo}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Date</Label>
                  <p>{formatDate(selectedEntry.entryDate)}</p>
                </div>
              </div>

              <div>
                <Label className="text-gray-500">Description</Label>
                <p>{selectedEntry.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-500">Cash In</Label>
                  <p className="text-green-600 font-bold">
                    {selectedEntry.cashIn > 0 ? formatCurrency(selectedEntry.cashIn) : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Cash Out</Label>
                  <p className="text-red-600 font-bold">
                    {selectedEntry.cashOut > 0 ? formatCurrency(selectedEntry.cashOut) : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Balance</Label>
                  <p className="font-bold">{formatCurrency(selectedEntry.balance)}</p>
                </div>
              </div>

              {selectedEntry.reference && (
                <div>
                  <Label className="text-gray-500">Reference</Label>
                  <p>{selectedEntry.reference}</p>
                </div>
              )}

              {selectedEntry.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p>{selectedEntry.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-gray-500">Company</Label>
                <p>{selectedEntry.company?.name || 'N/A'}</p>
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

export default memo(CashBookTabComponent);
