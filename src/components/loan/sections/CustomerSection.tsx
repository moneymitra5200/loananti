'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, Mail, Phone, MapPin, Briefcase, Banknote, 
  Key, Copy, FileCheck, Users 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { LoanDetails } from './types';

interface CustomerSectionProps {
  loanDetails: LoanDetails | null;
  onCopy: (text: string) => Promise<void>;
}

const CustomerSection = memo(function CustomerSection({ loanDetails, onCopy }: CustomerSectionProps) {
  return (
    <>
      {/* Customer Header */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
        <Avatar className="h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-600">
          <AvatarFallback className="bg-transparent text-white text-xl font-bold">
            {loanDetails?.customer?.name?.charAt(0) || loanDetails?.firstName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold text-lg">{loanDetails?.customer?.name || [loanDetails?.title, loanDetails?.firstName, loanDetails?.middleName, loanDetails?.lastName].filter(Boolean).join(' ')}</h3>
          <p className="text-gray-500">{loanDetails?.customer?.email}</p>
          <p className="text-gray-500">{loanDetails?.customer?.phone || loanDetails?.phone}</p>
        </div>
      </div>

      {/* Login Credentials */}
      {loanDetails?.plainPassword && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-600" />
              Login Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{loanDetails.customer?.email}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6"
                    onClick={() => onCopy(loanDetails.customer?.email || '')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Password</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{loanDetails.plainPassword}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6"
                    onClick={() => onCopy(loanDetails.plainPassword || '')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="font-semibold">{[loanDetails?.title, loanDetails?.firstName, loanDetails?.middleName, loanDetails?.lastName].filter(Boolean).join(' ') || loanDetails?.customer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Father's Name</p>
              <p className="font-semibold">{loanDetails?.fatherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Mother's Name</p>
              <p className="font-semibold">{loanDetails?.motherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date of Birth</p>
              <p className="font-semibold">{loanDetails?.dateOfBirth || loanDetails?.customer?.dateOfBirth ? formatDate(loanDetails?.dateOfBirth || loanDetails?.customer?.dateOfBirth || new Date()) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Gender</p>
              <p className="font-semibold">{loanDetails?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Marital Status</p>
              <p className="font-semibold">{loanDetails?.maritalStatus || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nationality</p>
              <p className="font-semibold">{loanDetails?.nationality || 'Indian'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYC Documents */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-blue-600" />
            KYC Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">PAN Number</p>
              <p className="font-semibold">{loanDetails?.panNumber || loanDetails?.customer?.panNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Aadhaar Number</p>
              <p className="font-semibold">
                {loanDetails?.aadhaarNumber || loanDetails?.customer?.aadhaarNumber 
                  ? `XXXX-XXXX-${(loanDetails?.aadhaarNumber || loanDetails?.customer?.aadhaarNumber)?.slice(-4)}` 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-semibold">{loanDetails?.phone || loanDetails?.customer?.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold">{loanDetails?.customer?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-semibold">{loanDetails?.address || loanDetails?.customer?.address}</p>
                <p className="text-sm text-gray-500">
                  {[loanDetails?.city || loanDetails?.customer?.city, 
                    loanDetails?.state || loanDetails?.customer?.state, 
                    loanDetails?.pincode || loanDetails?.customer?.pincode]
                    .filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
            {loanDetails?.applicationLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-emerald-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 font-medium text-emerald-600">Application Location</p>
                  <p className="font-semibold text-emerald-700">{loanDetails.applicationLocation}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-600" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Employment Type</p>
              <p className="font-semibold">{loanDetails?.employmentType || loanDetails?.customer?.employmentType || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Employer</p>
              <p className="font-semibold">{loanDetails?.employerName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Designation</p>
              <p className="font-semibold">{loanDetails?.designation || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Years in Employment</p>
              <p className="font-semibold">{loanDetails?.yearsInEmployment ? `${loanDetails.yearsInEmployment} years` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Experience</p>
              <p className="font-semibold">{loanDetails?.totalWorkExperience ? `${loanDetails.totalWorkExperience} years` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Monthly Income</p>
              <p className="font-semibold">{formatCurrency(loanDetails?.monthlyIncome || loanDetails?.customer?.monthlyIncome || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Annual Income</p>
              <p className="font-semibold">{formatCurrency(loanDetails?.annualIncome || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Other Income</p>
              <p className="font-semibold">{formatCurrency(loanDetails?.otherIncome || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Income Source</p>
              <p className="font-semibold">{loanDetails?.incomeSource || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Office Phone</p>
              <p className="font-semibold">{loanDetails?.officePhone || 'N/A'}</p>
            </div>
            {loanDetails?.employerAddress && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Employer Address</p>
                <p className="font-semibold">{loanDetails.employerAddress}</p>
              </div>
            )}
            {loanDetails?.officeEmail && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Office Email</p>
                <p className="font-semibold">{loanDetails.officeEmail}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-green-600" />
            Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Account Holder</p>
              <p className="font-semibold">{loanDetails?.accountHolderName || loanDetails?.customer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bank Name</p>
              <p className="font-semibold">{loanDetails?.bankName || loanDetails?.customer?.bankName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account Number</p>
              <p className="font-semibold">{loanDetails?.bankAccountNumber || loanDetails?.customer?.bankAccountNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IFSC Code</p>
              <p className="font-semibold">{loanDetails?.bankIfsc || loanDetails?.customer?.bankIfsc || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Branch</p>
              <p className="font-semibold">{loanDetails?.bankBranch || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account Type</p>
              <p className="font-semibold">{loanDetails?.accountType || 'Savings'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardians */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-600" />
            Guardians
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!loanDetails?.reference1Name && !loanDetails?.reference2Name) ? (
            <p className="text-gray-500 text-center py-4">No references provided</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {loanDetails?.reference1Name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Guardian 1</p>
                  <p className="font-semibold">{loanDetails.reference1Name}</p>
                  <p className="text-sm text-gray-500">{loanDetails.reference1Phone}</p>
                  <p className="text-xs text-gray-400">{loanDetails.reference1Relation}</p>
                  {loanDetails.reference1Address && (
                    <p className="text-xs text-gray-400 mt-1">{loanDetails.reference1Address}</p>
                  )}
                </div>
              )}
              {loanDetails?.reference2Name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Guardian 2</p>
                  <p className="font-semibold">{loanDetails.reference2Name}</p>
                  <p className="text-sm text-gray-500">{loanDetails.reference2Phone}</p>
                  <p className="text-xs text-gray-400">{loanDetails.reference2Relation}</p>
                  {loanDetails.reference2Address && (
                    <p className="text-xs text-gray-400 mt-1">{loanDetails.reference2Address}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
});

export default CustomerSection;
