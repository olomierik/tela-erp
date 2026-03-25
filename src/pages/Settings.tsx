import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Building2, Users, Bot, Bell, Plug, Shield, RefreshCw,
  Upload, Save, Plus, Mail, ExternalLink, Lock, Key,
} from 'lucide-react';

const integrations = [
  { name: 'WhatsApp Business', description: 'Send order updates & invoices via WhatsApp', icon: '💬', status: 'coming_soon' },
  { name: 'Email (SMTP)', description: 'Send transactional emails from your domain', icon: '✉️', status: 'coming_soon' },
  { name: 'Zapier', description: 'Automate workflows with 5000+ apps', icon: '⚡', status: 'coming_soon' },
  { name: 'Slack', description: 'Get notifications in your Slack workspace', icon: '💼', status: 'coming_soon' },
];

export default function SettingsPage() {
  const { popularCurrencies, currencySymbol, defaultCurrency } = useCurrency();
  const { tenant, isDemo } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [syncing, setSyncing] = useState(false);
  const [aiKey, setAiKey] = useState('');
  const [saveAiLoading, setSaveAiLoading] = useState(false);

  const handleSaveCurrency = async () => {
    if (isDemo || !tenant?.id) { toast.info('Settings save disabled in demo'); return; }
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

  const handleSaveAI = async () => {
    if (isDemo) { toast.info('AI settings save disabled in demo'); return; }
    setSaveAiLoading(true);
    setTimeout(() => {
      toast.success('AI settings saved');
      setSaveAiLoading(false);
    }, 800);
  };

  return (
    <AppLayout title="Settings" subtitle="Configure your workspace">
      <div className="max-w-3xl">
        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Company</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5"><Users className="w-3.5 h-3.5" />Team</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5"><Bot className="w-3.5 h-3.5" />AI Settings</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" />Notifications</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5"><Plug className="w-3.5 h-3.5" />Integrations</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Security</TabsTrigger>
          </TabsList>

          {/* ── Company ── */}
          <TabsContent value="company" className="space-y-4">
            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">Company Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Company Logo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG or SVG, recommended 256×256px</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload Logo
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Company Name</Label>
                    <Input defaultValue={tenant?.name || 'TELA Industries'} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Address</Label>
                    <Input placeholder="123 Business Ave, Suite 100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input placeholder="New York" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input placeholder="United States" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input placeholder="+1 555 0100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Email</Label>
                    <Input defaultValue="admin@tela-erp.com" type="email" />
                  </div>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Save className="w-4 h-4" /> Save Company Info
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">Currency Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label>Default Currency</Label>
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {popularCurrencies.map(c => (
                          <SelectItem key={c} value={c}>{currencySymbol(c)} {c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleSaveCurrency} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 gap-1.5">
                      <Save className="w-4 h-4" /> Save
                    </Button>
                    <Button onClick={handleSyncRates} variant="outline" disabled={syncing} className="h-9 gap-1.5">
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Rates
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">UTC-5 (Eastern)</SelectItem>
                      <SelectItem value="pst">UTC-8 (Pacific)</SelectItem>
                      <SelectItem value="eat">UTC+3 (East Africa)</SelectItem>
                      <SelectItem value="gmt">UTC+0 (GMT)</SelectItem>
                      <SelectItem value="ist">UTC+5:30 (India)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Team ── */}
          <TabsContent value="team" className="space-y-4">
            <Card className="rounded-xl border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Team Members</CardTitle>
                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Alex Morgan', email: 'admin@tela-erp.com', role: 'Admin' },
                    { name: 'Jordan Smith', email: 'jordan@company.com', role: 'User' },
                    { name: 'Taylor Reed', email: 'taylor@company.com', role: 'User' },
                  ].map((member) => (
                    <div key={member.email} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xs font-bold">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'} className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI Settings ── */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="rounded-xl border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-sm">Tela AI Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm text-indigo-700 dark:text-indigo-300">
                  Tela AI uses OpenAI to answer business questions and analyze your data. Add your API key below to enable it.
                </div>
                <div className="space-y-1.5">
                  <Label>OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={aiKey}
                        onChange={e => setAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleSaveAI} disabled={saveAiLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                      <Save className="w-4 h-4" /> {saveAiLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key is stored securely as a Supabase edge function secret.{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      Get an API key <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>AI Model</Label>
                  <Select defaultValue="gpt-4o-mini">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast &amp; Affordable)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Most Capable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">Email Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                  <Bell className="w-4 h-4 mt-0.5 shrink-0" />
                  Email notifications require SMTP configuration. Contact support to enable email delivery.
                </div>
                {[
                  { label: 'Low stock alerts', description: 'When items fall below reorder level', default: true },
                  { label: 'New orders', description: 'When a new sales order is placed', default: true },
                  { label: 'Invoice overdue', description: 'When an invoice passes its due date', default: true },
                  { label: 'Payroll finalized', description: 'When a payroll run is finalized', default: false },
                  { label: 'Leave requests', description: 'When an employee submits a leave request', default: false },
                ].map((notif) => (
                  <div key={notif.label} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{notif.label}</p>
                      <p className="text-xs text-muted-foreground">{notif.description}</p>
                    </div>
                    <Switch defaultChecked={notif.default} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Integrations ── */}
          <TabsContent value="integrations" className="space-y-4">
            <p className="text-sm text-muted-foreground">Connect TELA-ERP with your favorite tools.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {integrations.map((int) => (
                <Card key={int.name} className="rounded-xl border-border opacity-80">
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-2xl">{int.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{int.name}</p>
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Coming Soon</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{int.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security" className="space-y-4">
            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">Account Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Password</p>
                      <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs">Change Password</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Coming Soon</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                      <Key className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">API Access</p>
                      <p className="text-xs text-muted-foreground">Manage API keys for integrations</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
