'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, CheckCircle, Wallet, FileText, User, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  sessionForm?: { approvedAmount: number };
  customer?: { id: string; name: string };
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
  const customerSearchQuery = searchQuery.toLowerCase();
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery) || 
    c.email.toLowerCase().includes(customerSearchQuery) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  const activeLoansCount = loans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status)).length;

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
                <p className="text-2xl font-bold text-blue-600">{activeLoansCount}</p>
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
                <p className="text-2xl font-bold text-violet-600">{loans.length}</p>
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
            <Input placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No customers found</p>
              <p className="text-sm text-gray-400">Customers will appear here when they register</p>
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
                    const customerLoans = loans.filter(l => l.customer?.id === customer.id);
                    const activeLoan = customerLoans.find(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
                    const totalBorrowed = customerLoans.reduce((sum, l) => sum + (l.sessionForm?.approvedAmount || l.requestedAmount), 0);
                    
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
                            <span className="font-medium">{customerLoans.length}</span>
                            {customerLoans.length > 0 && (
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
                              onClick={() => onViewCustomer(customer)}
                            >
                              <Eye className="h-4 w-4" />
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
    </div>
  );
}

export default memo(CustomersSection);
