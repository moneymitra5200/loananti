'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Landmark, Plus, Eye, Building2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currentBalance: number;
  isDefault: boolean;
  ifscCode?: string;
  companyId?: string;
  company?: { id: string; name: string; code: string; };
}

interface BankAccountsSectionProps {
  bankAccounts: BankAccount[];
  onAdd: () => void;
  onView: (account: BankAccount) => void;
}

function BankAccountsSectionComponent({ bankAccounts, onAdd, onView }: BankAccountsSectionProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />Bank Accounts
            </CardTitle>
            <CardDescription>Company bank accounts and balances</CardDescription>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {bankAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Landmark className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No bank accounts found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{account.bankName}</span>
                  <div className="flex items-center gap-1">
                    {account.isDefault && <Badge className="bg-blue-500 text-xs">Default</Badge>}
                    {account.company && (
                      <Badge variant="outline" className="text-xs">{account.company.code}</Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">{account.accountNumber}</p>
                {account.ifscCode && <p className="text-xs text-gray-400 mb-2">IFSC: {account.ifscCode}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(account.currentBalance)}</p>
                  <Button size="sm" variant="ghost" onClick={() => onView(account)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(BankAccountsSectionComponent);
