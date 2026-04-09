'use client';

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, CheckCircle, Wallet, FileText, User, Eye, UserPlus, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  sessionForm?: { approvedAmount: number };
  customer?: { id: string; name: string };
  mirrorLoanId?: string | null;
  isMirrorLoan?: boolean;
}

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  phone?: string;
}

interface Props {
  customers: CustomerItem[];
  loans: Loan[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onViewCustomer: (customer: CustomerItem) => void;
}

function CustomersSection({
  customers,
  loans,
  searchQuery,
  setSearchQuery,
  onViewCustomer
}: Props) {
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [creating, setCreating] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const customerSearchQuery = searchQuery.toLowerCase();
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery) || 
    c.email.toLowerCase().includes(customerSearchQuery) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  // Count unique loans per customer (mirror loans should be grouped with original)
  const getUniqueLoanCount = (customerId: string) => {
    const customerLoans = loans.filter(l => l.customer?.id === customerId);
    // Filter out mirror loans that have a mirrorLoanId (they're duplicates)
    const uniqueLoans = customerLoans.filter(loan => !loan.isMirrorLoan && !loan.mirrorLoanId);
    // Count unique loans (original + non-mirror loans)
    return uniqueLoans.length;
  };

  const getUniqueLoans = (customerId: string) => {
    const customerLoans = loans.filter(l => l.customer?.id === customerId);
    // Return only non-mirror loans for counting purposes
    return customerLoans.filter(loan => !loan.isMirrorLoan);
  };

  // Count active loans for stats
  const uniqueActiveLoans = loans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status) && !l.isMirrorLoan);

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.name || !newCustomerForm.email || !newCustomerForm.password) {
      return;
    }
    setCreating(true);
    try {
      const response = await fetch('/api/auth/customer-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerForm)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setShowNewCustomerDialog(false);
        setNewCustomerForm({ name: '', email: '', phone: '', password: '' });
        // Refresh the page or update state
        window.location.reload();
      } else {
        alert(data.error || 'Failed to create customer');
      }
    } catch (error) {
      alert('Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetails = async (customer: CustomerItem) => {
    setSelectedCustomerDetails(customer);
    setLoadingDetails(true);
    setShowDetailsDialog(true);
    try {
      const response = await fetch(`/api/user/details?userId=${customer.id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedCustomerDetails(data.user);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
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
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.isActive).length}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With Active Loans</p>
                <p className="text-2xl font-bold text-blue-600">{uniqueActiveLoans.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-violet-600">{loans.filter(l => !l.isMirrorLoan).length}</p>
              </div>
              <div className="p-2 bg-violet-50 rounded-lg">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              Customer Directory
            </CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64" />
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowNewCustomerDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No customers found</p>
              <p className="text-sm text-gray-400">Customers will appear here when they register</p>
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowNewCustomerDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />Add First Customer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Loans</TableHead>
                    <TableHead>Active Loan</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const customerLoans = getUniqueLoans(customer.id);
                    const activeLoan = customerLoans.find(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
                    const totalBorrowed = customerLoans.reduce((sum, l) => sum + (l.sessionForm?.approvedAmount || l.requestedAmount), 0);
                    const uniqueLoanCount = getUniqueLoanCount(customer.id);
                    
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">{customer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{customer.phone || 'N/A'}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{uniqueLoanCount}</span>
                            {uniqueLoanCount > 0 && (
                              <span className="text-xs text-gray-500">(₹{totalBorrowed.toLocaleString()})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {activeLoan ? (
                            <div>
                              <p className="font-medium text-green-600">{formatCurrency(activeLoan.sessionForm?.approvedAmount || activeLoan.requestedAmount)}</p>
                              <p className="text-xs text-gray-500">{activeLoan.applicationNo}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{formatDate(customer.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewDetails(customer)}
                            >
                              <Eye className="h-4 w-4 mr-1" />View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Add New Customer
            </DialogTitle>
            <DialogDescription>
              Create a new customer account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input 
                value={newCustomerForm.name} 
                onChange={(e) => setNewCustomerForm({...newCustomerForm, name: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input 
                type="email"
                value={newCustomerForm.email} 
                onChange={(e) => setNewCustomerForm({...newCustomerForm, email: e.target.value})}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input 
                value={newCustomerForm.phone} 
                onChange={(e) => setNewCustomerForm({...newCustomerForm, phone: e.target.value})}
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input 
                type="password"
                value={newCustomerForm.password} 
                onChange={(e) => setNewCustomerForm({...newCustomerForm, password: e.target.value})}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleCreateCustomer} disabled={creating}>
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog - A to Z Details */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              Customer Details - {selectedCustomerDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Complete A to Z information about this customer
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : selectedCustomerDetails ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="text-sm font-medium">{selectedCustomerDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium">{selectedCustomerDetails.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium">{selectedCustomerDetails.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge className={selectedCustomerDetails.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {selectedCustomerDetails.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium">{formatDate(selectedCustomerDetails.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Login</p>
                      <p className="text-sm font-medium">{selectedCustomerDetails.lastLoginAt ? formatDate(selectedCustomerDetails.lastLoginAt) : 'Never'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Details */}
              {selectedCustomerDetails.panNumber || selectedCustomerDetails.aadhaarNumber || selectedCustomerDetails.dateOfBirth ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Personal Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedCustomerDetails.panNumber && (
                        <div>
                          <p className="text-xs text-gray-500">PAN Number</p>
                          <p className="text-sm font-medium">{selectedCustomerDetails.panNumber}</p>
                        </div>
                      )}
                      {selectedCustomerDetails.aadhaarNumber && (
                        <div>
                          <p className="text-xs text-gray-500">Aadhaar Number</p>
                          <p className="text-sm font-medium">XXXX-XXXX-{selectedCustomerDetails.aadhaarNumber?.slice(-4)}</p>
                        </div>
                      )}
                      {selectedCustomerDetails.dateOfBirth && (
                        <div>
                          <p className="text-xs text-gray-500">Date of Birth</p>
                          <p className="text-sm font-medium">{formatDate(selectedCustomerDetails.dateOfBirth)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Loan Summary */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Loan Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{selectedCustomerDetails._count?.loanApplications || 0}</p>
                      <p className="text-xs text-gray-500">Total Applications</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{selectedCustomerDetails._count?.activeLoans || 0}</p>
                      <p className="text-xs text-gray-500">Active Loans</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{selectedCustomerDetails._count?.disbursedLoans || 0}</p>
                      <p className="text-xs text-gray-500">Disbursed Loans</p>
                    </div>
                    <div className="text-center p-3 bg-violet-50 rounded-lg">
                      <p className="text-2xl font-bold text-violet-600">{selectedCustomerDetails._count?.payments || 0}</p>
                      <p className="text-xs text-gray-500">Total Payments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              {selectedCustomerDetails.recentActivity?.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {selectedCustomerDetails.recentActivity.map((activity: any, idx: number) => (
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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(CustomersSection);
