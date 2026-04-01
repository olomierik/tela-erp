import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BookOpen, Plus, Search, FileText, CheckCircle2,
  XCircle, Clock, TrendingUp, Filter, Eye, Edit, Trash2,
  Terminal,
} from 'lucide-react';
import CommandInput from './CommandInput';

interface Voucher {
  id: string;
  tenant_id: string;
  voucher_type: string;
  voucher_number: string;
  reference: string | null;
  narration: string;
  voucher_date: string;
  status: string;
  is_auto: boolean;
  source_module: string | null;
  created_at: string;
  entries?: VoucherEntry[];
}

interface VoucherEntry {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  sale: { label: 'Sale', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  purchase: { label: 'Purchase', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  payment: { label: 'Payment', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  receipt: { label: 'Receipt', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  journal: { label: 'Journal', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  contra: { label: 'Contra', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  credit_note: { label: 'Credit Note', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  debit_note: { label: 'Debit Note', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
};

const STATUS_VARIANT: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function Vouchers() {
  const navigate = useNavigate();
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCommand, setShowCommand] = useState(false);

  const loadVouchers = async () => {
    if (isDemo || !tenant?.id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('accounting_vouchers')
      .select('*, entries:accounting_voucher_entries(*)')
      .eq('tenant_id', tenant.id)
      .order('voucher_date', { ascending: false })
      .limit(500);
    if (error) toast.error('Failed to load vouchers');
    else setVouchers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadVouchers(); }, [tenant?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase
      .channel('vouchers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounting_vouchers' }, () => {
        loadVouchers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id]);

  // KPIs
  const totalVouchers = vouchers.length;
  const postedCount = vouchers.filter(v => v.status === 'posted').length;
  const draftCount = vouchers.filter(v => v.status === 'draft').length;
  const totalPostedValue = vouchers
    .filter(v => v.status === 'posted')
    .reduce((sum, v) => sum + (v.entries ?? []).reduce((s, e) => s + Number(e.debit), 0), 0);

  // Filter
  const filtered = vouchers.filter(v => {
    if (search) {
      const q = search.toLowerCase();
      if (!v.voucher_number.toLowerCase().includes(q) && !v.narration.toLowerCase().includes(q)) return false;
    }
    if (typeFilter !== 'all' && v.voucher_type !== typeFilter) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    await (supabase as any).from('accounting_voucher_entries').delete().eq('voucher_id', id);
    const { error } = await (supabase as any).from('accounting_vouchers').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Voucher deleted'); setVouchers(prev => prev.filter(v => v.id !== id)); }
  };

  const handlePost = async (id: string) => {
    const { error } = await (supabase as any)
      .from('accounting_vouchers')
      .update({ status: 'posted' })
      .eq('id', id);
    if (error) toast.error('Failed to post voucher');
    else { toast.success('Voucher posted!'); loadVouchers(); }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowCommand(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AppLayout title="Vouchers">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Voucher Book</h1>
            <p className="text-sm text-muted-foreground">Tally-style double-entry voucher management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setShowCommand(true)} className="gap-1.5">
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">Command</span>
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-1">Ctrl+/</kbd>
            </Button>
            <Button size="sm" onClick={() => navigate('/accounting/vouchers/new')} className="gap-1.5">
              <Plus className="w-4 h-4" /> New Voucher
            </Button>
          </div>
        </div>

        {/* Command Input */}
        {showCommand && (
          <CommandInput
            onClose={() => setShowCommand(false)}
            onVoucherCreated={() => loadVouchers()}
          />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Vouchers', value: totalVouchers, icon: BookOpen, color: 'text-foreground' },
            { label: 'Posted', value: postedCount, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
            { label: 'Drafts', value: draftCount, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Posted Value', value: formatMoney(totalPostedValue), icon: TrendingUp, color: 'text-foreground' },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <kpi.icon className="w-3.5 h-3.5" /> {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className={cn("text-xl font-bold", kpi.color)}>
                  {loading ? <Skeleton className="h-7 w-20" /> : kpi.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search vouchers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voucher list */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">No vouchers found</p>
                <p className="text-sm">Create your first voucher or use the command input.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(v => {
                  const totalDebit = (v.entries ?? []).reduce((s, e) => s + Number(e.debit), 0);
                  const tc = TYPE_CONFIG[v.voucher_type] ?? { label: v.voucher_type, color: 'bg-muted text-muted-foreground' };
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/accounting/vouchers/${v.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-sm font-semibold text-foreground">{v.voucher_number}</span>
                          <Badge className={cn('text-[10px] px-1.5 py-0', tc.color)}>{tc.label}</Badge>
                          <Badge className={cn('text-[10px] px-1.5 py-0', STATUS_VARIANT[v.status])}>{v.status}</Badge>
                          {v.is_auto && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Auto</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{v.narration || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">{formatMoney(totalDebit)}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(v.voucher_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {v.status === 'draft' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handlePost(v.id); }} title="Post">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDelete(v.id); }} title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
