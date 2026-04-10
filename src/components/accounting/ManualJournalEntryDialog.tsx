'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
}

interface JournalEntryLine {
  accountCode: string;
  debitAmount: number;
  creditAmount: number;
  narration: string;
}

interface ManualJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

export default function ManualJournalEntryDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess
}: ManualJournalEntryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { accountCode: '', debitAmount: 0, creditAmount: 0, narration: '' },
    { accountCode: '', debitAmount: 0, creditAmount: 0, narration: '' }
  ]);

  // Fetch accounts when company changes or dialog opens
  useEffect(() => {
    if (open && companyId) {
      fetchAccounts();
    }
  }, [open, companyId]);

  const fetchAccounts = async () => {
    setFetchingAccounts(true);
    try {
      const res = await fetch(`/api/accounting/chart-of-accounts?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setFetchingAccounts(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { accountCode: '', debitAmount: 0, creditAmount: 0, narration: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines];
    
    if (field === 'debitAmount' && value > 0) {
      newLines[index].creditAmount = 0;
    } else if (field === 'creditAmount' && value > 0) {
      newLines[index].debitAmount = 0;
    }
    
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.creditAmount) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const handleSubmit = async () => {
    if (!isBalanced) {
      toast.error('Journal entry must be balanced (Total Debit = Total Credit)');
      return;
    }

    if (!narration.trim()) {
      toast.error('Please enter a narration for the entry');
      return;
    }

    const invalidLines = lines.filter(l => !l.accountCode || (l.debitAmount <= 0 && l.creditAmount <= 0));
    if (invalidLines.length > 0) {
      toast.error('Please complete all lines or remove empty ones');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accounting/journal-entries/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          entryDate,
          narration,
          lines
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Journal entry recorded successfully');
        onOpenChange(false);
        setNarration('');
        setLines([
          { accountCode: '', debitAmount: 0, creditAmount: 0, narration: '' },
          { accountCode: '', debitAmount: 0, creditAmount: 0, narration: '' }
        ]);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to record journal entry');
      }
    } catch (error) {
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              Manual Journal Entry
            </DialogTitle>
            <DialogDescription className="text-emerald-100 italic">
              Record direct debit/credit transactions between chart of accounts
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-white">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-600 font-semibold">Entry Date</Label>
              <Input 
                type="date" 
                value={entryDate} 
                onChange={(e) => setEntryDate(e.target.value)}
                className="border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600 font-semibold">Narration</Label>
              <Input 
                placeholder="Description of the transaction" 
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
              />
            </div>
          </div>

          {/* Table Area */}
          <div className="border border-emerald-50 rounded-xl overflow-hidden shadow-sm">
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader className="bg-emerald-50/50">
                  <TableRow>
                    <TableHead className="text-emerald-800 font-bold">Account</TableHead>
                    <TableHead className="w-[150px] text-emerald-800 font-bold">Debit (₹)</TableHead>
                    <TableHead className="w-[150px] text-emerald-800 font-bold">Credit (₹)</TableHead>
                    <TableHead className="text-emerald-800 font-bold">Line Narration</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="min-w-[250px]">
                        <Select 
                          value={line.accountCode} 
                          onValueChange={(val) => updateLine(index, 'accountCode', val)}
                        >
                          <SelectTrigger className="border-emerald-50 focus:ring-emerald-500">
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.accountCode}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] bg-gray-100 px-1 rounded">{acc.accountCode}</span>
                                  <span>{acc.accountName}</span>
                                  <Badge variant="outline" className="text-[10px] scale-75 origin-left">
                                    {acc.accountType}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={line.debitAmount || ''}
                          onChange={(e) => updateLine(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                          className="border-emerald-50 focus:ring-emerald-500 text-blue-600 font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={line.creditAmount || ''}
                          onChange={(e) => updateLine(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                          className="border-emerald-50 focus:ring-emerald-500 text-green-600 font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Optional" 
                          value={line.narration}
                          onChange={(e) => updateLine(index, 'narration', e.target.value)}
                          className="border-emerald-50 focus:ring-emerald-500"
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 2}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={addLine}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg px-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>

            <div className="flex flex-col items-end gap-1 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
               <div className="flex gap-8 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Total Debit</span>
                    <span className="text-blue-600 font-bold text-lg">₹{totalDebit.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Total Credit</span>
                    <span className="text-green-600 font-bold text-lg">₹{totalCredit.toLocaleString()}</span>
                  </div>
               </div>
               
               {!isBalanced && totalDebit > 0 && (
                 <div className="flex items-center gap-1.5 text-red-500 text-xs mt-1 font-medium animate-pulse">
                   <AlertCircle className="h-3 w-3" />
                   Unbalanced by ₹{difference.toLocaleString()}
                 </div>
               )}
               
               {isBalanced && (
                 <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] mt-1 font-bold uppercase tracking-tight">
                   <CheckCircle2 className="h-3 w-3" />
                   Entries Balanced
                 </div>
               )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t flex flex-row justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:bg-gray-200">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isBalanced || loading || !narration.trim()}
            className={`min-w-[150px] rounded-lg transition-all duration-300 shadow-md ${
              isBalanced && narration.trim() 
                ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200 shadow-lg' 
                : 'bg-gray-300'
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Post Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
