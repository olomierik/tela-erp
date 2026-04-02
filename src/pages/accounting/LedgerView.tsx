import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LedgerList, type Account, type LedgerBalance } from './ledger/LedgerList';
import { LedgerDetail } from './ledger/LedgerDetail';

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

export default function LedgerView() {
  const { tenant, isDemo } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!tenant?.id || isDemo) { setLoading(false); return; }
    setLoading(true);
    const [accRes, balRes] = await Promise.all([
      (supabase as any).from('chart_of_accounts').select('id, code, name, account_type, is_system, is_active').eq('tenant_id', tenant.id).order('code'),
      (supabase as any).from('accounting_ledger_balances').select('*').eq('tenant_id', tenant.id),
    ]);
    setAccounts(accRes.data ?? []);
    setBalances(balRes.data ?? []);
    setLoading(false);
  }, [tenant?.id, isDemo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load entries for selected account
  useEffect(() => {
    if (!selectedAccount || !tenant?.id) { setEntries([]); return; }
    (supabase as any)
      .from('accounting_voucher_entries')
      .select('*, voucher:accounting_vouchers(voucher_number, voucher_date, voucher_type, narration, status)')
      .eq('tenant_id', tenant.id)
      .eq('account_id', selectedAccount)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }: any) => setEntries(data ?? []));
  }, [selectedAccount, tenant?.id]);

  const selectedAccInfo = accounts.find(a => a.id === selectedAccount);
  const selectedBalance = balances.find(b => b.account_id === selectedAccount);

  return (
    <AppLayout title="Ledger">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ledger Management</h1>
          <p className="text-sm text-muted-foreground">Create, rename, and manage ledger accounts</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LedgerList
            accounts={accounts}
            balances={balances}
            loading={loading}
            selectedAccount={selectedAccount}
            onSelect={setSelectedAccount}
            onRefresh={loadData}
          />
          <LedgerDetail account={selectedAccInfo} balance={selectedBalance} entries={entries} onRefresh={() => { loadData(); setSelectedAccount(selectedAccount); }} />
        </div>
      </div>
    </AppLayout>
  );
}
