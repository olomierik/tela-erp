import { useState, useEffect } from 'react';
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
  CheckCircle2, XCircle, Loader2, Zap,
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

  // AI settings state
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6');
  const [saveAiLoading, setSaveAiLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);

  // Load existing AI config on mount
  useEffect(() => {
    if (!tenant?.id || isDemo) return;
    (async () => {
      const { data } = await (supabase.from('tenants') as any)
        .select('anthropic_api_key, ai_model')
        .eq('id', tenant.id)
        .single();
      if (data?.anthropic_api_key) {
        setAiConfigured(true);
        setAiModel(data.ai_model || 'claude-sonnet-4-6');
        // Show masked placeholder so user knows a key is set
        setAiKey('');
      }
    })();
  }, [tenant?.id, isDemo]);

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
    if (!aiKey.trim() && !aiConfigured) { toast.error('Please enter an Anthropic API key'); return; }
    setSaveAiLoading(true);
    try {
      const updates: Record<string, any> = { ai_model: aiModel };
      if (aiKey.trim()) updates.anthropic_api_key = aiKey.trim();
      const { error } = await (supabase.from('tenants') as any)
        .update(updates)
        .eq('id', tenant?.id);
      if (error) throw error;
      setAiConfigured(true);
      if (aiKey.trim()) setAiKey('');
      toast.success('AI settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save AI settings');
    } finally {
      setSaveAiLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (isDemo) { toast.info('Test disabled in demo'); return; }
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tela-ai', {
        body: { message: 'ping', context: {}, mode: 'default' },
      });
      if (error) throw error;
      if (data?.reply && !data.reply.includes('not configured')) {
        toast.success('Connected — Claude responded successfully');
      } else {
        toast.error(data?.reply || 'API key not working. Check your key and try again.');
      }
    } catch (err: any) {
      toast.error('Connection failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTestLoading(false);
    }
  };

  const handleClearKey = async () => {
    if (isDemo) return;
    const { error } = await (supabase.from('tenants') as any)
      .update({ anthropic_api_key: null })
      .eq('id', tenant?.id);
    if (!error) {
      setAiConfigured(false);
      setAiKey('');
      toast.success('API key removed');
    }
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-sm">Tela AI Configuration</CardTitle>
                  </div>
                  {aiConfigured ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 gap-1">
                      <XCircle className="w-3 h-3" /> Not configured
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm text-indigo-700 dark:text-indigo-300">
                  Tela AI uses Anthropic Claude to answer business questions and analyze your data.
                  Your API key is stored securely in your tenant database — all AI features activate instantly after saving.
                </div>

                <div className="space-y-2">
                  <Label>Anthropic API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={aiKey}
                        onChange={e => setAiKey(e.target.value)}
                        placeholder={aiConfigured ? '●●●●●●●●●●●●●●● (key saved)' : 'sk-ant-api03-...'}
                        className="pl-9 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{' '}
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      console.anthropic.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-haiku-4-5-20251001">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Claude Haiku 4.5</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Fast · Low cost</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="claude-sonnet-4-6">
                        <div className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Claude Sonnet 4.6</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Recommended</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="claude-opus-4-6">
                        <div className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5 text-purple-500" />
                          <span>Claude Opus 4.6</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Most capable</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Model used across all Tela AI features: CFO Assistant, Document Scanner, and Demand Forecast.</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleSaveAI}
                    disabled={saveAiLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                  >
                    {saveAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saveAiLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    onClick={handleTestConnection}
                    disabled={testLoading || !aiConfigured}
                    variant="outline"
                    className="gap-2"
                  >
                    {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {testLoading ? 'Testing...' : 'Test Connection'}
                  </Button>
                  {aiConfigured && (
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 text-sm" onClick={handleClearKey}>
                      <XCircle className="w-4 h-4" /> Remove Key
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Features Overview */}
            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">AI Features</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '🧠', title: 'Tela AI Chat', desc: 'Ask anything about your business data', route: '/dashboard' },
                    { icon: '📊', title: 'CFO Assistant', desc: 'Financial analysis, forecasts & anomaly detection', route: '/ai-cfo' },
                    { icon: '📄', title: 'Document Scanner', desc: 'AI-powered invoice & receipt extraction', route: '/documents' },
                    { icon: '📦', title: 'Demand Forecast', desc: 'Predict inventory needs with 30/60/90-day outlook', route: '/inventory' },
                  ].map(f => (
                    <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                      <span className="text-xl">{f.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
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
