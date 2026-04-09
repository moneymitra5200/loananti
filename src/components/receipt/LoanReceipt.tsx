'use client';

import { forwardRef } from 'react';

interface LoanReceiptProps {
  receiptNo: string;
  date: string;
  // Company Details
  companyName: string;
  companyCode: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  // Customer Details
  customerName: string;
  fatherName: string;
  customerPhone: string;
  customerAddress: string;
  customerAadhaar: string;
  customerPan: string;
  // Loan Details
  loanAccountNo: string;
  loanAmount: number;
  interestRate: number;
  interestType: string;
  tenure: number;
  emiAmount: number;
  totalInterest: number;
  totalAmount: number;
  disbursementDate: string;
  firstEmiDate: string;
  // Bank Details
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  // Additional
  purpose: string;
  witnessName: string;
  witnessPhone: string;
}

const LoanReceipt = forwardRef<HTMLDivElement, LoanReceiptProps>(({
  receiptNo,
  date,
  companyName,
  companyCode,
  companyAddress,
  companyPhone,
  companyEmail,
  customerName,
  fatherName,
  customerPhone,
  customerAddress,
  customerAadhaar,
  customerPan,
  loanAccountNo,
  loanAmount,
  interestRate,
  interestType,
  tenure,
  emiAmount,
  totalInterest,
  totalAmount,
  disbursementDate,
  firstEmiDate,
  bankName,
  bankAccountNo,
  bankIfsc,
  purpose,
  witnessName,
  witnessPhone
}, ref) => {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const convertHundreds = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertHundreds(n % 100) : '');
    };
    
    const convertThousands = (n: number): string => {
      if (n < 1000) return convertHundreds(n);
      if (n < 100000) return convertHundreds(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertHundreds(n % 1000) : '');
      if (n < 10000000) return convertHundreds(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convertThousands(n % 100000) : '');
      return convertHundreds(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convertThousands(n % 10000000) : '');
    };
    
    return convertThousands(Math.round(num));
  };

  return (
    <div ref={ref} style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '8mm',
      backgroundColor: '#fff',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10pt',
      color: '#000',
      boxSizing: 'border-box'
    }}>
      {/* Main Border */}
      <div style={{
        border: '2px solid #1e40af',
        borderRadius: '3px',
        padding: '5mm',
        boxSizing: 'border-box',
        height: '100%'
      }}>
        
        {/* Header - Company Info */}
        <div style={{
          textAlign: 'center',
          borderBottom: '2px solid #1e40af',
          paddingBottom: '4mm',
          marginBottom: '4mm'
        }}>
          <div style={{
            fontSize: '18pt',
            fontWeight: 'bold',
            color: '#1e40af',
            letterSpacing: '2px'
          }}>
            {companyName.toUpperCase()}
          </div>
          <div style={{ fontSize: '9pt', marginTop: '1mm', color: '#666' }}>
            {companyAddress}
          </div>
          <div style={{ fontSize: '9pt', color: '#666' }}>
            Phone: {companyPhone} | Email: {companyEmail}
          </div>
        </div>

        {/* Title */}
        <div style={{
          textAlign: 'center',
          fontSize: '14pt',
          fontWeight: 'bold',
          marginBottom: '4mm',
          textDecoration: 'underline'
        }}>
          LOAN DISBURSEMENT RECEIPT
        </div>

        {/* Receipt No and Date */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '3mm',
          paddingBottom: '2mm',
          borderBottom: '1px solid #000'
        }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>Receipt No: </span>
            <span style={{ color: '#1e40af', fontWeight: 'bold' }}>{receiptNo}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold' }}>Date: </span>
            <span style={{ color: '#1e40af' }}>{formatDate(date)}</span>
          </div>
        </div>

        {/* Customer Details Section */}
        <div style={{
          border: '1px solid #1e40af',
          padding: '3mm',
          marginBottom: '3mm',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '11pt',
            marginBottom: '2mm',
            color: '#1e40af'
          }}>
            BORROWER DETAILS
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold', width: '30%' }}>Borrower Name</td>
                <td style={{ padding: '1mm' }}>: {customerName}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Father/Husband Name</td>
                <td style={{ padding: '1mm' }}>: {fatherName}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Phone Number</td>
                <td style={{ padding: '1mm' }}>: {customerPhone}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Address</td>
                <td style={{ padding: '1mm' }}>: {customerAddress}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Aadhaar Number</td>
                <td style={{ padding: '1mm' }}>: {customerAadhaar || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>PAN Number</td>
                <td style={{ padding: '1mm' }}>: {customerPan || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Loan Details Section */}
        <div style={{
          border: '1px solid #1e40af',
          padding: '3mm',
          marginBottom: '3mm',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '11pt',
            marginBottom: '2mm',
            color: '#1e40af'
          }}>
            LOAN DETAILS
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold', width: '30%' }}>Loan Account No</td>
                <td style={{ padding: '1mm' }}>: {loanAccountNo}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Loan Amount</td>
                <td style={{ padding: '1mm' }}>: {formatCurrency(loanAmount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Interest Rate</td>
                <td style={{ padding: '1mm' }}>: {interestRate}% ({interestType})</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Tenure</td>
                <td style={{ padding: '1mm' }}>: {tenure} Months</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>EMI Amount</td>
                <td style={{ padding: '1mm' }}>: {formatCurrency(emiAmount)}/month</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Total Interest</td>
                <td style={{ padding: '1mm' }}>: {formatCurrency(totalInterest)}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Total Repayment</td>
                <td style={{ padding: '1mm' }}>: {formatCurrency(totalAmount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Disbursement Date</td>
                <td style={{ padding: '1mm' }}>: {formatDate(disbursementDate)}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>First EMI Date</td>
                <td style={{ padding: '1mm' }}>: {formatDate(firstEmiDate)}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Purpose</td>
                <td style={{ padding: '1mm' }}>: {purpose || 'Personal Loan'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div style={{
          marginBottom: '3mm',
          padding: '2mm',
          backgroundColor: '#fefce8',
          border: '1px solid #ca8a04'
        }}>
          <span style={{ fontWeight: 'bold' }}>Amount in Words: </span>
          <span style={{ fontStyle: 'italic' }}>
            {numberToWords(loanAmount)} Rupees Only
          </span>
        </div>

        {/* Bank Details Section */}
        <div style={{
          border: '1px solid #1e40af',
          padding: '3mm',
          marginBottom: '3mm',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '11pt',
            marginBottom: '2mm',
            color: '#1e40af'
          }}>
            BANK DETAILS (For EMI Payment)
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold', width: '30%' }}>Bank Name</td>
                <td style={{ padding: '1mm' }}>: {bankName || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Account Number</td>
                <td style={{ padding: '1mm' }}>: {bankAccountNo || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>IFSC Code</td>
                <td style={{ padding: '1mm' }}>: {bankIfsc || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Witness Details */}
        <div style={{
          border: '1px solid #ccc',
          padding: '3mm',
          marginBottom: '3mm'
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '11pt',
            marginBottom: '2mm'
          }}>
            WITNESS DETAILS
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold', width: '30%' }}>Witness Name</td>
                <td style={{ padding: '1mm' }}>: {witnessName || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '1mm', fontWeight: 'bold' }}>Witness Phone</td>
                <td style={{ padding: '1mm' }}>: {witnessPhone || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms & Conditions */}
        <div style={{
          marginBottom: '3mm',
          padding: '3mm',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ccc',
          fontSize: '9pt'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>TERMS & CONDITIONS:</div>
          <ol style={{ paddingLeft: '5mm', margin: 0 }}>
            <li>The borrower agrees to repay the loan as per the EMI schedule.</li>
            <li>Late payment will attract penalty charges as per company policy.</li>
            <li>The company reserves the right to take legal action for default.</li>
            <li>All disputes are subject to the jurisdiction of the local court.</li>
          </ol>
        </div>

        {/* Signatures Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8mm',
          paddingTop: '3mm'
        }}>
          {/* Borrower Signature */}
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{ marginBottom: '12mm' }}></div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2mm' }}>
              <span style={{ fontWeight: 'bold' }}>Borrower Signature</span>
            </div>
          </div>

          {/* Witness Signature */}
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{ marginBottom: '12mm' }}></div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2mm' }}>
              <span style={{ fontWeight: 'bold' }}>Witness Signature</span>
            </div>
          </div>

          {/* Company Stamp & Signature */}
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{
              border: '1px dashed #1e40af',
              borderRadius: '50%',
              width: '20mm',
              height: '20mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2mm',
              color: '#1e40af',
              fontSize: '7pt'
            }}>
              COMPANY<br/>STAMP
            </div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2mm' }}>
              <span style={{ fontWeight: 'bold', color: '#1e40af' }}>Authorized Signatory</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '5mm',
          textAlign: 'center',
          fontSize: '8pt',
          color: '#666',
          borderTop: '1px solid #ccc',
          paddingTop: '2mm'
        }}>
          This is a computer generated receipt. No signature required.
          <br />
          For any queries, please contact us at: {companyPhone} | {companyEmail}
        </div>
      </div>
    </div>
  );
});

LoanReceipt.displayName = 'LoanReceipt';

export default LoanReceipt;
