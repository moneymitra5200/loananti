'use client';

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Users, Building2, User, UserPlus, Eye, EyeOff, Trash2, Edit, Shield, AlertTriangle, Search, X, KeyRound, Copy, Lock, Unlock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isLocked?: boolean;
  createdAt: string;
  phone?: string;
  company?: string | { id: string; name: string };
  companyId?: string;
  agent?: { id: string; name: string; agentCode?: string };
  agentId?: string;
  agentCode?: string;
  staffCode?: string;
  cashierCode?: string;
  accountantCode?: string;
  companyCredit?: number;
  personalCredit?: number;
}

interface Props {
  users: UserItem[];
  userRoleFilter: string;
  setUserRoleFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddUser: () => void;
  onViewUserDetails: (userId: string) => void;
  onEditUser: (user: UserItem) => void;
  onUnlockUser: (userId: string) => void;
  onDeleteUser: (user: UserItem) => void;
}

// Simple edit dialog component
function EditUserDialog({
  user,
  open,
  onClose,
  onSave
}: {
  user: UserItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; phone: string; password: string }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Populate form whenever user changes
  useEffect(() => {
    if (user && open) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPassword('');
      setCurrentPassword('');
      setShowPassword(false);
      // Fetch current password for display
      fetch(`/api/user/${user.id}?includePassword=true`)
        .then(r => r.json())
        .then(d => { if (d.user?.plainPassword) setCurrentPassword(d.user.plainPassword); })
        .catch(() => {});
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Error', description: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body: any = { name, phone, password: password || undefined };
      if (email && email !== user?.email) body.email = email;
      const response = await fetch(`/api/user/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'Success', description: 'User updated successfully' });
        onClose();
        onSave({ name, email, phone, password });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Edit {user.role === 'COMPANY' ? 'Company' : 'User'}
          </DialogTitle>
          <DialogDescription>
            Update details for {user.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className={isSuperAdmin ? 'border-purple-300 bg-purple-50' : ''}
            />
            {isSuperAdmin && <p className="text-xs text-purple-600">⚠️ This is the Super Admin's email — change with care</p>}
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone" />
          </div>

          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Leave blank to keep current password</p>
            {currentPassword && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <KeyRound className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700 font-mono">{showPassword ? currentPassword : '••••••••'}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(currentPassword); toast({ title: 'Copied!', description: 'Password copied to clipboard' }); }}
                  className="ml-auto text-amber-600 hover:text-amber-700"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-600"><strong>Role:</strong> {user.role}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersSection({
  users,
  userRoleFilter,
  setUserRoleFilter,
  searchQuery,
  setSearchQuery,
  onAddUser,
  onViewUserDetails,
  onEditUser,
  onUnlockUser,
  onDeleteUser
}: Props) {
  // Permanent super admin emails - these accounts are hidden
  const PERMANENT_ADMIN_EMAILS = ['moneymitra@gmail.com'];
  
  // Local edit dialog state
  const [editDialogUser, setEditDialogUser] = useState<UserItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Filter out hidden permanent super admins (none by default now — SA is shown but protected)
  const visibleUsers = users; // Show all including SUPER_ADMIN
  const nonCustomerUsers = visibleUsers.filter(u => u.role !== 'CUSTOMER');
  
  // Apply role filter
  const filteredByRole = userRoleFilter === 'all' 
    ? nonCustomerUsers 
    : nonCustomerUsers.filter(u => u.role === userRoleFilter);
  
  // Apply search filter
  const filteredUsers = filteredByRole.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone && u.phone.includes(searchQuery))
  );

  // Count by role
  const counts = {
    total: nonCustomerUsers.length,
    companies: visibleUsers.filter(u => u.role === 'COMPANY').length,
    agents: visibleUsers.filter(u => u.role === 'AGENT').length,
    staff: visibleUsers.filter(u => u.role === 'STAFF').length,
    cashiers: visibleUsers.filter(u => u.role === 'CASHIER').length,
    accountants: visibleUsers.filter(u => u.role === 'ACCOUNTANT').length,
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700';
      case 'COMPANY': return 'bg-blue-100 text-blue-700';
      case 'AGENT': return 'bg-cyan-100 text-cyan-700';
      case 'STAFF': return 'bg-orange-100 text-orange-700';
      case 'CASHIER': return 'bg-green-100 text-green-700';
      case 'ACCOUNTANT': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEditClick = (user: UserItem) => {
    setEditDialogUser(user);
    setShowEditDialog(true);
  };

  const handleEditSave = () => {
    setShowEditDialog(false);
    setEditDialogUser(null);
    // Trigger parent refresh
    onEditUser(editDialogUser!);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Companies</p>
            <p className="text-xl font-bold text-blue-600">{counts.companies}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-cyan-500">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Agents</p>
            <p className="text-xl font-bold text-cyan-600">{counts.agents}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Staff</p>
            <p className="text-xl font-bold text-orange-600">{counts.staff}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Cashiers</p>
            <p className="text-xl font-bold text-green-600">{counts.cashiers}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-teal-500">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Accountants</p>
            <p className="text-xl font-bold text-teal-600">{counts.accountants}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              User Management
            </CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CASHIER">Cashier</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-48 pl-9" 
                />
                {searchQuery && (
                  <X 
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No users found</p>
              <p className="text-sm text-gray-400">Try a different filter or add a new user</p>
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={onAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />Add User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Associated With</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`font-semibold ${
                              u.role === 'COMPANY' ? 'bg-blue-100 text-blue-700' :
                              u.role === 'AGENT' ? 'bg-cyan-100 text-cyan-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {u.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            {(u.agentCode || u.staffCode || u.cashierCode || u.accountantCode) && (
                              <p className="text-xs text-gray-500">
                                {u.agentCode || u.staffCode || u.cashierCode || u.accountantCode}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.email}</p>
                        {u.phone && <p className="text-xs text-gray-500">{u.phone}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeStyle(u.role)}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.company ? (
                          <p className="text-sm">{typeof u.company === 'object' ? u.company.name : u.company}</p>
                        ) : u.agent ? (
                          <p className="text-sm text-gray-500">Agent: {u.agent.name}</p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {u.isLocked && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Locked
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewUserDetails(u.id)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-blue-50"
                            onClick={() => handleEditClick(u)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          {u.isLocked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-orange-50"
                              onClick={() => onUnlockUser(u.id)}
                              title="Unlock"
                            >
                              <Shield className="h-4 w-4 text-orange-600" />
                            </Button>
                          )}
                          {/* Super Admin: no delete, show protected badge */}
                          {u.role === 'SUPER_ADMIN' ? (
                            <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                              <Shield className="h-3 w-3" /> Protected
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-red-50"
                              onClick={() => onDeleteUser(u)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditUserDialog
        user={editDialogUser}
        open={showEditDialog}
        onClose={() => { setShowEditDialog(false); setEditDialogUser(null); }}
        onSave={handleEditSave}
      />
    </div>
  );
}

export default memo(UsersSection);
