import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const { popularCurrencies, currencySymbol, defaultCurrency } = useCurrency();
  const { tenant, isDemo } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [syncing, setSyncing] = useState(false);

  const handleSaveCurrency = async () => {
    if (isDemo || !tenant?.id) return;
    const { error } = await (supabase.from('tenants') as any)
      .update({ default_currency: selectedCurrency })
      .eq('id', tenant.id);
    if (error) toast.error(error.message);
    else toast.success(`Default currency changed to ${selectedCurrency}`);
  };

  const handleSyncRates = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('fetch-exchange-rates');
      if (error) throw error;
      toast.success('Exchange rates updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync rates');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppLayout title="Settings" subtitle="General application settings">
      <div className="max-w-2xl space-y-6">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-card-foreground">General</h3>
          <div>
            <Label>Company Name</Label>
            <Input defaultValue={tenant?.name || 'TELA Industries'} className="mt-1.5" />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input defaultValue="admin@tela-erp.com" className="mt-1.5" />
          </div>
          <div>
            <Label>Timezone</Label>
            <Input defaultValue="UTC-5 (Eastern)" className="mt-1.5" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-card-foreground">Currency & Localization</h3>
          <div>
            <Label>Default Currency</Label>
            <p className="text-xs text-muted-foreground mb-1.5">All monetary values are stored in this currency</p>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {popularCurrencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {currencySymbol(c)} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveCurrency} disabled={isDemo}>Save Currency</Button>
            <Button variant="outline" onClick={handleSyncRates} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Exchange Rates
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-card-foreground">Notifications</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts via email</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">Low Stock Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when inventory is low</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">Order Updates</p>
              <p className="text-xs text-muted-foreground">Real-time order status changes</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <Button>Save Settings</Button>
      </div>
    </AppLayout>
  );
}
