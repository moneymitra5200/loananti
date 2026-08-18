'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Loader2, Key, Mail, Save, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import OfflineLoanDetailPanel from '@/components/offline-loan/OfflineLoanDetailPanel';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserDetails: any;
  loadingUserDetails: boolean;
}

export default function UserDetailsDialog({
  open,
  onOpenChange,
  selectedUserDetails,
  loadingUserDetails,
}: UserDetailsDialogProps) {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [selectedOfflineLoanId, setSelectedOfflineLoanId] = useState<string | null>(null);
  const [showOfflineLoanPanel, setShowOfflineLoanPanel] = useState(false);

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-700',
      COMPANY: 'bg-blue-100 text-blue-700',
      AGENT: 'bg-cyan-100 text-cyan-700',
      STAFF: 'bg-orange-100 text-orange-700',
      CASHIER: 'bg-green-100 text-green-700',
      ACCOUNTANT: 'bg-teal-100 text-teal-700',
      CUSTOMER: 'bg-gray-100 text-gray-700',
    };
    return classes[role] || 'bg-gray-100 text-gray-700';
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch('/api/user/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUserDetails.id, 
          newPassword 
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'Password Updated', description: 'Password has been changed successfully' });
        setShowPasswordChange(false);
        setNewPassword('');
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update password', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update password', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({ title: 'Error', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedUserDetails.id, 
          email: newEmail 
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'Email Updated', description: 'Email has been changed successfully' });
        setShowEmailChange(false);
        setNewEmail('');
        // Update local state
        if (selectedUserDetails) {
          selectedUserDetails.email = newEmail;
        }
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update email', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update email', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            User Details - {selectedUserDetails?.name}
          </DialogTitle>
          <DialogDescription>
            Complete A to Z overview of user activity and information
          </DialogDescription>
        </DialogHeader>
        
        {loadingUserDetails ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : selectedUserDetails ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setNewEmail(selectedUserDetails.email || ''); setShowEmailChange(true); }}>
                      <Mail className="h-4 w-4 mr-1" />Change Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowPasswordChange(true)}>
                      <Key className="h-4 w-4 mr-1" />Change Password
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">{selectedUserDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium">{selectedUserDetails.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <Badge className={getRoleBadgeClass(selectedUserDetails.role)}>
                      {selectedUserDetails.role}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge className={selectedUserDetails.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {selectedUserDetails.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Company Credit</p>
                    <p className="text-sm font-medium text-emerald-600">₹{(selectedUserDetails.companyCredit || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Personal Credit</p>
                    <p className="text-sm font-medium text-amber-600">₹{(selectedUserDetails.personalCredit || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm font-medium">{formatDate(selectedUserDetails.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Login</p>
                    <p className="text-sm font-medium">{selectedUserDetails.lastLoginAt ? formatDate(selectedUserDetails.lastLoginAt) : 'Never'}</p>
                  </div>
                </div>
                
                {/* Codes */}
                {(selectedUserDetails.agentCode || selectedUserDetails.staffCode || selectedUserDetails.cashierCode || selectedUserDetails.accountantCode) && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {selectedUserDetails.agentCode && <Badge variant="outline">Agent: {selectedUserDetails.agentCode}</Badge>}
                    {selectedUserDetails.staffCode && <Badge variant="outline">Staff: {selectedUserDetails.staffCode}</Badge>}
                    {selectedUserDetails.cashierCode && <Badge variant="outline">Cashier: {selectedUserDetails.cashierCode}</Badge>}
                    {selectedUserDetails.accountantCode && <Badge variant="outline">Accountant: {selectedUserDetails.accountantCode}</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company/Agent Association */}
            {(selectedUserDetails.company || selectedUserDetails.agent) && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Association</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedUserDetails.company && (
                      <div>
                        <p className="text-xs text-gray-500">Company</p>
                        <p className="text-sm font-medium">{selectedUserDetails.company?.name || 'N/A'}</p>
                      </div>
                    )}
                    {selectedUserDetails.agent && (
                      <div>
                        <p className="text-xs text-gray-500">Agent</p>
                        <p className="text-sm font-medium">{selectedUserDetails.agent?.name || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Customer Personal & Financial Information */}
            {(selectedUserDetails.panNumber || selectedUserDetails.aadhaarNumber || selectedUserDetails.bankAccountNumber || selectedUserDetails.employmentType) && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">KYC & Banking Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedUserDetails.panNumber && (
                      <div>
                        <p className="text-xs text-gray-500">PAN Number</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedUserDetails.panNumber}</p>
                      </div>
                    )}
                    {selectedUserDetails.aadhaarNumber && (
                      <div>
                        <p className="text-xs text-gray-500">Aadhaar Number</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedUserDetails.aadhaarNumber}</p>
                      </div>
                    )}
                    {selectedUserDetails.dateOfBirth && (
                      <div>
                        <p className="text-xs text-gray-500">Date of Birth</p>
                        <p className="text-sm font-medium">{formatDate(selectedUserDetails.dateOfBirth)}</p>
                      </div>
                    )}
                    {selectedUserDetails.employmentType && (
                      <div>
                        <p className="text-xs text-gray-500">Employment Type</p>
                        <p className="text-sm font-medium">{selectedUserDetails.employmentType}</p>
                      </div>
                    )}
                    {selectedUserDetails.monthlyIncome > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Monthly Income</p>
                        <p className="text-sm font-medium text-emerald-600">{formatCurrency(selectedUserDetails.monthlyIncome)}</p>
                      </div>
                    )}
                    {selectedUserDetails.bankName && (
                      <div>
                        <p className="text-xs text-gray-500">Bank Name</p>
                        <p className="text-sm font-medium">{selectedUserDetails.bankName}</p>
                      </div>
                    )}
                    {selectedUserDetails.bankAccountNumber && (
                      <div>
                        <p className="text-xs text-gray-500">Account Number</p>
                        <p className="text-sm font-medium">{selectedUserDetails.bankAccountNumber}</p>
                      </div>
                    )}
                    {selectedUserDetails.bankIfsc && (
                      <div>
                        <p className="text-xs text-gray-500">IFSC Code</p>
                        <p className="text-sm font-medium">{selectedUserDetails.bankIfsc}</p>
                      </div>
                    )}
                    {selectedUserDetails.address && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm font-medium">{[selectedUserDetails.address, selectedUserDetails.city, selectedUserDetails.state, selectedUserDetails.pincode].filter(Boolean).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Financial Overview */}
            {selectedUserDetails.role === 'CUSTOMER' && selectedUserDetails.roleSpecificData && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">Total Loans</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {selectedUserDetails.roleSpecificData.totalLoans || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedUserDetails.roleSpecificData.onlineLoansCount || 0} Online | {selectedUserDetails.roleSpecificData.offlineLoansCount || 0} Offline
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">Total Borrowed / Disbursed</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {formatCurrency(selectedUserDetails.roleSpecificData.totalDisbursedAmount || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">Total Amount Paid</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {formatCurrency(selectedUserDetails.roleSpecificData.totalPaidAmount || 0)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedUserDetails.roleSpecificData.totalPaymentsCount || 0} Payments Made
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loans Table for Customer */}
            {selectedUserDetails.role === 'CUSTOMER' && (
              (selectedUserDetails.roleSpecificData?.loanApplications?.length > 0 || selectedUserDetails.roleSpecificData?.offlineLoans?.length > 0) ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer Loans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <th className="px-3 py-2">Loan # / App #</th>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Amount</th>
                              <th className="px-3 py-2">EMI</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {(selectedUserDetails.roleSpecificData.loanApplications || []).map((loan: any) => (
                              <tr key={loan.id}>
                                <td className="px-3 py-2 font-semibold text-emerald-700">{loan.applicationNo}</td>
                                <td className="px-3 py-2"><Badge className="bg-blue-100 text-blue-700">ONLINE</Badge></td>
                                <td className="px-3 py-2 font-medium">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount || 0)}</td>
                                <td className="px-3 py-2">{loan.sessionForm?.emiAmount ? formatCurrency(loan.sessionForm.emiAmount) : 'N/A'}</td>
                                <td className="px-3 py-2"><Badge variant="outline">{loan.status}</Badge></td>
                                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(loan.createdAt)}</td>
                              </tr>
                            ))}
                            {(selectedUserDetails.roleSpecificData.offlineLoans || []).map((loan: any) => (
                              <tr 
                                key={loan.id} 
                                className="hover:bg-purple-50/60 cursor-pointer transition-colors"
                                onClick={() => {
                                  setSelectedOfflineLoanId(loan.id);
                                  setShowOfflineLoanPanel(true);
                                }}
                              >
                                <td className="px-3 py-2 font-semibold text-purple-700 flex items-center gap-1.5">
                                  {loan.loanNumber}
                                  <span className="text-[10px] text-purple-600 font-normal underline">view →</span>
                                </td>
                                <td className="px-3 py-2"><Badge className="bg-purple-100 text-purple-700">OFFLINE</Badge></td>
                                <td className="px-3 py-2 font-medium">{formatCurrency(loan.loanAmount || 0)}</td>
                                <td className="px-3 py-2">{loan.emiAmount ? formatCurrency(loan.emiAmount) : 'N/A'}</td>
                                <td className="px-3 py-2"><Badge variant="outline">{loan.status}</Badge></td>
                                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(loan.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null
            )}

            {/* Payments History Table for Customer */}
            {selectedUserDetails.role === 'CUSTOMER' && selectedUserDetails.roleSpecificData?.paymentRecords?.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="px-3 py-2">Receipt #</th>
                          <th className="px-3 py-2">Loan #</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Mode</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedUserDetails.roleSpecificData.paymentRecords.map((payment: any) => (
                          <tr key={payment.id}>
                            <td className="px-3 py-2 font-mono text-xs text-gray-700">{payment.receiptNumber || payment.id.slice(-6)}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{payment.loanApplication?.applicationNo || 'N/A'}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-600">{formatCurrency(payment.amount)}</td>
                            <td className="px-3 py-2"><Badge variant="outline">{payment.paymentMode || 'CASH'}</Badge></td>
                            <td className="px-3 py-2"><Badge className="bg-green-100 text-green-700">{payment.status}</Badge></td>
                            <td className="px-3 py-2 text-xs text-gray-500">{formatDate(payment.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Recent Activity */}
            {selectedUserDetails.recentActivity?.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedUserDetails.recentActivity.map((activity: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                        <Badge variant="outline" className="text-xs">{activity.module || activity.action}</Badge>
                        <span className="flex-1 truncate">{activity.description || activity.action}</span>
                        <span className="text-xs text-gray-400">{formatDate(activity.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Change Password Dialog */}
            {showPasswordChange && (
              <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-600" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>New Password</Label>
                    <Input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowPasswordChange(false); setNewPassword(''); }}>
                      <X className="h-4 w-4 mr-1" />Cancel
                    </Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={handleChangePassword} disabled={updating}>
                      {updating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : <><Save className="h-4 w-4 mr-1" />Update Password</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Change Email Dialog */}
            {showEmailChange && (
              <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Change Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Email</Label>
                    <Input value={selectedUserDetails.email} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>New Email</Label>
                    <Input 
                      type="email" 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowEmailChange(false); setNewEmail(''); }}>
                      <X className="h-4 w-4 mr-1" />Cancel
                    </Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={handleChangeEmail} disabled={updating}>
                      {updating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : <><Save className="h-4 w-4 mr-1" />Update Email</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
      {showOfflineLoanPanel && selectedOfflineLoanId && (
        <OfflineLoanDetailPanel
          loanId={selectedOfflineLoanId}
          open={showOfflineLoanPanel}
          onClose={() => {
            setShowOfflineLoanPanel(false);
            setSelectedOfflineLoanId(null);
          }}
        />
      )}
    </Dialog>
  );
}
