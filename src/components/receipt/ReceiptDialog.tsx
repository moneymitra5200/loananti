'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, FileText, X } from 'lucide-react';
import EMIReceipt from './EMIReceipt';

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

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData | null;
}

export default function ReceiptDialog({ open, onOpenChange, receiptData }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !receiptData) return;
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [2, 2, 2, 2] as [number, number, number, number],
        filename: `Receipt_${receiptData.receiptNo.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.99 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm' as const, format: 'a5' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(receiptRef.current).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>EMI Payment Receipt — ${receiptData?.receiptNo}</title>
          <style>
            @page { size: A5; margin: 0; }
            body { margin: 0; padding: 0; }
            @media print { body { -webkit-print-color-adjust: exact; color-adjust: exact; } }
          </style>
        </head>
        <body>${receiptRef.current.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full-screen-ish dialog so user can read the whole receipt */}
      <DialogContent className="w-[98vw] max-w-3xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Sticky header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-blue-600" />
            EMI Receipt — {receiptData.receiptNo}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleDownloadPDF} disabled={downloading} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs px-3">
              <Download className="h-3.5 w-3.5 mr-1" />
              {downloading ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs px-3">
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable receipt area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6 flex justify-center">
          <div className="bg-white shadow-xl" style={{ width: '148mm' }}>
            <EMIReceipt
              ref={receiptRef}
              receiptNo={receiptData.receiptNo}
              date={receiptData.date}
              customerName={receiptData.customerName}
              fatherName={receiptData.fatherName}
              phone={receiptData.phone}
              address={receiptData.address}
              loanAccountNo={receiptData.loanAccountNo}
              loanAmount={receiptData.loanAmount}
              interestRate={receiptData.interestRate}
              mirrorInterestRate={receiptData.mirrorInterestRate}
              tenure={receiptData.tenure}
              emiNumber={receiptData.emiNumber}
              totalEmis={receiptData.totalEmis}
              dueDate={receiptData.dueDate}
              paymentDate={receiptData.paymentDate}
              principalAmount={receiptData.principalAmount}
              interestAmount={receiptData.interestAmount}
              penaltyAmount={receiptData.penaltyAmount}
              penaltyWaived={receiptData.penaltyWaived}
              totalAmount={receiptData.totalAmount}
              paymentMode={receiptData.paymentMode}
              referenceNo={receiptData.referenceNo}
              balanceDue={receiptData.balanceDue}
              companyName={receiptData.companyName}
              companyCode={receiptData.companyCode}
              isInterestOnly={receiptData.isInterestOnly}
            />
          </div>
        </div>

        {/* Footer hint */}
        <div className="text-center text-xs text-gray-400 py-2 border-t bg-white flex-shrink-0">
          Click Download PDF for a clean single-page A5 receipt
        </div>
      </DialogContent>
    </Dialog>
  );
}
