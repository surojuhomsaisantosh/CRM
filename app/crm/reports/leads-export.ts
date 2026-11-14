import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export interface ExportColumnDef {
  key: string;
  label: string;
  defaultSelected: boolean;
}

export const EXPORTABLE_COLUMNS: ExportColumnDef[] = [
  { key: 'name', label: 'Name', defaultSelected: true },
  { key: 'email', label: 'Email', defaultSelected: true },
  { key: 'phone', label: 'Phone', defaultSelected: true },
  { key: 'status', label: 'Status', defaultSelected: true },
  { key: 'project', label: 'Project', defaultSelected: true },
  { key: 'source_page', label: 'Source', defaultSelected: true },
  { key: 'message', label: 'Message', defaultSelected: false },
  { key: 'location', label: 'Location', defaultSelected: false },
  { key: 'created_at', label: 'Created At', defaultSelected: true },
];

export async function exportLeadsToCSV(leads: any[], columns: string[], fileName = 'leads_export.csv') {
  const colDefs = columns.map((c) => EXPORTABLE_COLUMNS.find((def) => def.key === c)?.label || c);

  // Build CSV header line
  const headerLine = colDefs.map((label) => `"${String(label).replace(/"/g, '""')}"`).join(',');

  // Build CSV data rows
  const rowLines = leads.map((lead) => {
    return columns
      .map((col) => {
        const val = lead[col] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const csvContent = [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportLeadsToExcel(
  leads: any[],
  columns: string[],
  fileName = 'leads_export.xlsx',
  sheetName = 'CRM Leads'
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Set columns with automatic sizing
  worksheet.columns = columns.map((col) => {
    const colDef = EXPORTABLE_COLUMNS.find((c) => c.key === col);
    const headerTitle = colDef?.label || col;
    return {
      header: headerTitle,
      key: col,
      width: Math.max(headerTitle.length + 4, 18),
    };
  });

  // Style header row (Navy branding with white bold text)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F1D33' },
  };

  // Add lead rows
  leads.forEach((lead) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      rowData[col] = lead[col] ?? '';
    });
    worksheet.addRow(rowData);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PdfExportOptions {
  reportTitle?: string;
  filterSummary?: string;
}

export async function exportLeadsToPDF(
  leads: any[],
  columns: string[],
  fileName = 'leads_export.pdf',
  optionsOrTitle: string | PdfExportOptions = 'CRM Leads Database'
) {
  const title = typeof optionsOrTitle === 'string' ? optionsOrTitle : (optionsOrTitle.reportTitle || 'CRM Leads Database');
  const summary = typeof optionsOrTitle === 'object' ? optionsOrTitle.filterSummary : '';

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100);
  const subtext = summary 
    ? `Filter: ${summary}  |  Generated on ${new Date().toLocaleString('en-IN')}`
    : `Generated on ${new Date().toLocaleString('en-IN')}`;
  doc.text(subtext, 14, 22);

  const headers = columns.map((col) => {
    const colDef = EXPORTABLE_COLUMNS.find((c) => c.key === col);
    return colDef?.label || col;
  });

  const rows = leads.map((lead) =>
    columns.map((col) => {
      if (col === 'created_at' && lead[col]) {
        return new Date(lead[col]).toLocaleDateString('en-IN');
      }
      return String(lead[col] ?? '');
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 29, 51], textColor: [255, 255, 255] },
  });

  doc.save(fileName);
}
