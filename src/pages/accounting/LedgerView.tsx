import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BookOpen, Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

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

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

interface LedgerBalance {
  account_id: string;
  total_debit: number;
  total_credit: number;
  running_balance: number;
}

export default function LedgerView() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Load accounts and balances
  useEffect(() => {
    if (!tenant?.id || isDemo) { setLoading(false); return; }
    Promise.all([
      (supabase as any).from('chart_of_accounts').select('id, code, name, account_type').eq('tenant_id', tenant.id).order('code'),
      (supabase as any).from('accounting_ledger_balances').select('*').eq('tenant_id', tenant.id),
    ]).then(([accRes, balRes]) => {
      setAccounts(accRes.data ?? []);
      setBalances(balRes.data ?? []);
      setLoading(false);
    });
  }, [tenant?.id]);

  // Load entries for selected account
  useEffect(() => {
    if (!selectedAccount || !tenant?.id) { setEntries([]); return; }
    (supabase as any)
      .from('accounting_voucher_entries')
      .select('*, voucher:accounting_vouchers(voucher_number, voucher_date, voucher_type, narration, status)')
      .eq('tenant_id', tenant.id)
      .eq('account_id', selectedAccount)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }: any) => setEntries(data ?? []));
  }, [selectedAccount, tenant?.id]);

  const selectedBalance = balances.find(b => b.account_id === selectedAccount);
  const selectedAccInfo = accounts.find(a => a.id === selectedAccount);

  const filteredAccounts = search
    ? accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.account_type] ??= []).push(a);
    return acc;
  }, {});

  return (
    <AppLayout title="Ledger">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ledger View</h1>
          <p className="text-sm text-muted-foreground">View transaction history for each account</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Account list */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Accounts</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                Object.entries(groupedAccounts).map(([type, accs]) => (
                  <div key={type}>
                    <div className="px-4 py-1.5 bg-muted/30 border-y border-border">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{type}</span>
                    </div>
                    {accs.map(a => {
                      const bal = balances.find(b => b.account_id === a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAccount(a.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted/40 transition-colors text-sm",
                            selectedAccount === a.id && "bg-primary/10 border-l-2 border-primary"
                          )}
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{a.code}</span>
                            <span className="truncate">{a.name}</span>
                          </div>
                          {bal && (
                            <span className={cn("text-xs font-semibold tabular-nums shrink-0", Number(bal.running_balance) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                              {formatMoney(Math.abs(Number(bal.running_balance)))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Ledger detail */}
          <Card className="lg:col-span-2">
            {selectedAccInfo ? (
              <>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedAccInfo.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{selectedAccInfo.code} · {selectedAccInfo.account_type}</p>
                    </div>
                    {selectedBalance && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={cn("text-lg font-bold tabular-nums", Number(selectedBalance.running_balance) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                          {formatMoney(Number(selectedBalance.running_balance))}
                        </p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>Dr: {formatMoney(Number(selectedBalance.total_debit))}</span>
                          <span>Cr: {formatMoney(Number(selectedBalance.total_credit))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {entries.length === 0 ? (
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
                          </tr>
                        </thead>
                        <tbody>
                          {entries.filter(e => e.voucher?.status === 'posted').map(e => (
                            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                                {e.voucher?.voucher_date ? new Date(e.voucher.voucher_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-mono text-xs font-medium">{e.voucher?.voucher_number}</span>
                              </td>
                              <td className="px-3 py-2 text-xs truncate max-w-[200px]">{e.voucher?.narration || e.description}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                                {Number(e.debit) > 0 ? formatMoney(Number(e.debit)) : ''}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                                {Number(e.credit) > 0 ? formatMoney(Number(e.credit)) : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center text-muted-foreground">
                <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Select an account</p>
                <p className="text-xs">Choose an account to view its ledger entries</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
