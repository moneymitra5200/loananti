'use client';

import { forwardRef } from 'react';

interface EMIReceiptProps {
  receiptNo: string;
  date: string;
  customerName: string;
  fatherName: string;
  phone: string;
  address: string;
  loanAccountNo: string;
  loanAmount: number;
  interestRate: number;
  mirrorInterestRate: number;
  tenure: number;
  emiNumber: number;
  totalEmis: number;
  dueDate: string;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount?: number;
  penaltyWaived?: number;
  totalAmount: number;
  paymentMode: string;
  referenceNo: string;
  balanceDue: number;
  companyName: string;
  companyCode: string;
  isInterestOnly?: boolean;
}

const EMIReceipt = forwardRef<HTMLDivElement, EMIReceiptProps>(({
  receiptNo,
  date,
  customerName,
  fatherName,
  phone,
  address,
  loanAccountNo,
  loanAmount,
  interestRate,
  mirrorInterestRate,
  tenure,
  emiNumber,
  totalEmis,
  dueDate,
  paymentDate,
  principalAmount,
  interestAmount,
  penaltyAmount = 0,
  penaltyWaived = 0,
  totalAmount,
  paymentMode,
  referenceNo,
  balanceDue,
  companyName,
  companyCode,
  isInterestOnly = false
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
      minHeight: '148mm',
      padding: '5mm',
      backgroundColor: '#fff',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11pt',
      color: '#000',
      boxSizing: 'border-box'
    }}>
      {/* Main Border - Blue solid border */}
      <div style={{
        border: '2px solid #1e40af',
        borderRadius: '3px',
        padding: '5mm',
        boxSizing: 'border-box'
      }}>
        
        {/* Header - Company Name Centered */}
        <div style={{
          textAlign: 'center',
          borderBottom: '1px solid #1e40af',
          paddingBottom: '3mm',
          marginBottom: '3mm'
        }}>
          <div style={{
            fontSize: '16pt',
            fontWeight: 'bold',
            color: '#1e40af',
            letterSpacing: '1px'
          }}>
            {companyName.toUpperCase()}
          </div>
          <div style={{
            fontSize: '9pt',
            color: '#666',
            marginTop: '1mm'
          }}>
            Your Trusted Financial Partner
          </div>
        </div>

        {/* Title - RECEIPT */}
        <div style={{
          textAlign: 'center',
          fontSize: '14pt',
          fontWeight: 'bold',
          marginBottom: '3mm',
          textDecoration: 'underline'
        }}>
          EMI PAYMENT RECEIPT
        </div>

        {/* Receipt No and Date Row */}
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

        {/* Customer Details */}
        <div style={{ marginBottom: '3mm' }}>
          <div style={{ marginBottom: '1.5mm' }}>
            <span style={{ fontWeight: 'bold' }}>Customer Name: </span>
            <span>{customerName}</span>
          </div>
          <div style={{ marginBottom: '1.5mm' }}>
            <span style={{ fontWeight: 'bold' }}>Father/Husband Name: </span>
            <span>{fatherName}</span>
          </div>
          <div style={{ marginBottom: '1.5mm' }}>
            <span style={{ fontWeight: 'bold' }}>Customer Address: </span>
            <span>{address}</span>
          </div>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Reference No: </span>
              <span style={{ color: '#1e40af' }}>{referenceNo}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Customer ID: </span>
              <span>{companyCode}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Line */}
        <div style={{ borderTop: '1px solid #000', marginBottom: '3mm' }}></div>

        {/* Loan Details */}
        <div style={{ marginBottom: '3mm' }}>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Loan Account No:</span>
            <span>{loanAccountNo}</span>
          </div>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>EMI Number:</span>
            <span>{emiNumber} of {totalEmis}</span>
          </div>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Due Date:</span>
            <span>{formatDate(dueDate)}</span>
          </div>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Payment Date:</span>
            <span>{formatDate(paymentDate)}</span>
          </div>
        </div>

        {/* Horizontal Line */}
        <div style={{ borderTop: '1px solid #000', marginBottom: '3mm' }}></div>

        {/* Payment Amount Details */}
        <div style={{ marginBottom: '3mm' }}>
          <div style={{ marginBottom: '2mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Principal Amount:</span>
            <span>{formatCurrency(isInterestOnly ? 0 : principalAmount)}</span>
          </div>
          <div style={{ marginBottom: '2mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Interest Amount (Rate Of Interest):</span>
            <span>{formatCurrency(interestAmount)}</span>
          </div>
          {penaltyAmount > 0 && (
            <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: '#dc2626' }}>Penalty Charged:</span>
              <span style={{ color: '#dc2626' }}>{formatCurrency(penaltyAmount)}</span>
            </div>
          )}
          {penaltyWaived > 0 && (
            <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: '#d97706' }}>Penalty Waived:</span>
              <span style={{ color: '#d97706' }}>− {formatCurrency(penaltyWaived)}</span>
            </div>
          )}
          {penaltyAmount > 0 && (
            <div style={{ marginBottom: '2mm', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>Net Penalty:</span>
              <span style={{ color: '#b91c1c' }}>{formatCurrency(Math.max(0, penaltyAmount - penaltyWaived))}</span>
            </div>
          )}
          <div style={{ marginBottom: '2mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Service Charge:</span>
            <span>₹0</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            borderTop: '2px solid #1e40af',
            paddingTop: '2mm',
            marginTop: '2mm',
            backgroundColor: '#eff6ff',
            padding: '2mm'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '12pt', color: '#1e40af' }}>TOTAL AMOUNT:</span>
            <span style={{ fontWeight: 'bold', fontSize: '14pt', color: '#1e40af' }}>{formatCurrency(totalAmount)}</span>
          </div>
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
            {numberToWords(totalAmount)} Rupees Only
          </span>
        </div>

        {/* Payment Mode and Balance */}
        <div style={{ marginBottom: '3mm' }}>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Payment Mode:</span>
            <span>{paymentMode}</span>
          </div>
          <div style={{ marginBottom: '1.5mm', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Balance Due:</span>
            <span style={{ color: balanceDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>

        {/* Interest Only Note */}
        {isInterestOnly && (
          <div style={{
            marginBottom: '3mm',
            padding: '2mm',
            backgroundColor: '#dbeafe',
            border: '1px solid #3b82f6',
            fontSize: '10pt'
          }}>
            <strong>Note:</strong> This is an Interest Only payment. Principal amount is deferred to a new EMI.
          </div>
        )}

        {/* Horizontal Line */}
        <div style={{ borderTop: '1px solid #000', marginBottom: '3mm' }}></div>

        {/* Signatures Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '5mm'
        }}>
          {/* Left Signature - Cashier */}
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ marginBottom: '10mm' }}></div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
              <span style={{ color: '#1e40af' }}>Cashier</span>
            </div>
            <div style={{ fontSize: '9pt', color: '#666' }}>Authorized Officer</div>
          </div>

          {/* Center - Company Stamp */}
          <div style={{ textAlign: 'center', width: '20%' }}>
            <div style={{
              border: '1px dashed #1e40af',
              borderRadius: '50%',
              width: '25mm',
              height: '25mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              color: '#1e40af',
              fontSize: '7pt',
              textAlign: 'center'
            }}>
              COMPANY<br/>STAMP
            </div>
          </div>

          {/* Right Signature - Manager */}
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ marginBottom: '10mm' }}></div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
              <span style={{ color: '#1e40af' }}>Manager</span>
            </div>
            <div style={{ fontSize: '9pt', color: '#666' }}>Authorized Officer</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '4mm',
          textAlign: 'center',
          fontSize: '8pt',
          color: '#666',
          borderTop: '1px solid #ccc',
          paddingTop: '2mm'
        }}>
          This is a computer generated receipt. No signature required.
        </div>
      </div>
    </div>
  );
});

EMIReceipt.displayName = 'EMIReceipt';

export default EMIReceipt;
