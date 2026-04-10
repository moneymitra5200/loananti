'use client';

import { formatCurrency } from '@/utils/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, User as UserIcon, Building, MapPin, Briefcase, CheckCircle, XCircle, AlertTriangle, IndianRupee, Phone, Landmark, ChevronsRight } from 'lucide-react';
import type { LoanDetails } from './types';

interface FormSectionProps {
  loanDetails: LoanDetails | null;
}

const Field = ({ label, value, currency }: { label: string; value?: string | number | null; currency?: boolean }) => {
  if (value === null || value === undefined || value === '' || value === 'NaN') return null;
  const display = currency ? `₹${formatCurrency(Number(value))}` : String(value);
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900 text-sm break-all">{display}</p>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, color = 'emerald' }: { icon: any; title: string; color?: string }) => (
  <div className={`flex items-center gap-2 p-3 bg-${color}-50 border-b border-${color}-100 font-semibold text-${color}-900`}>
    <Icon className={`h-4 w-4 text-${color}-600`} />
    {title}
  </div>
);

export function FormSection({ loanDetails }: FormSectionProps) {
  if (!loanDetails) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No loan details available.</p>
      </div>
    );
  }

  const d = loanDetails;
  const c = loanDetails.customer;
  const sf = loanDetails.sessionForm;
  const lf = loanDetails.loanForm;

  return (
    <div className="space-y-4 pb-6">

      {/* Application Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white shadow">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-white/70 mb-0.5">Application Number</p>
            <p className="text-xl font-bold">{d.applicationNo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70 mb-0.5">Loan Type</p>
            <p className="text-lg font-bold">{d.loanType}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className="bg-white/20 text-white border-white/30">{d.status}</Badge>
          {d.fraudFlag && <Badge className="bg-red-400 text-white">⚠️ Fraud Flag</Badge>}
          {d.riskScore > 0 && <Badge className="bg-amber-400 text-white">Risk: {d.riskScore}</Badge>}
        </div>
      </div>

      {/* Personal Information */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader icon={UserIcon} title="Personal Information" />
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Title" value={d.title} />
          <Field label="First Name" value={d.firstName || c?.name?.split(' ')[0]} />
          <Field label="Middle Name" value={d.middleName} />
          <Field label="Last Name" value={d.lastName} />
          <Field label="Father's Name" value={d.fatherName} />
          <Field label="Mother's Name" value={d.motherName} />
          <Field label="Gender" value={d.gender} />
          <Field label="Date of Birth" value={d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString('en-IN') : undefined} />
          <Field label="Marital Status" value={d.maritalStatus} />
          <Field label="Nationality" value={d.nationality} />
          <Field label="PAN Number" value={d.panNumber || c?.panNumber} />
          <Field label="Aadhaar Number" value={d.aadhaarNumber || c?.aadhaarNumber} />
        </CardContent>
      </Card>

      {/* Contact & Address */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader icon={MapPin} title="Contact & Address" color="blue" />
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Phone" value={d.phone || c?.phone} />
          <Field label="Email" value={c?.email} />
          <Field label="Address" value={d.address || c?.address} />
          <Field label="City" value={d.city || c?.city} />
          <Field label="State" value={d.state || c?.state} />
          <Field label="Pincode" value={d.pincode || c?.pincode} />
          <Field label="Reference 1 Name" value={d.reference1Name} />
          <Field label="Reference 1 Phone" value={d.reference1Phone} />
          <Field label="Reference 1 Relation" value={d.reference1Relation} />
          <Field label="Reference 2 Name" value={d.reference2Name} />
          <Field label="Reference 2 Phone" value={d.reference2Phone} />
          <Field label="Reference 2 Relation" value={d.reference2Relation} />
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader icon={Briefcase} title="Employment & Income" color="purple" />
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Employment Type" value={d.employmentType || c?.employmentType} />
          <Field label="Employer Name" value={d.employerName} />
          <Field label="Designation" value={d.designation} />
          <Field label="Years in Employment" value={d.yearsInEmployment} />
          <Field label="Total Work Experience" value={d.totalWorkExperience} />
          <Field label="Office Phone" value={d.officePhone} />
          <Field label="Office Email" value={d.officeEmail} />
          <Field label="Monthly Income" value={d.monthlyIncome || c?.monthlyIncome} currency />
          <Field label="Annual Income" value={d.annualIncome} currency />
          <Field label="Other Income" value={d.otherIncome} currency />
          <Field label="Income Source" value={d.incomeSource} />
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader icon={Landmark} title="Bank Details" color="amber" />
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Bank Name" value={d.bankName || c?.bankName} />
          <Field label="Account Holder" value={d.accountHolderName} />
          <Field label="Account Number" value={d.bankAccountNumber || c?.bankAccountNumber} />
          <Field label="IFSC Code" value={d.bankIfsc || c?.bankIfsc} />
          <Field label="Branch" value={d.bankBranch} />
          <Field label="Account Type" value={d.accountType} />
        </CardContent>
      </Card>

      {/* Sanction / Loan Terms */}
      {sf && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <SectionHeader icon={IndianRupee} title="Sanction / Loan Terms" color="emerald" />
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Requested Amount" value={d.requestedAmount} currency />
            <Field label="Approved Amount" value={sf.approvedAmount} currency />
            <Field label="Interest Rate" value={sf.interestRate ? `${sf.interestRate}% p.a.` : undefined} />
            <Field label="Tenure" value={sf.tenure ? `${sf.tenure} months` : undefined} />
            <Field label="EMI Amount" value={sf.emiAmount} currency />
            <Field label="Total Interest" value={sf.totalInterest} currency />
            <Field label="Total Amount" value={sf.totalAmount} currency />
            <Field label="Processing Fee" value={sf.processingFee} currency />
            <Field label="Moratorium Period" value={sf.moratoriumPeriod ? `${sf.moratoriumPeriod} months` : undefined} />
            <Field label="Late Payment Penalty" value={sf.latePaymentPenalty} currency />
            <Field label="Bounce Charges" value={sf.bounceCharges} currency />
            <Field label="Special Conditions" value={sf.specialConditions} />
            <Field label="Start Date" value={sf.startDate ? new Date(sf.startDate).toLocaleDateString('en-IN') : undefined} />
            <Field label="Purpose" value={d.purpose} />
            <Field label="Sanctioned By Agent" value={sf.agent?.name} />
          </CardContent>
        </Card>
      )}

      {/* Document Verification (from LoanForm) */}
      {lf && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <SectionHeader icon={CheckCircle} title="Document Verification Status" color="green" />
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'PAN', verified: lf.panVerified },
                { label: 'Aadhaar', verified: lf.aadhaarVerified },
                { label: 'Bank', verified: lf.bankVerified },
                { label: 'Employment', verified: lf.employmentVerified },
                { label: 'Address', verified: lf.addressVerified },
                { label: 'Income', verified: lf.incomeVerified },
              ].map(({ label, verified }) => (
                <div key={label} className={`flex items-center gap-2 p-3 rounded-lg border ${verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {verified
                    ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                  <span className={`text-sm font-medium ${verified ? 'text-green-800' : 'text-red-700'}`}>{label}</span>
                </div>
              ))}
            </div>
            {lf.fraudFlag && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-100 rounded-lg border border-red-300">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">⚠️ Fraud Flag Active: {lf.fraudReason || 'Reason not specified'}</span>
              </div>
            )}
            {lf.verificationRemarks && (
              <p className="mt-3 text-sm text-gray-600 p-3 bg-gray-50 rounded-lg border">Remarks: {lf.verificationRemarks}</p>
            )}
            {lf.internalRemarks && (
              <p className="mt-2 text-sm text-amber-800 p-3 bg-amber-50 rounded-lg border border-amber-200">Internal: {lf.internalRemarks}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disbursement Info */}
      {d.disbursedAmount && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <SectionHeader icon={ChevronsRight} title="Disbursement Info" color="blue" />
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Disbursed Amount" value={d.disbursedAmount} currency />
            <Field label="Disbursed At" value={d.disbursedAt ? new Date(d.disbursedAt).toLocaleString('en-IN') : undefined} />
            <Field label="Disbursement Mode" value={d.disbursementMode} />
            <Field label="Disbursement Ref" value={d.disbursementRef} />
            <Field label="Disbursed By" value={d.disbursedBy?.name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
