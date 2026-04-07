'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Trash2 } from 'lucide-react';
import type { UserItem } from '../types';

interface UsersTabProps {
  users: UserItem[];
  companies: UserItem[];
  agents: UserItem[];
  staff: UserItem[];
  cashiers: UserItem[];
  accountants: UserItem[];
  customers: UserItem[];
  userRoleFilter: string;
  setUserRoleFilter: (filter: string) => void;
  setShowRoleSelectDialog: (show: boolean) => void;
  setSelectedUser: (user: UserItem | null) => void;
  setShowDeleteConfirmDialog: (show: boolean) => void;
  handleUnlockUser: (id: string) => void;
}

export default function UsersTab({
  users,
  companies,
  agents,
  staff,
  cashiers,
  accountants,
  customers,
  userRoleFilter,
  setUserRoleFilter,
  setShowRoleSelectDialog,
  setSelectedUser,
  setShowDeleteConfirmDialog,
  handleUnlockUser
}: UsersTabProps) {
  const filteredUsers = userRoleFilter === 'all' ? users : users.filter(u => u.role === userRoleFilter);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'COMPANY': return 'bg-blue-100 text-blue-700';
      case 'AGENT': return 'bg-cyan-100 text-cyan-700';
      case 'STAFF': return 'bg-purple-100 text-purple-700';
      case 'CASHIER': return 'bg-orange-100 text-orange-700';
      case 'ACCOUNTANT': return 'bg-teal-100 text-teal-700';
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleAvatarColor = (role: string) => {
    switch (role) {
      case 'COMPANY': return 'bg-blue-100 text-blue-700';
      case 'AGENT': return 'bg-cyan-100 text-cyan-700';
      case 'STAFF': return 'bg-purple-100 text-purple-700';
      case 'CASHIER': return 'bg-orange-100 text-orange-700';
      case 'ACCOUNTANT': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Filter:</span>
          <Button size="sm" variant={userRoleFilter === 'all' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('all')}>
            All ({users.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'COMPANY' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('COMPANY')}>
            Companies ({companies.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'AGENT' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('AGENT')}>
            Agents ({agents.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'STAFF' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('STAFF')}>
            Staff ({staff.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'CASHIER' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('CASHIER')}>
            Cashiers ({cashiers.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'ACCOUNTANT' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('ACCOUNTANT')}>
            Accountants ({accountants.length})
          </Button>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowRoleSelectDialog(true)}>
          <UserPlus className="h-4 w-4 mr-1" />Create User
        </Button>
      </div>

      <Card className="bg-white shadow-sm border-0">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={getRoleAvatarColor(u.role)}>
                          {u.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{u.name}</p>
                          <Badge variant="outline">{u.role}</Badge>
                          {!u.isActive && <Badge className="bg-red-100 text-red-700">Inactive</Badge>}
                          {u.isLocked && <Badge className="bg-amber-100 text-amber-700">Locked</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {u.company && <p className="text-xs text-gray-400">{typeof u.company === 'string' ? u.company : u.company.name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {u.isLocked && (
                        <Button size="sm" variant="outline" className="text-amber-600" onClick={() => handleUnlockUser(u.id)}>
                          Unlock
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { setSelectedUser(u); setShowDeleteConfirmDialog(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
