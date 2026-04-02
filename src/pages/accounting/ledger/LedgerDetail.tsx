import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookOpen, ArrowUpDown } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
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

export function LedgerDetail({ account, balance, entries }: Props) {
  const { formatMoney } = useCurrency();
  const postedEntries = entries.filter(e => e.voucher?.status === 'posted');

  // Compute running balance per row
  let runBal = 0;
  const rows = [...postedEntries].reverse().map(e => {
    runBal += Number(e.debit) - Number(e.credit);
    return { ...e, runBal };
  });
  rows.reverse();

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
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{account.name}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono">{account.code} · {account.account_type}</p>
          </div>
          {balance && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={cn('text-lg font-bold tabular-nums', Number(balance.running_balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                {formatMoney(Number(balance.running_balance))}
              </p>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>Dr: {formatMoney(Number(balance.total_debit))}</span>
                <span>Cr: {formatMoney(Number(balance.total_credit))}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {postedEntries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Voucher</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Narration</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Debit</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Credit</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {e.voucher?.voucher_date ? new Date(e.voucher.voucher_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="font-mono text-[10px]">{e.voucher?.voucher_number}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs truncate max-w-[200px]">{e.voucher?.narration || e.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                      {Number(e.debit) > 0 ? formatMoney(Number(e.debit)) : ''}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                      {Number(e.credit) > 0 ? formatMoney(Number(e.credit)) : ''}
                    </td>
                    <td className={cn('px-3 py-2 text-right tabular-nums text-xs font-semibold', e.runBal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                      {formatMoney(Math.abs(e.runBal))} {e.runBal >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
