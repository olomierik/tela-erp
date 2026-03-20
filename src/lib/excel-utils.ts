import * as XLSX from 'xlsx';

const INVENTORY_TEMPLATE_HEADERS = ['sku', 'name', 'category', 'quantity', 'unit_cost', 'reorder_level', 'warehouse_location'];
const SAMPLE_ROWS = [
  ['SKU-001', 'Steel Sheet 4x8', 'Raw Materials', 100, 12.50, 20, 'A-01'],
  ['SKU-002', 'Copper Wire 2mm', 'Raw Materials', 250, 8.75, 50, 'B-03'],
  ['SKU-003', 'Motor Assembly', 'Components', 30, 145.00, 10, 'C-12'],
];

export function downloadInventoryTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([INVENTORY_TEMPLATE_HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = INVENTORY_TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.writeFile(wb, 'inventory-template.xlsx');
}

export interface ParsedInventoryRow {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit_cost: number;
  reorder_level: number;
  warehouse_location?: string;
}

export function parseInventoryExcel(file: File): Promise<{ rows: ParsedInventoryRow[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (raw.length < 2) {
          resolve({ rows: [], errors: ['File is empty or has no data rows'] });
          return;
        }

        const headers = raw[0].map((h: any) => String(h).toLowerCase().trim());
        const errors: string[] = [];
        const rows: ParsedInventoryRow[] = [];

        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.every((c: any) => c === undefined || c === '')) continue;

          const skuIdx = headers.indexOf('sku');
          const nameIdx = headers.indexOf('name');
          const sku = String(r[skuIdx] ?? '').trim();
          const name = String(r[nameIdx] ?? '').trim();

          if (!sku || !name) {
            errors.push(`Row ${i + 1}: Missing SKU or Name`);
            continue;
          }

          rows.push({
            sku,
            name,
            category: String(r[headers.indexOf('category')] ?? ''),
            quantity: Number(r[headers.indexOf('quantity')] ?? 0) || 0,
            unit_cost: Number(r[headers.indexOf('unit_cost')] ?? 0) || 0,
            reorder_level: Number(r[headers.indexOf('reorder_level')] ?? 10) || 10,
            warehouse_location: r[headers.indexOf('warehouse_location')] ? String(r[headers.indexOf('warehouse_location')]) : undefined,
          });
        }

        resolve({ rows, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
