'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, CreditCard, User, QrCode, Banknote, Link2, Calendar, Eye, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface SecondaryPaymentPage {
  id: string;
  name: string;
  description?: string;
  upiId?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ifscCode?: string;
  roleId?: string;
  roleType?: string;
  isActive: boolean;
  createdAt: string;
  role?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface PaymentPageAssignment {
  id: string;
  emiScheduleId: string;
  loanApplicationId: string;
  secondaryPaymentPageId: string;
  useDefaultCompanyPage: boolean;
  updatedAt: string;
  secondaryPaymentPage: {
    id: string;
    name: string;
    description: string | null;
    role?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
  emiSchedule: {
    id: string;
    installmentNumber: number;
    dueDate: string;
    totalAmount: number;
    paymentStatus: string;
    loanApplication: {
      id: string;
      applicationNo: string;
      customer: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      company?: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
  modifiedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

interface SecondaryPaymentPageSectionProps {
  userId: string;
  companyId?: string;
  companies?: { id: string; name: string }[];
  isSuperAdmin?: boolean;
}

const SecondaryPaymentPageSection = memo(function SecondaryPaymentPageSection({
  userId,
  isSuperAdmin = false
}: SecondaryPaymentPageSectionProps) {
  const [pages, setPages] = useState<SecondaryPaymentPage[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<SecondaryPaymentPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Assignment tracking state
  const [assignments, setAssignments] = useState<PaymentPageAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pages');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    upiId: '',
    qrCodeUrl: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    ifscCode: '',
    roleId: '',
    roleType: ''
  });

  // Fetch all payment pages (common for all companies)
  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/emi-payment-settings?action=secondary-pages');
      const data = await response.json();
      if (data.success) {
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Failed to fetch payment pages');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (data.users) {
        const collectableRoles = ['CASHIER', 'STAFF', 'AGENT', 'ACCOUNTANT'];
        setUsers(data.users.filter((u: UserItem) => collectableRoles.includes(u.role) && u.isActive));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const response = await fetch('/api/emi-payment-settings?action=secondary-page-assignments');
      const data = await response.json();
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPages();
    if (isSuperAdmin) {
      fetchAssignments();
    }
  }, [fetchUsers, fetchPages, fetchAssignments, isSuperAdmin]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      upiId: '',
      qrCodeUrl: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      ifscCode: '',
      roleId: '',
      roleType: ''
    });
    setEditingPage(null);
  };

  const handleOpenDialog = (page?: SecondaryPaymentPage) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        name: page.name,
        description: page.description || '',
        upiId: page.upiId || '',
        qrCodeUrl: page.qrCodeUrl || '',
        bankName: page.bankName || '',
        accountNumber: page.accountNumber || '',
        accountName: page.accountName || '',
        ifscCode: page.ifscCode || '',
        roleId: page.roleId || '',
        roleType: page.roleType || ''
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    resetForm();
  };

  const handleRoleChange = (roleId: string) => {
    const selectedUser = users.find(u => u.id === roleId);
    setFormData(prev => ({
      ...prev,
      roleId,
      roleType: selectedUser?.role || ''
    }));
  };

  const handleQrCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG, JPG, WEBP, and GIF images are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB.');
      return;
    }

    setUploadingQr(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload/qr-code', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await response.json();

      if (data.success && data.url) {
        setFormData(prev => ({ ...prev, qrCodeUrl: data.url }));
        toast.success('QR code uploaded successfully');
      } else {
        throw new Error(data.error || 'Failed to upload QR code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload QR code image');
    } finally {
      setUploadingQr(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveQrCode = () => {
    setFormData(prev => ({ ...prev, qrCodeUrl: '' }));
  };

  const handleSave = async () => {
    // Only name is required
    if (!formData.name || !formData.name.trim()) {
      toast.error('Please enter a page name');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/emi-payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdById: userId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingPage ? 'Payment page updated' : 'Payment page created');
        handleCloseDialog();
        fetchPages();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Failed to save payment page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this payment page?')) return;

    try {
      const response = await fetch(`/api/emi-payment-settings?pageId=${pageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Payment page deleted');
        fetchPages();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete payment page');
    }
  };

  const getRoleBadgeColor = (roleType: string) => {
    switch (roleType) {
      case 'CASHIER': return 'bg-emerald-100 text-emerald-700';
      case 'STAFF': return 'bg-blue-100 text-blue-700';
      case 'AGENT': return 'bg-purple-100 text-purple-700';
      case 'ACCOUNTANT': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      PENDING: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      PAID: { className: 'bg-green-100 text-green-700', label: 'Paid' },
      PARTIALLY_PAID: { className: 'bg-blue-100 text-blue-700', label: 'Partial' },
      OVERDUE: { className: 'bg-red-100 text-red-700', label: 'Overdue' },
      INTEREST_ONLY_PAID: { className: 'bg-purple-100 text-purple-700', label: 'Interest Paid' },
    };
    const c = statusConfig[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };


  // Render for SuperAdmin with tabs
  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pages">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Pages
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Link2 className="h-4 w-4 mr-2" />
              Page Assignments
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pages" className="mt-4">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                      Secondary Payment Pages
                    </CardTitle>
                    <CardDescription>
                      Create payment pages for collection points. These pages are common for all companies. EMI payments via these pages will credit the selected role&apos;s personal credit.
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDialog()} className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="h-4 w-4 mr-2" /> Add Page
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : pages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No payment pages created yet</p>
                    <p className="text-sm">Create a payment page to enable collection points</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>QR Code</TableHead>
                          <TableHead>Bank Details</TableHead>
                          <TableHead>UPI ID</TableHead>
                          <TableHead>Role (Personal Credit)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pages.map((page) => (
                          <TableRow key={page.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{page.name}</p>
                                {page.description && (
                                  <p className="text-xs text-gray-500">{page.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {page.qrCodeUrl ? (
                                <img 
                                  src={page.qrCodeUrl} 
                                  alt="QR Code" 
                                  className="w-12 h-12 rounded border object-cover"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {page.bankName ? (
                                <div className="text-sm">
                                  <p className="font-medium">{page.bankName}</p>
                                  <p className="text-gray-500">{page.accountNumber}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {page.upiId ? (
                                <span className="text-sm">{page.upiId}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {page.role ? (
                                <div className="flex items-center gap-2">
                                  <Badge className={getRoleBadgeColor(page.roleType || '')}>
                                    {page.role.name}
                                  </Badge>
                                  <span className="text-xs text-gray-500">({page.role.role})</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">No role assigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={page.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {page.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(page)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(page.id)}>
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
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-4">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-emerald-600" />
                      Secondary Payment Page Assignments
                    </CardTitle>
                    <CardDescription>
                      Track where secondary payment pages are assigned to EMIs. Shows which EMI uses which payment page.
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={fetchAssignments} disabled={loadingAssignments}>
                    {loadingAssignments ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment page assignments found</p>
                    <p className="text-sm mt-2">When EMIs are assigned to secondary payment pages, they will appear here</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Page</TableHead>
                          <TableHead>Loan Application</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>EMI #</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned By</TableHead>
                          <TableHead>Assigned Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{assignment.secondaryPaymentPage?.name}</p>
                                {assignment.secondaryPaymentPage?.role && (
                                  <p className="text-xs text-muted-foreground">
                                    Credit to: {assignment.secondaryPaymentPage.role.name}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-mono text-sm">{assignment.emiSchedule?.loanApplication?.applicationNo}</p>
                                {assignment.emiSchedule?.loanApplication?.company && (
                                  <p className="text-xs text-muted-foreground">
                                    {assignment.emiSchedule.loanApplication.company.name}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{assignment.emiSchedule?.loanApplication?.customer?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.emiSchedule?.loanApplication?.customer?.phone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">EMI #{assignment.emiSchedule?.installmentNumber}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(assignment.emiSchedule?.dueDate)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(assignment.emiSchedule?.totalAmount)}
                            </TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(assignment.emiSchedule?.paymentStatus)}
                            </TableCell>
                            <TableCell>
                              {assignment.modifiedBy ? (
                                <div>
                                  <p className="text-sm">{assignment.modifiedBy.name}</p>
                                  <p className="text-xs text-muted-foreground">{assignment.modifiedBy.role}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{formatDate(assignment.updatedAt)}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? 'Edit Payment Page' : 'Create Payment Page'}</DialogTitle>
              <DialogDescription>
                Payment details shown to customers. This page will be common for all companies. Select a role to credit their personal credit when payments are made.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Page Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Collection Point A"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3"><User className="h-4 w-4" /> Role Assignment (Personal Credit)</h4>
                <div className="grid gap-2">
                  <Label>Select Role/User</Label>
                  <Select value={formData.roleId} onValueChange={handleRoleChange}>
                    <SelectTrigger><SelectValue placeholder="Select user for personal credit" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">When EMI payment is made via this page, the selected user&apos;s personal credit will increase.</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3"><QrCode className="h-4 w-4" /> UPI Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>UPI ID</Label>
                    <Input value={formData.upiId} onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))} placeholder="name@upi" />
                  </div>
                  <div className="grid gap-2">
                    <Label>QR Code Image</Label>
                    <div className="flex items-center gap-2">
                      <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleQrCodeUpload} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingQr} className="w-full">
                        {uploadingQr ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {uploadingQr ? 'Uploading...' : 'Upload QR'}
                      </Button>
                    </div>
                  </div>
                </div>
                {formData.qrCodeUrl && (
                  <div className="mt-3 relative inline-block">
                    <img src={formData.qrCodeUrl} alt="QR Code Preview" className="w-32 h-32 rounded-lg border object-cover" />
                    <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0" onClick={handleRemoveQrCode}><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3"><Banknote className="h-4 w-4" /> Bank Account Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Bank Name</Label><Input value={formData.bankName} onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))} placeholder="State Bank of India" /></div>
                  <div className="grid gap-2"><Label>Account Number</Label><Input value={formData.accountNumber} onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))} placeholder="1234567890" /></div>
                  <div className="grid gap-2"><Label>Account Holder Name</Label><Input value={formData.accountName} onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))} placeholder="John Doe" /></div>
                  <div className="grid gap-2"><Label>IFSC Code</Label><Input value={formData.ifscCode} onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))} placeholder="SBIN0001234" /></div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                {saving ? 'Saving...' : (editingPage ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Regular view for non-SuperAdmin
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Secondary Payment Pages
            </CardTitle>
            <CardDescription>
              Create payment pages for collection points. EMI payments via these pages will credit the selected role&apos;s personal credit.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="h-4 w-4 mr-2" /> Add Page
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No payment pages created yet</p>
            <p className="text-sm">Create a payment page to enable collection points</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>UPI ID</TableHead>
                  <TableHead>Role (Personal Credit)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{page.name}</p>
                        {page.description && (
                          <p className="text-xs text-gray-500">{page.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {page.qrCodeUrl ? (
                        <img 
                          src={page.qrCodeUrl} 
                          alt="QR Code" 
                          className="w-12 h-12 rounded border object-cover"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {page.bankName ? (
                        <div className="text-sm">
                          <p className="font-medium">{page.bankName}</p>
                          <p className="text-gray-500">{page.accountNumber}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {page.upiId ? (
                        <span className="text-sm">{page.upiId}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {page.role ? (
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(page.roleType || '')}>
                            {page.role.name}
                          </Badge>
                          <span className="text-xs text-gray-500">({page.role.role})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No role assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={page.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {page.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(page)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(page.id)}>
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

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? 'Edit Payment Page' : 'Create Payment Page'}</DialogTitle>
              <DialogDescription>
                Payment details shown to customers. Select a role to credit their personal credit when payments are made.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Page Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Collection Point A" autoFocus />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description" />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3"><User className="h-4 w-4" /> Role Assignment (Personal Credit)</h4>
                <div className="grid gap-2">
                  <Label>Select Role/User</Label>
                  <Select value={formData.roleId} onValueChange={handleRoleChange}>
                    <SelectTrigger><SelectValue placeholder="Select user for personal credit" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">When EMI payment is made via this page, the selected user&apos;s personal credit will increase.</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3"><QrCode className="h-4 w-4" /> UPI Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>UPI ID</Label><Input value={formData.upiId} onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))} placeholder="name@upi" /></div>
                  <div className="grid gap-2">
                    <Label>QR Code Image</Label>
                    <div className="flex items-center gap-2">
                      <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleQrCodeUpload} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingQr} className="w-full">
                        {uploadingQr ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {uploadingQr ? 'Uploading...' : 'Upload QR'}
                      </Button>
                    </div>
                  </div>
                </div>
                {formData.qrCodeUrl && (
                  <div className="mt-3 relative inline-block">
                    <img src={formData.qrCodeUrl} alt="QR Code Preview" className="w-32 h-32 rounded-lg border object-cover" />
                    <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0" onClick={handleRemoveQrCode}><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3"><Banknote className="h-4 w-4" /> Bank Account Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Bank Name</Label><Input value={formData.bankName} onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))} placeholder="State Bank of India" /></div>
                  <div className="grid gap-2"><Label>Account Number</Label><Input value={formData.accountNumber} onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))} placeholder="1234567890" /></div>
                  <div className="grid gap-2"><Label>Account Holder Name</Label><Input value={formData.accountName} onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))} placeholder="John Doe" /></div>
                  <div className="grid gap-2"><Label>IFSC Code</Label><Input value={formData.ifscCode} onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))} placeholder="SBIN0001234" /></div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                {saving ? 'Saving...' : (editingPage ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});

export default SecondaryPaymentPageSection;
