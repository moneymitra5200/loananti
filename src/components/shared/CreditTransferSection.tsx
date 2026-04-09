'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, Wallet, Landmark, Building2, Users, Loader2, 
  IndianRupee, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface CreditTransferSectionProps {
  userId: string;
  userRole: string;
  companyId?: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
  myCash: number;
  companyCredit: number;
  bankAccounts: {
    id: string;
    bankName: string;
    accountNumber: string;
    currentBalance: number;
    isDefault: boolean;
  }[];
}

interface User {
  id: string;
  name: string;
  role: string;
  companyCredit: number;
  personalCredit: number;
  credit: number;
}

export default function CreditTransferSection({ userId, userRole, companyId }: CreditTransferSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Dialog states
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  
  // Form states
  const [transferType, setTransferType] = useState<'user' | 'bank' | 'cash'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [creditType, setCreditType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [remarks, setRemarks] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch companies
      const companiesRes = await fetch('/api/credit-transfer');
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies || []);
      }

      // Fetch current user data
      const userRes = await fetch(`/api/credit-transfer?userId=${userId}`);
      if (userRes.ok) {
        const data = await userRes.json();
        setCurrentUser(data.user);
      }

      // Fetch all users for transfer (if super admin)
      if (userRole === 'SUPER_ADMIN') {
        const usersRes = await fetch('/api/user/list?role=AGENT,CASHIER,STAFF');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userId, userRole]);

  const handleTransfer = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let response;
      
      if (transferType === 'user' && selectedUserId) {
        response = await fetch('/api/credit-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user-to-user',
            fromUserId: userId,
            toUserId: selectedUserId,
            amount: amountNum,
            creditType,
            paymentMode,
            proofUrl,
            remarks
          })
        });
      } else if (transferType === 'bank' && selectedBankId) {
        response = await fetch('/api/credit-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user-to-bank',
            fromUserId: userId,
            bankAccountId: selectedBankId,
            amount: amountNum,
            creditType,
            paymentMode,
            proofUrl,
            remarks
          })
        });
      } else if (transferType === 'cash' && selectedCompanyId) {
        response = await fetch('/api/credit-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user-to-cash',
            fromUserId: userId,
            companyId: selectedCompanyId,
            amount: amountNum,
            creditType,
            paymentMode,
            proofUrl,
            remarks
          })
        });
      }

      if (response && response.ok) {
        const data = await response.json();
        toast({ title: 'Success', description: data.message });
        setShowTransferDialog(false);
        resetForm();
        fetchAllData();
      } else {
        const error = await response?.json();
        toast({ title: 'Error', description: error?.error || 'Transfer failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process transfer', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCash = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || !selectedCompanyId) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/credit-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-cash',
          companyId: selectedCompanyId,
          amount: amountNum,
          remarks,
          createdBy: userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: 'Success', description: data.message });
        setShowCashDialog(false);
        resetForm();
        fetchAllData();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add cash', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddToBank = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || !selectedBankId) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/credit-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-to-bank',
          bankAccountId: selectedBankId,
          amount: amountNum,
          remarks,
          createdBy: userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: 'Success', description: data.message });
        setShowBankDialog(false);
        resetForm();
        fetchAllData();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add to bank', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedUserId('');
    setSelectedCompanyId('');
    setSelectedBankId('');
    setCreditType('PERSONAL');
    setPaymentMode('CASH');
    setRemarks('');
    setProofUrl('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const company3 = companies.find(c => c.code.includes('3'));
  const otherCompanies = companies.filter(c => !c.code.includes('3'));

  return (
    <div className="space-y-6">
      {/* Current User Credit Summary */}
      {currentUser && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Your Credit Balance</h3>
                <p className="text-sm text-gray-500">Total credit across all sources</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAllData}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-xs text-gray-500">Personal Credit</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(currentUser.personalCredit)}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-xs text-gray-500">Company Credit</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(currentUser.companyCredit)}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-xs text-gray-500">Total Credit</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(currentUser.credit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Send Credit */}
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setShowTransferDialog(true)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">Send Credit</h4>
                <p className="text-sm text-gray-500">Transfer to user, bank or company cash</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Cash to Company 3 */}
        {(userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT') && company3 && (
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => { setSelectedCompanyId(company3.id); setShowCashDialog(true); }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Add to My Cash</h4>
                  <p className="text-sm text-gray-500">Company 3: {formatCurrency(company3.myCash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add to Bank */}
        {(userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT') && (
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setShowBankDialog(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Add to Bank</h4>
                  <p className="text-sm text-gray-500">Deposit funds to bank account</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Company Cash & Bank Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company 3 - My Cash */}
        {company3 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-600" />
                {company3.name} - My Cash
              </CardTitle>
              <CardDescription>Cash balance (no bank account)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-green-600">{formatCurrency(company3.myCash)}</p>
                <p className="text-sm text-gray-500 mt-2">Available Cash</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Companies Bank Accounts */}
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              Company Bank Accounts
            </CardTitle>
            <CardDescription>Bank balances for operational companies</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {otherCompanies.map(company => (
                  <div key={company.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{company.name}</span>
                    </div>
                    {company.bankAccounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium">{account.bankName}</p>
                          <p className="text-xs text-gray-500">{account.accountNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{formatCurrency(account.currentBalance)}</p>
                          {account.isDefault && <Badge className="text-xs">Default</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Credit</DialogTitle>
            <DialogDescription>Transfer your credit to another user, bank, or company cash</DialogDescription>
          </DialogHeader>
          
          <Tabs value={transferType} onValueChange={(v) => setTransferType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="user">To User</TabsTrigger>
              <TabsTrigger value="bank">To Bank</TabsTrigger>
              <TabsTrigger value="cash">To Cash</TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="space-y-4">
              <div>
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user to transfer" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.id !== userId).map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          <Badge variant="outline">{user.role}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              <div>
                <Label>Select Bank Account</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherCompanies.flatMap(company => 
                      company.bankAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <span>{account.bankName}</span>
                            <span className="text-xs text-gray-500">({company.name})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="cash" className="space-y-4">
              <div>
                <Label>Select Company</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{company.name}</span>
                          <span className="text-xs text-gray-500">Cash: {formatCurrency(company.myCash)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 pt-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Credit Type</Label>
              <Select value={creditType} onValueChange={(v) => setCreditType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">Personal Credit</SelectItem>
                  <SelectItem value="COMPANY">Company Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Remarks</Label>
              <Input 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Cash Dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cash to Company</DialogTitle>
            <DialogDescription>Add cash directly to company's My Cash balance</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Remarks</Label>
              <Input 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Source of cash (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCash} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Banknote className="h-4 w-4 mr-2" />}
              Add Cash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Bank Dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funds to Bank Account</DialogTitle>
            <DialogDescription>Deposit funds to company's bank account</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Bank Account</Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {companies.flatMap(company => 
                    company.bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.bankName}</span>
                          <span className="text-xs text-gray-500">({company.name})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Remarks</Label>
              <Input 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Source of funds (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankDialog(false)}>Cancel</Button>
            <Button onClick={handleAddToBank} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Landmark className="h-4 w-4 mr-2" />}
              Add to Bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
