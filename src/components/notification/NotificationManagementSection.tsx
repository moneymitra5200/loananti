'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell, Send, FileText, Users, Settings, Plus, Edit, Trash2, Eye, 
  RefreshCw, Loader2, Check, AlertCircle, Clock, CreditCard, Wallet,
  Search, Filter, ChevronDown, ChevronUp, Info, Save, X, User as UserIcon
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== TYPES ====================
interface Template {
  id: string;
  code: string;
  name: string;
  category: string;
  title: string;
  message: string;
  variables: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
}

interface RecipientCount {
  totalUsers: number;
  customers: number;
  agents: number;
  staff: number;
  companies: number;
  cashiers: number;
  customersWithActiveLoans: number;
  customersWithOverdueEMI: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

// ==================== SEND NOTIFICATION TAB ====================
function SendNotificationTab() {
  const [sendType, setSendType] = useState<'individual' | 'role' | 'segment'>('role');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [actionUrl, setActionUrl] = useState('');
  const [actionText, setActionText] = useState('');
  const [selectedRole, setSelectedRole] = useState('CUSTOMER');
  const [selectedSegment, setSelectedSegment] = useState('ACTIVE_LOANS');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [counts, setCounts] = useState<RecipientCount | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentResult, setSentResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    if (sendType === 'individual') {
      fetchUsersByRole(selectedRole);
    }
  }, [sendType, selectedRole]);

  const fetchCounts = async () => {
    try {
      const response = await fetch('/api/notification?action=recipient-counts');
      const data = await response.json();
      if (data.success) {
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchUsersByRole = async (role: string) => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/notification?action=users-by-role&role=${role}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Error', description: 'Title and message are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setSentResult(null);

    try {
      let endpoint = '/api/notification';
      let body: any = { title, message, priority, actionUrl, actionText };

      if (sendType === 'role') {
        body = { ...body, action: 'send-to-role', role: selectedRole };
      } else if (sendType === 'segment') {
        body = { ...body, action: 'send-to-segment', segment: selectedSegment };
      } else {
        if (selectedUsers.length === 0) {
          toast({ title: 'Error', description: 'Please select at least one user', variant: 'destructive' });
          setLoading(false);
          return;
        }
        body = { ...body, action: 'send-to-users', userIds: selectedUsers };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setSentResult({ sent: data.sentCount, total: data.totalUsers });
        toast({ 
          title: 'Success', 
          description: `Notification sent to ${data.sentCount} users` 
        });
        // Reset form
        setTitle('');
        setMessage('');
        setSelectedUsers([]);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to send notification', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({ title: 'Error', description: 'Failed to send notification', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getRecipientCount = () => {
    if (!counts) return 0;
    switch (sendType) {
      case 'role':
        switch (selectedRole) {
          case 'CUSTOMER': return counts.customers;
          case 'AGENT': return counts.agents;
          case 'STAFF': return counts.staff;
          case 'COMPANY': return counts.companies;
          case 'CASHIER': return counts.cashiers;
          default: return 0;
        }
      case 'segment':
        switch (selectedSegment) {
          case 'ACTIVE_LOANS': return counts.customersWithActiveLoans;
          case 'OVERDUE_EMI': return counts.customersWithOverdueEMI;
          default: return 0;
        }
      case 'individual':
        return selectedUsers.length;
      default:
        return 0;
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Send Type Selection */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'role', label: 'By Role', icon: Users, desc: 'Send to all users with a specific role' },
          { key: 'segment', label: 'By Segment', icon: Filter, desc: 'Send to users matching conditions' },
          { key: 'individual', label: 'Individual', icon: UserIcon, desc: 'Send to specific selected users' },
        ].map(type => (
          <Card
            key={type.key}
            className={`cursor-pointer transition-all ${
              sendType === type.key 
                ? 'border-emerald-500 bg-emerald-50' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => setSendType(type.key as any)}
          >
            <CardContent className="p-4 text-center">
              <type.icon className={`h-8 w-8 mx-auto mb-2 ${sendType === type.key ? 'text-emerald-600' : 'text-gray-400'}`} />
              <h4 className="font-medium">{type.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recipient Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select Recipients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sendType === 'role' && (
            <div className="space-y-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">All Customers ({counts?.customers || 0})</SelectItem>
                  <SelectItem value="AGENT">All Agents ({counts?.agents || 0})</SelectItem>
                  <SelectItem value="STAFF">All Staff ({counts?.staff || 0})</SelectItem>
                  <SelectItem value="COMPANY">All Companies ({counts?.companies || 0})</SelectItem>
                  <SelectItem value="CASHIER">All Cashiers ({counts?.cashiers || 0})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sendType === 'segment' && (
            <div className="space-y-4">
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE_LOANS">
                    Customers with Active Loans ({counts?.customersWithActiveLoans || 0})
                  </SelectItem>
                  <SelectItem value="OVERDUE_EMI">
                    Customers with Overdue EMIs ({counts?.customersWithOverdueEMI || 0})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sendType === 'individual' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={(role) => {
                  setSelectedRole(role);
                  setSelectedUsers([]);
                  fetchUsersByRole(role);
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customers</SelectItem>
                    <SelectItem value="AGENT">Agents</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="COMPANY">Companies</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id) 
                            ? 'bg-emerald-100' 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setSelectedUsers(prev => 
                            prev.includes(user.id)
                              ? prev.filter(id => id !== user.id)
                              : [...prev, user.id]
                          );
                        }}
                      >
                        <div className={`w-4 h-4 rounded border ${
                          selectedUsers.includes(user.id)
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedUsers.includes(user.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        {user.phone && (
                          <span className="text-xs text-gray-400">{user.phone}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Check className="h-4 w-4" />
                  {selectedUsers.length} user(s) selected
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notification Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              placeholder="Notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Message *</Label>
            <Textarea
              placeholder="Write your notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Action Text</Label>
              <Input
                placeholder="e.g., View Details"
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Action URL (optional)</Label>
            <Input
              placeholder="/path/to/page"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-gray-500 mt-1">URL to navigate when user clicks the notification</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Send */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready to send to</p>
              <p className="text-2xl font-bold text-emerald-600">
                {getRecipientCount().toLocaleString()} recipients
              </p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={handleSend}
              disabled={loading || !title.trim() || !message.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </div>

          {sentResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-white rounded-lg border border-emerald-200"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <Check className="h-4 w-4" />
                <span className="font-medium">
                  Successfully sent to {sentResult.sent} of {sentResult.total} users
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TEMPLATES TAB ====================
function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; template: Template | null }>({
    open: false,
    template: null,
  });
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'SYSTEM',
    title: '',
    message: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notification?action=templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditDialog({ open: true, template });
    setForm({
      code: template.code,
      name: template.name,
      category: template.category,
      title: template.title,
      message: template.message,
    });
  };

  const handleSave = async () => {
    if (!editDialog.template) return;
    setSaving(true);
    try {
      const response = await fetch('/api/notification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-template',
          id: editDialog.template.id,
          ...form,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Template updated successfully' });
        setEditDialog({ open: false, template: null });
        fetchTemplates();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch('/api/notification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-template',
          id: template.id,
          isActive: !template.isActive,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(prev => 
          prev.map(t => t.id === template.id ? { ...t, isActive: !t.isActive } : t)
        );
        toast({ 
          title: 'Success', 
          description: `Template ${!template.isActive ? 'enabled' : 'disabled'}` 
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' });
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      EMI: 'bg-orange-100 text-orange-700',
      LOAN: 'bg-blue-100 text-blue-700',
      PAYMENT: 'bg-green-100 text-green-700',
      CREDIT: 'bg-purple-100 text-purple-700',
      SYSTEM: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors.SYSTEM;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Notification Templates</h3>
          <p className="text-sm text-gray-500">Manage pre-defined notification templates</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTemplates()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(template => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{template.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadge(template.category)}>
                      {template.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{template.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleActive(template)}
                        disabled={template.isSystem}
                      />
                      {template.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, template: null })}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the notification template content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className="mt-1.5"
                  disabled
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={form.category} 
                  onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMI">EMI</SelectItem>
                    <SelectItem value="LOAN">Loan</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Template Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{variable_name}}'} for dynamic values
              </p>
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                rows={5}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, template: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== SETTINGS TAB ====================
function NotificationSettingsTab() {
  const [settings, setSettings] = useState({
    enableEMIReminders: true,
    emiReminderDays: 3,
    enableOverdueAlerts: true,
    enablePaymentConfirmation: true,
    enableLoanStatusUpdates: true,
    enableCreditAlerts: true,
    creditAlertThreshold: 1000,
  });
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const handleToggle = (key: keyof typeof settings) => (checked: boolean) => {
    console.log('[NotificationSettings] Toggle:', key, checked);
    setSettings(prev => ({ ...prev, [key]: checked }));
  };

  const handleNumberChange = (key: keyof typeof settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    console.log('[NotificationSettings] Number change:', key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings: { notificationSettings: settings } 
        }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Settings saved successfully' });
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[NotificationSettings] Save error:', error);
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeTemplates = async () => {
    setInitializing(true);
    try {
      const response = await fetch('/api/notification?action=init-templates');
      const data = await response.json();
      if (data.success) {
        toast({ 
          title: 'Success', 
          description: `Initialized ${data.created} new templates (${data.total} total)` 
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to initialize templates', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[NotificationSettings] Init error:', error);
      toast({ title: 'Error', description: 'Failed to initialize templates', variant: 'destructive' });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automated Notification Triggers
          </CardTitle>
          <CardDescription>
            Configure when automated notifications should be sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* EMI Reminders */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">EMI Reminders</p>
                <p className="text-sm text-gray-500">Send reminders before EMI due date</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Days before:</Label>
                <Input
                  type="number"
                  value={settings.emiReminderDays}
                  onChange={handleNumberChange('emiReminderDays')}
                  className="w-16"
                  min={1}
                  max={7}
                  disabled={!settings.enableEMIReminders}
                />
              </div>
              <Switch
                checked={settings.enableEMIReminders}
                onCheckedChange={handleToggle('enableEMIReminders')}
              />
            </div>
          </div>

          {/* Overdue Alerts */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium">Overdue EMI Alerts</p>
                <p className="text-sm text-gray-500">Alert when EMI becomes overdue</p>
              </div>
            </div>
            <Switch
              checked={settings.enableOverdueAlerts}
              onCheckedChange={handleToggle('enableOverdueAlerts')}
            />
          </div>

          {/* Payment Confirmation */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Payment Confirmation</p>
                <p className="text-sm text-gray-500">Confirm when payment is received</p>
              </div>
            </div>
            <Switch
              checked={settings.enablePaymentConfirmation}
              onCheckedChange={handleToggle('enablePaymentConfirmation')}
            />
          </div>

          {/* Loan Status Updates */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Loan Status Updates</p>
                <p className="text-sm text-gray-500">Notify on loan approval/rejection/disbursement</p>
              </div>
            </div>
            <Switch
              checked={settings.enableLoanStatusUpdates}
              onCheckedChange={handleToggle('enableLoanStatusUpdates')}
            />
          </div>

          {/* Credit Alerts */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Credit Alerts</p>
                <p className="text-sm text-gray-500">Alert when credit balance is low</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Below ₹</Label>
                <Input
                  type="number"
                  value={settings.creditAlertThreshold}
                  onChange={handleNumberChange('creditAlertThreshold')}
                  className="w-24"
                  min={0}
                  disabled={!settings.enableCreditAlerts}
                />
              </div>
              <Switch
                checked={settings.enableCreditAlerts}
                onCheckedChange={handleToggle('enableCreditAlerts')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Initialize Templates */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Initialize Default Templates</p>
                <p className="text-sm text-gray-500">
                  Create default notification templates for all event types
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600"
              onClick={handleInitializeTemplates}
              disabled={initializing}
            >
              {initializing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Initialize Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function NotificationManagementSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-600" />
            Notification Management
          </h2>
          <p className="text-gray-500 mt-1">
            Send notifications and manage automated triggers
          </p>
        </div>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="send" className="data-[state=active]:bg-white">
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <SendNotificationTab />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="settings">
          <NotificationSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
