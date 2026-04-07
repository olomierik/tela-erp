import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, User, Building2, Bot, Palette, Bell, AlertTriangle, LayoutGrid } from 'lucide-react';
import { useModules, INDUSTRY_PRESETS, ALL_MODULES, ModuleKey, MODULE_LABELS } from '@/contexts/ModulesContext';
import { Switch } from '@/components/ui/switch';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
  anthropic_api_key: string | null;
}

interface CompanyFields {
  industry: string;
  country: string;
  timezone: string;
  currency: string;
  website: string;
  phone: string;
}

interface NotificationPrefs {
  email_notifications: boolean;
  invoice_reminders: boolean;
  payment_alerts: boolean;
  low_stock_alerts: boolean;
}

type ThemeChoice = 'light' | 'dark' | 'system';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Chicago', 'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo',
  'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Istanbul', 'Europe/London', 'Europe/Paris',
  'Pacific/Auckland',
  'UTC',
];

const CURRENCIES = [
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'KES', label: 'KES – Kenyan Shilling' },
  { value: 'NGN', label: 'NGN – Nigerian Naira' },
  { value: 'ZAR', label: 'ZAR – South African Rand' },
];

const LS_COMPANY   = 'myerp_company_fields';
const LS_NOTIFS    = 'myerp_notifications';

function loadCompanyFields(): CompanyFields {
  try {
    const raw = localStorage.getItem(LS_COMPANY);
    if (raw) return JSON.parse(raw) as CompanyFields;
  } catch {}
  return { industry: '', country: '', timezone: 'UTC', currency: 'USD', website: '', phone: '' };
}

function loadNotifPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(LS_NOTIFS);
    if (raw) return JSON.parse(raw) as NotificationPrefs;
  } catch {}
  return { email_notifications: true, invoice_reminders: true, payment_alerts: true, low_stock_alerts: false };
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors
        after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
        after:rounded-full after:h-4 after:w-4 after:transition-all
        peer-checked:after:translate-x-4" />
    </label>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, profile } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { activeModules, industry, toggleModule, setIndustry } = useModules();

  // Profile loading
  const [profileLoading, setProfileLoading] = useState(true);
  const [dbProfile, setDbProfile] = useState<ProfileRow | null>(null);

  // Company Profile
  const [companyName, setCompanyName] = useState('');
  const [companyFields, setCompanyFields] = useState<CompanyFields>(loadCompanyFields);
  const [savingCompany, setSavingCompany] = useState(false);

  // User Profile
  const [fullName, setFullName] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // AI Assistant
  const [apiKey, setApiKey] = useState('');
  const [savingAI, setSavingAI] = useState(false);

  // Appearance — derive from ThemeContext + localStorage on mount
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => {
    try {
      const stored = localStorage.getItem('myerp_theme_choice') as ThemeChoice | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) return stored;
    } catch {}
    return 'system';
  });

  // Notifications
  const [notifs, setNotifs] = useState<NotificationPrefs>(loadNotifPrefs);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Danger zone
  const [signingOut, setSigningOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // ── Fetch profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('myerp_profiles')
      .select('id, full_name, company_name, anthropic_api_key')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const row = data as ProfileRow;
          setDbProfile(row);
          setCompanyName(row.company_name ?? '');
          setFullName(row.full_name ?? '');
          // Mask API key — show placeholder with last 4 chars if saved
          if (row.anthropic_api_key) {
            setApiKey(''); // leave blank so password input shows placeholder
          }
        }
        setProfileLoading(false);
      });
  }, [user]);

  // ── Apply theme choice ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('myerp_theme_choice', themeChoice);
    const root = document.documentElement;
    if (themeChoice === 'dark') {
      root.classList.add('dark');
    } else if (themeChoice === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [themeChoice]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function cfField<K extends keyof CompanyFields>(key: K, value: string) {
    setCompanyFields(f => ({ ...f, [key]: value }));
  }

  function notifField<K extends keyof NotificationPrefs>(key: K, value: boolean) {
    setNotifs(f => ({ ...f, [key]: value }));
  }

  // ── Save handlers ──────────────────────────────────────────────────────────

  async function saveCompanyProfile() {
    if (!user) return;
    setSavingCompany(true);
    try {
      const { error } = await supabase
        .from('myerp_profiles')
        .update({ company_name: companyName })
        .eq('id', user.id);
      if (error) throw error;
      localStorage.setItem(LS_COMPANY, JSON.stringify(companyFields));
      toast.success('Company profile saved');
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSavingCompany(false);
    }
  }

  async function saveUserProfile() {
    if (!user) return;
    setSavingUser(true);
    try {
      const { error } = await supabase
        .from('myerp_profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('User profile saved');
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSavingUser(false);
    }
  }

  async function saveAISettings() {
    if (!user) return;
    if (!apiKey.trim()) { toast.error('API key cannot be empty'); return; }
    setSavingAI(true);
    try {
      const { error } = await supabase
        .from('myerp_profiles')
        .update({ anthropic_api_key: apiKey.trim() })
        .eq('id', user.id);
      if (error) throw error;
      setDbProfile(prev => prev ? { ...prev, anthropic_api_key: apiKey.trim() } : prev);
      setApiKey(''); // clear after save — show masked placeholder
      toast.success('API key saved');
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSavingAI(false);
    }
  }

  async function saveNotifications() {
    setSavingNotifs(true);
    try {
      localStorage.setItem(LS_NOTIFS, JSON.stringify(notifs));
      toast.success('Notification preferences saved');
    } finally {
      setSavingNotifs(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (e) {
      toast.error((e as Error).message ?? 'Sign out failed');
      setSigningOut(false);
    }
  }

  function handleDeleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    toast.info('To permanently delete your account, please contact support at support@myerp.app');
    setDeleteConfirm(false);
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const avatarInitials = (() => {
    const name = fullName.trim() || user?.email || '';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const maskedKey = dbProfile?.anthropic_api_key
    ? `••••••••••••••••••••••••••••••••••••${dbProfile.anthropic_api_key.slice(-4)}`
    : '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Settings">
      <PageHeader
        title="Settings"
        subtitle="Manage your company profile, preferences, and account settings"
      />

      {profileLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ═══════════════════════ LEFT COLUMN ═══════════════════════ */}
          <div className="space-y-6">

            {/* 1. Company Profile */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Company Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-company-name">Company Name</Label>
                  <Input
                    id="s-company-name"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-industry">Industry</Label>
                    <Input
                      id="s-industry"
                      value={companyFields.industry}
                      onChange={e => cfField('industry', e.target.value)}
                      placeholder="e.g. Manufacturing"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-country">Country</Label>
                    <Input
                      id="s-country"
                      value={companyFields.country}
                      onChange={e => cfField('country', e.target.value)}
                      placeholder="e.g. Kenya"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-timezone">Timezone</Label>
                  <Select
                    id="s-timezone"
                    value={companyFields.timezone}
                    onChange={e => cfField('timezone', e.target.value)}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-currency">Currency</Label>
                  <Select
                    id="s-currency"
                    value={companyFields.currency}
                    onChange={e => cfField('currency', e.target.value)}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-website">Website</Label>
                    <Input
                      id="s-website"
                      value={companyFields.website}
                      onChange={e => cfField('website', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-phone">Phone</Label>
                    <Input
                      id="s-phone"
                      value={companyFields.phone}
                      onChange={e => cfField('phone', e.target.value)}
                      placeholder="+1 555 000 0000"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={saveCompanyProfile} disabled={savingCompany}>
                    {savingCompany && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save Company Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. Modules & Apps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                  Modules & Apps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Industry selector */}
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setIndustry(key);
                          toast.success('Industry updated — modules have been reset to defaults');
                        }}
                        className={[
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                          industry === key
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground',
                        ].join(' ')}
                      >
                        <span>{preset.icon}</span>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Changing industry resets modules to the recommended defaults</p>
                </div>

                {/* Module toggles */}
                <div className="space-y-2">
                  <Label>Active Modules</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {(ALL_MODULES as ModuleKey[]).map(key => {
                      const descriptions: Record<ModuleKey, string> = {
                        finance: 'Invoices, bills, budgets, journal entries',
                        sales: 'Leads, customers, quotes, orders',
                        procurement: 'Vendors, POs, goods receipt',
                        inventory: 'Products, stock, warehouses',
                        hr: 'Employees, payroll, attendance, leave',
                        manufacturing: 'BOMs, production orders, quality',
                        projects: 'Projects, tasks, timesheets',
                        assets: 'Register and depreciation',
                        expenses: 'Expense claims and approvals',
                        helpdesk: 'Support tickets',
                        fleet: 'Vehicles, services, fuel logs',
                        maintenance: 'Equipment and requests',
                        marketing: 'Mailing lists and campaigns',
                        subscriptions: 'Recurring billing',
                        pos: 'Point of sale orders',
                      };
                      return (
                        <div key={key} className="flex items-center justify-between gap-2 py-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">{MODULE_LABELS[key]}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{descriptions[key]}</p>
                          </div>
                          <Switch
                            checked={activeModules.includes(key)}
                            onCheckedChange={() => toggleModule(key)}
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* 3. User Profile */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-muted-foreground" />
                  User Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar initials */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg shrink-0 select-none">
                    {avatarInitials}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{fullName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-full-name">Full Name</Label>
                  <Input
                    id="s-full-name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">Email</Label>
                  <Input
                    id="s-email"
                    value={user?.email ?? ''}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
                </div>
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={saveUserProfile} disabled={savingUser}>
                    {savingUser && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 4. AI Assistant */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-api-key">Anthropic API Key</Label>
                  <Input
                    id="s-api-key"
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={maskedKey || 'sk-ant-api03-…'}
                    autoComplete="new-password"
                  />
                  {dbProfile?.anthropic_api_key && (
                    <p className="text-xs text-muted-foreground">
                      Saved key ends in <span className="font-mono">{dbProfile.anthropic_api_key.slice(-4)}</span>. Enter a new key to replace it.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-model">Model</Label>
                  <Input
                    id="s-model"
                    value="claude-opus-4-6"
                    readOnly
                    className="bg-muted/50 cursor-not-allowed text-muted-foreground font-mono text-xs"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={saveAISettings} disabled={savingAI}>
                    {savingAI && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save API Key
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ═══════════════════════ RIGHT COLUMN ══════════════════════ */}
          <div className="space-y-6">

            {/* 5. Appearance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="mb-2 block">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as ThemeChoice[]).map(choice => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setThemeChoice(choice)}
                      className={[
                        'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium capitalize transition-colors',
                        themeChoice === choice
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                      ].join(' ')}
                    >
                      {/* Mini preview swatch */}
                      <span className={[
                        'w-8 h-5 rounded border border-border',
                        choice === 'light' ? 'bg-white' : choice === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-r from-white to-gray-900',
                      ].join(' ')} />
                      {choice}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {themeChoice === 'system'
                    ? 'Follows your operating system preference.'
                    : `Locked to ${themeChoice} mode.`}
                </p>
              </CardContent>
            </Card>

            {/* 6. Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    { key: 'email_notifications' as const, label: 'Email Notifications', description: 'Receive activity summaries via email' },
                    { key: 'invoice_reminders' as const, label: 'Invoice Reminders', description: 'Get reminders for overdue invoices' },
                    { key: 'payment_alerts' as const, label: 'Payment Alerts', description: 'Notify when payments are received or missed' },
                    { key: 'low_stock_alerts' as const, label: 'Low Stock Alerts', description: 'Alert when inventory falls below threshold' },
                  ] satisfies { key: keyof NotificationPrefs; label: string; description: string }[]
                ).map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Toggle
                      id={`notif-${item.key}`}
                      checked={notifs[item.key]}
                      onChange={v => notifField(item.key, v)}
                    />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={saveNotifications} disabled={savingNotifs}>
                    {savingNotifs && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 7. Danger Zone */}
            <Card className="border-destructive/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sign Out</p>
                    <p className="text-xs text-muted-foreground">End your current session on this device.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="shrink-0"
                  >
                    {signingOut && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Sign Out
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border border-destructive/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently remove all your data. This cannot be undone.</p>
                  </div>
                  <Button
                    size="sm"
                    variant={deleteConfirm ? 'destructive' : 'outline'}
                    onClick={handleDeleteAccount}
                    className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {deleteConfirm ? 'Are you sure?' : 'Delete Account'}
                  </Button>
                </div>
                {deleteConfirm && (
                  <p className="text-xs text-muted-foreground px-1">
                    Click "Are you sure?" again to confirm, or navigate away to cancel.
                  </p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
