import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface EntryLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

const VOUCHER_TYPES = [
  { value: 'journal', label: 'Journal' },
  { value: 'sale', label: 'Sale' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'payment', label: 'Payment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'contra', label: 'Contra' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
];

function newLine(): EntryLine {
  return { id: crypto.randomUUID(), account_id: '', description: '', debit: 0, credit: 0 };
}

export default function VoucherForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  const { formatMoney } = useCurrency();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [voucherType, setVoucherType] = useState('journal');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('draft');
  const [lines, setLines] = useState<EntryLine[]>([newLine(), newLine()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  // Load accounts
  useEffect(() => {
    if (!tenant?.id) return;
    (supabase as any)
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('tenant_id', tenant.id)
      .order('code')
      .then(({ data }: any) => setAccounts(data ?? []));
  }, [tenant?.id]);

  // Load existing voucher
  useEffect(() => {
    if (isNew || !tenant?.id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('accounting_vouchers')
        .select('*, entries:accounting_voucher_entries(*)')
        .eq('id', id)
        .single();
      if (error || !data) { toast.error('Voucher not found'); navigate('/accounting/vouchers'); return; }
      setVoucherType(data.voucher_type);
      setVoucherNumber(data.voucher_number);
      setVoucherDate(data.voucher_date);
      setNarration(data.narration);
      setReference(data.reference || '');
      setStatus(data.status);
      setLines(data.entries?.length ? data.entries.map((e: any) => ({
        id: e.id, account_id: e.account_id, description: e.description, debit: Number(e.debit), credit: Number(e.credit),
      })) : [newLine(), newLine()]);
      setLoading(false);
    })();
  }, [id, tenant?.id]);

  // Auto-generate voucher number for new
  useEffect(() => {
    if (!isNew || !tenant?.id) return;
    (supabase as any).rpc('next_voucher_number', { _tenant_id: tenant.id, _type: voucherType })
      .then(({ data }: any) => { if (data) setVoucherNumber(data); });
  }, [isNew, tenant?.id, voucherType]);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const updateLine = (idx: number, field: keyof EntryLine, value: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (idx: number) => { if (lines.length > 2) setLines(prev => prev.filter((_, i) => i !== idx)); };

  const handleSave = async (postAfter = false) => {
    if (!tenant?.id || !user?.id) return;
    if (!isBalanced) { toast.error('Debits must equal credits!'); return; }
    if (lines.some(l => !l.account_id)) { toast.error('All lines must have an account'); return; }
    if (totalDebit === 0) { toast.error('Voucher amount cannot be zero'); return; }

    setSaving(true);
    try {
      let voucherId = id;
      if (isNew) {
        const { data, error } = await (supabase as any)
          .from('accounting_vouchers')
          .insert({
            tenant_id: tenant.id,
            voucher_type: voucherType,
            voucher_number: voucherNumber,
            voucher_date: voucherDate,
            narration,
            reference: reference || null,
            status: postAfter ? 'posted' : 'draft',
            created_by: user.id,
          })
          .select('id')
          .single();
        if (error) throw error;
        voucherId = data.id;
      } else {
        const { error } = await (supabase as any)
          .from('accounting_vouchers')
          .update({ voucher_type: voucherType, voucher_date: voucherDate, narration, reference: reference || null, status: postAfter ? 'posted' : status })
          .eq('id', id);
        if (error) throw error;
        await (supabase as any).from('accounting_voucher_entries').delete().eq('voucher_id', id);
      }

      const entries = lines.map(l => ({
        voucher_id: voucherId,
        tenant_id: tenant.id,
        account_id: l.account_id,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
      }));
      const { error: lErr } = await (supabase as any).from('accounting_voucher_entries').insert(entries);
      if (lErr) throw lErr;

      toast.success(postAfter ? 'Voucher posted!' : 'Voucher saved!');
      navigate('/accounting/vouchers');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLayout title="Voucher"><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;

  return (
    <AppLayout title={isNew ? 'New Voucher' : `Voucher ${voucherNumber}`}>
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate('/accounting/vouchers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{isNew ? 'New Voucher' : `Edit ${voucherNumber}`}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={saving || !isBalanced} onClick={() => handleSave(false)} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button size="sm" disabled={saving || !isBalanced} onClick={() => handleSave(true)} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Save & Post
            </Button>
          </div>
        </div>

        {/* Voucher header fields */}
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={voucherType} onValueChange={setVoucherType} disabled={status === 'posted'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOUCHER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Number</Label>
              <Input value={voucherNumber} readOnly className="bg-muted/50 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} disabled={status === 'posted'} />
            </div>
            <div>
              <Label className="text-xs">Reference</Label>
              <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" disabled={status === 'posted'} />
            </div>
            <div className="col-span-full">
              <Label className="text-xs">Narration</Label>
              <Textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="Describe this transaction..." rows={2} disabled={status === 'posted'} />
            </div>
          </CardContent>
        </Card>

        {/* Entry lines */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Journal Entries</CardTitle>
              {status !== 'posted' && (
                <Button size="sm" variant="outline" onClick={addLine} className="gap-1 h-7 text-xs">
                  <Plus className="w-3 h-3" /> Add Line
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Account</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Description</th>
                    <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-[140px]">Debit</th>
                    <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-[140px]">Credit</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-2 py-1.5">
                        <Select value={line.account_id} onValueChange={v => updateLine(idx, 'account_id', v)} disabled={status === 'posted'}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account..." /></SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>
                                <span className="font-mono text-[10px] mr-1">{a.code}</span> {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="h-8 text-xs" placeholder="Line note" disabled={status === 'posted'} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', Number(e.target.value))} className="h-8 text-xs text-right tabular-nums" placeholder="0.00" disabled={status === 'posted'} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', Number(e.target.value))} className="h-8 text-xs text-right tabular-nums" placeholder="0.00" disabled={status === 'posted'} />
                      </td>
                      <td className="px-1">
                        {status !== 'posted' && lines.length > 2 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(idx)}>
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-3 py-2 text-xs" colSpan={2}>Totals</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{formatMoney(totalDebit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{formatMoney(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance indicator */}
            <div className={cn("px-4 py-2 text-xs flex items-center gap-2", isBalanced ? "text-green-600 dark:text-green-400" : "text-destructive")}>
              {isBalanced ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Balanced — ready to post</>
              ) : (
                <><AlertTriangle className="w-3.5 h-3.5" /> Difference: {formatMoney(Math.abs(totalDebit - totalCredit))}</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
