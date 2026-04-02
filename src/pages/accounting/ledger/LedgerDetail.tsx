import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BookOpen, ArrowUpDown, Printer, FileSpreadsheet, FileText, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { generatePDFReport } from '@/lib/pdf-reports';
import * as XLSX from 'xlsx';
import type { Account, LedgerBalance } from './LedgerList';

interface LedgerEntry {
  id: string;
  voucher_id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  created_at: string;
  voucher?: {
    voucher_number: string;
    voucher_date: string;
    voucher_type: string;
    narration: string;
    status: string;
  };
}

interface Props {
  account: Account | undefined;
  balance: LedgerBalance | undefined;
  entries: LedgerEntry[];
}

const VOUCHER_TYPES = ['all', 'journal', 'sales', 'purchase', 'payment', 'receipt', 'contra'];
const PAGE_SIZE = 50;

export function LedgerDetail({ account, balance, entries }: Props) {
  const { formatMoney } = useCurrency();
  const { tenant } = useAuth();

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [voucherType, setVoucherType] = useState('all');
  const [refSearch, setRefSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);

  const postedEntries = entries.filter(e => e.voucher?.status === 'posted');

  // Apply filters
  const filteredEntries = useMemo(() => {
    let result = postedEntries;
    if (dateFrom) result = result.filter(e => (e.voucher?.voucher_date ?? '') >= dateFrom);
    if (dateTo) result = result.filter(e => (e.voucher?.voucher_date ?? '') <= dateTo);
    if (voucherType !== 'all') result = result.filter(e => e.voucher?.voucher_type === voucherType);
    if (refSearch.trim()) {
      const q = refSearch.toLowerCase();
      result = result.filter(e =>
        e.voucher?.voucher_number?.toLowerCase().includes(q) ||
        e.voucher?.narration?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [postedEntries, dateFrom, dateTo, voucherType, refSearch]);

  // Running balance rows (oldest first for calculation, then display newest first)
  const rowsWithBalance = useMemo(() => {
    let runBal = 0;
    const sorted = [...filteredEntries].sort((a, b) =>
      (a.voucher?.voucher_date ?? '').localeCompare(b.voucher?.voucher_date ?? '') ||
      a.created_at.localeCompare(b.created_at)
    );
    const rows = sorted.map(e => {
      runBal += Number(e.debit) - Number(e.credit);
      return { ...e, runBal };
    });
    return rows;
  }, [filteredEntries]);

  // Display newest first
  const displayRows = useMemo(() => [...rowsWithBalance].reverse(), [rowsWithBalance]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const pagedRows = displayRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useMemo(() => setPage(0), [dateFrom, dateTo, voucherType, refSearch]);

  // Totals
  const totalDebit = filteredEntries.reduce((s, e) => s + Number(e.debit), 0);
  const totalCredit = filteredEntries.reduce((s, e) => s + Number(e.credit), 0);
  const closingBalance = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].runBal : 0;

  const filterLabel = [
    dateFrom && `From: ${dateFrom}`,
    dateTo && `To: ${dateTo}`,
    voucherType !== 'all' && `Type: ${voucherType}`,
    refSearch && `Search: "${refSearch}"`,
  ].filter(Boolean).join(' | ');

  // Export helpers - use ALL filtered data (not just current page)
  const getExportRows = () => {
    // Chronological order for export
    return rowsWithBalance.map(e => ({
      date: e.voucher?.voucher_date ? new Date(e.voucher.voucher_date).toLocaleDateString() : '—',
      type: e.voucher?.voucher_type ?? '',
      reference: e.voucher?.voucher_number ?? '',
      narration: e.voucher?.narration || e.description,
      debit: Number(e.debit),
      credit: Number(e.credit),
      balance: e.runBal,
    }));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = getExportRows();
    const html = `<!DOCTYPE html><html><head><title>Ledger: ${account?.name}</title>
      <style>
        body { font-family: -apple-system, sans-serif; margin: 20px; font-size: 12px; }
        h1 { font-size: 18px; margin: 0; } h2 { font-size: 14px; color: #666; margin: 4px 0 12px; }
        .meta { color: #888; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; font-size: 11px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .dr { color: #059669; } .cr { color: #dc2626; }
        .total-row { font-weight: bold; border-top: 2px solid #333; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h1>${tenant?.name || 'Company'}</h1>
      <h2>Ledger: ${account?.name} (${account?.code})</h2>
      <div class="meta">${filterLabel || 'All transactions'} · Generated: ${new Date().toLocaleString()}</div>
      <table><thead><tr>
        <th>Date</th><th>Type</th><th>Reference</th><th>Narration</th>
        <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
      </tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td>${r.date}</td><td>${r.type}</td><td>${r.reference}</td><td>${r.narration}</td>
        <td class="num">${r.debit > 0 ? formatMoney(r.debit) : ''}</td>
        <td class="num">${r.credit > 0 ? formatMoney(r.credit) : ''}</td>
        <td class="num ${r.balance >= 0 ? 'dr' : 'cr'}">${formatMoney(Math.abs(r.balance))} ${r.balance >= 0 ? 'Dr' : 'Cr'}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="4">Total</td>
        <td class="num">${formatMoney(totalDebit)}</td>
        <td class="num">${formatMoney(totalCredit)}</td>
        <td class="num ${closingBalance >= 0 ? 'dr' : 'cr'}">${formatMoney(Math.abs(closingBalance))} ${closingBalance >= 0 ? 'Dr' : 'Cr'}</td>
      </tr></tbody></table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handleExportPDF = () => {
    const rows = getExportRows();
    generatePDFReport({
      title: `Ledger: ${account?.name}`,
      subtitle: `${account?.code} · ${account?.account_type}${filterLabel ? ` · ${filterLabel}` : ''}`,
      tenantName: tenant?.name,
      headers: ['Date', 'Type', 'Reference', 'Narration', 'Debit', 'Credit', 'Balance'],
      rows: rows.map(r => [
        r.date, r.type, r.reference, r.narration,
        r.debit > 0 ? formatMoney(r.debit) : '',
        r.credit > 0 ? formatMoney(r.credit) : '',
        `${formatMoney(Math.abs(r.balance))} ${r.balance >= 0 ? 'Dr' : 'Cr'}`,
      ]),
      stats: [
        { label: 'Total Debit', value: formatMoney(totalDebit) },
        { label: 'Total Credit', value: formatMoney(totalCredit) },
        { label: 'Closing Balance', value: `${formatMoney(Math.abs(closingBalance))} ${closingBalance >= 0 ? 'Dr' : 'Cr'}` },
        { label: 'Transactions', value: String(rows.length) },
      ],
      numericColumns: [4, 5, 6],
    });
  };

  const handleExportExcel = () => {
    const rows = getExportRows();
    const header = ['Date', 'Voucher Type', 'Reference', 'Narration', 'Debit', 'Credit', 'Balance'];
    const data = rows.map(r => [r.date, r.type, r.reference, r.narration, r.debit || '', r.credit || '', r.balance]);

    // Add metadata rows at top
    const meta = [
      [`Company: ${tenant?.name || ''}`],
      [`Ledger: ${account?.name} (${account?.code})`],
      [filterLabel || 'All transactions'],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...meta, header, ...data]);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `ledger-${account?.code}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setVoucherType('all');
    setRefSearch('');
  };

  const hasActiveFilters = dateFrom || dateTo || voucherType !== 'all' || refSearch;

  if (!account) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="py-16 text-center text-muted-foreground">
          <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Select a ledger</p>
          <p className="text-xs">Choose a ledger from the list to view its transactions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 flex flex-col">
      {/* Header with account info + actions */}
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{account.name}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono">{account.code} · {account.account_type}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-3.5 h-3.5" />
              Filter
              {hasActiveFilters && <Badge className="ml-1 h-4 w-4 p-0 text-[9px] rounded-full">!</Badge>}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePrint} disabled={filteredEntries.length === 0}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportPDF} disabled={filteredEntries.length === 0}>
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportExcel} disabled={filteredEntries.length === 0}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        {balance && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/30 rounded-md px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Total Debit</p>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(totalDebit || Number(balance.total_debit))}</p>
            </div>
            <div className="bg-muted/30 rounded-md px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Total Credit</p>
              <p className="text-sm font-bold tabular-nums text-destructive">{formatMoney(totalCredit || Number(balance.total_credit))}</p>
            </div>
            <div className="bg-muted/30 rounded-md px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Balance</p>
              <p className={cn('text-sm font-bold tabular-nums', (closingBalance || Number(balance.running_balance)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                {formatMoney(Math.abs(filteredEntries.length > 0 ? closingBalance : Number(balance.running_balance)))}
                <span className="text-[10px] ml-1">{(filteredEntries.length > 0 ? closingBalance : Number(balance.running_balance)) >= 0 ? 'Dr' : 'Cr'}</span>
              </p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-2 p-2 bg-muted/20 rounded-md border border-border">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 text-xs w-[130px]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 text-xs w-[130px]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Voucher Type</label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOUCHER_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Search</label>
              <Input placeholder="Reference / narration..." value={refSearch} onChange={e => setRefSearch(e.target.value)} className="h-7 text-xs w-[160px]" />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      {/* Transaction table */}
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex-1">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Reference</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Narration</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Debit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Credit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(e => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {e.voucher?.voucher_date ? new Date(e.voucher.voucher_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{e.voucher?.voucher_type}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{e.voucher?.voucher_number}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs truncate max-w-[200px]">{e.voucher?.narration || e.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                        {Number(e.debit) > 0 && <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(Number(e.debit))}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                        {Number(e.credit) > 0 && <span className="text-destructive">{formatMoney(Number(e.credit))}</span>}
                      </td>
                      <td className={cn('px-3 py-2 text-right tabular-nums text-xs font-semibold', e.runBal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                        {formatMoney(Math.abs(e.runBal))} {e.runBal >= 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-foreground/20 bg-muted/30 font-semibold">
                    <td colSpan={4} className="px-3 py-2 text-xs">
                      Total ({filteredEntries.length} transaction{filteredEntries.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-emerald-600 dark:text-emerald-400">{formatMoney(totalDebit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-destructive">{formatMoney(totalCredit)}</td>
                    <td className={cn('px-3 py-2 text-right tabular-nums text-xs', closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                      {formatMoney(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
                <span className="text-[10px] text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, displayRows.length)} of {displayRows.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs tabular-nums">{page + 1} / {totalPages}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
