'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Briefcase, Banknote, Calculator, Shield, Upload, X, Image as ImageIcon, RefreshCw, BookOpen, Wallet, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  companyId: string;
  agentId: string;
  // Extended company fields - SIMPLIFIED for company creation
  code?: string;
  isMirrorCompany?: boolean;
  // Optional profile fields (can be filled later)
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  panNumber?: string;
  website?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerPan?: string;
  ownerAadhaar?: string;
  logoUrl?: string;
  accountingType?: string;
  defaultInterestRate?: number;
  defaultInterestType?: string;
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
  setUserForm: React.Dispatch<React.SetStateAction<UserForm>>;
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUserForm({ ...userForm, logoUrl: data.url });
        toast.success('Logo uploaded successfully');
      } else {
        toast.error('Failed to upload logo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setUserForm({ ...userForm, logoUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Company Creation Dialog - SIMPLIFIED */}
      <Dialog open={showUserDialog && userForm.role === 'COMPANY'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-blue-600" />
              Create Company Account
            </DialogTitle>
            <DialogDescription>Create a new company - interest rate is set per loan, not per company</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Name *</Label>
                <Input placeholder="Enter company name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Code</Label>
                <Input placeholder="e.g., C1, C2, C3 (auto-generated if empty)" value={userForm.code || ''} onChange={(e) => setUserForm({ ...userForm, code: e.target.value })} />
                <p className="text-xs text-gray-500">Use C1, C2 for mirror companies, C3 for original company</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Address *</Label>
                <Input type="email" placeholder="company@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Password *</Label>
                <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
            </div>

            {/* Mirror Company Toggle */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-600" />
                    Is this a Mirror Company?
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Mirror companies can receive mirrored loans from other companies
                  </p>
                </div>
                <Switch
                  checked={userForm.isMirrorCompany === true}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, isMirrorCompany: checked })}
                />
              </div>
              
              {userForm.isMirrorCompany ? (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Mirror Company</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    Interest rate will be set when creating/mirroring each loan
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Original Company</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    This company will create loans for customers directly
                  </p>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Interest rate for mirror loans is set <strong>per loan</strong> when creating or mirroring, 
                not fixed per company. This gives you flexibility to use different rates for different loans.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
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
