'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2, User, ClipboardCheck, UserPlus, Eye, Shield, Trash2 } from 'lucide-react';

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
  companyUsers: UserItem[];
  agents: UserItem[];
  staff: UserItem[];
  cashiers: UserItem[];
  accountants: UserItem[];
  userRoleFilter: string;
  setUserRoleFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddUser: () => void;
  onViewUserDetails: (userId: string) => void;
  onUnlockUser: (userId: string) => void;
  onDeleteUser: (user: UserItem) => void;
}

function UsersSection({
  users,
  companyUsers,
  agents,
  staff,
  cashiers,
  accountants,
  userRoleFilter,
  setUserRoleFilter,
  searchQuery,
  setSearchQuery,
  onAddUser,
  onViewUserDetails,
  onUnlockUser,
  onDeleteUser
}: Props) {
  // Permanent super admin emails - these accounts are hidden from user management
  const PERMANENT_ADMIN_EMAILS = ['moneymitra@gmail.com'];
  
  // Filter out permanent super admins from all displays
  const visibleUsers = users.filter(u => !PERMANENT_ADMIN_EMAILS.includes(u.email));
  const nonCustomerUsers = visibleUsers.filter(u => u.role !== 'CUSTOMER');
  const filteredByRole = userRoleFilter === 'all' ? nonCustomerUsers : nonCustomerUsers.filter(u => u.role === userRoleFilter);
  const filteredBySearch = filteredByRole.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Row - using visibleUsers to hide permanent admin from counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{visibleUsers.length}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Companies</p>
                <p className="text-2xl font-bold text-blue-600">{companyUsers.filter(u => !PERMANENT_ADMIN_EMAILS.includes(u.email)).length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Agents</p>
                <p className="text-2xl font-bold text-cyan-600">{agents.filter(u => !PERMANENT_ADMIN_EMAILS.includes(u.email)).length}</p>
              </div>
              <div className="p-2 bg-cyan-50 rounded-lg">
                <User className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Staff & Others</p>
                <p className="text-2xl font-bold text-violet-600">{staff.filter(u => !PERMANENT_ADMIN_EMAILS.includes(u.email)).length + cashiers.filter(u => !PERMANENT_ADMIN_EMAILS.includes(u.email)).length + accountants.filter(u => !PERMANENT_ADMIN_EMAILS.includes(u.email)).length}</p>
              </div>
              <div className="p-2 bg-violet-50 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-violet-600" />
              </div>
            </div>
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
            <div className="flex gap-2 flex-wrap">
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CASHIER">Cashier</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48" />
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBySearch.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No users found</p>
              <p className="text-sm text-gray-400">Create a user to get started</p>
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={onAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />Add First User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company/Agent</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBySearch.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">{u.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <div className="flex gap-2">
                              {u.agentCode && <Badge variant="outline" className="text-xs">{u.agentCode}</Badge>}
                              {u.staffCode && <Badge variant="outline" className="text-xs">{u.staffCode}</Badge>}
                              {u.cashierCode && <Badge variant="outline" className="text-xs">{u.cashierCode}</Badge>}
                              {u.accountantCode && <Badge variant="outline" className="text-xs">{u.accountantCode}</Badge>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{u.email}</p>
                          {u.phone && <p className="text-xs text-gray-500">{u.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'COMPANY' ? 'bg-blue-100 text-blue-700' :
                          u.role === 'AGENT' ? 'bg-cyan-100 text-cyan-700' :
                          u.role === 'STAFF' ? 'bg-orange-100 text-orange-700' :
                          u.role === 'CASHIER' ? 'bg-green-100 text-green-700' :
                          u.role === 'ACCOUNTANT' ? 'bg-teal-100 text-teal-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.company && typeof u.company === 'object' && <p className="text-sm">{u.company.name}</p>}
                        {u.company && typeof u.company === 'string' && <p className="text-sm">{u.company}</p>}
                        {u.agent && <p className="text-sm text-gray-500">{u.agent.name}</p>}
                        {!u.company && !u.agent && <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-emerald-600">Co: ₹{(u.companyCredit || 0).toLocaleString()}</p>
                          <p className="text-amber-600">Pr: ₹{(u.personalCredit || 0).toLocaleString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {u.isLocked && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">Locked</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => onViewUserDetails(u.id)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {u.isLocked && (
                            <Button size="sm" variant="outline" className="text-orange-600 hover:bg-orange-50" onClick={() => onUnlockUser(u.id)} title="Unlock">
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onDeleteUser(u)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}

export default memo(UsersSection);
