'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Landmark, Upload, QrCode, CreditCard, Plus, Edit, Trash2, 
  IndianRupee, ArrowUpRight, ArrowDownRight, Calendar, FileText, Image as ImageIcon,
  Loader2, AlertCircle, CheckCircle, Eye, Download
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ownerName?: string;
  branchName?: string;
  ifscCode?: string;
  accountType: string;
  currentBalance: number;
  upiId?: string;
  qrCodeUrl?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  transactions?: BankTransaction[];
}

interface BankTransaction {
  id: string;
  transactionType: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  createdById: string;
}

interface BankHeadSectionProps {
  companyId: string;
  companyName: string;
  companyCode: string;
}

export default function BankHeadSection({ companyId, companyName, companyCode }: BankHeadSectionProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    ownerName: '',
    branchName: '',
    ifscCode: '',
    accountType: 'CURRENT',
    openingBalance: 0,
    upiId: '',
    qrCodeUrl: '',
    isDefault: false
  });

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, [companyId]);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accountant/bank-accounts?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.bankAccounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (bank?: BankAccount) => {
    if (bank) {
      setEditMode(true);
      setFormData({
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
        ownerName: bank.ownerName || '',
        branchName: bank.branchName || '',
        ifscCode: bank.ifscCode || '',
        accountType: bank.accountType || 'CURRENT',
        openingBalance: 0,
        upiId: bank.upiId || '',
        qrCodeUrl: bank.qrCodeUrl || '',
        isDefault: bank.isDefault
      });
      setSelectedBank(bank);
    } else {
      setEditMode(false);
      setFormData({
        bankName: '',
        accountNumber: '',
        accountName: '',
        ownerName: '',
        branchName: '',
        ifscCode: '',
        accountType: 'CURRENT',
        openingBalance: 0,
        upiId: '',
        qrCodeUrl: '',
        isDefault: false
      });
      setSelectedBank(null);
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.bankName || !formData.accountNumber || !formData.accountName) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editMode 
        ? `/api/accountant/bank-accounts/${selectedBank?.id}`
        : '/api/accountant/bank-accounts';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const body = editMode 
        ? { ...formData, companyId }
        : { ...formData, companyId, openingBalance: formData.openingBalance };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ 
          title: 'Success', 
          description: editMode ? 'Bank account updated successfully' : 'Bank account created successfully' 
        });
        setShowDialog(false);
        fetchBankAccounts();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to save bank account', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save bank account', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleQrCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' });
      return;
    }

    setUploadingQr(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'qr-code');

      const res = await fetch('/api/upload/document', {
        method: 'POST',
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, qrCodeUrl: data.url }));
        toast({ title: 'Success', description: 'QR Code uploaded successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to upload QR Code', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload QR Code', variant: 'destructive' });
    } finally {
      setUploadingQr(false);
    }
  };

  const viewTransactions = async (bank: BankAccount) => {
    try {
      const res = await fetch(`/api/accountant/bank-accounts/${bank.id}/transactions`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBank({ ...bank, transactions: data.transactions || [] });
        setShowTransactionDialog(true);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch transactions', variant: 'destructive' });
    }
  };

  const totalBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-blue-600" />
            Bank Head - {companyName}
          </h2>
          <p className="text-muted-foreground">Manage bank accounts and view transaction history</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Bank Account
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Bank Accounts</p>
              <p className="text-3xl font-bold text-blue-600">{bankAccounts.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="text-3xl font-bold text-emerald-600">{bankAccounts.filter(b => b.isActive).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : bankAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bank accounts found</p>
            <Button onClick={() => handleOpenDialog()} className="mt-4" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Add First Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((bank) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`cursor-pointer hover:shadow-lg transition-all ${bank.isDefault ? 'border-2 border-blue-500' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {bank.bankName}
                    </CardTitle>
                    {bank.isDefault && (
                      <Badge className="bg-blue-100 text-blue-700">Default</Badge>
                    )}
                  </div>
                  <CardDescription>
                    A/C: {bank.accountNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Owner Name */}
                    {bank.ownerName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Owner:</span>
                        <span className="font-medium">{bank.ownerName}</span>
                      </div>
                    )}
                    
                    {/* UPI ID */}
                    {bank.upiId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">UPI ID:</span>
                        <span className="font-medium text-blue-600">{bank.upiId}</span>
                      </div>
                    )}

                    {/* Current Balance */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Balance:</span>
                      <span className={`font-bold ${bank.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(bank.currentBalance)}
                      </span>
                    </div>

                    {/* QR Code Preview */}
                    {bank.qrCodeUrl && (
                      <div className="mt-2">
                        <img 
                          src={bank.qrCodeUrl} 
                          alt="QR Code" 
                          className="w-20 h-20 rounded border object-cover"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => viewTransactions(bank)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Transactions
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenDialog(bank)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Bank Account Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              {editMode ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>
              Fill in the bank account details. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Basic Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name *</Label>
                  <Input 
                    value={formData.bankName} 
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g., HDFC Bank"
                  />
                </div>
                <div>
                  <Label>Account Number *</Label>
                  <Input 
                    value={formData.accountNumber} 
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <Label>Account Name *</Label>
                  <Input 
                    value={formData.accountName} 
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <Label>Owner Name</Label>
                  <Input 
                    value={formData.ownerName} 
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Bank account owner's name"
                  />
                </div>
                <div>
                  <Label>Branch Name</Label>
                  <Input 
                    value={formData.branchName} 
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="Branch name"
                  />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input 
                    value={formData.ifscCode} 
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="IFSC Code"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label>Account Type</Label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  >
                    <option value="CURRENT">Current</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="OD">Overdraft</option>
                  </select>
                </div>
                {!editMode && (
                  <div>
                    <Label>Opening Balance</Label>
                    <Input 
                      type="number"
                      value={formData.openingBalance} 
                      onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Payment Display Settings</h4>
              <p className="text-sm text-gray-500">These details will be shown to customers when they pay EMI</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>UPI ID</Label>
                  <Input 
                    value={formData.upiId} 
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g., company@upi"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customer will see this UPI ID to make payments</p>
                </div>
                
                <div className="col-span-2">
                  <Label>QR Code Image</Label>
                  <div className="flex items-center gap-4">
                    {formData.qrCodeUrl && (
                      <img 
                        src={formData.qrCodeUrl} 
                        alt="QR Code" 
                        className="w-24 h-24 rounded border object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleQrCodeUpload}
                        disabled={uploadingQr}
                      />
                      {uploadingQr && (
                        <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload QR code image for customer payments</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Default Setting */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isDefault" 
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isDefault">Set as default bank account for this company</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editMode ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Transaction History - {selectedBank?.bankName}
            </DialogTitle>
            <DialogDescription>
              All transactions for account: {selectedBank?.accountNumber}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedBank?.transactions && selectedBank.transactions.length > 0 ? (
              <div className="space-y-2">
                {selectedBank.transactions.map((txn) => (
                  <div 
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        txn.transactionType === 'CREDIT' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {txn.transactionType === 'CREDIT' 
                          ? <ArrowDownRight className="h-4 w-4 text-green-600" />
                          : <ArrowUpRight className="h-4 w-4 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(txn.createdAt)} • {txn.referenceType}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        txn.transactionType === 'CREDIT' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {txn.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {formatCurrency(txn.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No transactions found</p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
