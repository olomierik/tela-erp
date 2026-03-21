import { useState } from 'react';
import { format } from 'date-fns';
import AppLayout from '@/components/layout/AppLayout';
import { FileDown, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generatePDFReport } from '@/lib/pdf-reports';
import { cn } from '@/lib/utils';

type ReportType = 'sales' | 'inventory' | 'production' | 'accounting';

export default function Reports() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 86400000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data: salesData } = useTenantQuery('sales_orders');
  const { data: inventoryData } = useTenantQuery('inventory_items');
  const { data: productionData } = useTenantQuery('production_orders');
  const { data: transactionData } = useTenantQuery('transactions');

  const sales = salesData ?? [];
  const inventory = inventoryData ?? [];
  const production = productionData ?? [];
  const transactions = transactionData ?? [];

  const filterByDate = (items: any[], dateField: string) =>
    items.filter((i: any) => {
      const d = new Date(i[dateField]);
      return d >= startDate && d <= endDate;
    });

  const filteredSales = filterByDate(sales, 'created_at');
  const filteredProduction = filterByDate(production, 'created_at');
  const filteredTransactions = filterByDate(transactions, 'date');

  const getPreviewData = () => {
    switch (reportType) {
      case 'sales':
        return { headers: ['Order #', 'Customer', 'Amount', 'Status', 'Date'],
          rows: filteredSales.slice(0, 10).map((o: any) => [o.order_number, o.customer_name, formatMoney(Number(o.total_amount)), o.status, new Date(o.created_at).toLocaleDateString()]),
          count: filteredSales.length };
      case 'inventory':
        return { headers: ['SKU', 'Name', 'Category', 'Qty', 'Value', 'Status'],
          rows: inventory.slice(0, 10).map((i: any) => [i.sku, i.name, i.category, i.quantity, formatMoney(i.quantity * Number(i.unit_cost)), i.status]),
          count: inventory.length };
      case 'production':
        return { headers: ['Order #', 'Product', 'Qty', 'Status', 'Start', 'End'],
          rows: filteredProduction.slice(0, 10).map((o: any) => [o.order_number, o.product_name, o.quantity, o.status, o.start_date || '—', o.end_date || '—']),
          count: filteredProduction.length };
      case 'accounting':
        return { headers: ['Date', 'Description', 'Type', 'Category', 'Amount'],
          rows: filteredTransactions.slice(0, 10).map((t: any) => [new Date(t.date).toLocaleDateString(), t.description, t.type, t.category, formatMoney(Number(t.amount))]),
          count: filteredTransactions.length };
    }
  };

  const preview = getPreviewData();

  const handleDownload = () => {
    const data = getPreviewData();
    const allRows = reportType === 'sales'
      ? filteredSales.map((o: any) => [o.order_number, o.customer_name, formatMoney(Number(o.total_amount)), o.status, new Date(o.created_at).toLocaleDateString()])
      : reportType === 'inventory'
      ? inventory.map((i: any) => [i.sku, i.name, i.category, i.quantity, formatMoney(i.quantity * Number(i.unit_cost)), i.status])
      : reportType === 'production'
      ? filteredProduction.map((o: any) => [o.order_number, o.product_name, o.quantity, o.status, o.start_date || '—', o.end_date || '—'])
      : filteredTransactions.map((t: any) => [new Date(t.date).toLocaleDateString(), t.description, t.type, t.category, formatMoney(Number(t.amount))]);

    generatePDFReport({
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      subtitle: `${format(startDate, 'MMM d, yyyy')} — ${format(endDate, 'MMM d, yyyy')} · ${tenant?.name || 'TELA-ERP'}`,
      tenantName: tenant?.name,
      headers: data.headers,
      rows: allRows,
      stats: [{ label: 'Total Records', value: String(data.count) }],
    });
  };

  return (
    <AppLayout title="Reports" subtitle="Generate & download reports">
      {/* Controls */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Report Type</label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="production">Production Report</SelectItem>
                  <SelectItem value="accounting">Accounting Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-start text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(startDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-start text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(endDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <Button className="h-9 gap-2" onClick={handleDownload} disabled={preview.count === 0}>
              <FileDown className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Preview ({preview.count} records)</CardTitle>
            {preview.count > 10 && <span className="text-xs text-muted-foreground">Showing first 10</span>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {preview.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                    {row.map((cell: any, j: number) => (
                      <td key={j} className="px-4 py-2.5 text-sm text-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
                {preview.rows.length === 0 && (
                  <tr><td colSpan={preview.headers.length} className="px-4 py-8 text-center text-sm text-muted-foreground">No data for selected date range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
