'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User, Briefcase, Banknote, Calculator, Shield } from 'lucide-react';

interface UserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  companyId: string;
  agentId: string;
}

interface Agent {
  id: string;
  name: string;
  agentCode?: string;
}

interface UserDialogsProps {
  showUserDialog: boolean;
  setShowUserDialog: (show: boolean) => void;
  userForm: UserForm;
  setUserForm: (form: UserForm) => void;
  savingUser: boolean;
  handleCreateUser: () => void;
  agents: Agent[];
}

export default function UserDialogs({
  showUserDialog,
  setShowUserDialog,
  userForm,
  setUserForm,
  savingUser,
  handleCreateUser,
  agents,
}: UserDialogsProps) {
  return (
    <>
      {/* Company Creation Dialog */}
      <Dialog open={showUserDialog && userForm.role === 'COMPANY'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-blue-600" />
              Create Company Account
            </DialogTitle>
            <DialogDescription>Create a new company. A company profile will be auto-generated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Company Name *</Label>
              <Input placeholder="Enter company name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address *</Label>
              <Input type="email" placeholder="company@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number</Label>
              <Input placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating...' : 'Create Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Creation Dialog */}
      <Dialog open={showUserDialog && userForm.role === 'AGENT'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-cyan-600" />
              Create Agent Account
            </DialogTitle>
            <DialogDescription>
              Create a new agent who can manage loan applications. Agents are common for all companies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name *</Label>
              <Input placeholder="Agent name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address *</Label>
              <Input type="email" placeholder="agent@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number</Label>
              <Input placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            </div>
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <p className="text-sm text-cyan-700">
                <strong>Note:</strong> Agents in this system are common for all companies. They can work with any company's loans.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Creation Dialog */}
      <Dialog open={showUserDialog && userForm.role === 'STAFF'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Briefcase className="h-6 w-6 text-purple-600" />
              Create Staff Account
            </DialogTitle>
            <DialogDescription>Create a staff member who will collect loan forms from customers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name *</Label>
              <Input placeholder="Staff name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address *</Label>
              <Input type="email" placeholder="staff@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number *</Label>
              <Input placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assign to Agent *</Label>
              <Select value={userForm.agentId} onValueChange={(v) => setUserForm({ ...userForm, agentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.agentCode})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button className="bg-purple-500 hover:bg-purple-600" onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating...' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cashier Creation Dialog - Ecosystem Wide */}
      <Dialog open={showUserDialog && userForm.role === 'CASHIER'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Banknote className="h-6 w-6 text-orange-600" />
              Create Cashier Account
            </DialogTitle>
            <DialogDescription>
              Create an ecosystem-wide cashier who can handle payment collections across all companies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Ecosystem-Wide Access</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                This cashier will have access to handle payments from ALL companies in the system.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name *</Label>
              <Input placeholder="Cashier name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address *</Label>
              <Input type="email" placeholder="cashier@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number *</Label>
              <Input placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating...' : 'Create Cashier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accountant Creation Dialog - Ecosystem Wide */}
      <Dialog open={showUserDialog && userForm.role === 'ACCOUNTANT'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-6 w-6 text-teal-600" />
              Create Accountant Account
            </DialogTitle>
            <DialogDescription>
              Create an ecosystem-wide accountant who can manage financial records across all companies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center gap-2 text-teal-700">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Ecosystem-Wide Access</span>
              </div>
              <p className="text-xs text-teal-600 mt-1">
                This accountant will have access to financial data from ALL companies in the system.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name *</Label>
              <Input placeholder="Accountant name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address *</Label>
              <Input type="email" placeholder="accountant@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number *</Label>
              <Input placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button className="bg-teal-500 hover:bg-teal-600" onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating...' : 'Create Accountant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
