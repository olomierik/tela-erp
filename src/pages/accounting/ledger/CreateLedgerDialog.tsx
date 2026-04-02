import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue / Income' },
  { value: 'expense', label: 'Expense' },
];

interface Props {
  onCreated: () => void;
  existingCodes: string[];
}

export function CreateLedgerDialog({ onCreated, existingCodes }: Props) {
  const { tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [accountType, setAccountType] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceType, setBalanceType] = useState<'debit' | 'credit'>('debit');

  const reset = () => {
    setName(''); setCode(''); setAccountType(''); setOpeningBalance(''); setBalanceType('debit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name.trim() || !accountType || !code.trim()) return;

    setSaving(true);
    try {
      // Insert account
      const { data: newAcc, error } = await (supabase as any)
        .from('chart_of_accounts')
        .insert({
          tenant_id: tenant.id,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          account_type: accountType,
          is_system: false,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        if (error.message?.includes('idx_coa_tenant_name_unique')) {
          toast.error('A ledger with this name already exists');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Create opening balance voucher if needed
      const obAmount = parseFloat(openingBalance);
      if (obAmount > 0 && newAcc?.id) {
        const debit = balanceType === 'debit' ? obAmount : 0;
        const credit = balanceType === 'credit' ? obAmount : 0;

        await (supabase as any).rpc('auto_create_voucher', {
          _tenant_id: tenant.id,
          _voucher_type: 'journal',
          _source_module: 'accounting',
          _source_id: newAcc.id,
          _narration: `Opening Balance: ${name.trim()}`,
          _voucher_date: new Date().toISOString().split('T')[0],
          _entries: JSON.stringify([
            { account_name: name.trim(), account_type: accountType, debit, credit, description: 'Opening balance' },
            { account_name: 'Opening Balance Equity', account_type: 'equity', debit: credit, credit: debit, description: 'Opening balance contra' },
          ]),
        });
      }

      toast.success(`Ledger "${name.trim()}" created`);
      reset();
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ledger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Ledger
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Ledger</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ledger Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trade Receivables" required />
          </div>
          <div className="space-y-1.5">
            <Label>Account Code *</Label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 1100" required className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Group *</Label>
            <Select value={accountType} onValueChange={setAccountType} required>
              <SelectTrigger><SelectValue placeholder="Select group..." /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Opening Balance</Label>
              <Input type="number" step="0.01" min="0" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Balance Type</Label>
              <Select value={balanceType} onValueChange={v => setBalanceType(v as 'debit' | 'credit')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit (Dr)</SelectItem>
                  <SelectItem value="credit">Credit (Cr)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving || !name.trim() || !accountType || !code.trim()}>
            {saving ? 'Creating...' : 'Create Ledger'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
