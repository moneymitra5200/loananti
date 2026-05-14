/**
 * Accounting Export Utilities
 * Supports: Excel (CSV/TSV), PDF (jsPDF), Image (html2canvas), Word (.doc)
 * GoI-ready formatting for NBFC financial statements
 */

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

// ─── CSV / EXCEL ──────────────────────────────────────────────────────────────
function csvRow(...cells: (string | number)[]): string {
  return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
}

function downloadCSV(rows: string[], filename: string) {
  const bom = '\uFEFF'; // UTF-8 BOM so Excel opens in Indian locale
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PROFIT & LOSS ────────────────────────────────────────────────────────────
export function exportProfitLossCSV(data: any, companyName: string, period: string) {
  const rows: string[] = [
    csvRow(`Profit & Loss Statement — ${companyName}`),
    csvRow(`Period: ${period}`),
    csvRow('Generated:', new Date().toLocaleString('en-IN')),
    csvRow(''),
    csvRow('', 'Dr Side (Expenses)', '', 'Cr Side (Income)'),
    csvRow('Particulars', 'Amount (₹)', 'Particulars', 'Amount (₹)'),
    csvRow('---', '---', '---', '---'),
  ];

  const income: any[] = data.income || [];
  const expenses: any[] = data.expenses || [];
  const maxLen = Math.max(income.length, expenses.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expenses[i] || { accountName: '', amount: 0 };
    const inc = income[i] || { accountName: '', amount: 0 };
    rows.push(csvRow(
      exp.accountName || '',
      exp.accountName ? exp.amount : '',
      inc.accountName || '',
      inc.accountName ? inc.amount : ''
    ));
  }

  const netProfit = (data.netProfit ?? (data.totalIncome - data.totalExpenses));
  const isProfit = netProfit >= 0;

  rows.push(csvRow('---', '---', '---', '---'));
  if (isProfit) {
    rows.push(csvRow('Net Profit (Cr)', netProfit, '', ''));
  } else {
    rows.push(csvRow('', '', 'Net Loss (Dr)', Math.abs(netProfit)));
  }
  rows.push(csvRow('TOTAL', data.totalExpenses + (isProfit ? netProfit : 0), 'TOTAL', data.totalIncome + (isProfit ? 0 : Math.abs(netProfit))));

  downloadCSV(rows, `ProfitLoss_${companyName}_${dateSuffix()}.csv`);
}

// ─── BALANCE SHEET ────────────────────────────────────────────────────────────
export function exportBalanceSheetCSV(data: any, companyName: string) {
  const rows: string[] = [
    csvRow(`Balance Sheet — ${companyName}`),
    csvRow(`As on: ${new Date().toLocaleDateString('en-IN')}`),
    csvRow('Generated:', new Date().toLocaleString('en-IN')),
    csvRow(''),
    csvRow('LIABILITIES & CAPITAL', 'Amount (₹)', 'ASSETS', 'Amount (₹)'),
    csvRow('---', '---', '---', '---'),
  ];

  const liabilities = [
    ...(data.liabilities || data.leftSide?.items || []),
    ...(data.equity || [])
  ];
  const assets = data.assets || data.rightSide?.items || [];
  const maxLen = Math.max(liabilities.length, assets.length);

  for (let i = 0; i < maxLen; i++) {
    const l = liabilities[i] || { accountName: '', amount: 0 };
    const a = assets[i] || { accountName: '', amount: 0 };
    rows.push(csvRow(
      l.accountName || l.name || '',
      (l.accountName || l.name) ? (l.amount || 0) : '',
      a.accountName || a.name || '',
      (a.accountName || a.name) ? (a.amount || 0) : ''
    ));
  }

  rows.push(csvRow('---', '---', '---', '---'));
  const totalL = data.totalLiabilities ?? data.leftSide?.total ?? 0;
  const totalE = data.totalEquity ?? 0;
  const totalA = data.totalAssets ?? data.rightSide?.total ?? 0;
  rows.push(csvRow('TOTAL', totalL + totalE, 'TOTAL', totalA));
  rows.push(csvRow(''));
  rows.push(csvRow('Balance Check:', Math.abs((totalL + totalE) - totalA) < 1 ? 'BALANCED ✓' : `DIFFERENCE: ${INR(Math.abs((totalL + totalE) - totalA))}`));

  downloadCSV(rows, `BalanceSheet_${companyName}_${dateSuffix()}.csv`);
}

// ─── TRIAL BALANCE ────────────────────────────────────────────────────────────
export function exportTrialBalanceCSV(data: any, companyName: string) {
  const rows: string[] = [
    csvRow(`Trial Balance — ${companyName}`),
    csvRow(`As on: ${new Date().toLocaleDateString('en-IN')}`),
    csvRow(''),
    csvRow('Account Code', 'Account Name', 'Account Type', 'Debit (₹)', 'Credit (₹)'),
    csvRow('---', '---', '---', '---', '---'),
  ];

  const items = data.trialBalance || data || [];
  let totalDr = 0, totalCr = 0;

  for (const item of items) {
    rows.push(csvRow(
      item.accountCode,
      item.accountName,
      item.accountType,
      item.debitBalance > 0 ? item.debitBalance : '',
      item.creditBalance > 0 ? item.creditBalance : ''
    ));
    totalDr += item.debitBalance || 0;
    totalCr += item.creditBalance || 0;
  }

  rows.push(csvRow('---', '---', '---', '---', '---'));
  rows.push(csvRow('TOTAL', '', '', totalDr, totalCr));
  rows.push(csvRow(''));
  rows.push(csvRow('Balanced:', Math.abs(totalDr - totalCr) < 0.01 ? 'YES ✓' : `NO — Difference: ${INR(Math.abs(totalDr - totalCr))}`));

  downloadCSV(rows, `TrialBalance_${companyName}_${dateSuffix()}.csv`);
}

// ─── PERSONAL LEDGER ─────────────────────────────────────────────────────────
export function exportPersonalLedgerCSV(entries: any[], customerName: string, companyName: string) {
  const rows: string[] = [
    csvRow(`Personal Ledger (Khata) — ${customerName}`),
    csvRow(`Company: ${companyName}`),
    csvRow(`Generated: ${new Date().toLocaleString('en-IN')}`),
    csvRow(''),
    csvRow('Date', 'Particulars', 'Voucher No', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'),
    csvRow('---', '---', '---', '---', '---', '---'),
  ];

  let balance = 0;
  for (const e of entries) {
    const dr = e.debitAmount || e.debit || 0;
    const cr = e.creditAmount || e.credit || 0;
    balance += dr - cr;
    rows.push(csvRow(
      e.date || e.entryDate || '',
      e.narration || e.description || '',
      e.voucherNo || e.referenceNo || '',
      dr || '',
      cr || '',
      balance
    ));
  }

  downloadCSV(rows, `PersonalLedger_${customerName}_${dateSuffix()}.csv`);
}

// ─── LEDGER (CHART OF ACCOUNTS) ───────────────────────────────────────────────
export function exportLedgerCSV(entries: any[], accountName: string, companyName: string) {
  const rows: string[] = [
    csvRow(`Ledger Account — ${accountName}`),
    csvRow(`Company: ${companyName}`),
    csvRow(`Generated: ${new Date().toLocaleString('en-IN')}`),
    csvRow(''),
    csvRow('Date', 'Particulars', 'Vch No', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'),
    csvRow('---', '---', '---', '---', '---', '---'),
  ];

  let balance = 0;
  for (const e of entries) {
    const dr = e.debitAmount || 0;
    const cr = e.creditAmount || 0;
    balance += dr - cr;
    rows.push(csvRow(
      new Date(e.entryDate || e.date).toLocaleDateString('en-IN'),
      e.narration || e.description || '',
      e.voucherNo || '',
      dr || '',
      cr || '',
      balance
    ));
  }

  downloadCSV(rows, `Ledger_${accountName}_${dateSuffix()}.csv`);
}

// ─── PDF EXPORT (print-to-PDF) ────────────────────────────────────────────────
export function printToPDF(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; padding: 20mm; }
      h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
      h2 { font-size: 13pt; text-align: center; margin-bottom: 12px; color: #333; }
      .subtitle { text-align: center; font-size: 10pt; margin-bottom: 20px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f0f0f0; border: 1px solid #999; padding: 6px 8px; font-weight: bold; text-align: left; }
      td { border: 1px solid #ccc; padding: 5px 8px; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .total-row { background: #f9f9f9; font-weight: bold; border-top: 2px solid #333; }
      .net-row { background: #e8f5e9; font-weight: bold; }
      .loss-row { background: #fce8e8; font-weight: bold; }
      .section-header { background: #1a1a2e; color: white; padding: 4px 8px; font-weight: bold; }
      .balanced { color: green; font-weight: bold; }
      .unbalanced { color: red; font-weight: bold; }
      @media print { @page { size: A4; margin: 15mm; } }
    </style>
  `;

  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${styles}</head><body>`);
  printWindow.document.write(`<h1>${title}</h1>`);
  printWindow.document.write(`<div class="subtitle">Generated: ${new Date().toLocaleString('en-IN')}</div>`);
  printWindow.document.write(el.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

// ─── IMAGE EXPORT (html2canvas) ───────────────────────────────────────────────
export async function exportAsImage(elementId: string, filename: string) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const el = document.getElementById(elementId);
    if (!el) { alert('Element not found'); return; }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    canvas.toBlob(blob => {
      if (blob) triggerDownload(blob, `${filename}_${dateSuffix()}.png`);
    }, 'image/png');
  } catch (e) {
    console.error('Image export failed:', e);
    alert('Image export failed. Please try PDF instead.');
  }
}

// ─── WORD (.doc) EXPORT ───────────────────────────────────────────────────────
export function exportAsWord(elementId: string, filename: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 2cm; }
        h1, h2 { text-align: center; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #999; padding: 4px 8px; }
        th { background: #f0f0f0; font-weight: bold; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p style="text-align:center;color:#555">Generated: ${new Date().toLocaleString('en-IN')}</p>
      ${el.innerHTML}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  triggerDownload(blob, `${filename}_${dateSuffix()}.doc`);
}

// ─── PDF via jsPDF ────────────────────────────────────────────────────────────
export async function exportAsPDF(elementId: string, filename: string, title: string) {
  try {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const el = document.getElementById(elementId);
    if (!el) return;

    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let y = 0;
    while (y < pdfHeight) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -y, pdfWidth, pdfHeight);
      y += pageHeight;
    }

    pdf.save(`${filename}_${dateSuffix()}.pdf`);
  } catch (e) {
    console.error('PDF export failed:', e);
    // Fallback to print
    printToPDF(elementId, title);
  }
}

// ─── UNIVERSAL EXPORT MENU ───────────────────────────────────────────────────
export type ExportFormat = 'excel' | 'pdf' | 'image' | 'word' | 'print';

export interface ExportOptions {
  elementId: string;
  filename: string;
  title: string;
  csvExportFn?: () => void;
}

export async function handleExport(format: ExportFormat, opts: ExportOptions) {
  switch (format) {
    case 'excel':
      if (opts.csvExportFn) opts.csvExportFn();
      break;
    case 'pdf':
      await exportAsPDF(opts.elementId, opts.filename, opts.title);
      break;
    case 'image':
      await exportAsImage(opts.elementId, opts.filename);
      break;
    case 'word':
      exportAsWord(opts.elementId, opts.filename, opts.title);
      break;
    case 'print':
      printToPDF(opts.elementId, opts.title);
      break;
  }
}

// ─── HELPER ──────────────────────────────────────────────────────────────────
function dateSuffix(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
