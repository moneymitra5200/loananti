'use client';

import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Edit, Trash2, CheckCircle, XCircle, Shield, Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface UserItem {
  id: string; name: string; email: string; role: string; isActive: boolean; isLocked?: boolean; createdAt: string;
  phone?: string; company?: string | { id: string; name: string }; companyId?: string;
  agentId?: string; agent?: { id: string; name: string; agentCode: string };
}

interface CompanyItem {
  id: string; name: string; code: string; isActive: boolean;
}

interface UserManagementSectionProps {
  users: UserItem[];
  companies: CompanyItem[];
  agents: UserItem[];
  onRefresh: () => void;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY: 'Company Admin',
  AGENT: 'Agent',
  STAFF: 'Staff',
  CASHIER: 'Cashier',
  ACCOUNTANT: 'Accountant',
  CUSTOMER: 'Customer',
};

function UserManagementSectionComponent({ users, companies, agents, onRefresh }: UserManagementSectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'COMPANY', companyId: '', agentId: ''
  });

  const openDialog = useCallback((user?: UserItem) => {
    if (user) {
      setSelectedUser(user);
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: user.role || 'COMPANY',
        companyId: typeof user.company === 'string' ? user.companyId || '' : user.company?.id || user.companyId || '',
        agentId: user.agentId || '',
      });
    } else {
      setSelectedUser(null);
      setForm({ name: '', email: '', phone: '', password: '', role: 'COMPANY', companyId: '', agentId: '' });
    }
    setShowDialog(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name || !form.email || (!selectedUser && !form.password)) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = selectedUser ? `/api/user/${selectedUser.id}` : '/api/user';
      const method = selectedUser ? 'PUT' : 'POST';
      const body = selectedUser 
        ? { ...form, password: form.password || undefined }
        : form;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({ title: 'Success', description: `User ${selectedUser ? 'updated' : 'created'} successfully` });
        setShowDialog(false);
        onRefresh();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save user', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [form, selectedUser, onRefresh]);

  const handleToggleStatus = useCallback(async (user: UserItem) => {
    try {
      const response = await fetch(`/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: `User ${!user.isActive ? 'activated' : 'deactivated'}` });
        onRefresh();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  }, [onRefresh]);

  return (
    <>
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />User Management
              </CardTitle>
              <CardDescription>Manage system users and their roles</CardDescription>
            </div>
            <Button className="bg-purple-500 hover:bg-purple-600" onClick={() => openDialog()}>
              <UserPlus className="h-4 w-4 mr-2" />Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {typeof user.company === 'string' ? user.company : user.company?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className={user.isActive ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Update user details' : 'Create a new system user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>{selectedUser ? 'Password (leave blank to keep)' : 'Password *'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Company Admin</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CASHIER">Cashier</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.role === 'COMPANY' || form.role === 'AGENT' || form.role === 'STAFF' || form.role === 'CASHIER' || form.role === 'ACCOUNTANT') && (
              <div>
                <Label>Company</Label>
                <Select value={form.companyId} onValueChange={(v) => setForm({ ...form, companyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.role === 'STAFF' || form.role === 'CASHIER') && (
              <div>
                <Label>Agent</Label>
                <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {selectedUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(UserManagementSectionComponent);
