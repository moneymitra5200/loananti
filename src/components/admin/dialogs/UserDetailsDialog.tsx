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
            
            {/* Role-Specific Stats */}
            {selectedUserDetails.roleSpecificData && Object.keys(selectedUserDetails.roleSpecificData).length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Role-Specific Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(selectedUserDetails.roleSpecificData).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {typeof value === 'number' ? value.toLocaleString() : 
                           Array.isArray(value) ? value.length : 
                           String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Activity Counts */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{selectedUserDetails._count?.loanApplications || 0}</p>
                    <p className="text-xs text-gray-500">Loan Applications</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{selectedUserDetails._count?.disbursedLoans || 0}</p>
                    <p className="text-xs text-gray-500">Disbursed Loans</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{selectedUserDetails._count?.payments || 0}</p>
                    <p className="text-xs text-gray-500">Payments</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{selectedUserDetails._count?.auditLogs || 0}</p>
                    <p className="text-xs text-gray-500">Audit Logs</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{selectedUserDetails._count?.notifications || 0}</p>
                    <p className="text-xs text-gray-500">Notifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
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
    </Dialog>
  );
}
