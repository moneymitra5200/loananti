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
  mirrorInterestRate?: number;
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
  paymentReference?: string;
  referenceNo: string;
  balanceDue: number;
  companyName: string;
  companyCode: string;
  // Payment type flags
  isInterestOnly?: boolean;
  isPrincipalOnly?: boolean;
  isPartialPayment?: boolean;
  isSplitPayment?: boolean;
  splitCashAmount?: number;
  splitOnlineAmount?: number;
  remainingDue?: number;
  isMirrorLoan?: boolean;
  // Admin-configurable receipt defaults (from Settings > Receipt Settings)
  receiptSettings?: {
    showCustomerName?: boolean;
    showFatherName?: boolean;
    showPhone?: boolean;
    showAddress?: boolean;
    showLoanAccount?: boolean;
    showEmiNumber?: boolean;
    showDueDate?: boolean;
    showPaymentDate?: boolean;
    showPrincipal?: boolean;
    showInterest?: boolean;
    showPenalty?: boolean;
    showTotalAmount?: boolean;
    showAmountInWords?: boolean;
    showPaymentMode?: boolean;
    showReferenceNo?: boolean;
    showBalanceDue?: boolean;
    showSplitBreakdown?: boolean;
    showRemainingDue?: boolean;
    showSignatureSection?: boolean;
    showCompanyStamp?: boolean;
    headerSubtitle?: string;
    footerText?: string;
    accentColor?: string;
  };
}

const EMIReceipt = forwardRef<HTMLDivElement, EMIReceiptProps>((props, ref) => {
  const {
    receiptNo, date, customerName, fatherName, phone, address,
    loanAccountNo, loanAmount, interestRate, tenure,
    emiNumber, totalEmis, dueDate, paymentDate,
    principalAmount, interestAmount,
    penaltyAmount = 0, penaltyWaived = 0,
    totalAmount, paymentMode, paymentReference, referenceNo,
    balanceDue, companyName, companyCode,
    isInterestOnly = false, isPrincipalOnly = false,
    isPartialPayment = false, isSplitPayment = false,
    splitCashAmount = 0, splitOnlineAmount = 0,
    remainingDue = 0,
    receiptSettings: rs = {},
  } = props;

  // Shorthand: default all toggles to true (admin can turn off in Settings)
  const show = {
    customerName:    rs.showCustomerName    ?? true,
    fatherName:      rs.showFatherName      ?? true,
    phone:           rs.showPhone           ?? true,
    address:         rs.showAddress         ?? true,
    loanAccount:     rs.showLoanAccount     ?? true,
    emiNumber:       rs.showEmiNumber       ?? true,
    dueDate:         rs.showDueDate         ?? true,
    paymentDate:     rs.showPaymentDate     ?? true,
    principal:       rs.showPrincipal       ?? true,
    interest:        rs.showInterest        ?? true,
    penalty:         rs.showPenalty         ?? true,
    totalAmount:     rs.showTotalAmount     ?? true,
    amountInWords:   rs.showAmountInWords   ?? true,
    paymentMode:     rs.showPaymentMode     ?? true,
    referenceNo:     rs.showReferenceNo     ?? true,
    balanceDue:      rs.showBalanceDue      ?? true,
    splitBreakdown:  rs.showSplitBreakdown  ?? true,
    remainingDue:    rs.showRemainingDue    ?? true,
    signatureSection:rs.showSignatureSection?? true,
    companyStamp:    rs.showCompanyStamp    ?? true,
  };
  const accentColor = rs.accentColor || '#1e40af';
  const headerSubtitle = rs.headerSubtitle || 'Your Trusted Financial Partner';
  const footerText = rs.footerText || 'This is a computer generated receipt.';

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

  // Determine payment type label + color
  const paymentTypeLabel = isInterestOnly
    ? 'INTEREST ONLY'
    : isPrincipalOnly
    ? 'PRINCIPAL ONLY'
    : isPartialPayment
    ? 'PARTIAL PAYMENT'
    : isSplitPayment
    ? 'SPLIT PAYMENT'
    : 'FULL EMI PAYMENT';

  const paymentTypeBg = isInterestOnly
    ? '#eff6ff'
    : isPrincipalOnly
    ? '#fef2f2'
    : isPartialPayment
    ? '#fff7ed'
    : isSplitPayment
    ? '#f5f3ff'
    : '#f0fdf4';

  const paymentTypeColor = isInterestOnly
    ? '#1d4ed8'
    : isPrincipalOnly
    ? '#dc2626'
    : isPartialPayment
    ? '#ea580c'
    : isSplitPayment
    ? '#7c3aed'
    : '#16a34a';

  const row = (label: string, value: string, bold = false, color?: string) => (
    <div style={{ display: 'flex', marginBottom: '1.5mm', alignItems: 'baseline' }}>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color: color || '#222', fontSize: '9pt', width: '58%', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color: color || '#222', fontSize: '9pt', textAlign: 'left', flex: 1 }}>{value}</span>
    </div>
  );

  const netPenalty = Math.max(0, penaltyAmount - penaltyWaived);

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
      <div style={{ border: `2px solid ${accentColor}`, borderRadius: '3px', padding: '4mm', boxSizing: 'border-box' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', borderBottom: `1px solid ${accentColor}`, paddingBottom: '2mm', marginBottom: '2mm' }}>
          <div style={{ fontSize: '14pt', fontWeight: 'bold', color: accentColor, letterSpacing: '0.5px' }}>
            {companyName.toUpperCase()}
          </div>
          <div style={{ fontSize: '8pt', color: '#666', marginTop: '0.5mm' }}>
            {headerSubtitle}
          </div>
        </div>

        {/* ── Title + Payment Type Badge ── */}
        <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
          <div style={{ fontSize: '11pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '1.5mm' }}>
            EMI PAYMENT RECEIPT
          </div>
          <div style={{
            display: 'inline-block',
            backgroundColor: paymentTypeBg,
            border: `1.5px solid ${paymentTypeColor}`,
            borderRadius: '3px',
            padding: '1mm 4mm',
            fontSize: '8.5pt',
            fontWeight: 'bold',
            color: paymentTypeColor,
            letterSpacing: '0.5px',
          }}>
            {paymentTypeLabel}
          </div>
        </div>

        {/* ── Receipt No & Date ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', paddingBottom: '1.5mm', borderBottom: '1px solid #ccc' }}>
          <span style={{ fontSize: '8.5pt' }}><strong>Receipt No:</strong> <span style={{ color: accentColor, fontWeight: 'bold' }}>{receiptNo}</span></span>
          <span style={{ fontSize: '8.5pt' }}><strong>Date:</strong> <span style={{ color: accentColor }}>{fmtDate(date)}</span></span>
        </div>

        {/* ── Customer Info ── */}
        <div style={{ marginBottom: '2mm' }}>
          {show.customerName && row('Customer Name:', customerName)}
          {show.fatherName && row('Father / Husband Name:', fatherName || '—')}
          {show.phone && phone && row('Phone:', phone)}
          {show.address && address && row('Address:', address)}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
            {show.referenceNo && <span style={{ fontSize: '9pt' }}><strong>Reference No:</strong> <span style={{ color: accentColor }}>{referenceNo || paymentReference || '—'}</span></span>}
            <span style={{ fontSize: '9pt' }}><strong>Customer ID:</strong> {companyCode}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #aaa', marginBottom: '2mm' }} />

        {/* ── Loan & EMI Details ── */}
        <div style={{ marginBottom: '2mm' }}>
          {show.loanAccount && row('Loan Account No:', loanAccountNo)}
          {show.emiNumber && row('EMI Number:', `${emiNumber} of ${totalEmis}`)}
          {show.dueDate && row('Due Date:', fmtDate(dueDate))}
          {show.paymentDate && row('Payment Date:', fmtDate(paymentDate))}
        </div>

        <div style={{ borderTop: '1px solid #aaa', marginBottom: '2mm' }} />

        {/* ── Payment Breakdown ── */}
        <div style={{ marginBottom: '2mm' }}>

          {isInterestOnly ? (
            <>
              {show.interest && row('Interest Collected:', fmt(interestAmount), false, '#1d4ed8')}
              {show.principal && row('Principal:', 'Deferred to next EMI', false, '#6b7280')}
            </>
          ) : isPrincipalOnly ? (
            <>
              {show.principal && row('Principal Collected:', fmt(principalAmount), false, '#dc2626')}
              {show.interest && row('Interest:', 'Written off (Irrecoverable Debt)', false, '#6b7280')}
            </>
          ) : isPartialPayment ? (
            <>
              {show.principal && row('Principal (Partial):', fmt(principalAmount))}
              {show.interest && row('Interest (Partial):', fmt(interestAmount))}
              {show.remainingDue && remainingDue > 0 && row('Remaining Due:', fmt(remainingDue), false, '#ea580c')}
            </>
          ) : (
            <>
              {show.principal && row('Principal Amount:', fmt(principalAmount))}
              {show.interest && row('Interest Amount:', fmt(interestAmount))}
            </>
          )}

          {/* Penalty rows — only if admin enabled AND penalty exists */}
          {show.penalty && penaltyAmount > 0 && row('Penalty Charged:', fmt(penaltyAmount), false, '#dc2626')}
          {show.penalty && penaltyWaived > 0 && row('Penalty Waived:', '− ' + fmt(penaltyWaived), false, '#d97706')}
          {show.penalty && penaltyAmount > 0 && row('Net Penalty:', fmt(netPenalty), false, '#b91c1c')}

          {row('Service Charge:', '₹0.00')}

          {/* Total */}
          {show.totalAmount && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              borderTop: `2px solid ${accentColor}`, paddingTop: '1.5mm', marginTop: '1.5mm',
              backgroundColor: '#eff6ff', padding: '1.5mm 2mm',
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '10pt', color: accentColor }}>TOTAL AMOUNT PAID:</span>
              <span style={{ fontWeight: 'bold', fontSize: '12pt', color: accentColor }}>{fmt(totalAmount)}</span>
            </div>
          )}
        </div>

        {/* ── Split Breakdown (if SPLIT) ── */}
        {show.splitBreakdown && isSplitPayment && (splitCashAmount > 0 || splitOnlineAmount > 0) && (
          <div style={{ marginBottom: '2mm', padding: '1.5mm 2mm', backgroundColor: '#f5f3ff', border: '1px solid #7c3aed', borderRadius: '2px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8.5pt', color: '#7c3aed', marginBottom: '1mm' }}>
              Split Payment Breakdown:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '8.5pt' }}>Cash Portion:</span>
              <span style={{ fontSize: '8.5pt', fontWeight: 'bold' }}>{fmt(splitCashAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '8.5pt' }}>Online Portion:</span>
              <span style={{ fontSize: '8.5pt', fontWeight: 'bold' }}>{fmt(splitOnlineAmount)}</span>
            </div>
          </div>
        )}

        {/* ── Partial Remaining Notice ── */}
        {show.remainingDue && isPartialPayment && remainingDue > 0 && (
          <div style={{ marginBottom: '2mm', padding: '1.5mm 2mm', backgroundColor: '#fff7ed', border: '1px solid #ea580c', borderRadius: '2px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8.5pt', color: '#ea580c' }}>
              ⚠ Partial Payment — Balance Remaining: {fmt(remainingDue)}
            </div>
            <div style={{ fontSize: '7.5pt', color: '#9a3412' }}>
              Remaining amount is due. Please arrange payment as soon as possible.
            </div>
          </div>
        )}

        {/* ── Amount in Words ── */}
        {show.amountInWords && (
          <div style={{ marginBottom: '2mm', padding: '1.5mm 2mm', backgroundColor: '#fefce8', border: '1px solid #ca8a04' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8.5pt' }}>Amount in Words: </span>
            <span style={{ fontStyle: 'italic', fontSize: '8.5pt' }}>{toWords(totalAmount)} Rupees Only</span>
          </div>
        )}

        {/* ── Payment Mode & Balance ── */}
        <div style={{ marginBottom: '2mm' }}>
          {show.paymentMode && row('Payment Mode:', isSplitPayment ? 'SPLIT (Cash + Online)' : paymentMode)}
          {show.referenceNo && (paymentReference || referenceNo) && !isSplitPayment &&
            row('Transaction Ref:', paymentReference || referenceNo)}
          {show.balanceDue && (
            <div style={{ display: 'flex', marginBottom: '1.5mm' }}>
              <span style={{ fontSize: '9pt', width: '58%', flexShrink: 0 }}><strong>Balance Due:</strong></span>
              <span style={{ fontSize: '9pt', fontWeight: 'bold', color: balanceDue > 0 ? '#dc2626' : '#16a34a', flex: 1 }}>{fmt(balanceDue)}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #aaa', marginBottom: '3mm' }} />

        {/* ── Signature Section ── */}
        {show.signatureSection && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2mm' }}>
            <div style={{ textAlign: 'center', width: show.companyStamp ? '33%' : '48%' }}>
              <div style={{ height: '10mm', borderBottom: '1px solid #555', marginBottom: '1mm' }} />
              <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: accentColor }}>Borrower</div>
              <div style={{ fontSize: '7.5pt', color: '#555' }}>Signature of Borrower</div>
            </div>
            {show.companyStamp && (
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{
                  border: `1px dashed ${accentColor}`, borderRadius: '50%',
                  width: '18mm', height: '18mm',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto', color: accentColor, fontSize: '6.5pt', textAlign: 'center',
                }}>
                  COMPANY<br />STAMP
                </div>
              </div>
            )}
            <div style={{ textAlign: 'center', width: show.companyStamp ? '33%' : '48%' }}>
              <div style={{ height: '10mm', borderBottom: '1px solid #555', marginBottom: '1mm' }} />
              <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: accentColor }}>Authorized Signatory</div>
              <div style={{ fontSize: '7.5pt', color: '#555' }}>For {companyName}</div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: '3mm', textAlign: 'center', fontSize: '7.5pt', color: '#888', borderTop: '1px solid #ddd', paddingTop: '1.5mm' }}>
          {footerText} · {companyName} · {companyCode}
        </div>
      </div>
    </div>
  );
});

EMIReceipt.displayName = 'EMIReceipt';
export default EMIReceipt;
