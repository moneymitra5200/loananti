'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, FileText } from 'lucide-react';
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
        margin: 0,
        filename: `Receipt_${receiptData.receiptNo.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a5' as const, orientation: 'portrait' as const }
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
          <title>EMI Payment Receipt</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${receiptRef.current.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            EMI Payment Receipt - {receiptData.receiptNo}
          </DialogTitle>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-shrink-0 pb-2 border-b">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '148mm' }}>
            <EMIReceipt ref={receiptRef} {...receiptData} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
