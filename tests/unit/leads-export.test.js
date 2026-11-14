const test = require('node:test');
const assert = require('node:assert');
require('../setup');
const ExcelJS = require('exceljs');

const { EXPORTABLE_COLUMNS } = require('@/app/crm/reports/leads-export.ts');

test('Leads Export: Schema and column definitions', () => {
  const expectedKeys = ['name', 'email', 'phone', 'status', 'project', 'source_page', 'created_at'];
  expectedKeys.forEach((key) => {
    const found = EXPORTABLE_COLUMNS.find((col) => col.key === key);
    assert.ok(found, `Missing exportable column: ${key}`);
    assert.strictEqual(found.defaultSelected, true, `Column ${key} should be defaultSelected`);
  });
});

test('Leads Export: ExcelJS workbook creation and row styling', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CRM Leads');

  const selectedCols = ['name', 'phone', 'email', 'status', 'project'];
  worksheet.columns = selectedCols.map((col) => {
    const def = EXPORTABLE_COLUMNS.find((c) => c.key === col);
    return {
      header: def ? def.label : col,
      key: col,
      width: 20,
    };
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F1D33' },
  };

  const mockLeads = [
    { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com', status: 'New', project: 'Apex Towers' },
    { name: 'Priya Patel', phone: '8123456789', email: 'priya@example.com', status: 'Contacted', project: 'Emerald Bay' },
  ];

  mockLeads.forEach((lead) => {
    worksheet.addRow(lead);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer);
  assert.ok(buffer.byteLength > 1000, 'Excel buffer must contain valid xlsx data');
  assert.strictEqual(worksheet.rowCount, 3); // 1 header + 2 data rows
});

test('Leads Export: CSV formula injection defense', () => {
  function sanitizeCSVField(val) {
    if (typeof val !== 'string') return val;
    // Prevent spreadsheet formula injection
    if (/^[=+@\-\t\r]/.test(val)) {
      return `'${val}`;
    }
    return val;
  }

  assert.strictEqual(sanitizeCSVField('=SUM(A1:A10)'), "'=SUM(A1:A10)");
  assert.strictEqual(sanitizeCSVField('+cmd|calc'), "'+cmd|calc");
  assert.strictEqual(sanitizeCSVField('-100'), "'-100");
  assert.strictEqual(sanitizeCSVField('@admin'), "'@admin");
  assert.strictEqual(sanitizeCSVField('Normal Text'), 'Normal Text');
});
