/**
 * exportToExcel.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Zero-dependency CSV export that Excel opens natively.
 * CSV is produced with BOM so Excel shows ₹ and Indian text correctly.
 *
 * Usage:
 *   exportToExcel({ rows, headers, filename: 'DayBook_April2026' });
 */

export interface ExportRow {
  [key: string]: string | number | null | undefined;
}

interface ExportOptions {
  /** Row objects – keys must match `headers` (or will auto-use Object.keys) */
  rows: ExportRow[];
  /** Column headers in order; use human-readable names */
  headers?: string[];
  /** Column keys in same order as headers (defaults to Object.keys of first row) */
  keys?: string[];
  /** Filename WITHOUT extension */
  filename?: string;
  /** Company name for the report header row */
  companyName?: string;
  /** Date range string e.g. "01 Apr 2026 – 21 Apr 2026" */
  dateRange?: string;
  /** Report title e.g. "Day Book" */
  reportTitle?: string;
}

function escapeCell(val: string | number | null | undefined): string {
  if (val == null) return '';
  const str = String(val);
  // Wrap in quotes if it contains comma, newline or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToExcel({
  rows,
  headers,
  keys,
  filename = 'Report',
  companyName,
  dateRange,
  reportTitle,
}: ExportOptions): void {
  if (!rows || rows.length === 0) {
    alert('No data to export');
    return;
  }

  const _keys  = keys    || Object.keys(rows[0]);
  const _heads = headers || _keys;

  const csvLines: string[] = [];

  // ── Meta rows (optional) ────────────────────────────────────────────
  if (reportTitle) csvLines.push(`"${reportTitle}"`);
  if (companyName) csvLines.push(`"Company: ${companyName}"`);
  if (dateRange)   csvLines.push(`"Period: ${dateRange}"`);
  if (reportTitle || companyName || dateRange) csvLines.push(''); // blank separator

  // ── Header row ───────────────────────────────────────────────────────
  csvLines.push(_heads.map(escapeCell).join(','));

  // ── Data rows ────────────────────────────────────────────────────────
  for (const row of rows) {
    csvLines.push(_keys.map(k => escapeCell(row[k])).join(','));
  }

  // ── BOM + blob ───────────────────────────────────────────────────────
  const bom = '\uFEFF'; // UTF-8 BOM – Excel needs this to show ₹ correctly
  const content = bom + csvLines.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convenience: format a number as Indian currency string for CSV */
export const fmtINR = (n: number | null | undefined): string =>
  '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
