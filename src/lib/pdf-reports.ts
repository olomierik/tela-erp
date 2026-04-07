import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TELA_LOGO_BASE64 } from './logo-base64';

interface ReportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  stats?: { label: string; value: string }[];
  tenantName?: string;
  landscape?: boolean;
  // Indices of columns that should be right-aligned (numbers/money)
  numericColumns?: number[];
}

export function generatePDFReport({
  title, subtitle, headers, rows, stats, tenantName,
  landscape = false, numericColumns = [],
}: ReportOptions) {
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // indigo-600
  doc.rect(0, 0, pageWidth, 14, 'F');

  // Logo
  try {
    doc.addImage(TELA_LOGO_BASE64, 'PNG', margin, 2, 28, 10);
  } catch {
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(tenantName || 'TELA-ERP', margin, 9);
  }

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    pageWidth - margin, 9, { align: 'right' },
  );

  // ── Title ─────────────────────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);

  if (subtitle) {
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, margin, y);
  }

  // ── Stats summary boxes ───────────────────────────────────────────────────
  if (stats && stats.length > 0) {
    y += 10;
    const cols = Math.min(stats.length, 4);
    const boxW = (pageWidth - margin * 2 - (cols - 1) * 4) / cols;
    const boxH = 20;
    stats.forEach((stat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (boxW + 4);
      const by = y + row * (boxH + 4);
      doc.setFillColor(243, 246, 255);
      doc.setDrawColor(210, 220, 250);
      doc.roundedRect(x, by, boxW, boxH, 2, 2, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(100, 110, 140);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.label, x + 4, by + 7);
      doc.setFontSize(11);
      doc.setTextColor(20, 30, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(stat.value, x + 4, by + 15);
    });
    const statRows = Math.ceil(stats.length / cols);
    y += statRows * (boxH + 4) + 4;
  } else {
    y += 8;
  }

  // ── Determine column styles ───────────────────────────────────────────────
  const columnStyles: Record<number, object> = {};
  headers.forEach((_, i) => {
    if (numericColumns.includes(i)) {
      columnStyles[i] = { halign: 'right' };
    }
  });

  // ── Identify total / section-header rows ─────────────────────────────────
  const bodyStyles = rows.map(row => {
    const isTotal = row.some(c => typeof c === 'string' && c.toString().includes('TOTAL'));
    const isSection = row.some(c => typeof c === 'string' && c.toString().includes('──'));
    if (isTotal) return { fillColor: [230, 236, 255] as [number, number, number], fontStyle: 'bold' as const, textColor: [20, 30, 80] as [number, number, number] };
    if (isSection) return { fillColor: [245, 247, 250] as [number, number, number], fontStyle: 'bold' as const, textColor: [60, 70, 100] as [number, number, number] };
    return {} as Record<string, unknown>;
  });

  // ── Table ─────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows.map(r => r.map(String)),
    styles: {
      fontSize: landscape ? 8 : 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: landscape ? 8 : 9,
    },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    columnStyles,
    bodyStyles: { textColor: [30, 30, 30] },
    didParseCell(data) {
      const style = bodyStyles[data.row.index];
      if (style && Object.keys(style).length > 0) {
        Object.assign(data.cell.styles, style);
        // Right-align numeric columns even in total rows
        if (numericColumns.includes(data.column.index)) {
          data.cell.styles.halign = 'right';
        }
      }
    },
    margin: { left: margin, right: margin },
    tableLineColor: [200, 210, 235],
    tableLineWidth: 0.1,
  });

  // ── Page footers ──────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 210, 235);
    doc.line(margin, ph - 12, pageWidth - margin, ph - 12);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 160);
    doc.setFont('helvetica', 'normal');
    doc.text(`${title} · Generated by TELA-ERP`, margin, ph - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, ph - 6, { align: 'right' });
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Invoice PDF Generator ─────────────────────────────────────────────────

interface InvoicePDFOptions {
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  lineItems: Array<{ description: string; quantity: number; unit_price: number; discount_percent?: number; line_total: number }>;
  tenantName?: string;
  formatMoney: (n: number) => string;
}

export function generateInvoicePDF(opts: InvoicePDFOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  // Header bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 14, 'F');

  // Logo
  try {
    doc.addImage(TELA_LOGO_BASE64, 'PNG', margin, 2, 28, 10);
  } catch {
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(opts.tenantName || 'TELA-ERP', margin, 9);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin, 9, { align: 'right' });

  // Invoice details
  y += 10;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice ${opts.invoiceNumber}`, margin, y);

  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const leftInfo = [
    ['Bill To:', opts.customerName],
    ['Status:', opts.status.toUpperCase()],
  ];
  const rightInfo = [
    ['Issue Date:', opts.issueDate || '—'],
    ['Due Date:', opts.dueDate || '—'],
  ];

  leftInfo.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y + i * 6);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 22, y + i * 6);
  });

  rightInfo.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, pageWidth - margin - 60, y + i * 6);
    doc.setFont('helvetica', 'normal');
    doc.text(value, pageWidth - margin - 35, y + i * 6);
  });

  y += 18;

  // Line items table
  const headers = ['#', 'Description', 'Qty', 'Unit Price', 'Disc %', 'Total'];
  const rows = opts.lineItems.map((li, i) => [
    String(i + 1),
    li.description,
    String(li.quantity),
    opts.formatMoney(li.unit_price),
    String(li.discount_percent || 0) + '%',
    opts.formatMoney(li.line_total),
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  // Totals section
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  let ty = finalY + 8;
  const totalsX = pageWidth - margin - 70;

  const totals = [
    ['Subtotal', opts.formatMoney(opts.subtotal)],
    [`Tax (${opts.taxRate}%)`, opts.formatMoney(opts.taxAmount)],
  ];

  doc.setFontSize(10);
  totals.forEach(([label, value]) => {
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalsX, ty);
    doc.text(value, pageWidth - margin, ty, { align: 'right' });
    ty += 6;
  });

  // Total line
  ty += 2;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(totalsX, ty - 3, pageWidth - margin, ty - 3);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Total', totalsX, ty + 3);
  doc.text(opts.formatMoney(opts.totalAmount), pageWidth - margin, ty + 3, { align: 'right' });

  // Notes
  if (opts.notes) {
    ty += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Notes:', margin, ty);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.notes, margin, ty + 5, { maxWidth: pageWidth - margin * 2 });
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 210, 235);
  doc.line(margin, ph - 12, pageWidth - margin, ph - 12);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 160);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice ${opts.invoiceNumber} · Generated by TELA-ERP`, margin, ph - 6);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin, ph - 6, { align: 'right' });

  doc.save(`invoice-${opts.invoiceNumber.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
