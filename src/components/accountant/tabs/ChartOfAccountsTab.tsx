'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, BookOpen, Trash2 } from 'lucide-react';
import type { ChartOfAccountsTabProps } from './types';

function ChartOfAccountsTabComponent({
  accounts,
  groupedAccounts,
  selectedAccountType,
  setSelectedAccountType,
  setSelectedAccount,
  setShowAccountDialog,
  setShowAccountDetailDialog,
  setShowLedgerDetailDialog,
  setSelectedLedgerAccount,
  fetchLedgerTransactions,
  confirmDelete,
  formatCurrency,
  getAccountTypeColor,
}: ChartOfAccountsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage all ledger accounts</p>
        </div>
        <Button onClick={() => setShowAccountDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Account
        </Button>
      </div>

      {/* Account Type Summary */}
      <div className="grid grid-cols-5 gap-4">
        {['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY'].map((type) => {
          const typeAccounts = groupedAccounts[type] || [];
          const total = typeAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
          return (
            <Card key={type} className={`cursor-pointer hover:shadow-md transition-all ${selectedAccountType === type ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedAccountType(selectedAccountType === type ? 'all' : type)}>
              <CardContent className="p-4 text-center">
                <Badge className={getAccountTypeColor(type)}>{type}</Badge>
                <p className="text-xl font-bold mt-2">{formatCurrency(Math.abs(total))}</p>
                <p className="text-xs text-muted-foreground">{typeAccounts.length} accounts</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedAccounts)
                  .filter(([type]) => selectedAccountType === 'all' || type === selectedAccountType)
                  .flatMap(([_, accounts]) => accounts.map((account) => (
                    <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedAccount(account); setShowAccountDetailDialog(true); }}>
                      <TableCell className="font-mono">{account.accountCode}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{account.accountName}</p>
                          {account.description && <p className="text-xs text-muted-foreground">{account.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge className={getAccountTypeColor(account.accountType)}>{account.accountType}</Badge></TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(account.currentBalance)}</span>
                      </TableCell>
                      <TableCell>
                        {account.isActive ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                        {account.isSystemAccount && <Badge variant="outline" className="ml-1">System</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLedgerAccount(account.id); fetchLedgerTransactions(account.id); setShowLedgerDetailDialog(true); }}>
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAccount(account); setShowAccountDetailDialog(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!account.isSystemAccount && (
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={(e) => { e.stopPropagation(); confirmDelete('account', account.id, account.accountName); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(ChartOfAccountsTabComponent);
