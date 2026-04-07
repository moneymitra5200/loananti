'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import type { BalanceSheet } from '../types';

interface BalanceSheetSectionProps {
  balanceSheet: BalanceSheet | null;
  onExport: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function BalanceSheetSection({ balanceSheet, onExport }: BalanceSheetSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Balance Sheet</h2>
        <Button onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">ASSETS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {balanceSheet?.assets?.map((asset, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{asset.accountName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(asset.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-green-50 font-bold">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(balanceSheet?.totalAssets || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">LIABILITIES & EQUITY</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {balanceSheet?.liabilities?.length > 0 ? (
                  balanceSheet.liabilities.map((liab, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{liab.accountName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liab.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">No liabilities</TableCell>
                    <TableCell className="text-right">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-red-50 font-semibold">
                  <TableCell>Total Liabilities</TableCell>
                  <TableCell className="text-right text-red-700">
                    {formatCurrency(balanceSheet?.totalLiabilities || 0)}
                  </TableCell>
                </TableRow>
                
                {balanceSheet?.equity?.map((eq, idx) => (
                  <TableRow key={`equity-${idx}`}>
                    <TableCell className="font-medium">{eq.accountName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(eq.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-50 font-semibold">
                  <TableCell>Total Equity</TableCell>
                  <TableCell className="text-right text-blue-700">
                    {formatCurrency(balanceSheet?.totalEquity || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
