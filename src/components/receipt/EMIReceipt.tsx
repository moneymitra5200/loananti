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

const EMIReceipt = forwardRef<HTMLDivElement, EMIReceiptProps>((props, ref) => {
  const {
    receiptNo, date, customerName, fatherName, phone, address,
    loanAccountNo, loanAmount, emiNumber, totalEmis, dueDate, paymentDate,
    principalAmount, interestAmount, penaltyAmount = 0, penaltyWaived = 0,
    totalAmount, paymentMode, referenceNo, balanceDue,
    companyName, companyCode, isInterestOnly = false,
  } = props;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

  const fmtDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const toWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    if (num === 0) return 'Zero';
    const h = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + h(n % 100) : '');
    };
    const t = (n: number): string => {
      if (n < 1000) return h(n);
      if (n < 100000) return h(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + h(n % 1000) : '');
      if (n < 10000000) return h(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + t(n % 100000) : '');
      return h(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + t(n % 10000000) : '');
    };
    return t(Math.round(num));
  };

  const row = (label: string, value: string, bold = false, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', alignItems: 'center' }}>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color: color || '#222', fontSize: '9pt' }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color: color || '#222', fontSize: '9pt', textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div ref={ref} style={{
      width: '148mm',
      backgroundColor: '#fff',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9pt',
      color: '#111',
      boxSizing: 'border-box',
      padding: '4mm',
    }}>
      <div style={{ border: '2px solid #1e40af', borderRadius: '3px', padding: '4mm', boxSizing: 'border-box' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid #1e40af', paddingBottom: '2mm', marginBottom: '2mm' }}>
          <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1e40af', letterSpacing: '0.5px' }}>
            {companyName.toUpperCase()}
          </div>
          <div style={{ fontSize: '8pt', color: '#666', marginTop: '0.5mm' }}>
            Your Trusted Financial Partner
          </div>
        </div>

        {/* ── Title ── */}
        <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', marginBottom: '2mm', textDecoration: 'underline' }}>
          EMI PAYMENT RECEIPT
        </div>

        {/* ── Receipt No & Date ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', paddingBottom: '1.5mm', borderBottom: '1px solid #ccc' }}>
          <span style={{ fontSize: '8.5pt' }}><strong>Receipt No:</strong> <span style={{ color: '#1e40af', fontWeight: 'bold' }}>{receiptNo}</span></span>
          <span style={{ fontSize: '8.5pt' }}><strong>Date:</strong> <span style={{ color: '#1e40af' }}>{fmtDate(date)}</span></span>
        </div>

        {/* ── Customer Info ── */}
        <div style={{ marginBottom: '2mm' }}>
          {row('Customer Name:', customerName)}
          {row('Father / Husband Name:', fatherName || '—')}
          {phone && row('Phone:', phone)}
          {address && row('Address:', address)}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
            <span style={{ fontSize: '9pt' }}><strong>Reference No:</strong> <span style={{ color: '#1e40af' }}>{referenceNo || '—'}</span></span>
            <span style={{ fontSize: '9pt' }}><strong>Customer ID:</strong> {companyCode}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #aaa', marginBottom: '2mm' }} />

        {/* ── Loan Details ── */}
        <div style={{ marginBottom: '2mm' }}>
          {row('Loan Account No:', loanAccountNo)}
          {row('EMI Number:', `${emiNumber} of ${totalEmis}`)}
          {row('Due Date:', fmtDate(dueDate))}
          {row('Payment Date:', fmtDate(paymentDate))}
        </div>

        <div style={{ borderTop: '1px solid #aaa', marginBottom: '2mm' }} />

        {/* ── Payment Breakdown ── */}
        <div style={{ marginBottom: '2mm' }}>
          {row('Principal Amount:', fmt(isInterestOnly ? 0 : principalAmount))}
          {row('Interest Amount (Rate of Interest):', fmt(interestAmount))}
          {penaltyAmount > 0 && row('Penalty Charged:', fmt(penaltyAmount), false, '#dc2626')}
          {penaltyWaived > 0 && row('Penalty Waived:', '− ' + fmt(penaltyWaived), false, '#d97706')}
          {penaltyAmount > 0 && row('Net Penalty:', fmt(Math.max(0, penaltyAmount - penaltyWaived)), false, '#b91c1c')}
          {row('Service Charge:', '₹0.00')}
          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '2px solid #1e40af', paddingTop: '1.5mm', marginTop: '1.5mm',
            backgroundColor: '#eff6ff', padding: '1.5mm 2mm',
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '10pt', color: '#1e40af' }}>TOTAL AMOUNT:</span>
            <span style={{ fontWeight: 'bold', fontSize: '12pt', color: '#1e40af' }}>{fmt(totalAmount)}</span>
          </div>
        </div>

        {/* ── Amount in Words ── */}
        <div style={{ marginBottom: '2mm', padding: '1.5mm 2mm', backgroundColor: '#fefce8', border: '1px solid #ca8a04' }}>
          <span style={{ fontWeight: 'bold', fontSize: '8.5pt' }}>Amount in Words: </span>
          <span style={{ fontStyle: 'italic', fontSize: '8.5pt' }}>{toWords(totalAmount)} Rupees Only</span>
        </div>

        {/* ── Payment Mode & Balance ── */}
        <div style={{ marginBottom: '2mm' }}>
          {row('Payment Mode:', paymentMode)}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
            <span style={{ fontSize: '9pt' }}><strong>Balance Due:</strong></span>
            <span style={{ fontSize: '9pt', fontWeight: 'bold', color: balanceDue > 0 ? '#dc2626' : '#16a34a' }}>{fmt(balanceDue)}</span>
          </div>
        </div>

        {/* ── Interest Only Note ── */}
        {isInterestOnly && (
          <div style={{ marginBottom: '2mm', padding: '1.5mm', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', fontSize: '8pt' }}>
            <strong>Note:</strong> This is an Interest Only payment. Principal amount is deferred to a new EMI.
          </div>
        )}

        <div style={{ borderTop: '1px solid #aaa', marginBottom: '3mm' }} />

        {/* ── Signature Section — 4 columns: Borrower | Stamp | Lender ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2mm' }}>

          {/* Borrower Signature */}
          <div style={{ textAlign: 'center', width: '33%' }}>
            <div style={{ height: '10mm', borderBottom: '1px solid #555', marginBottom: '1mm' }} />
            <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#1e40af' }}>Borrower</div>
            <div style={{ fontSize: '7.5pt', color: '#555' }}>Signature of Borrower</div>
          </div>

          {/* Company Stamp */}
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{
              border: '1px dashed #1e40af', borderRadius: '50%',
              width: '18mm', height: '18mm',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', color: '#1e40af', fontSize: '6.5pt', textAlign: 'center',
            }}>
              COMPANY<br />STAMP
            </div>
          </div>

          {/* Authorized Signatory */}
          <div style={{ textAlign: 'center', width: '33%' }}>
            <div style={{ height: '10mm', borderBottom: '1px solid #555', marginBottom: '1mm' }} />
            <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#1e40af' }}>Authorized Signatory</div>
            <div style={{ fontSize: '7.5pt', color: '#555' }}>For {companyName}</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: '3mm', textAlign: 'center', fontSize: '7.5pt', color: '#888', borderTop: '1px solid #ddd', paddingTop: '1.5mm' }}>
          This is a computer generated receipt. · {companyName} · {companyCode}
        </div>
      </div>
    </div>
  );
});

EMIReceipt.displayName = 'EMIReceipt';
export default EMIReceipt;
