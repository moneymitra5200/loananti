'use client';

/**
 * Generate PDF with all EMI receipts - 4 receipts per page in a grid
 * This uses browser's print functionality with a hidden iframe
 */

interface ReceiptData {
  receiptNo: string;
  date: string;
  customerName: string;
  fatherName: string;
  phone: string;
  address: string;
  loanAccountNo: string;
  loanAmount: number;
  interestRate: number;
  emiNumber: number;
  totalEmis: number;
  dueDate: string;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount?: number;
  totalAmount: number;
  paymentMode: string;
  referenceNo: string;
  balanceDue: number;
  companyName: string;
  companyCode: string;
  isInterestOnly?: boolean;
}

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

function generateReceiptHTML(receipt: ReceiptData): string {
  return `
    <div style="width: 48%; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #111; box-sizing: border-box; padding: 3mm; page-break-inside: avoid;">
      <div style="border: 1.5px solid #1e40af; border-radius: 2px; padding: 3mm; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1px solid #1e40af; padding-bottom: 1.5mm; margin-bottom: 1.5mm;">
          <div style="font-size: 11pt; font-weight: bold; color: #1e40af; letter-spacing: 0.5px;">
            ${receipt.companyName.toUpperCase()}
          </div>
          <div style="font-size: 7pt; color: #666; margin-top: 0.5mm;">Your Trusted Financial Partner</div>
        </div>

        <!-- Title -->
        <div style="text-align: center; font-size: 9pt; font-weight: bold; margin-bottom: 1.5mm; text-decoration: underline;">
          EMI PAYMENT RECEIPT
        </div>

        <!-- Receipt No & Date -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 1.5mm; padding-bottom: 1mm; border-bottom: 1px solid #ccc; font-size: 7.5pt;">
          <span><strong>Receipt No:</strong> <span style="color: #1e40af; font-weight: bold;">${receipt.receiptNo}</span></span>
          <span><strong>Date:</strong> <span style="color: #1e40af;">${fmtDate(receipt.date)}</span></span>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Customer:</strong></span>
            <span>${receipt.customerName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>F/H Name:</strong></span>
            <span>${receipt.fatherName || '—'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Phone:</strong></span>
            <span>${receipt.phone}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Loan A/c No:</strong></span>
            <span style="color: #1e40af;">${receipt.loanAccountNo}</span>
          </div>
        </div>

        <div style="border-top: 1px solid #aaa; margin-bottom: 1.5mm;"></div>

        <!-- EMI Details -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>EMI Number:</strong></span>
            <span>${receipt.emiNumber} of ${receipt.totalEmis}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Due Date:</strong></span>
            <span>${fmtDate(receipt.dueDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Payment Date:</strong></span>
            <span>${fmtDate(receipt.paymentDate)}</span>
          </div>
        </div>

        <div style="border-top: 1px solid #aaa; margin-bottom: 1.5mm;"></div>

        <!-- Payment Breakdown -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span>Principal:</span>
            <span>${fmt(receipt.isInterestOnly ? 0 : receipt.principalAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span>Interest:</span>
            <span>${fmt(receipt.interestAmount)}</span>
          </div>
          ${receipt.penaltyAmount && receipt.penaltyAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm; color: #dc2626;">
            <span>Penalty:</span>
            <span>${fmt(receipt.penaltyAmount)}</span>
          </div>
          ` : ''}
          <!-- Total -->
          <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #1e40af; padding-top: 1mm; margin-top: 1mm; background: #eff6ff; padding: 1mm 2mm;">
            <span style="font-weight: bold; font-size: 8pt; color: #1e40af;">TOTAL:</span>
            <span style="font-weight: bold; font-size: 10pt; color: #1e40af;">${fmt(receipt.totalAmount)}</span>
          </div>
        </div>

        <!-- Amount in Words -->
        <div style="margin-bottom: 1.5mm; padding: 1mm 2mm; background: #fefce8; border: 1px solid #ca8a04; font-size: 7pt;">
          <span style="font-weight: bold;">In Words: </span>
          <span style="font-style: italic;">${toWords(receipt.totalAmount)} Rupees Only</span>
        </div>

        <!-- Payment Mode & Balance -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Payment Mode:</strong></span>
            <span>${receipt.paymentMode}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Balance Due:</strong></span>
            <span style="font-weight: bold; color: ${receipt.balanceDue > 0 ? '#dc2626' : '#16a34a'};">${fmt(receipt.balanceDue)}</span>
          </div>
        </div>

        ${receipt.isInterestOnly ? `
        <div style="margin-bottom: 1.5mm; padding: 1mm; background: #dbeafe; border: 1px solid #3b82f6; font-size: 7pt;">
          <strong>Note:</strong> Interest Only payment. Principal deferred.
        </div>
        ` : ''}

        <div style="border-top: 1px solid #aaa; margin-bottom: 2mm;"></div>

        <!-- Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 1.5mm;">
          <div style="text-align: center; width: 33%;">
            <div style="height: 8mm; border-bottom: 1px solid #555; margin-bottom: 0.5mm;"></div>
            <div style="font-size: 7pt; font-weight: bold; color: #1e40af;">Borrower</div>
          </div>
          <div style="text-align: center; width: 30%;">
            <div style="border: 1px dashed #1e40af; border-radius: 50%; width: 14mm; height: 14mm; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #1e40af; font-size: 5pt; text-align: center;">
              STAMP
            </div>
          </div>
          <div style="text-align: center; width: 33%;">
            <div style="height: 8mm; border-bottom: 1px solid #555; margin-bottom: 0.5mm;"></div>
            <div style="font-size: 7pt; font-weight: bold; color: #1e40af;">Authorized</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 2mm; text-align: center; font-size: 6pt; color: #888; border-top: 1px solid #ddd; padding-top: 1mm;">
          Computer generated receipt · ${receipt.companyName} · ${receipt.companyCode}
        </div>
      </div>
    </div>
  `;
}

export function generateAllReceiptsPDF(receipts: ReceiptData[], title: string = 'All EMI Receipts'): void {
  // Group receipts into pages of 4
  const receiptsPerPage = 4;
  const pages: ReceiptData[][] = [];
  
  for (let i = 0; i < receipts.length; i += receiptsPerPage) {
    pages.push(receipts.slice(i, i + receiptsPerPage));
  }

  // Generate HTML for each page
  const pagesHTML = pages.map((pageReceipts, pageIndex) => {
    // Create 2x2 grid
    let gridHTML = '';
    for (let i = 0; i < 4; i++) {
      if (pageReceipts[i]) {
        gridHTML += generateReceiptHTML(pageReceipts[i]);
      } else {
        // Empty placeholder to maintain grid structure
        gridHTML += '<div style="width: 48%;"></div>';
      }
    }

    return `
      <div class="page" style="width: 210mm; height: 297mm; padding: 8mm; box-sizing: border-box; ${pageIndex < pages.length - 1 ? 'page-break-after: always;' : ''}">
        <div style="display: flex; flex-wrap: wrap; gap: 4mm; justify-content: space-between; height: 100%; align-content: flex-start;">
          ${gridHTML}
        </div>
        <div style="position: absolute; bottom: 5mm; right: 8mm; font-size: 7pt; color: #999;">
          Page ${pageIndex + 1} of ${pages.length}
        </div>
      </div>
    `;
  });

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
        }
        .page {
          position: relative;
        }
        @media print {
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHTML.join('')}
    </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Open in new window for printing
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export default generateAllReceiptsPDF;
