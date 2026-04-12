'use client';

import { Label } from '@/components/ui/label';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { User, FileSearch, MapPin, Banknote, Users, Upload, FileText, CheckCircle, Info, AlertCircle, Sparkles, Car, Loader2, Briefcase, Building, Clock, Navigation, ExternalLink } from 'lucide-react';
import GoldLoanReceipt from '@/components/loan/GoldLoanReceipt';
import VehicleLoanReceipt from '@/components/loan/VehicleLoanReceipt';
import { toast } from '@/hooks/use-toast';
import EmploymentStepContent from './EmploymentStepContent';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
  requestedTenure?: number; requestedInterestRate?: number;
  currentHandlerId?: string;
  title?: string; firstName?: string; lastName?: string; fatherName?: string;
  panNumber?: string; aadhaarNumber?: string; dateOfBirth?: string;
  employmentType?: string; employerName?: string; monthlyIncome?: number;
  bankAccountNumber?: string; bankIfsc?: string; bankName?: string;
  address?: string; city?: string; state?: string; pincode?: string;
}

interface FormErrors {
  [key: string]: string;
}

interface LoanFormData {
  title: string; firstName: string; lastName: string; middleName: string; fatherName: string; motherName: string;
  dateOfBirth: string; gender: string; maritalStatus: string; nationality: string;
  panNumber: string; aadhaarNumber: string; panVerified: boolean; aadhaarVerified: boolean;
  address: string; city: string; state: string; pincode: string; phone: string;
  employmentType: string; employerName: string; employerAddress: string; designation: string;
  yearsInEmployment: string; totalWorkExperience: string; monthlyIncome: string; annualIncome: string;
  businessName: string; businessType: string; yearsInBusiness: string; annualTurnover: string; businessAddress: string;
  companyName: string; companyType: string; yearsInOperation: string; annualRevenue: string; numberOfEmployees: string;
  professionType: string; practiceName: string; yearsOfPractice: string; professionalRegNo: string;
  previousEmployer: string; retirementDate: string; pensionAmount: string;
  spouseName: string; spouseOccupation: string; spouseIncome: string; familyIncome: string;
  institutionName: string; courseProgram: string; expectedCompletion: string; guardianName: string; guardianIncome: string;
  sourceOfFunds: string; monthlySupportAmount: string; supportProviderName: string;
  officePhone: string; officeEmail: string;
  bankAccountNumber: string; bankIfsc: string; bankName: string; accountType: string; bankVerified: boolean;
  verificationRemarks: string; riskScore: number; fraudFlag: boolean; visitDate: string; visitRemarks: string;
  ref1Name: string; ref1Phone: string; ref1Relation: string; ref1Address: string;
  ref2Name: string; ref2Phone: string; ref2Relation: string; ref2Address: string;
  creditScore: number;
  applicantSignature: string;
  // GPS Location
  gpsLatitude: string;
  gpsLongitude: string;
  gpsAddress: string;
  gpsAccuracy: string;
  gpsCapturedAt: string;
}

interface GoldLoanData {
  grossWeight?: number;
  netWeight?: number;
  goldRate?: number;
  valuationAmount?: number;
  loanAmount?: number;
  ownerName?: string;
  goldItemPhoto?: string;
  karat?: number;
  numberOfItems?: number;
  itemDescription?: string;
  verificationDate?: string;
  verifiedBy?: string;
  remarks?: string;
}

interface VehicleLoanData {
  vehicleType?: string;
  vehicleNumber?: string;
  manufacturer?: string;
  model?: string;
  yearOfManufacture?: number;
  valuationAmount?: number;
  loanAmount?: number;
  ownerName?: string;
  rcBookPhoto?: string;
  vehiclePhoto?: string;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType?: string;
  color?: string;
  verificationDate?: string;
  verifiedBy?: string;
  remarks?: string;
}

interface UploadedDoc {
  url: string;
  name: string;
  uploading: boolean;
}

interface LoanFormStepContentProps {
  currentStep: number;
  loanForm: LoanFormData;
  setLoanForm: React.Dispatch<React.SetStateAction<LoanFormData>>;
  formErrors: FormErrors;
  selectedLoan: Loan | null;
  goldLoanData: Partial<GoldLoanData>;
  setGoldLoanData: React.Dispatch<React.SetStateAction<Partial<GoldLoanData>>>;
  vehicleLoanData: Partial<VehicleLoanData>;
  setVehicleLoanData: React.Dispatch<React.SetStateAction<Partial<VehicleLoanData>>>;
  uploadedDocs: Record<string, UploadedDoc>;
  setUploadedDocs: React.Dispatch<React.SetStateAction<Record<string, UploadedDoc>>>;
  uploadingDoc: string | null;
  setUploadingDoc: React.Dispatch<React.SetStateAction<string | null>>;
  submitError: string | null;
  userId?: string;
}

// Helper function to check if loan type is Gold Loan
const isGoldLoan = (loanType: string): boolean => {
  const upperType = loanType?.toUpperCase() || '';
  return upperType === 'GOLD' || upperType.includes('GOLD');
};

// Helper function to check if loan type is Vehicle Loan
const isVehicleLoan = (loanType: string): boolean => {
  const upperType = loanType?.toUpperCase() || '';
  return upperType === 'VEHICLE' || upperType.includes('VEHICLE');
};

// Document types
const DOCUMENT_TYPES = [
  { id: 'pan_card', name: 'PAN Card', desc: 'Front side', required: true },
  { id: 'aadhaar_front', name: 'Aadhaar Front', desc: 'Front side', required: true },
  { id: 'aadhaar_back', name: 'Aadhaar Back', desc: 'Back side', required: true },
  { id: 'income_proof', name: 'Income Proof', desc: 'Salary slip/ITR', required: true },
  { id: 'address_proof', name: 'Address Proof', desc: 'Utility bill', required: false },
  { id: 'photo', name: 'Photo', desc: 'Passport size', required: false },
  { id: 'election_card', name: 'Election Card', desc: 'Voter ID', required: false },
  { id: 'house_photo', name: 'House Photo', desc: 'Residence photo', required: false },
  { id: 'guarantor_photo', name: 'Guarantor Photo', desc: 'Guarantor passport photo', required: false },
  { id: 'passbook_photo', name: 'Passbook Photo', desc: 'Bank passbook front page', required: false },
];

export default function LoanFormStepContent({
  currentStep,
  loanForm,
  setLoanForm,
  formErrors,
  selectedLoan,
  goldLoanData,
  setGoldLoanData,
  vehicleLoanData,
  setVehicleLoanData,
  uploadedDocs,
  setUploadedDocs,
  uploadingDoc,
  setUploadingDoc,
  submitError,
  userId,
}: LoanFormStepContentProps) {
  
  const inputClass = (field: string) => `w-full ${formErrors[field] ? 'border-red-500 focus-visible:ring-red-500' : ''}`;

  // Handle document upload
  const handleDocumentUpload = async (documentType: string, file: File) => {
    if (!selectedLoan) return;
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid File Type', 
        description: 'Only images (PNG, JPG, WEBP) and PDF files are allowed.', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: 'File Too Large', 
        description: 'Maximum file size is 10MB.', 
        variant: 'destructive' 
      });
      return;
    }
    
    setUploadingDoc(documentType);
    setUploadedDocs(prev => ({
      ...prev,
      [documentType]: { url: '', name: file.name, uploading: true }
    }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('loanId', selectedLoan.id);
      formData.append('uploadedBy', userId || '');
      
      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setUploadedDocs(prev => ({
        ...prev,
        [documentType]: { url: data.url, name: file.name, uploading: false }
      }));
      
      toast({ 
        title: 'Upload Successful', 
        description: `${DOCUMENT_TYPES.find(d => d.id === documentType)?.name || documentType} uploaded successfully.` 
      });
    } catch (error) {
      setUploadedDocs(prev => {
        const newDocs = { ...prev };
        delete newDocs[documentType];
        return newDocs;
      });
      toast({ 
        title: 'Upload Failed', 
        description: error instanceof Error ? error.message : 'Failed to upload document.', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  // Remove uploaded document
  const handleRemoveDocument = (documentType: string) => {
    setUploadedDocs(prev => {
      const newDocs = { ...prev };
      delete newDocs[documentType];
      return newDocs;
    });
    toast({ title: 'Document Removed', description: 'The document has been removed.' });
  };

  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Personal Information</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Select value={loanForm.title} onValueChange={(v) => setLoanForm({...loanForm, title: v})}>
                <SelectTrigger id="title"><SelectValue placeholder="Select title" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" className={inputClass('firstName')} value={loanForm.firstName} onChange={(e) => setLoanForm({...loanForm, firstName: e.target.value})} placeholder="Enter first name" />
              {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" value={loanForm.middleName} onChange={(e) => setLoanForm({...loanForm, middleName: e.target.value})} placeholder="Enter middle name" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" className={inputClass('lastName')} value={loanForm.lastName} onChange={(e) => setLoanForm({...loanForm, lastName: e.target.value})} placeholder="Enter last name" />
              {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
            </div>
            <div>
              <Label htmlFor="fatherName">Father's Name</Label>
              <Input id="fatherName" value={loanForm.fatherName} onChange={(e) => setLoanForm({...loanForm, fatherName: e.target.value})} placeholder="Enter father's name" />
            </div>
            <div>
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input id="motherName" value={loanForm.motherName} onChange={(e) => setLoanForm({...loanForm, motherName: e.target.value})} placeholder="Enter mother's name" />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={loanForm.dateOfBirth} onChange={(e) => setLoanForm({...loanForm, dateOfBirth: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={loanForm.gender} onValueChange={(v) => setLoanForm({...loanForm, gender: v})}>
                <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select value={loanForm.maritalStatus} onValueChange={(v) => setLoanForm({...loanForm, maritalStatus: v})}>
                <SelectTrigger id="maritalStatus"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" value={loanForm.nationality} onChange={(e) => setLoanForm({...loanForm, nationality: e.target.value})} />
            </div>
          </div>
        </div>
      );

    case 2:
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [gpsLoading, setGpsLoading] = useState(false);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [gpsError, setGpsError] = useState<string | null>(null);

      const captureGPS = () => {
        if (!navigator.geolocation) {
          setGpsError('Geolocation is not supported by this browser.');
          return;
        }
        setGpsLoading(true);
        setGpsError(null);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const now = new Date().toLocaleString('en-IN');
            // Reverse geocode using OpenStreetMap Nominatim (free, no key)
            let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                { headers: { 'Accept-Language': 'en' } }
              );
              const data = await res.json();
              if (data.display_name) address = data.display_name;
            } catch { /* use coordinate fallback */ }
            setLoanForm(prev => ({
              ...prev,
              gpsLatitude: String(latitude.toFixed(6)),
              gpsLongitude: String(longitude.toFixed(6)),
              gpsAddress: address,
              gpsAccuracy: `±${Math.round(accuracy)}m`,
              gpsCapturedAt: now,
            }));
            setGpsLoading(false);
          },
          (err) => {
            setGpsError(
              err.code === 1 ? 'Location access denied. Please allow location in browser settings.' :
              err.code === 2 ? 'Location unavailable. Please try again.' :
              'Location request timed out.'
            );
            setGpsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Contact &amp; Address</h4>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Full Address *</Label>
              <Textarea id="address" className={inputClass('address')} value={loanForm.address} onChange={(e) => setLoanForm({...loanForm, address: e.target.value})} placeholder="Enter complete address" rows={3} />
              {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" className={inputClass('city')} value={loanForm.city} onChange={(e) => setLoanForm({...loanForm, city: e.target.value})} placeholder="Enter city" />
                {formErrors.city && <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>}
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input id="state" className={inputClass('state')} value={loanForm.state} onChange={(e) => setLoanForm({...loanForm, state: e.target.value})} placeholder="Enter state" />
                {formErrors.state && <p className="text-xs text-red-500 mt-1">{formErrors.state}</p>}
              </div>
              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input id="pincode" className={inputClass('pincode')} value={loanForm.pincode} onChange={(e) => setLoanForm({...loanForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6)})} placeholder="6-digit pincode" maxLength={6} />
                {formErrors.pincode && <p className="text-xs text-red-500 mt-1">{formErrors.pincode}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={loanForm.phone} onChange={(e) => setLoanForm({...loanForm, phone: e.target.value})} placeholder="10-digit mobile number" maxLength={10} />
              </div>
            </div>

            {/* ── GPS Location Capture ────────────────────────── */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-sm text-emerald-800">GPS Location Capture</span>
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Field Verification</Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={captureGPS}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Locating...</>
                  ) : (
                    <><Navigation className="h-3.5 w-3.5 mr-1.5" />{loanForm.gpsLatitude ? 'Re-capture' : 'Get Location'}</>
                  )}
                </Button>
              </div>

              {gpsError && (
                <Alert className="bg-red-50 border-red-200 py-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-xs">{gpsError}</AlertDescription>
                </Alert>
              )}

              {loanForm.gpsLatitude ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Latitude</p>
                      <p className="text-sm font-mono font-semibold text-gray-800">{loanForm.gpsLatitude}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Longitude</p>
                      <p className="text-sm font-mono font-semibold text-gray-800">{loanForm.gpsLongitude}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Detected Address</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{loanForm.gpsAddress}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-gray-400">Accuracy: {loanForm.gpsAccuracy} · {loanForm.gpsCapturedAt}</span>
                      <a
                        href={`https://www.google.com/maps?q=${loanForm.gpsLatitude},${loanForm.gpsLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />View on Map
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs text-emerald-700 font-medium">Location captured successfully</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Click "Get Location" to capture the applicant&apos;s current GPS coordinates. This helps verify the application location.</p>
              )}
            </div>
          </div>
        </div>
      );

    case 3:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileSearch className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">KYC Documents</h4>
          </div>
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              Enter valid PAN and Aadhaar numbers. Mark as verified after checking the documents.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="panNumber">PAN Number *</Label>
              <Input id="panNumber" className={inputClass('panNumber')} value={loanForm.panNumber} onChange={(e) => setLoanForm({...loanForm, panNumber: e.target.value.toUpperCase()})} placeholder="ABCDE1234F" maxLength={10} />
              {formErrors.panNumber && <p className="text-xs text-red-500 mt-1">{formErrors.panNumber}</p>}
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="panVerified" checked={loanForm.panVerified} onCheckedChange={(checked) => setLoanForm({...loanForm, panVerified: checked as boolean})} />
                <label htmlFor="panVerified" className="text-sm font-medium cursor-pointer">PAN Verified</label>
              </div>
            </div>
            <div>
              <Label htmlFor="aadhaarNumber">Aadhaar Number *</Label>
              <Input id="aadhaarNumber" className={inputClass('aadhaarNumber')} value={loanForm.aadhaarNumber} onChange={(e) => setLoanForm({...loanForm, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12)})} placeholder="123456789012" />
              {formErrors.aadhaarNumber && <p className="text-xs text-red-500 mt-1">{formErrors.aadhaarNumber}</p>}
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="aadhaarVerified" checked={loanForm.aadhaarVerified} onCheckedChange={(checked) => setLoanForm({...loanForm, aadhaarVerified: checked as boolean})} />
                <label htmlFor="aadhaarVerified" className="text-sm font-medium cursor-pointer">Aadhaar Verified</label>
              </div>
            </div>
          </div>
        </div>
      );

    case 4:
      return <EmploymentStepContent loanForm={loanForm} setLoanForm={setLoanForm} formErrors={formErrors} />;

    case 5:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Bank Details</h4>
          </div>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              Loan amount will be disbursed to this bank account. Verify details carefully.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankAccountNumber">Account Number *</Label>
              <Input id="bankAccountNumber" className={inputClass('bankAccountNumber')} value={loanForm.bankAccountNumber} onChange={(e) => setLoanForm({...loanForm, bankAccountNumber: e.target.value})} placeholder="Account number" />
              {formErrors.bankAccountNumber && <p className="text-xs text-red-500 mt-1">{formErrors.bankAccountNumber}</p>}
            </div>
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={loanForm.accountType} onValueChange={(v) => setLoanForm({...loanForm, accountType: v})}>
                <SelectTrigger id="accountType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bankIfsc">IFSC Code *</Label>
              <Input id="bankIfsc" className={inputClass('bankIfsc')} value={loanForm.bankIfsc} onChange={(e) => setLoanForm({...loanForm, bankIfsc: e.target.value.toUpperCase()})} placeholder="SBIN0001234" maxLength={11} />
              {formErrors.bankIfsc && <p className="text-xs text-red-500 mt-1">{formErrors.bankIfsc}</p>}
            </div>
            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input id="bankName" className={inputClass('bankName')} value={loanForm.bankName} onChange={(e) => setLoanForm({...loanForm, bankName: e.target.value})} placeholder="Bank name" />
              {formErrors.bankName && <p className="text-xs text-red-500 mt-1">{formErrors.bankName}</p>}
            </div>
            <div className="sm:col-span-2 pt-2">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Checkbox id="bankVerified" checked={loanForm.bankVerified} onCheckedChange={(checked) => setLoanForm({...loanForm, bankVerified: checked as boolean})} />
                <label htmlFor="bankVerified" className="text-sm font-medium cursor-pointer">Bank Account Verified (Check passed)</label>
              </div>
            </div>
          </div>
        </div>
      );

    case 6:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Guarantors</h4>
          </div>
          <p className="text-sm text-gray-500">Add at least two guarantors for verification purposes.</p>
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h5 className="font-medium mb-3 text-gray-700">Guarantor 1</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ref1Name">Full Name</Label>
                  <Input id="ref1Name" value={loanForm.ref1Name} onChange={(e) => setLoanForm({...loanForm, ref1Name: e.target.value})} placeholder="Reference name" />
                </div>
                <div>
                  <Label htmlFor="ref1Phone">Phone Number</Label>
                  <Input id="ref1Phone" className={inputClass('ref1Phone')} value={loanForm.ref1Phone} onChange={(e) => setLoanForm({...loanForm, ref1Phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} placeholder="10-digit number" maxLength={10} />
                  {formErrors.ref1Phone && <p className="text-xs text-red-500 mt-1">{formErrors.ref1Phone}</p>}
                </div>
                <div>
                  <Label htmlFor="ref1Relation">Relationship</Label>
                  <Select value={loanForm.ref1Relation} onValueChange={(v) => setLoanForm({...loanForm, ref1Relation: v})}>
                    <SelectTrigger id="ref1Relation"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family Member</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="neighbor">Neighbor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ref1Address">Address</Label>
                  <Input id="ref1Address" value={loanForm.ref1Address} onChange={(e) => setLoanForm({...loanForm, ref1Address: e.target.value})} placeholder="Address" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h5 className="font-medium mb-3 text-gray-700">Guarantor 2</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ref2Name">Full Name</Label>
                  <Input id="ref2Name" value={loanForm.ref2Name} onChange={(e) => setLoanForm({...loanForm, ref2Name: e.target.value})} placeholder="Reference name" />
                </div>
                <div>
                  <Label htmlFor="ref2Phone">Phone Number</Label>
                  <Input id="ref2Phone" className={inputClass('ref2Phone')} value={loanForm.ref2Phone} onChange={(e) => setLoanForm({...loanForm, ref2Phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} placeholder="10-digit number" maxLength={10} />
                  {formErrors.ref2Phone && <p className="text-xs text-red-500 mt-1">{formErrors.ref2Phone}</p>}
                </div>
                <div>
                  <Label htmlFor="ref2Relation">Relationship</Label>
                  <Select value={loanForm.ref2Relation} onValueChange={(v) => setLoanForm({...loanForm, ref2Relation: v})}>
                    <SelectTrigger id="ref2Relation"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family Member</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="neighbor">Neighbor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ref2Address">Address</Label>
                  <Input id="ref2Address" value={loanForm.ref2Address} onChange={(e) => setLoanForm({...loanForm, ref2Address: e.target.value})} placeholder="Address" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 7:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Document Upload</h4>
          </div>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              Upload clear scanned copies or photos. Supported formats: PNG, JPG, WEBP, PDF. Max size: 10MB.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {DOCUMENT_TYPES.map((doc) => {
              const uploaded = uploadedDocs[doc.id];
              const isUploading = uploadingDoc === doc.id;
              
              return (
                <div key={doc.id} className="relative">
                  <input
                    type="file"
                    id={`doc-${doc.id}`}
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(doc.id, file);
                      e.target.value = ''; // Reset for re-upload
                    }}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor={`doc-${doc.id}`}
                    className={`block p-4 border-2 rounded-xl text-center transition-all cursor-pointer ${
                      uploaded
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                    } ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {uploaded ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                        <p className="text-sm font-medium text-emerald-700">{doc.name}</p>
                        <p className="text-xs text-emerald-600 truncate max-w-full">{uploaded.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveDocument(doc.id);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
                        <p className="text-sm font-medium text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.desc}</p>
                        {doc.required && (
                          <span className="text-xs text-red-500 mt-1">*Required</span>
                        )}
                      </div>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
          
          {/* Upload Summary */}
          {Object.keys(uploadedDocs).length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>{Object.keys(uploadedDocs).length}</strong> of {DOCUMENT_TYPES.filter(d => d.required).length} required documents uploaded
              </p>
            </div>
          )}
        </div>
      );

    case 8:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Applicant Signature</h4>
          </div>
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              The applicant can sign below using mouse or touch. This signature will be included in the loan application form.
            </AlertDescription>
          </Alert>
          
          {/* Signature Canvas */}
          <div className="space-y-3">
            <Label>Applicant Signature</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
              <canvas 
                id="signatureCanvas"
                className="w-full h-40 bg-white border border-gray-200 rounded-lg cursor-crosshair"
                onMouseDown={(e) => {
                  const canvas = e.target as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#1a1a1a';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    const rect = canvas.getBoundingClientRect();
                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                  }
                }}
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return;
                  const canvas = e.target as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    const rect = canvas.getBoundingClientRect();
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.stroke();
                  }
                }}
                onMouseUp={() => {
                  const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
                  if (canvas) {
                    const dataUrl = canvas.toDataURL();
                    setLoanForm({...loanForm, applicantSignature: dataUrl});
                  }
                }}
                onTouchStart={(e) => {
                  const canvas = e.target as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#1a1a1a';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                  }
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const canvas = e.target as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    ctx.stroke();
                  }
                }}
                onTouchEnd={() => {
                  const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
                  if (canvas) {
                    const dataUrl = canvas.toDataURL();
                    setLoanForm({...loanForm, applicantSignature: dataUrl});
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      setLoanForm({...loanForm, applicantSignature: ''});
                    }
                  }
                }}
              >
                Clear Signature
              </Button>
              {loanForm.applicantSignature && (
                <Badge className="bg-green-100 text-green-700">Signature Captured</Badge>
              )}
            </div>
          </div>
          
          {/* Declaration */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-2">
              <Checkbox id="declaration" className="mt-1" />
              <label htmlFor="declaration" className="text-sm text-gray-700">
                I hereby declare that the information provided above is true and correct to the best of my knowledge. 
                I understand that providing false information may result in rejection of my loan application and/or 
                legal action.
              </label>
            </div>
          </div>
        </div>
      );

    case 9:
      // This step is only for GOLD and VEHICLE loans
      // For other loan types, this case won't be reached
      if (isGoldLoan(selectedLoan?.loanType || '')) {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-lg">Gold Item Details</h4>
            </div>
            <Alert className="bg-amber-50 border-amber-200 mb-4">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Please fill in the gold item details. This information is required for gold loan processing.
              </AlertDescription>
            </Alert>
            <GoldLoanReceipt 
              data={goldLoanData} 
              onChange={setGoldLoanData} 
            />
            {Object.keys(formErrors).length > 0 && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  Please fill in all required fields: Net Weight, Gold Rate, Loan Amount, and Owner Name.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      } else if (isVehicleLoan(selectedLoan?.loanType || '')) {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-lg">Vehicle Details</h4>
            </div>
            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Please fill in the vehicle details. This information is required for vehicle loan processing.
              </AlertDescription>
            </Alert>
            <VehicleLoanReceipt 
              data={vehicleLoanData} 
              onChange={setVehicleLoanData} 
            />
            {Object.keys(formErrors).length > 0 && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  Please fill in all required fields: Vehicle Type, Vehicle Number, Valuation Amount, and Loan Amount.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      }
      // For non-GOLD/VEHICLE loans, case 9 falls through to Review (case 10)
      // fall through intentionally
    case 10:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-lg">Review & Submit</h4>
          </div>
          
          {submitError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Verification Checklist */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h5 className="font-medium mb-3">Verification Checklist</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'PAN Verified', checked: loanForm.panVerified },
                { label: 'Aadhaar Verified', checked: loanForm.aadhaarVerified },
                { label: 'Bank Verified', checked: loanForm.bankVerified },
                { label: 'Employment Added', checked: !!loanForm.employmentType },
                { label: 'Address Filled', checked: !!loanForm.address },
                { label: 'Guarantors Added', checked: !!(loanForm.ref1Name || loanForm.ref2Name) },
                // Add collateral details check for GOLD/VEHICLE loans
                ...(isGoldLoan(selectedLoan?.loanType || '') ? [{ label: 'Gold Details Filled', checked: !!(goldLoanData.netWeight && goldLoanData.loanAmount) }] : []),
                ...(isVehicleLoan(selectedLoan?.loanType || '') ? [{ label: 'Vehicle Details Filled', checked: !!(vehicleLoanData.vehicleType && vehicleLoanData.loanAmount) }] : []),
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${item.checked ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={item.checked ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-gray-500">Applicant</p>
              <p className="font-medium">{loanForm.firstName} {loanForm.lastName}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-gray-500">PAN</p>
              <p className="font-medium">{loanForm.panNumber || 'N/A'}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-gray-500">Monthly Income</p>
              <p className="font-medium">{loanForm.monthlyIncome ? `₹${parseInt(loanForm.monthlyIncome).toLocaleString()}` : 'N/A'}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-gray-500">Employment</p>
              <p className="font-medium">{loanForm.employmentType || 'N/A'}</p>
            </div>
          </div>
          
          {/* Gold/Vehicle Loan Summary */}
          {selectedLoan?.loanType === 'GOLD' && goldLoanData.loanAmount && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h5 className="font-medium mb-2 text-amber-800">Gold Loan Summary</h5>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Net Weight</p>
                  <p className="font-medium">{goldLoanData.netWeight}g</p>
                </div>
                <div>
                  <p className="text-gray-500">Valuation</p>
                  <p className="font-medium">₹{(goldLoanData.valuationAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Loan Amount</p>
                  <p className="font-medium text-amber-700">₹{(goldLoanData.loanAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          
          {selectedLoan?.loanType === 'VEHICLE' && vehicleLoanData.loanAmount && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h5 className="font-medium mb-2 text-blue-800">Vehicle Loan Summary</h5>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Vehicle</p>
                  <p className="font-medium">{vehicleLoanData.vehicleType} - {vehicleLoanData.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Valuation</p>
                  <p className="font-medium">₹{(vehicleLoanData.valuationAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Loan Amount</p>
                  <p className="font-medium text-blue-700">₹{(vehicleLoanData.loanAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">Verification Remarks</Label>
            <Textarea id="remarks" value={loanForm.verificationRemarks} onChange={(e) => setLoanForm({...loanForm, verificationRemarks: e.target.value})} placeholder="Add any notes or remarks about the verification..." rows={3} />
            {formErrors.verificationRemarks && <p className="text-xs text-red-500 mt-1">{formErrors.verificationRemarks}</p>}
          </div>

          {/* Risk Assessment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="riskScore">Risk Score (0-100)</Label>
              <Input id="riskScore" type="number" min="0" max="100" value={loanForm.riskScore} onChange={(e) => setLoanForm({...loanForm, riskScore: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})} />
              <p className="text-xs text-gray-500 mt-1">0 = Low Risk, 100 = High Risk</p>
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <Checkbox id="fraudFlag" checked={loanForm.fraudFlag} onCheckedChange={(checked) => setLoanForm({...loanForm, fraudFlag: checked as boolean})} />
                <label htmlFor="fraudFlag" className="text-sm font-medium text-red-600 cursor-pointer">Flag as Potential Fraud</label>
              </div>
            </div>
          </div>

          {/* Credit Score */}
          <div className="mt-4">
            <Label htmlFor="creditScore">Credit Score</Label>
            <Input id="creditScore" type="number" min="300" max="900" placeholder="Enter credit score (300-900)" value={loanForm.creditScore || ''} onChange={(e) => setLoanForm({...loanForm, creditScore: parseInt(e.target.value) || 0})} />
            <p className="text-xs text-gray-500 mt-1">Customer's credit score (CIBIL score: 300-900)</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
