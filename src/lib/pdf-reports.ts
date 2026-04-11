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
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
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
  tenantEmail?: string;
  tenantPhone?: string;
  tenantAddress?: string;
  tenantTin?: string;
  tenantVrn?: string;
  formatMoney: (n: number) => string;
}

export function generateInvoicePDF(opts: InvoicePDFOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // ── Accent header bar ──────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 6, 'F');

  y = 18;

  // ── Company name (large) ───────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.tenantName || 'Company', margin, y);

  // "INVOICE" label on the right
  doc.setFontSize(28);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

  // ── Company details (issuer) ───────────────────────────────────────────────
  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const issuerLines: string[] = [];
  if (opts.tenantAddress) issuerLines.push(opts.tenantAddress);
  if (opts.tenantEmail) issuerLines.push(`Email: ${opts.tenantEmail}`);
  if (opts.tenantPhone) issuerLines.push(`Phone: ${opts.tenantPhone}`);
  if (opts.tenantTin) issuerLines.push(`TIN: ${opts.tenantTin}`);
  if (opts.tenantVrn) issuerLines.push(`VRN: ${opts.tenantVrn}`);
  issuerLines.forEach(line => {
    doc.text(line, margin, y);
    y += 4;
  });

  // ── Divider ────────────────────────────────────────────────────────────────
  y += 2;
  doc.setDrawColor(220, 225, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Invoice meta & customer info (two columns) ────────────────────────────
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;

  // Left column – Invoice details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('INVOICE DETAILS', leftColX, y);

  y += 6;
  doc.setTextColor(60, 60, 60);
  const metaRows = [
    ['Invoice No:', opts.invoiceNumber],
    ['Issue Date:', opts.issueDate || '—'],
    ['Due Date:', opts.dueDate || '—'],
    ['Status:', opts.status.toUpperCase()],
  ];
  metaRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, leftColX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, leftColX + 24, y);
    y += 5;
  });

  // Right column – Bill To
  let ry = y - 6 * 4 - 6; // align with left column start
  ry = y - metaRows.length * 5; // recalc
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text('BILL TO', rightColX, ry);
  ry += 6;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.customerName, rightColX, ry);
  ry += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const custLines: string[] = [];
  if (opts.customerAddress) custLines.push(opts.customerAddress);
  if (opts.customerEmail) custLines.push(opts.customerEmail);
  if (opts.customerPhone) custLines.push(opts.customerPhone);
  custLines.forEach(line => {
    doc.text(line, rightColX, ry);
    ry += 4;
  });

  y = Math.max(y, ry) + 6;

  // ── Line items table ───────────────────────────────────────────────────────
  const headers = ['#', 'Item / Description', 'Qty', 'Unit Price', 'Disc %', 'Amount'];
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
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineColor: [230, 235, 245],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
  });

  // ── Totals section ─────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  let ty = finalY + 10;
  const totalsX = pageWidth - margin - 75;

  // Summary box background
  doc.setFillColor(248, 250, 255);
  doc.setDrawColor(220, 225, 240);
  doc.roundedRect(totalsX - 4, ty - 5, pageWidth - margin - totalsX + 8, 38, 2, 2, 'FD');

  const totals = [
    ['Subtotal', opts.formatMoney(opts.subtotal)],
    [`Tax (${opts.taxRate}%)`, opts.formatMoney(opts.taxAmount)],
  ];

  doc.setFontSize(9);
  totals.forEach(([label, value]) => {
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalsX, ty);
    doc.text(value, pageWidth - margin, ty, { align: 'right' });
    ty += 6;
  });

  // Total highlight
  ty += 3;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(totalsX, ty - 3, pageWidth - margin, ty - 3);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('TOTAL', totalsX, ty + 3);
  doc.setTextColor(20, 20, 20);
  doc.text(opts.formatMoney(opts.totalAmount), pageWidth - margin, ty + 3, { align: 'right' });

  // ── Payment terms / Notes ──────────────────────────────────────────────────
  // Place notes on the left side, aligned with table start
  let ny = finalY + 10;
  if (opts.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('NOTES / TERMS', margin, ny);
    ny += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(opts.notes, margin, ny, { maxWidth: totalsX - margin - 10 });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(37, 99, 235);
  doc.rect(0, ph - 14, pageWidth, 14, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text(`${opts.tenantName || 'Company'} · Invoice ${opts.invoiceNumber}`, margin, ph - 5);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, ph - 5, { align: 'right' });

  doc.save(`invoice-${opts.invoiceNumber.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
