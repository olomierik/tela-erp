import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  stats?: { label: string; value: string }[];
  tenantName?: string;
}

export function generatePDFReport({ title, subtitle, headers, rows, stats, tenantName }: ReportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(tenantName || 'TELA-ERP', 14, y);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - 14, y, { align: 'right' });

  y += 12;
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, y);

  if (subtitle) {
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, y);
  }

  // Stats summary
  if (stats && stats.length > 0) {
    y += 12;
    const statWidth = (pageWidth - 28) / stats.length;
    stats.forEach((stat, i) => {
      const x = 14 + i * statWidth;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x, y, statWidth - 4, 22, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(stat.label, x + 6, y + 8);
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text(stat.value, x + 6, y + 18);
    });
    y += 30;
  }

  // Table
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows.map(r => r.map(String)),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
