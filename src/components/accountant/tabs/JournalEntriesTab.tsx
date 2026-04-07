'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, Eye } from 'lucide-react';
import type { JournalEntriesTabProps } from './types';

function JournalEntriesTabComponent({
  journalEntries,
  setSelectedEntry,
  setShowJournalDialog,
  setShowEntryDetailDialog,
  handleExportReport,
  formatCurrency,
  formatDate,
  getReferenceTypeLabel,
}: JournalEntriesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <p className="text-muted-foreground">All financial transactions with double-entry bookkeeping</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExportReport('journal-entries')}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => setShowJournalDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{journalEntries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Debit</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(journalEntries.reduce((sum, e) => sum + e.totalDebit, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Credit</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(journalEntries.reduce((sum, e) => sum + e.totalCredit, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Journal Entries Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.map((entry) => (
                  <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedEntry(entry); setShowEntryDetailDialog(true); }}>
                    <TableCell className="font-mono font-bold">{entry.entryNumber}</TableCell>
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell><Badge variant="outline">{getReferenceTypeLabel(entry.referenceType)}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.narration}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(entry.totalDebit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(entry.totalCredit)}</TableCell>
                    <TableCell>
                      {entry.isApproved ? <Badge className="bg-green-500">Approved</Badge> : <Badge variant="destructive">Pending</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setShowEntryDetailDialog(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(JournalEntriesTabComponent);
