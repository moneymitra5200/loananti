'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import type { TrialBalanceTabProps } from './types';

function TrialBalanceTabComponent({
  trialBalance,
  handleExportReport,
  formatCurrency,
  formatDate,
  getAccountTypeColor,
}: TrialBalanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground">As on {formatDate(new Date())}</p>
        </div>
        <Button variant="outline" onClick={() => handleExportReport('trial-balance')}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance?.map((item: any) => (
                  <TableRow key={item.accountCode}>
                    <TableCell className="font-mono">{item.accountCode}</TableCell>
                    <TableCell>{item.accountName}</TableCell>
                    <TableCell><Badge className={getAccountTypeColor(item.accountType)}>{item.accountType}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{item.debitBalance > 0 ? formatCurrency(item.debitBalance) : '-'}</TableCell>
                    <TableCell className="text-right font-mono">{item.creditBalance > 0 ? formatCurrency(item.creditBalance) : '-'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(trialBalance?.reduce((sum: number, item: any) => sum + item.debitBalance, 0) || 0)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(trialBalance?.reduce((sum: number, item: any) => sum + item.creditBalance, 0) || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(TrialBalanceTabComponent);
