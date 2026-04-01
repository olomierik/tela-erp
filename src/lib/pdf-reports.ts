import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(tenantName || 'TELA-ERP', margin, 8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    pageWidth - margin, 8, { align: 'right' },
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
