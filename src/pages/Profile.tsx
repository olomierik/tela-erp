import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { User, Lock, Bell, Shield, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, role, isDemo } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tela_notification_prefs');
      return saved ? JSON.parse(saved) : {
        low_stock: true, overdue_invoices: true, new_orders: true,
        deal_updates: false, weekly_summary: true,
      };
    } catch {
      return { low_stock: true, overdue_invoices: true, new_orders: true, deal_updates: false, weekly_summary: true };
    }
  });

  const handleSave = async () => {
    if (isDemo) { toast.success('Profile updated (demo)'); return; }
    setSaving(true);
    try {
      await (supabase.from('profiles') as any)
        .update({ full_name: fullName, phone })
        .eq('user_id', profile?.user_id);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { toast.error('Enter a new password'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (isDemo) { toast.info('Password change disabled in demo'); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('tela_notification_prefs', JSON.stringify(notifications));
    toast.success('Notification preferences saved');
  };

  return (
    <AppLayout title="My Profile" subtitle="Manage your account settings">
      <div className="max-w-2xl">
        <PageHeader
          title="My Profile"
          subtitle="Update your profile information and preferences"
          icon={User}
          breadcrumb={[{ label: 'Profile' }]}
        />

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profile</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Lock className="w-3.5 h-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-border rounded-xl">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl font-bold">
                      {fullName.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{fullName}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <Badge variant="secondary" className="text-xs mt-1 capitalize">{role}</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email Address</Label>
                    <Input value={profile?.email ?? ''} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact your admin.</p>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border rounded-xl">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="pl-9 pr-9"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  <Button onClick={handleChangePassword} disabled={changingPw} className="gap-1.5">
                    {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {changingPw ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Two-Factor Authentication
                  </h4>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="text-sm font-medium">Authenticator App</p>
                      <p className="text-xs text-muted-foreground">Use an authenticator app for extra security</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border rounded-xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, val]) => {
                    const labels: Record<string, { title: string; desc: string }> = {
                      low_stock: { title: 'Low Stock Alerts', desc: 'When inventory drops below reorder level' },
                      overdue_invoices: { title: 'Overdue Invoice Alerts', desc: 'When an invoice becomes overdue' },
                      new_orders: { title: 'New Order Notifications', desc: 'When a new sales order is received' },
                      deal_updates: { title: 'Deal Stage Updates', desc: 'When CRM deal stages change' },
                      weekly_summary: { title: 'Weekly Summary Report', desc: 'Business performance summary every Monday' },
                    };
                    const info = labels[key];
                    return (
                      <div key={key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">{info?.title}</p>
                          <p className="text-xs text-muted-foreground">{info?.desc}</p>
                        </div>
                        <Switch
                          checked={val as boolean}
                          onCheckedChange={v => setNotifications((n: any) => ({ ...n, [key]: v }))}
                        />
                      </div>
                    );
                  })}
                </div>
                <Button className="mt-4 gap-1.5" onClick={handleSaveNotifications}>
                  <Save className="w-4 h-4" /> Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
