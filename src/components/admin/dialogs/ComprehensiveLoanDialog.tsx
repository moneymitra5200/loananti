'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, User, Phone, Mail, MapPin, Briefcase, CreditCard, CheckCircle, XCircle, FileCheck, AlertTriangle, Calculator, Wallet, Activity, Eye, Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface ComprehensiveLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingDetails: boolean;
  loanDetails: any;
  detailsTab: string;
  setDetailsTab: (tab: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function ComprehensiveLoanDialog({
  open,
  onOpenChange,
  loadingDetails,
  loanDetails,
  detailsTab,
  setDetailsTab,
  getStatusBadge,
}: ComprehensiveLoanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {loadingDetails ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : loanDetails ? (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    {loanDetails.loan.applicationNo}
                  </DialogTitle>
                  <DialogDescription>
                    {loanDetails.loan.customer?.name} • {loanDetails.loan.loanType} Loan
                  </DialogDescription>
                </div>
                {getStatusBadge(loanDetails.loan.status)}
              </div>
            </DialogHeader>
            
            <div className="p-6 pt-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                <TabsList className="grid grid-cols-6 mb-6">
                  <TabsTrigger value="customer" className="text-xs">Customer</TabsTrigger>
                  <TabsTrigger value="verification" className="text-xs">Verification</TabsTrigger>
                  <TabsTrigger value="session" className="text-xs">Sanction</TabsTrigger>
                  <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
                  <TabsTrigger value="emi" className="text-xs">EMI</TabsTrigger>
                </TabsList>

                {/* Customer Details Tab */}
                <TabsContent value="customer" className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Personal Info */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          Personal Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Full Name</p>
                            <p className="font-medium">{loanDetails.loan.customer?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Date of Birth</p>
                            <p className="font-medium">{loanDetails.loan.customer?.dateOfBirth ? formatDate(loanDetails.loan.customer.dateOfBirth) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">PAN Number</p>
                            <p className="font-medium font-mono">{loanDetails.loan.customer?.panNumber || loanDetails.loan.panNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Aadhaar Number</p>
                            <p className="font-medium font-mono">{loanDetails.loan.customer?.aadhaarNumber ? `XXXX-XXXX-${loanDetails.loan.customer.aadhaarNumber.slice(-4)}` : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Gender</p>
                            <p className="font-medium">{loanDetails.loan.gender || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Marital Status</p>
                            <p className="font-medium">{loanDetails.loan.maritalStatus || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4 text-green-600" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="col-span-2">
                            <p className="text-gray-500">Email</p>
                            <p className="font-medium flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {loanDetails.loan.customer?.email || 'N/A'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {loanDetails.loan.customer?.phone || loanDetails.loan.phone || 'N/A'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Address</p>
                            <p className="font-medium flex items-start gap-2">
                              <MapPin className="h-3 w-3 mt-1" />
                              {[
                                loanDetails.loan.customer?.address || loanDetails.loan.address,
                                loanDetails.loan.customer?.city || loanDetails.loan.city,
                                loanDetails.loan.customer?.state || loanDetails.loan.state,
                                loanDetails.loan.customer?.pincode || loanDetails.loan.pincode
                              ].filter(Boolean).join(', ') || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Employment Info */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-purple-600" />
                          Employment Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Employment Type</p>
                            <p className="font-medium">{loanDetails.loan.customer?.employmentType || loanDetails.loan.employmentType || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Monthly Income</p>
                            <p className="font-medium">{loanDetails.loan.customer?.monthlyIncome ? formatCurrency(loanDetails.loan.customer.monthlyIncome) : 'N/A'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Employer Name</p>
                            <p className="font-medium">{loanDetails.loan.employerName || 'N/A'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Designation</p>
                            <p className="font-medium">{loanDetails.loan.designation || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bank Info */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-orange-600" />
                          Bank Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Bank Name</p>
                            <p className="font-medium">{loanDetails.loan.customer?.bankName || loanDetails.loan.bankName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Account Type</p>
                            <p className="font-medium">{loanDetails.loan.accountType || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Account Number</p>
                            <p className="font-medium font-mono">
                              {loanDetails.loan.customer?.bankAccountNumber || loanDetails.loan.bankAccountNumber 
                                ? `XXXX-XXXX-${(loanDetails.loan.customer?.bankAccountNumber || loanDetails.loan.bankAccountNumber).slice(-4)}` 
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">IFSC Code</p>
                            <p className="font-medium font-mono">{loanDetails.loan.customer?.bankIfsc || loanDetails.loan.bankIfsc || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Verification Tab */}
                <TabsContent value="verification" className="space-y-4">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-teal-600" />
                        Verification Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loanDetails.loan.loanForm ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { label: 'PAN Verified', value: loanDetails.loan.loanForm.panVerified },
                            { label: 'Aadhaar Verified', value: loanDetails.loan.loanForm.aadhaarVerified },
                            { label: 'Bank Verified', value: loanDetails.loan.loanForm.bankVerified },
                            { label: 'Employment Verified', value: loanDetails.loan.loanForm.employmentVerified },
                            { label: 'Address Verified', value: loanDetails.loan.loanForm.addressVerified },
                            { label: 'Income Verified', value: loanDetails.loan.loanForm.incomeVerified },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              {item.value ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-400" />
                              )}
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileCheck className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                          <p>No verification data available</p>
                        </div>
                      )}
                      {loanDetails.loan.loanForm?.verificationRemarks && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-500">Verification Remarks</p>
                          <p className="text-sm">{loanDetails.loan.loanForm.verificationRemarks}</p>
                        </div>
                      )}
                      {loanDetails.loan.loanForm?.riskScore !== undefined && (
                        <div className="mt-4 flex items-center gap-4">
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs text-gray-500">Risk Score</p>
                            <p className="text-lg font-bold text-amber-600">{loanDetails.loan.loanForm.riskScore}</p>
                          </div>
                          {loanDetails.loan.loanForm.fraudFlag && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />Fraud Flag
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sanction Tab */}
                <TabsContent value="session" className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-blue-600" />
                          Loan Terms
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loanDetails.loan.sessionForm ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-emerald-50 rounded-lg">
                                <p className="text-xs text-gray-500">Approved Amount</p>
                                <p className="text-xl font-bold text-emerald-600">{formatCurrency(loanDetails.loan.sessionForm.approvedAmount)}</p>
                              </div>
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs text-gray-500">Interest Rate</p>
                                <p className="text-xl font-bold text-blue-600">{loanDetails.loan.sessionForm.interestRate}%</p>
                              </div>
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <p className="text-xs text-gray-500">Tenure</p>
                                <p className="text-xl font-bold text-purple-600">{loanDetails.loan.sessionForm.tenure} months</p>
                              </div>
                              <div className="p-3 bg-orange-50 rounded-lg">
                                <p className="text-xs text-gray-500">EMI Amount</p>
                                <p className="text-xl font-bold text-orange-600">{formatCurrency(loanDetails.loan.sessionForm.emiAmount)}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Processing Fee</p>
                                {loanDetails.mirrorMapping ? (
                                  <div>
                                    <p className="font-medium text-orange-600">{formatCurrency(loanDetails.mirrorMapping.mirrorProcessingFee || 0)}</p>
                                    <p className="text-[10px] text-orange-500 mt-0.5">Auto-calc — Booked as income on EMI #1</p>
                                  </div>
                                ) : (
                                  <p className="font-medium">{formatCurrency(loanDetails.loan.sessionForm.processingFee || 0)}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-gray-500">Total Interest</p>
                                <p className="font-medium">{formatCurrency(loanDetails.loan.sessionForm.totalInterest || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Total Amount</p>
                                <p className="font-medium">{formatCurrency(loanDetails.loan.sessionForm.totalAmount || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Moratorium Period</p>
                                <p className="font-medium">{loanDetails.loan.sessionForm.moratoriumPeriod || 0} months</p>
                              </div>
                            </div>
                            {loanDetails.loan.sessionForm.agent && (
                              <div className="pt-4 border-t">
                                <p className="text-xs text-gray-500 mb-2">Sanction Created By</p>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                      {loanDetails.loan.sessionForm.agent.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{loanDetails.loan.sessionForm.agent.name}</p>
                                    <p className="text-xs text-gray-500">{loanDetails.loan.sessionForm.agent.agentCode}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Calculator className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                            <p>No sanction data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          Disbursement Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Disbursed Amount</p>
                              <p className="font-bold text-lg">{formatCurrency(loanDetails.loan.disbursedAmount || loanDetails.loan.sessionForm?.approvedAmount || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Disbursement Date</p>
                              <p className="font-medium">{loanDetails.loan.disbursedAt ? formatDate(loanDetails.loan.disbursedAt) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Mode</p>
                              <p className="font-medium">{loanDetails.loan.disbursementMode || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Reference</p>
                              <p className="font-medium font-mono">{loanDetails.loan.disbursementRef || 'N/A'}</p>
                            </div>
                          </div>
                          {loanDetails.loan.disbursedBy && (
                            <div className="pt-4 border-t">
                              <p className="text-xs text-gray-500 mb-2">Disbursed By</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-orange-100 text-orange-700">
                                    {loanDetails.loan.disbursedBy.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-medium">{loanDetails.loan.disbursedBy.name}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Workflow Tab */}
                <TabsContent value="workflow" className="space-y-4">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-600" />
                        Workflow Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {loanDetails.workflowPipeline?.map((stage: any, index: number) => (
                          <div key={stage.status} className="flex items-start gap-4 pb-6 last:pb-0">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                stage.isCompleted 
                                  ? 'bg-green-500 text-white' 
                                  : stage.isCurrent 
                                    ? 'bg-blue-500 text-white ring-4 ring-blue-100' 
                                    : 'bg-gray-200 text-gray-500'
                              }`}>
                                {stage.isCompleted ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs font-bold">{index + 1}</span>
                                )}
                              </div>
                              {index < loanDetails.workflowPipeline.length - 1 && (
                                <div className={`w-0.5 h-full min-h-[40px] mt-1 ${
                                  stage.isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                }`} />
                              )}
                            </div>
                            
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${stage.isCompleted || stage.isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {stage.label}
                                </p>
                                {stage.isCurrent && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">Current</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{stage.role}</p>
                              {stage.timestamp && (
                                <p className="text-xs text-gray-400 mt-1">{formatDate(stage.timestamp)}</p>
                              )}
                              {stage.actionBy && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[8px] bg-gray-100">
                                      {stage.actionBy.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-gray-600">{stage.actionBy.name}</span>
                                  <Badge variant="outline" className="text-xs">{stage.actionBy.role}</Badge>
                                </div>
                              )}
                              {stage.remarks && (
                                <p className="text-xs text-gray-500 mt-1 italic">"{stage.remarks}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm">Workflow History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Action</TableHead>
                              <TableHead className="text-xs">From</TableHead>
                              <TableHead className="text-xs">To</TableHead>
                              <TableHead className="text-xs">By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanDetails.loan.workflowLogs?.map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                                <TableCell className="text-xs font-medium capitalize">{log.action}</TableCell>
                                <TableCell className="text-xs">{log.previousStatus?.replace(/_/g, ' ')}</TableCell>
                                <TableCell className="text-xs">{log.newStatus?.replace(/_/g, ' ')}</TableCell>
                                <TableCell className="text-xs">{log.actionBy?.name || 'System'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        Uploaded Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'PAN Card', key: 'panCardDoc', icon: FileText },
                          { label: 'Aadhaar Front', key: 'aadhaarFrontDoc', icon: FileText },
                          { label: 'Aadhaar Back', key: 'aadhaarBackDoc', icon: FileText },
                          { label: 'Income Proof', key: 'incomeProofDoc', icon: FileText },
                          { label: 'Address Proof', key: 'addressProofDoc', icon: MapPin },
                          { label: 'Photo', key: 'photoDoc', icon: User },
                          { label: 'Bank Statement', key: 'bankStatementDoc', icon: Receipt },
                          { label: 'Salary Slip', key: 'salarySlipDoc', icon: Receipt },
                        ].map((doc) => {
                          const docUrl = loanDetails.loan[doc.key];
                          return (
                            <div 
                              key={doc.key} 
                              className={`p-4 rounded-lg border ${docUrl ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <doc.icon className={`h-4 w-4 ${docUrl ? 'text-gray-600' : 'text-gray-300'}`} />
                                <span className={`text-sm font-medium ${docUrl ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {doc.label}
                                </span>
                              </div>
                              {docUrl ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7 text-xs"
                                    type="button"
                                    onClick={() => {
                                      if (docUrl.startsWith('data:')) {
                                        try {
                                          const arr = docUrl.split(',');
                                          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                                          const bstr = atob(arr[1]);
                                          let n = bstr.length;
                                          const u8arr = new Uint8Array(n);
                                          while (n--) u8arr[n] = bstr.charCodeAt(n);
                                          window.open(URL.createObjectURL(new Blob([u8arr], { type: mime })), '_blank');
                                        } catch { window.open(docUrl, '_blank'); }
                                      } else { window.open(docUrl, '_blank'); }
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />View
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">Not uploaded</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* EMI Tab */}
                <TabsContent value="emi" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Total EMIs</p>
                        <p className="text-2xl font-bold text-gray-900">{loanDetails.emiSummary.totalEMIs}</p>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-2xl font-bold text-green-600">{loanDetails.emiSummary.paidEMIs}</p>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="text-2xl font-bold text-blue-600">{loanDetails.emiSummary.pendingEMIs}</p>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{loanDetails.emiSummary.overdueEMIs}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm">EMI Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-80 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">#</TableHead>
                              <TableHead className="text-xs">Due Date</TableHead>
                              <TableHead className="text-xs">Principal</TableHead>
                              <TableHead className="text-xs">Interest</TableHead>
                              <TableHead className="text-xs">Total</TableHead>
                              <TableHead className="text-xs">Paid</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanDetails.loan.emiSchedules?.map((emi: any) => (
                              <TableRow key={emi.id}>
                                <TableCell className="text-xs font-medium">{emi.installmentNumber}</TableCell>
                                <TableCell className="text-xs">{formatDate(emi.dueDate)}</TableCell>
                                <TableCell className="text-xs">{formatCurrency(emi.principalAmount)}</TableCell>
                                <TableCell className="text-xs">{formatCurrency(emi.interestAmount)}</TableCell>
                                <TableCell className="text-xs font-medium">{formatCurrency(emi.totalAmount)}</TableCell>
                                <TableCell className="text-xs text-green-600">{emi.paidAmount > 0 ? formatCurrency(emi.paidAmount) : '-'}</TableCell>
                                <TableCell>
                                  <Badge className={`text-xs ${
                                    emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID' ? 'bg-green-100 text-green-700' :
                                    emi.paymentStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                    emi.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {emi.paymentStatus === 'INTEREST_ONLY_PAID' ? 'Interest Paid' : emi.paymentStatus}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {loanDetails.loan.payments?.length > 0 && (
                    <Card className="border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm">Recent Payments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Amount</TableHead>
                                <TableHead className="text-xs">Mode</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loanDetails.loan.payments.map((payment: any) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="text-xs">{formatDate(payment.createdAt)}</TableCell>
                                  <TableCell className="text-xs font-medium">{formatCurrency(payment.amount)}</TableCell>
                                  <TableCell className="text-xs">{payment.paymentMode || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge className={`text-xs ${
                                      payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                      payment.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {payment.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
