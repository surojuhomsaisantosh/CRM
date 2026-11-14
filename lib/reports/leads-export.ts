import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const filtered = leads.map((lead) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      row[col] = lead[col] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(filtered);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportLeadsToExcel(
  leads: any[],
  columns: string[],
  fileName = 'leads_export.xlsx',
  sheetName = 'CRM Leads'
) {
  const filtered = leads.map((lead) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      const colDef = EXPORTABLE_COLUMNS.find((c) => c.key === col);
      row[colDef?.label || col] = lead[col] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(filtered);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
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
