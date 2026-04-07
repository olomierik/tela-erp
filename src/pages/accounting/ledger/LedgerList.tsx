import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Search, Check, X, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { CreateLedgerDialog } from './CreateLedgerDialog';

const TYPE_COLORS: Record<string, string> = {
  asset: 'border-l-emerald-500',
  liability: 'border-l-rose-500',
  revenue: 'border-l-blue-500',
  income: 'border-l-blue-500',
  expense: 'border-l-amber-500',
  equity: 'border-l-purple-500',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  asset: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  liability: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  revenue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  income: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  expense: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  equity: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  is_system?: boolean;
  is_active?: boolean;
}

export interface LedgerBalance {
  account_id: string;
  total_debit: number;
  total_credit: number;
  running_balance: number;
}

interface Props {
  accounts: Account[];
  balances: LedgerBalance[];
  loading: boolean;
  selectedAccount: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function LedgerList({ accounts, balances, loading, selectedAccount, onSelect, onRefresh }: Props) {
  const { tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = accounts
    .filter(a => a.is_active !== false)
    .filter(a => filterType === 'all' || a.account_type === filterType)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()));

  const grouped = filtered.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.account_type] ??= []).push(a);
    return acc;
  }, {});

  const startRename = (a: Account) => {
    setEditingId(a.id);
    setEditName(a.name);
  };

  const saveRename = async () => {
    if (!editingId || !tenant?.id || !editName.trim()) return;
    const oldAcc = accounts.find(a => a.id === editingId);
    if (!oldAcc || oldAcc.name === editName.trim()) { setEditingId(null); return; }

    setSaving(true);
    const { error } = await (supabase as any)
      .from('chart_of_accounts')
      .update({ name: editName.trim() })
      .eq('id', editingId)
      .eq('tenant_id', tenant.id);

    if (error) {
      if (error.message?.includes('idx_coa_tenant_name_unique')) {
        toast.error('A ledger with this name already exists');
      } else {
        toast.error(error.message);
      }
    } else {
      // Audit log
      await (supabase as any).from('audit_log').insert({
        tenant_id: tenant.id,
        action: 'rename_ledger',
        module: 'accounting',
        reference_id: editingId,
        details: { old_name: oldAcc.name, new_name: editName.trim() },
      });
      toast.success(`Renamed to "${editName.trim()}"`);
      onRefresh();
    }
    setSaving(false);
    setEditingId(null);
  };

  const deleteLedger = async (a: Account) => {
    if (!tenant?.id) return;
    if (a.is_system) { toast.error('System ledgers cannot be deleted'); return; }

    // Check if transactions exist
    const { count } = await (supabase as any)
      .from('accounting_voucher_entries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('account_id', a.id);

    if (count && count > 0) {
      toast.error(`Cannot delete "${a.name}" — it has ${count} transaction(s). Deactivate instead.`);
      // Soft-delete
      await (supabase as any).from('chart_of_accounts').update({ is_active: false }).eq('id', a.id).eq('tenant_id', tenant.id);
      await (supabase as any).from('audit_log').insert({
        tenant_id: tenant.id, action: 'deactivate_ledger', module: 'accounting',
        reference_id: a.id, details: { name: a.name },
      });
      onRefresh();
      return;
    }

    const { error } = await (supabase as any)
      .from('chart_of_accounts')
      .delete()
      .eq('id', a.id)
      .eq('tenant_id', tenant.id);

    if (error) { toast.error(error.message); return; }

    await (supabase as any).from('audit_log').insert({
      tenant_id: tenant.id, action: 'delete_ledger', module: 'accounting',
      reference_id: a.id, details: { name: a.name },
    });
    toast.success(`Ledger "${a.name}" deleted`);
    if (selectedAccount === a.id) onSelect('');
    onRefresh();
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Ledgers</CardTitle>
          <CreateLedgerDialog onCreated={onRefresh} existingCodes={accounts.map(a => a.code)} />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search ledgers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="asset">Assets</SelectItem>
            <SelectItem value="liability">Liabilities</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0 max-h-[55vh] overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs">No ledgers found</div>
        ) : (
          Object.entries(grouped).map(([type, accs]) => (
            <div key={type}>
              <div className="px-4 py-1.5 bg-muted/30 border-y border-border flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{type}</span>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border-0', TYPE_BADGE_COLORS[type])}>
                  {accs.length}
                </Badge>
              </div>
              {accs.map(a => {
                const bal = balances.find(b => b.account_id === a.id);
                const isEditing = editingId === a.id;

                return (
                  <div
                    key={a.id}
                    className={cn(
                      'group w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted/40 transition-colors text-sm border-l-2',
                      TYPE_COLORS[a.account_type] || 'border-l-transparent',
                      selectedAccount === a.id && 'bg-primary/10'
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-6 text-xs flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          disabled={saving}
                        />
                        <button onClick={saveRename} disabled={saving} className="text-emerald-600 hover:text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => onSelect(a.id)} className="min-w-0 flex-1 text-left">
                          <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{a.code}</span>
                          <span className="truncate">{a.name}</span>
                          {a.is_system && <Badge variant="outline" className="ml-1.5 text-[8px] px-1 py-0">SYS</Badge>}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {bal && (
                            <span className={cn('text-xs font-semibold tabular-nums', Number(bal.running_balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                              {formatMoney(Math.abs(Number(bal.running_balance)))}
                            </span>
                          )}
                          <div className="hidden group-hover:flex items-center gap-0.5">
                            <button onClick={() => startRename(a)} className="p-0.5 text-muted-foreground hover:text-foreground" title="Rename">
                              <Pencil className="w-3 h-3" />
                            </button>
                            {!a.is_system && (
                              <button onClick={() => deleteLedger(a)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
