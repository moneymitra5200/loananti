'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Briefcase, Banknote, Calculator, Shield, Upload, X, Image as ImageIcon, RefreshCw, BookOpen, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface UserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  companyId: string;
  agentId: string;
  // Extended company fields
  code?: string;
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
  isMirrorCompany?: boolean;
  mirrorInterestRate?: number;
  mirrorInterestType?: string;
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
      {/* Company Creation Dialog - Comprehensive */}
      <Dialog open={showUserDialog && userForm.role === 'COMPANY'} onOpenChange={(open) => !open && setShowUserDialog(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-blue-600" />
              Create Company Account
            </DialogTitle>
            <DialogDescription>Create a new company with complete profile details</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="mirror">Mirror Settings</TabsTrigger>
              <TabsTrigger value="accounting">Accounting</TabsTrigger>
            </TabsList>
            
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 py-4">
              {/* Logo Upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {logoPreview || userForm.logoUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img 
                        src={logoPreview || userForm.logoUrl} 
                        alt="Company Logo" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      {uploadingLogo ? (
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                          <span className="text-xs text-gray-400 mt-1">Logo</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-medium">Company Logo</p>
                  <p className="text-sm text-gray-500">Upload a logo for your company (max 5MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Name *</Label>
                  <Input placeholder="Enter company name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Code</Label>
                  <Input placeholder="Auto-generated if empty" value={userForm.code || ''} onChange={(e) => setUserForm({ ...userForm, code: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email Address *</Label>
                  <Input type="email" placeholder="company@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone Number *</Label>
                  <Input placeholder="+91 9876543210" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Password *</Label>
                <Input type="password" placeholder="Min 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Website</Label>
                  <Input placeholder="https://company.com" value={userForm.website || ''} onChange={(e) => setUserForm({ ...userForm, website: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">GST Number</Label>
                  <Input placeholder="22AAAAA0000A1Z5" value={userForm.gstNumber || ''} onChange={(e) => setUserForm({ ...userForm, gstNumber: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">PAN Number</Label>
                  <Input placeholder="AAAAA0000A" value={userForm.panNumber || ''} onChange={(e) => setUserForm({ ...userForm, panNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Default Interest Rate (%)</Label>
                  <Input type="number" placeholder="12" value={userForm.defaultInterestRate || ''} onChange={(e) => setUserForm({ ...userForm, defaultInterestRate: parseFloat(e.target.value) })} />
                </div>
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 py-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Owner/Director Details:</strong> These details will be used for company verification and communications.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Address</Label>
                <Input placeholder="Full address" value={userForm.address || ''} onChange={(e) => setUserForm({ ...userForm, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">City</Label>
                  <Input placeholder="City" value={userForm.city || ''} onChange={(e) => setUserForm({ ...userForm, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">State</Label>
                  <Input placeholder="State" value={userForm.state || ''} onChange={(e) => setUserForm({ ...userForm, state: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pincode</Label>
                  <Input placeholder="Pincode" value={userForm.pincode || ''} onChange={(e) => setUserForm({ ...userForm, pincode: e.target.value })} />
                </div>
              </div>

              <hr className="my-4" />
              
              <h4 className="font-semibold text-gray-700">Owner/Director Information</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Owner Name</Label>
                  <Input placeholder="Full name" value={userForm.ownerName || ''} onChange={(e) => setUserForm({ ...userForm, ownerName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Owner Phone</Label>
                  <Input placeholder="+91 9876543210" value={userForm.ownerPhone || ''} onChange={(e) => setUserForm({ ...userForm, ownerPhone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Owner Email</Label>
                  <Input type="email" placeholder="owner@example.com" value={userForm.ownerEmail || ''} onChange={(e) => setUserForm({ ...userForm, ownerEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Owner PAN</Label>
                  <Input placeholder="AAAAA0000A" value={userForm.ownerPan || ''} onChange={(e) => setUserForm({ ...userForm, ownerPan: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Owner Aadhaar</Label>
                <Input placeholder="1234 5678 9012" value={userForm.ownerAadhaar || ''} onChange={(e) => setUserForm({ ...userForm, ownerAadhaar: e.target.value })} />
              </div>
            </TabsContent>

            {/* Mirror Settings Tab */}
            <TabsContent value="mirror" className="space-y-4 py-4">
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4" />
                  Mirror Company Settings
                </h4>
                <p className="text-sm text-purple-700">
                  Mirror companies receive loan data from the original company (Company 3). 
                  They charge a different interest rate to earn profit from the spread.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Is this a Mirror Company?</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Mirror companies (Company 1 & 2) receive mirrored loans from Company 3
                  </p>
                </div>
                <Switch
                  checked={userForm.isMirrorCompany !== false}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, isMirrorCompany: checked })}
                />
              </div>

              {userForm.isMirrorCompany !== false ? (
                <div className="space-y-4 border rounded-lg p-4 bg-emerald-50">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <RefreshCw className="h-4 w-4" />
                    <span className="font-medium">Mirror Company Configuration</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Mirror Interest Rate (%) *</Label>
                      <Input 
                        type="number" 
                        placeholder="15" 
                        value={userForm.mirrorInterestRate || ''} 
                        onChange={(e) => setUserForm({ ...userForm, mirrorInterestRate: parseFloat(e.target.value) })} 
                      />
                      <p className="text-xs text-gray-500">This rate will be permanent for all mirror loans</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Interest Type</Label>
                      <Select 
                        value={userForm.mirrorInterestType || 'REDUCING'} 
                        onValueChange={(v) => setUserForm({ ...userForm, mirrorInterestType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                          <SelectItem value="FLAT">Flat Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">
                      <strong>Example:</strong> If original loan is 24% FLAT and mirror rate is 15% REDUCING,
                      the mirror company earns from the interest spread.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">Original Company (Company 3)</span>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-600">
                      This company will be the <strong>Original Lender</strong> that creates loans for customers.
                      Mirror companies will receive a copy of these loans with their own interest rates.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      Customer-Facing
                    </Badge>
                    <Badge className="bg-green-100 text-green-700">
                      Uses Original Rates
                    </Badge>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Accounting Tab */}
            <TabsContent value="accounting" className="space-y-4 py-4">
              <div className="bg-teal-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-teal-800 flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  Accounting Type
                </h4>
                <p className="text-sm text-teal-700">
                  Choose the accounting system for this company. This determines what features are available.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Accounting Option */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    userForm.accountingType !== 'CASHBOOK_ONLY' 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setUserForm({ ...userForm, accountingType: 'FULL' })}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      userForm.accountingType !== 'CASHBOOK_ONLY' ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {userForm.accountingType !== 'CASHBOOK_ONLY' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold">Full Accounting</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Complete double-entry accounting system with:
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>✓ Chart of Accounts</li>
                        <li>✓ Journal Entries</li>
                        <li>✓ Trial Balance</li>
                        <li>✓ Balance Sheet</li>
                        <li>✓ Profit & Loss Statement</li>
                        <li>✓ Bank Accounts</li>
                        <li>✓ Cash Book & Day Book</li>
                      </ul>
                      <Badge className="mt-3 bg-emerald-100 text-emerald-700">
                        Recommended for Mirror Companies
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Cashbook Only Option */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    userForm.accountingType === 'CASHBOOK_ONLY' 
                      ? 'border-amber-500 bg-amber-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setUserForm({ ...userForm, accountingType: 'CASHBOOK_ONLY' })}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      userForm.accountingType === 'CASHBOOK_ONLY' ? 'border-amber-500' : 'border-gray-300'
                    }`}>
                      {userForm.accountingType === 'CASHBOOK_ONLY' && (
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold">Cashbook & Daybook Only</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Simple accounting for cash-based operations:
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>✓ Cash Book</li>
                        <li>✓ Day Book</li>
                        <li>✗ No Chart of Accounts</li>
                        <li>✗ No Journal Entries</li>
                        <li>✗ No Trial Balance</li>
                        <li>✗ No Bank Accounts</li>
                      </ul>
                      <Badge className="mt-3 bg-amber-100 text-amber-700">
                        Good for Original Company (C3)
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Interest Type */}
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium">Default Interest Type</Label>
                <Select 
                  value={userForm.defaultInterestType || 'FLAT'} 
                  onValueChange={(v) => setUserForm({ ...userForm, defaultInterestType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAT">Flat Rate</SelectItem>
                    <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  This will be the default interest calculation method for loans from this company
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
