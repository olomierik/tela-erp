import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import {
  Building2, Users, Bot, Bell, Plug, Shield, RefreshCw,
  Upload, Save, Plus, Mail, ExternalLink, Lock, Key,
  CheckCircle2, XCircle, Loader2, Zap, Eye, EyeOff,
} from 'lucide-react';

const integrations = [
  { name: 'WhatsApp Business', description: 'Send order updates & invoices via WhatsApp', icon: '💬', status: 'coming_soon' },
  { name: 'Email (SMTP)', description: 'Send transactional emails from your domain', icon: '✉️', status: 'coming_soon' },
  { name: 'Zapier', description: 'Automate workflows with 5000+ apps', icon: '⚡', status: 'coming_soon' },
  { name: 'Slack', description: 'Get notifications in your Slack workspace', icon: '💼', status: 'coming_soon' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { popularCurrencies, currencySymbol, defaultCurrency, saveDefaultCurrency } = useCurrency();
  const { tenant, profile, isDemo, refreshProfile } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [syncing, setSyncing] = useState(false);

  // Company info state
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [timezone, setTimezone] = useState('utc');
  const [savingCompany, setSavingCompany] = useState(false);

  // Team members
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // AI settings state
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6');
  const [saveAiLoading, setSaveAiLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [needsFunctionDeploy, setNeedsFunctionDeploy] = useState(false);

  // Notification prefs
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tela_notification_prefs');
      return saved ? JSON.parse(saved) : {
        low_stock: true, new_orders: true, invoice_overdue: true,
        payroll_finalized: false, leave_requests: false,
      };
    } catch { return { low_stock: true, new_orders: true, invoice_overdue: true, payroll_finalized: false, leave_requests: false }; }
  });
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Security - password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // AI config is now stored in tenant_secrets (not tenants)

  // Load company info
  useEffect(() => {
    if (!tenant?.id) return;
    setCompanyName(tenant.name || '');
    (async () => {
      const { data } = await (supabase.from('tenants') as any)
        .select('address, city, country, phone, contact_email, timezone')
        .eq('id', tenant.id)
        .single();
      if (data) {
        setCompanyAddress(data.address || '');
        setCompanyCity(data.city || '');
        setCompanyCountry(data.country || '');
        setCompanyPhone(data.phone || '');
        setCompanyEmail(data.contact_email || '');
        setTimezone(data.timezone || 'utc');
      }
    })();
  }, [tenant?.id]);

  // Load team members
  useEffect(() => {
    if (!tenant?.id) { setLoadingTeam(false); return; }
    (async () => {
      setLoadingTeam(true);
      try {
        const { data: profiles } = await (supabase.from('profiles') as any)
          .select('user_id, full_name, email, is_active, created_at')
          .eq('tenant_id', tenant.id)
          .limit(10);
        const { data: roles } = await (supabase.from('user_roles') as any)
          .select('user_id, role');
        const roleMap: Record<string, string> = {};
        (roles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
        setTeamMembers((profiles ?? []).map((p: any) => ({
          ...p,
          role: roleMap[p.user_id] || 'user',
        })));
      } catch { /* silent */ }
      finally { setLoadingTeam(false); }
    })();
  }, [tenant?.id]);

  // Load AI config
  useEffect(() => {
    if (!tenant?.id || isDemo) return;
    (async () => {
      const { data, error } = await (supabase.from('tenant_secrets') as any)
        .select('anthropic_api_key, ai_model')
        .eq('tenant_id', tenant.id)
        .single();
      if (error && !error.message?.includes('0 rows')) {
        return;
      }
      if (data?.anthropic_api_key) {
        setAiConfigured(true);
        setAiModel(data.ai_model || 'claude-sonnet-4-6');
      }
    })();
  }, [tenant?.id, isDemo]);

  // ── Handlers ──

  const handleSaveCompany = async () => {
    if (isDemo) { toast.info('Settings save disabled in demo'); return; }
    setSavingCompany(true);
    try {
      const { error } = await (supabase.from('tenants') as any)
        .update({
          name: companyName.trim(),
          address: companyAddress.trim(),
          city: companyCity.trim(),
          country: companyCountry.trim(),
          phone: companyPhone.trim(),
          contact_email: companyEmail.trim(),
          timezone,
        })
        .eq('id', tenant?.id);
      if (error) throw error;
      toast.success('Company information saved');
      refreshProfile?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveCurrency = async () => {
    if (isDemo) { toast.info('Settings save disabled in demo'); return; }
    try {
      await saveDefaultCurrency(selectedCurrency);
      toast.success(`Currency changed to ${selectedCurrency} — all pages updated`);
    } catch (err: any) {
      toast.error(err.message);
    }
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

  const handleSaveNotifications = () => {
    setSavingNotifs(true);
    localStorage.setItem('tela_notification_prefs', JSON.stringify(notifications));
    setTimeout(() => {
      setSavingNotifs(false);
      toast.success('Notification preferences saved');
    }, 400);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { toast.error('Enter a new password'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
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
      if (error) {
        if (error.message?.includes('column') || error.message?.includes('schema cache') || error.message?.includes('ai_model')) {
          setNeedsMigration(true);
          toast.error('Database migration required — see the setup instructions below.');
          return;
        }
        throw error;
      }
      setNeedsMigration(false);
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
        body: { message: 'Say "Tela AI is working!" in exactly those words.', context: {}, mode: 'default' },
      });
      if (error?.message?.includes('Failed to send') || error?.message?.includes('404') || error?.message?.includes('not found')) {
        setNeedsFunctionDeploy(true);
        toast.error('Edge function not deployed yet — see deployment instructions below.');
        return;
      }
      if (error) throw error;
      if (data?.reply && !data.reply.toLowerCase().includes('not configured')) {
        setNeedsFunctionDeploy(false);
        toast.success('✓ Connected — Tela AI is working!');
      } else {
        toast.error(data?.reply || 'API key not working. Check your key in Settings.');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to send') || msg.includes('fetch') || msg.includes('network')) {
        setNeedsFunctionDeploy(true);
        toast.error('Edge function not reachable — deploy it first.');
      } else {
        toast.error('Connection failed: ' + msg);
      }
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant?.id) return;
    if (isDemo) { toast.info('Upload disabled in demo'); return; }
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${tenant.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(path, file, { upsert: true });
      if (uploadError) {
        // If bucket doesn't exist, show a friendly message
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
          toast.error('Storage not configured. Logo upload will be available soon.');
          return;
        }
        throw uploadError;
      }
      const { data: urlData } = supabase.storage.from('tenant-assets').getPublicUrl(path);
      await (supabase.from('tenants') as any)
        .update({ logo_url: urlData.publicUrl })
        .eq('id', tenant.id);
      toast.success('Logo uploaded successfully');
      refreshProfile?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
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
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                    {tenant?.logo_url ? (
                      <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Company Logo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG or SVG, recommended 256×256px</p>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1.5" asChild>
                        <span><Upload className="w-3.5 h-3.5" /> Upload Logo</span>
                      </Button>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Company Name</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Business Type</Label>
                    <Select value={(tenant as any)?.business_type || 'trading'} disabled>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['trading','manufacturing','service','retail','construction','logistics'].map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Cannot be changed after transactions exist</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Financial Year Start</Label>
                    <Input type="date" value={(tenant as any)?.financial_year_start || ''} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>TIN</Label>
                    <Input value={(tenant as any)?.tin || ''} disabled placeholder="Tax ID Number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>VRN</Label>
                    <Input value={(tenant as any)?.vrn || ''} disabled placeholder="VAT Reg Number" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Address</Label>
                    <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="123 Business Ave, Suite 100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={companyCity} onChange={e => setCompanyCity(e.target.value)} placeholder="Dar es Salaam" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input value={companyCountry} onChange={e => setCompanyCountry(e.target.value)} placeholder="Tanzania" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+255 7XX XXX XXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Email</Label>
                    <Input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} type="email" placeholder="admin@company.com" />
                  </div>
                </div>
                <Button onClick={handleSaveCompany} disabled={savingCompany} className="gap-2">
                  {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingCompany ? 'Saving...' : 'Save Company Info'}
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
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {popularCurrencies.map(c => (
                          <SelectItem key={c} value={c}>{currencySymbol(c)} {c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleSaveCurrency} className="h-9 gap-1.5">
                      <Save className="w-4 h-4" /> Save
                    </Button>
                    <Button onClick={handleSyncRates} variant="outline" disabled={syncing} className="h-9 gap-1.5">
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync Rates
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
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
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate('/settings/team')}>
                    <Users className="w-3.5 h-3.5" /> Manage Team
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />)}
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No team members yet</p>
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate('/settings/team')}>
                      <Plus className="w-3.5 h-3.5" /> Invite Members
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {(member.full_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                    {teamMembers.length >= 10 && (
                      <Button variant="link" size="sm" className="text-xs w-full" onClick={() => navigate('/settings/team')}>
                        View all members →
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI Settings ── */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="rounded-xl border-border overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-amber-500" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Tela AI</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Powered by Anthropic Claude — built into the platform</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Included
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tela AI is fully managed by the platform — no API key or configuration needed. All AI features are available immediately.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '🧠', title: 'Tela AI Chat', desc: 'Ask anything about your business data in plain language' },
                    { icon: '📊', title: 'CFO Assistant', desc: 'Financial analysis, anomaly detection & cash-flow forecasts' },
                    { icon: '📄', title: 'Document Scanner', desc: 'AI-powered invoice & receipt data extraction' },
                    { icon: '📦', title: 'Demand Forecast', desc: '30/60/90-day inventory demand predictions' },
                  ].map(f => (
                    <div key={f.title} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                      <span className="text-base leading-none mt-0.5">{f.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.title}</p>
                        <p className="text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={handleTestConnection} disabled={testLoading} variant="outline" className="gap-2">
                  {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {testLoading ? 'Testing...' : 'Test AI Connection'}
                </Button>
              </CardContent>
            </Card>

            {needsFunctionDeploy && (
              <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 text-lg leading-none">🚀</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Deploy Edge Functions</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                      The AI edge functions need to be deployed. Run these commands from the project root.
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <pre className="text-xs bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 rounded-lg p-3 overflow-x-auto font-mono">
{`npx supabase functions deploy tela-ai
npx supabase functions deploy ai-cfo
npx supabase functions deploy ai-document-parser
npx supabase functions deploy ai-demand-forecast`}
                  </pre>
                  <Button
                    size="sm" variant="outline"
                    className="absolute top-2 right-2 h-6 text-[10px] gap-1 border-blue-300"
                    onClick={() => { navigator.clipboard.writeText('npx supabase functions deploy tela-ai\nnpx supabase functions deploy ai-cfo\nnpx supabase functions deploy ai-document-parser\nnpx supabase functions deploy ai-demand-forecast'); toast.success('Copied!'); }}
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
              </div>
            )}

            <Card className="rounded-xl border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm text-muted-foreground font-medium">Advanced: Custom API Key (Optional)</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  By default, Tela AI is powered by the platform. Optionally provide your own Anthropic key to use your own quota.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {needsMigration && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">⚠️ Database migration required first</p>
                    <div className="relative">
                      <pre className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-900 rounded p-2 font-mono">{MIGRATION_SQL}</pre>
                      <Button size="sm" variant="outline" className="absolute top-1 right-1 h-5 text-[10px] gap-1 border-amber-300"
                        onClick={() => { navigator.clipboard.writeText(MIGRATION_SQL); toast.success('SQL copied!'); }}>
                        <Copy className="w-2.5 h-2.5" /> Copy
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Anthropic API Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={aiKey}
                      onChange={e => setAiKey(e.target.value)}
                      placeholder={aiConfigured ? '●●●●●●●●●●●●●●● (custom key saved)' : 'sk-ant-api03-... (optional)'}
                      className="pl-9 font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      Get key from console.anthropic.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-haiku-4-5-20251001">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Claude Haiku 4.5</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Fast</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="claude-sonnet-4-6">
                        <div className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5 text-primary" />
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
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleSaveAI} disabled={saveAiLoading} variant="outline" className="gap-2">
                    {saveAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saveAiLoading ? 'Saving...' : 'Save Custom Key'}
                  </Button>
                  {aiConfigured && (
                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-sm" onClick={handleClearKey}>
                      <XCircle className="w-4 h-4" /> Remove Custom Key
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'low_stock', label: 'Low stock alerts', description: 'When items fall below reorder level' },
                  { key: 'new_orders', label: 'New orders', description: 'When a new sales order is placed' },
                  { key: 'invoice_overdue', label: 'Invoice overdue', description: 'When an invoice passes its due date' },
                  { key: 'payroll_finalized', label: 'Payroll finalized', description: 'When a payroll run is finalized' },
                  { key: 'leave_requests', label: 'Leave requests', description: 'When an employee submits a leave request' },
                ].map((notif) => (
                  <div key={notif.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{notif.label}</p>
                      <p className="text-xs text-muted-foreground">{notif.description}</p>
                    </div>
                    <Switch
                      checked={notifications[notif.key] ?? false}
                      onCheckedChange={v => setNotifications((n: any) => ({ ...n, [notif.key]: v }))}
                    />
                  </div>
                ))}
                <Button onClick={handleSaveNotifications} disabled={savingNotifs} className="gap-1.5">
                  {savingNotifs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingNotifs ? 'Saving...' : 'Save Preferences'}
                </Button>
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
              <CardHeader><CardTitle className="text-sm">Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-1.5">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border">
              <CardHeader><CardTitle className="text-sm">Additional Security</CardTitle></CardHeader>
              <CardContent className="space-y-3">
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
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <Key className="w-4 h-4 text-muted-foreground" />
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
