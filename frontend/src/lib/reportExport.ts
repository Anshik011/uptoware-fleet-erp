import { formatCurrency, formatDate, formatNumber } from '@/config/branding';

export interface ReportColumnDef {
  fieldname: string;
  label: string;
  fieldtype?: 'Data' | 'Currency' | 'Float' | 'Int' | 'Percent' | 'Date' | string;
}

export interface ReportExportMeta {
  fromDate?: string;
  toDate?: string;
  vehicle?: string;
  mineSite?: string;
  driver?: string;
  status?: string;
  search?: string;
}

export function formatReportCell(val: any, col: ReportColumnDef): string {
  if (val === null || val === undefined || val === '' || val === 'NaN') return '—';
  if (typeof val === 'number' && isNaN(val)) return '—';

  if (col.fieldtype === 'Currency') {
    const num = Number(val);
    if (isNaN(num)) return '—';
    return num < 0 ? `-${formatCurrency(Math.abs(num))}` : formatCurrency(num);
  }
  if (col.fieldtype === 'Percent') {
    const num = Number(val);
    if (isNaN(num)) return '—';
    return `${num.toFixed(1)}%`;
  }
  if (col.fieldtype === 'Date') {
    return formatDate(String(val));
  }
  if (col.fieldtype === 'Float' || col.fieldtype === 'Int') {
    const num = Number(val);
    return isNaN(num) ? '—' : formatNumber(num);
  }
  return String(val);
}

export function isNumericColumn(col: ReportColumnDef): boolean {
  return (
    col.fieldtype === 'Currency' ||
    col.fieldtype === 'Float' ||
    col.fieldtype === 'Int' ||
    col.fieldtype === 'Percent'
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

export function exportReportToCSV(
  title: string,
  columns: ReportColumnDef[],
  rows: Record<string, any>[]
): void {
  if (columns.length === 0 || rows.length === 0) return;

  const headers = columns.map((c) => `"${String(c.label || c.fieldname).replace(/"/g, '""')}"`).join(',');
  const csvRows = rows.map((row) =>
    columns
      .map((c) => {
        const raw = row[c.fieldname] !== undefined && row[c.fieldname] !== null ? row[c.fieldname] : '';
        return `"${String(raw).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const bom = '\uFEFF';
  const blob = new Blob([bom + [headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToExcel(
  title: string,
  columns: ReportColumnDef[],
  rows: Record<string, any>[],
  meta?: ReportExportMeta
): void {
  if (columns.length === 0 || rows.length === 0) return;

  const filterSummaryParts: string[] = [];
  if (meta?.fromDate || meta?.toDate) {
    filterSummaryParts.push(`Period: ${meta.fromDate || 'Start'} to ${meta.toDate || 'Today'}`);
  }
  if (meta?.mineSite && meta.mineSite !== 'ALL') {
    filterSummaryParts.push(`Mine Site: ${meta.mineSite}`);
  }
  if (meta?.vehicle && meta.vehicle !== 'ALL') {
    filterSummaryParts.push(`Vehicle: ${meta.vehicle}`);
  }
  if (meta?.driver && meta.driver !== 'ALL') {
    filterSummaryParts.push(`Driver/Employee: ${meta.driver}`);
  }
  if (meta?.status && meta.status !== 'ALL') {
    filterSummaryParts.push(`Status: ${meta.status}`);
  }
  if (meta?.search) {
    filterSummaryParts.push(`Search: "${meta.search}"`);
  }

  const headerCells = columns
    .map(
      (c) =>
        `<th style="background-color:#1e3a8a;color:#ffffff;font-weight:bold;border:1px solid #cbd5e1;padding:8px;text-align:${
          isNumericColumn(c) ? 'right' : 'left'
        };">${escapeHtml(c.label || c.fieldname)}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((row, idx) => {
      const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      const cells = columns
        .map((c) => {
          const val = formatReportCell(row[c.fieldname], c);
          return `<td style="background-color:${bg};border:1px solid #cbd5e1;padding:6px 8px;text-align:${
            isNumericColumn(c) ? 'right' : 'left'
          };">${escapeHtml(val)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>
      <table>
        <tr>
          <td colspan="${columns.length}" style="font-size:16px;font-weight:bold;color:#0f172a;padding:8px 0;">
            Uptoware Fleet ERP — ${escapeHtml(title)}
          </td>
        </tr>
        <tr>
          <td colspan="${columns.length}" style="font-size:11px;color:#475569;padding-bottom:8px;">
            Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}${
              filterSummaryParts.length > 0 ? ` | ${escapeHtml(filterSummaryParts.join(' | '))}` : ''
            } | Total Rows: ${rows.length}
          </td>
        </tr>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToPDF(
  title: string,
  columns: ReportColumnDef[],
  rows: Record<string, any>[],
  meta?: ReportExportMeta
): void {
  if (columns.length === 0 || rows.length === 0) return;

  const printWin = window.open('', '_blank', 'width=1150,height=800');
  if (!printWin) {
    alert('Please allow pop-ups in your browser to download/print the PDF report.');
    return;
  }

  const filterSummaryParts: string[] = [];
  if (meta?.fromDate || meta?.toDate) {
    filterSummaryParts.push(`Period: ${meta.fromDate || 'Start'} to ${meta.toDate || 'Today'}`);
  }
  if (meta?.mineSite && meta.mineSite !== 'ALL') {
    filterSummaryParts.push(`Mine Site: ${meta.mineSite}`);
  }
  if (meta?.vehicle && meta.vehicle !== 'ALL') {
    filterSummaryParts.push(`Vehicle: ${meta.vehicle}`);
  }
  if (meta?.driver && meta.driver !== 'ALL') {
    filterSummaryParts.push(`Driver / Staff: ${meta.driver}`);
  }
  if (meta?.status && meta.status !== 'ALL') {
    filterSummaryParts.push(`Status: ${meta.status}`);
  }
  if (meta?.search) {
    filterSummaryParts.push(`Search: "${meta.search}"`);
  }

  const headerCells = columns
    .map(
      (c) =>
        `<th class="${isNumericColumn(c) ? 'num' : 'txt'}">${escapeHtml(c.label || c.fieldname)}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map(
          (c) =>
            `<td class="${isNumericColumn(c) ? 'num' : 'txt'}">${escapeHtml(
              formatReportCell(row[c.fieldname], c)
            )}</td>`
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)} - Uptoware Fleet ERP</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
          body { margin: 0; color: #0f172a; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 10px; }
          .brand { font-size: 16px; font-weight: 700; color: #1e3a8a; }
          .sub { font-size: 12px; font-weight: 600; color: #334155; margin-top: 2px; }
          .meta { text-align: right; font-size: 10px; color: #475569; }
          .filters { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; margin-bottom: 10px; font-size: 10px; color: #334155; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 7px; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          tbody tr:nth-child(even) { background-color: #f8fafc; }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .txt { text-align: left; }
          @media print {
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">UPTOWARE FLEET ERP</div>
            <div class="sub">${escapeHtml(title)}</div>
          </div>
          <div class="meta">
            <div>Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
            <div>Total Records: ${rows.length}</div>
          </div>
        </div>
        ${
          filterSummaryParts.length > 0
            ? `<div class="filters"><strong>Applied Filters:</strong> ${escapeHtml(filterSummaryParts.join(' • '))}</div>`
            : ''
        }
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}
