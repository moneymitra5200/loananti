'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, User, Users, Building, Clock, AlertCircle } from 'lucide-react';

interface FormErrors {
  [key: string]: string;
}

interface EmploymentStepContentProps {
  loanForm: any;
  setLoanForm: React.Dispatch<React.SetStateAction<any>>;
  formErrors: FormErrors;
}

export default function EmploymentStepContent({
  loanForm,
  setLoanForm,
  formErrors,
}: EmploymentStepContentProps) {
  
  const inputClass = (field: string) => `w-full ${formErrors[field] ? 'border-red-500 focus-visible:ring-red-500' : ''}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-emerald-600" />
        <h4 className="font-semibold text-lg">Employment Details</h4>
      </div>
      
      {/* Employment Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employmentType">Employment Type *</Label>
          <Select value={loanForm.employmentType} onValueChange={(v) => setLoanForm({...loanForm, employmentType: v})}>
            <SelectTrigger id="employmentType" className={inputClass('employmentType')}><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Salaried">Salaried Employee</SelectItem>
              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
              <SelectItem value="Business">Business Owner</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Housewife">Housewife</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="Unemployed">Unemployed</SelectItem>
            </SelectContent>
          </Select>
          {formErrors.employmentType && <p className="text-xs text-red-500 mt-1">{formErrors.employmentType}</p>}
        </div>
      </div>

      {/* Dynamic Fields Based on Employment Type */}
      {loanForm.employmentType === 'Salaried' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h5 className="sm:col-span-2 font-medium text-blue-800 flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Salaried Employee Details
          </h5>
          <div>
            <Label htmlFor="employerName">Employer Name *</Label>
            <Input id="employerName" className={inputClass('employerName')} value={loanForm.employerName} onChange={(e) => setLoanForm({...loanForm, employerName: e.target.value})} placeholder="Company name" />
            {formErrors.employerName && <p className="text-xs text-red-500 mt-1">{formErrors.employerName}</p>}
          </div>
          <div>
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={loanForm.designation} onChange={(e) => setLoanForm({...loanForm, designation: e.target.value})} placeholder="Job title" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="employerAddress">Employer Address</Label>
            <Textarea id="employerAddress" value={loanForm.employerAddress} onChange={(e) => setLoanForm({...loanForm, employerAddress: e.target.value})} placeholder="Office address" rows={2} />
          </div>
          <div>
            <Label htmlFor="officePhone">Office Phone</Label>
            <Input id="officePhone" value={loanForm.officePhone} onChange={(e) => setLoanForm({...loanForm, officePhone: e.target.value})} placeholder="Office contact" />
          </div>
          <div>
            <Label htmlFor="officeEmail">Office Email</Label>
            <Input id="officeEmail" type="email" value={loanForm.officeEmail} onChange={(e) => setLoanForm({...loanForm, officeEmail: e.target.value})} placeholder="Official email" />
          </div>
          <div>
            <Label htmlFor="yearsInEmployment">Years in Current Job</Label>
            <Input id="yearsInEmployment" type="number" value={loanForm.yearsInEmployment} onChange={(e) => setLoanForm({...loanForm, yearsInEmployment: e.target.value})} placeholder="Years" min="0" />
          </div>
          <div>
            <Label htmlFor="totalWorkExperience">Total Work Experience</Label>
            <Input id="totalWorkExperience" type="number" value={loanForm.totalWorkExperience} onChange={(e) => setLoanForm({...loanForm, totalWorkExperience: e.target.value})} placeholder="Total years" min="0" />
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Monthly Income (₹) *</Label>
            <Input id="monthlyIncome" type="number" className={inputClass('monthlyIncome')} value={loanForm.monthlyIncome} onChange={(e) => setLoanForm({...loanForm, monthlyIncome: e.target.value})} placeholder="Amount" min="0" />
            {formErrors.monthlyIncome && <p className="text-xs text-red-500 mt-1">{formErrors.monthlyIncome}</p>}
          </div>
          <div>
            <Label htmlFor="annualIncome">Annual Income (₹)</Label>
            <Input id="annualIncome" type="number" value={loanForm.annualIncome} onChange={(e) => setLoanForm({...loanForm, annualIncome: e.target.value})} placeholder="Amount" min="0" />
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Self-Employed' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
          <h5 className="sm:col-span-2 font-medium text-purple-800 flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Self-Employed Details
          </h5>
          <div>
            <Label htmlFor="businessName">Business Name *</Label>
            <Input id="businessName" className={inputClass('businessName')} value={loanForm.businessName} onChange={(e) => setLoanForm({...loanForm, businessName: e.target.value})} placeholder="Your business name" />
            {formErrors.businessName && <p className="text-xs text-red-500 mt-1">{formErrors.businessName}</p>}
          </div>
          <div>
            <Label htmlFor="businessType">Business Type</Label>
            <Select value={loanForm.businessType} onValueChange={(v) => setLoanForm({...loanForm, businessType: v})}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
                <SelectItem value="LLP">LLP</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea id="businessAddress" value={loanForm.businessAddress} onChange={(e) => setLoanForm({...loanForm, businessAddress: e.target.value})} placeholder="Business address" rows={2} />
          </div>
          <div>
            <Label htmlFor="yearsInBusiness">Years in Business</Label>
            <Input id="yearsInBusiness" type="number" value={loanForm.yearsInBusiness} onChange={(e) => setLoanForm({...loanForm, yearsInBusiness: e.target.value})} placeholder="Years" min="0" />
          </div>
          <div>
            <Label htmlFor="annualTurnover">Annual Turnover (₹) *</Label>
            <Input id="annualTurnover" type="number" className={inputClass('annualTurnover')} value={loanForm.annualTurnover} onChange={(e) => setLoanForm({...loanForm, annualTurnover: e.target.value})} placeholder="Annual turnover" min="0" />
            {formErrors.annualTurnover && <p className="text-xs text-red-500 mt-1">{formErrors.annualTurnover}</p>}
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Monthly Income (₹)</Label>
            <Input id="monthlyIncome" type="number" value={loanForm.monthlyIncome} onChange={(e) => setLoanForm({...loanForm, monthlyIncome: e.target.value})} placeholder="Monthly draw" min="0" />
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Business' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <h5 className="sm:col-span-2 font-medium text-amber-800 flex items-center gap-2">
            <Building className="h-4 w-4" /> Business Owner Details
          </h5>
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input id="companyName" className={inputClass('companyName')} value={loanForm.companyName} onChange={(e) => setLoanForm({...loanForm, companyName: e.target.value})} placeholder="Company name" />
            {formErrors.companyName && <p className="text-xs text-red-500 mt-1">{formErrors.companyName}</p>}
          </div>
          <div>
            <Label htmlFor="companyType">Company Type</Label>
            <Select value={loanForm.companyType} onValueChange={(v) => setLoanForm({...loanForm, companyType: v})}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pvt Ltd">Private Limited</SelectItem>
                <SelectItem value="Public Ltd">Public Limited</SelectItem>
                <SelectItem value="LLP">LLP</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="businessAddress">Company Address</Label>
            <Textarea id="businessAddress" value={loanForm.businessAddress} onChange={(e) => setLoanForm({...loanForm, businessAddress: e.target.value})} placeholder="Company address" rows={2} />
          </div>
          <div>
            <Label htmlFor="yearsInOperation">Years in Operation</Label>
            <Input id="yearsInOperation" type="number" value={loanForm.yearsInOperation} onChange={(e) => setLoanForm({...loanForm, yearsInOperation: e.target.value})} placeholder="Years" min="0" />
          </div>
          <div>
            <Label htmlFor="numberOfEmployees">Number of Employees</Label>
            <Input id="numberOfEmployees" type="number" value={loanForm.numberOfEmployees} onChange={(e) => setLoanForm({...loanForm, numberOfEmployees: e.target.value})} placeholder="Employee count" min="0" />
          </div>
          <div>
            <Label htmlFor="annualRevenue">Annual Revenue (₹) *</Label>
            <Input id="annualRevenue" type="number" className={inputClass('annualRevenue')} value={loanForm.annualRevenue} onChange={(e) => setLoanForm({...loanForm, annualRevenue: e.target.value})} placeholder="Annual revenue" min="0" />
            {formErrors.annualRevenue && <p className="text-xs text-red-500 mt-1">{formErrors.annualRevenue}</p>}
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Monthly Income (₹)</Label>
            <Input id="monthlyIncome" type="number" value={loanForm.monthlyIncome} onChange={(e) => setLoanForm({...loanForm, monthlyIncome: e.target.value})} placeholder="Monthly draw" min="0" />
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Professional' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
          <h5 className="sm:col-span-2 font-medium text-teal-800 flex items-center gap-2">
            <User className="h-4 w-4" /> Professional Details
          </h5>
          <div>
            <Label htmlFor="professionType">Profession Type *</Label>
            <Select value={loanForm.professionType} onValueChange={(v) => setLoanForm({...loanForm, professionType: v})}>
              <SelectTrigger className={inputClass('professionType')}><SelectValue placeholder="Select profession" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Doctor">Doctor</SelectItem>
                <SelectItem value="CA">Chartered Accountant</SelectItem>
                <SelectItem value="Lawyer">Lawyer</SelectItem>
                <SelectItem value="Architect">Architect</SelectItem>
                <SelectItem value="Consultant">Consultant</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.professionType && <p className="text-xs text-red-500 mt-1">{formErrors.professionType}</p>}
          </div>
          <div>
            <Label htmlFor="practiceName">Practice/Business Name</Label>
            <Input id="practiceName" value={loanForm.practiceName} onChange={(e) => setLoanForm({...loanForm, practiceName: e.target.value})} placeholder="Clinic/Firm name" />
          </div>
          <div>
            <Label htmlFor="professionalRegNo">Registration Number</Label>
            <Input id="professionalRegNo" value={loanForm.professionalRegNo} onChange={(e) => setLoanForm({...loanForm, professionalRegNo: e.target.value})} placeholder="Professional registration" />
          </div>
          <div>
            <Label htmlFor="yearsOfPractice">Years of Practice</Label>
            <Input id="yearsOfPractice" type="number" value={loanForm.yearsOfPractice} onChange={(e) => setLoanForm({...loanForm, yearsOfPractice: e.target.value})} placeholder="Years" min="0" />
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Monthly Income (₹) *</Label>
            <Input id="monthlyIncome" type="number" className={inputClass('monthlyIncome')} value={loanForm.monthlyIncome} onChange={(e) => setLoanForm({...loanForm, monthlyIncome: e.target.value})} placeholder="Amount" min="0" />
            {formErrors.monthlyIncome && <p className="text-xs text-red-500 mt-1">{formErrors.monthlyIncome}</p>}
          </div>
          <div>
            <Label htmlFor="annualIncome">Annual Income (₹)</Label>
            <Input id="annualIncome" type="number" value={loanForm.annualIncome} onChange={(e) => setLoanForm({...loanForm, annualIncome: e.target.value})} placeholder="Amount" min="0" />
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Housewife' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-pink-50 rounded-xl border border-pink-100">
          <h5 className="sm:col-span-2 font-medium text-pink-800 flex items-center gap-2">
            <Users className="h-4 w-4" /> Housewife Details
          </h5>
          <div>
            <Label htmlFor="spouseName">Spouse Name *</Label>
            <Input id="spouseName" className={inputClass('spouseName')} value={loanForm.spouseName} onChange={(e) => setLoanForm({...loanForm, spouseName: e.target.value})} placeholder="Husband/Wife name" />
            {formErrors.spouseName && <p className="text-xs text-red-500 mt-1">{formErrors.spouseName}</p>}
          </div>
          <div>
            <Label htmlFor="spouseOccupation">Spouse Occupation</Label>
            <Input id="spouseOccupation" value={loanForm.spouseOccupation} onChange={(e) => setLoanForm({...loanForm, spouseOccupation: e.target.value})} placeholder="Spouse's occupation" />
          </div>
          <div>
            <Label htmlFor="spouseIncome">Spouse Monthly Income (₹)</Label>
            <Input id="spouseIncome" type="number" value={loanForm.spouseIncome} onChange={(e) => setLoanForm({...loanForm, spouseIncome: e.target.value})} placeholder="Spouse income" min="0" />
          </div>
          <div>
            <Label htmlFor="familyIncome">Total Family Income (₹) *</Label>
            <Input id="familyIncome" type="number" className={inputClass('familyIncome')} value={loanForm.familyIncome} onChange={(e) => setLoanForm({...loanForm, familyIncome: e.target.value})} placeholder="Total family income" min="0" />
            {formErrors.familyIncome && <p className="text-xs text-red-500 mt-1">{formErrors.familyIncome}</p>}
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Student' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-cyan-50 rounded-xl border border-cyan-100">
          <h5 className="sm:col-span-2 font-medium text-cyan-800 flex items-center gap-2">
            <User className="h-4 w-4" /> Student Details
          </h5>
          <div>
            <Label htmlFor="institutionName">Institution Name *</Label>
            <Input id="institutionName" className={inputClass('institutionName')} value={loanForm.institutionName} onChange={(e) => setLoanForm({...loanForm, institutionName: e.target.value})} placeholder="School/College name" />
            {formErrors.institutionName && <p className="text-xs text-red-500 mt-1">{formErrors.institutionName}</p>}
          </div>
          <div>
            <Label htmlFor="courseProgram">Course/Program</Label>
            <Input id="courseProgram" value={loanForm.courseProgram} onChange={(e) => setLoanForm({...loanForm, courseProgram: e.target.value})} placeholder="Course name" />
          </div>
          <div>
            <Label htmlFor="expectedCompletion">Expected Completion</Label>
            <Input id="expectedCompletion" type="date" value={loanForm.expectedCompletion} onChange={(e) => setLoanForm({...loanForm, expectedCompletion: e.target.value})} />
          </div>
          <div>
            <Label htmlFor="guardianName">Guardian Name *</Label>
            <Input id="guardianName" className={inputClass('guardianName')} value={loanForm.guardianName} onChange={(e) => setLoanForm({...loanForm, guardianName: e.target.value})} placeholder="Parent/Guardian name" />
            {formErrors.guardianName && <p className="text-xs text-red-500 mt-1">{formErrors.guardianName}</p>}
          </div>
          <div>
            <Label htmlFor="guardianIncome">Guardian Income (₹)</Label>
            <Input id="guardianIncome" type="number" value={loanForm.guardianIncome} onChange={(e) => setLoanForm({...loanForm, guardianIncome: e.target.value})} placeholder="Guardian income" min="0" />
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Retired' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h5 className="sm:col-span-2 font-medium text-gray-800 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Retired Person Details
          </h5>
          <div>
            <Label htmlFor="previousEmployer">Previous Employer *</Label>
            <Input id="previousEmployer" className={inputClass('previousEmployer')} value={loanForm.previousEmployer} onChange={(e) => setLoanForm({...loanForm, previousEmployer: e.target.value})} placeholder="Last employer name" />
            {formErrors.previousEmployer && <p className="text-xs text-red-500 mt-1">{formErrors.previousEmployer}</p>}
          </div>
          <div>
            <Label htmlFor="designation">Last Designation</Label>
            <Input id="designation" value={loanForm.designation} onChange={(e) => setLoanForm({...loanForm, designation: e.target.value})} placeholder="Last position" />
          </div>
          <div>
            <Label htmlFor="retirementDate">Retirement Date</Label>
            <Input id="retirementDate" type="date" value={loanForm.retirementDate} onChange={(e) => setLoanForm({...loanForm, retirementDate: e.target.value})} />
          </div>
          <div>
            <Label htmlFor="pensionAmount">Monthly Pension (₹) *</Label>
            <Input id="pensionAmount" type="number" className={inputClass('pensionAmount')} value={loanForm.pensionAmount} onChange={(e) => setLoanForm({...loanForm, pensionAmount: e.target.value})} placeholder="Pension amount" min="0" />
            {formErrors.pensionAmount && <p className="text-xs text-red-500 mt-1">{formErrors.pensionAmount}</p>}
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Other Monthly Income (₹)</Label>
            <Input id="monthlyIncome" type="number" value={loanForm.monthlyIncome} onChange={(e) => setLoanForm({...loanForm, monthlyIncome: e.target.value})} placeholder="Other income" min="0" />
          </div>
        </div>
      )}

      {loanForm.employmentType === 'Unemployed' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
          <h5 className="sm:col-span-2 font-medium text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Unemployed Details
          </h5>
          <div>
            <Label htmlFor="sourceOfFunds">Source of Funds *</Label>
            <Select value={loanForm.sourceOfFunds} onValueChange={(v) => setLoanForm({...loanForm, sourceOfFunds: v})}>
              <SelectTrigger className={inputClass('sourceOfFunds')}><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Family Support">Family Support</SelectItem>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Rental Income">Rental Income</SelectItem>
                <SelectItem value="Investment">Investment Returns</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.sourceOfFunds && <p className="text-xs text-red-500 mt-1">{formErrors.sourceOfFunds}</p>}
          </div>
          <div>
            <Label htmlFor="monthlySupportAmount">Monthly Support Amount (₹)</Label>
            <Input id="monthlySupportAmount" type="number" value={loanForm.monthlySupportAmount} onChange={(e) => setLoanForm({...loanForm, monthlySupportAmount: e.target.value})} placeholder="Amount" min="0" />
          </div>
          <div>
            <Label htmlFor="supportProviderName">Support Provider Name</Label>
            <Input id="supportProviderName" value={loanForm.supportProviderName} onChange={(e) => setLoanForm({...loanForm, supportProviderName: e.target.value})} placeholder="Who supports you" />
          </div>
        </div>
      )}
    </div>
  );
}
