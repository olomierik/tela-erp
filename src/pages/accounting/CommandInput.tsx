import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Terminal, X, Loader2, Zap, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandInputProps {
  onClose: () => void;
  onVoucherCreated: () => void;
}

const EXAMPLES = [
  { cmd: '/sale 200000 customer:Ali', desc: 'Record a sale' },
  { cmd: '/expense fuel 50000', desc: 'Record an expense' },
  { cmd: '/payment rent 1500000', desc: 'Record a payment' },
  { cmd: '/receipt cash 300000', desc: 'Record a receipt' },
  { cmd: '/journal DR:Cash 100000 CR:Sales 100000', desc: 'Manual journal entry' },
];

// Parse command into voucher data
function parseCommand(input: string): {
  type: string;
  narration: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.split(/\s+/);
  const command = parts[0].replace('/', '').toLowerCase();

  const typeMap: Record<string, { type: string; debit: string; credit: string }> = {
    sale: { type: 'sale', debit: 'Cash/Bank', credit: 'Sales Revenue' },
    expense: { type: 'payment', debit: 'Expenses', credit: 'Cash/Bank' },
    payment: { type: 'payment', debit: 'Accounts Payable', credit: 'Cash/Bank' },
    receipt: { type: 'receipt', debit: 'Cash/Bank', credit: 'Accounts Receivable' },
    purchase: { type: 'purchase', debit: 'Purchases', credit: 'Cash/Bank' },
  };

  const config = typeMap[command];
  if (!config) return null;

  // Extract amount (first number found)
  const amount = parts.slice(1).map(Number).find(n => !isNaN(n) && n > 0);
  if (!amount) return null;

  // Build narration from non-numeric, non-key:value parts
  const narration = parts.slice(1)
    .filter(p => isNaN(Number(p)) && !p.includes(':'))
    .join(' ') || `${config.type} transaction`;

  // Extract key:value pairs for context
  const kvPairs = parts.slice(1).filter(p => p.includes(':'));
  const customerInfo = kvPairs.find(p => p.startsWith('customer:'))?.split(':')[1] || '';
  const fullNarration = customerInfo ? `${narration} — ${customerInfo}` : narration;

  return {
    type: config.type,
    narration: fullNarration,
    amount,
    debitAccount: config.debit,
    creditAccount: config.credit,
  };
}

export default function CommandInput({ onClose, onVoucherCreated }: CommandInputProps) {
  const { tenant, user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof parseCommand>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const parsed = parseCommand(input);
    setPreview(parsed);
  }, [input]);

  const handleSubmit = async () => {
    if (!preview || !tenant?.id || !user?.id) return;
    setLoading(true);

    try {
      // Get next voucher number
      const { data: vnData } = await (supabase as any).rpc('next_voucher_number', {
        _tenant_id: tenant.id,
        _type: preview.type,
      });

      // Find or create accounts
      const findOrCreateAccount = async (name: string, type: string) => {
        const { data: existing } = await (supabase as any)
          .from('chart_of_accounts')
          .select('id')
          .eq('tenant_id', tenant.id)
          .ilike('name', name)
          .limit(1)
          .single();
        if (existing) return existing.id;

        const code = `AUTO-${Date.now().toString(36).toUpperCase()}`;
        const { data: created, error } = await (supabase as any)
          .from('chart_of_accounts')
          .insert({ tenant_id: tenant.id, name, account_type: type, code, is_system: false })
          .select('id')
          .single();
        if (error) throw error;
        return created.id;
      };

      const debitType = preview.type === 'sale' || preview.type === 'receipt' ? 'asset' : 'expense';
      const creditType = preview.type === 'sale' ? 'revenue' : 'asset';

      const debitAccountId = await findOrCreateAccount(preview.debitAccount, debitType);
      const creditAccountId = await findOrCreateAccount(preview.creditAccount, creditType);

      // Create voucher
      const { data: voucher, error: vErr } = await (supabase as any)
        .from('accounting_vouchers')
        .insert({
          tenant_id: tenant.id,
          voucher_type: preview.type,
          voucher_number: vnData || `V-${Date.now()}`,
          narration: preview.narration,
          voucher_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          created_by: user.id,
        })
        .select('id')
        .single();
      if (vErr) throw vErr;

      // Create entries
      await (supabase as any).from('accounting_voucher_entries').insert([
        { voucher_id: voucher.id, tenant_id: tenant.id, account_id: debitAccountId, debit: preview.amount, credit: 0, description: preview.narration },
        { voucher_id: voucher.id, tenant_id: tenant.id, account_id: creditAccountId, debit: 0, credit: preview.amount, description: preview.narration },
      ]);

      toast.success(`Voucher ${vnData} created as draft!`);
      onVoucherCreated();
      setInput('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && preview) handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <Card className="border-primary/30 shadow-lg shadow-primary/5 overflow-hidden">
      <CardContent className="p-0">
        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
          <Terminal className="w-4 h-4 text-primary shrink-0" />
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command... (e.g., /sale 200000 customer:Ali)"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm font-mono"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Debit:</span>
                <p className="font-medium">{preview.debitAccount} — {preview.amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Credit:</span>
                <p className="font-medium">{preview.creditAccount} — {preview.amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" disabled={loading} onClick={handleSubmit} className="gap-1.5">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Create as Draft
              </Button>
              <span className="text-[10px] text-muted-foreground">Press Enter ↵</span>
            </div>
          </div>
        )}

        {/* Help */}
        {!preview && input.length === 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Quick Commands</span>
            </div>
            <div className="space-y-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex.cmd}
                  onClick={() => setInput(ex.cmd)}
                  className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                >
                  <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{ex.cmd}</code>
                  <span className="text-xs text-muted-foreground">{ex.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
