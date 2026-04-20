import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/layout/AppLayout';
import { StatCard, DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Building2, TrendingUp, DollarSign, Plus, Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Tenant } from '@/types/erp';

export default function ResellerDashboard() {
  const { tenant, profile } = useAuth();
  const [clients, setClients] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPreview, setShowPreview] = useState<Tenant | null>(null);
  const [onboardingForm, setOnboardingForm] = useState({
    businessName: '',
    contactEmail: '',
    contactName: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#7C3AED',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('parent_tenant_id', tenant?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as Tenant[]) || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSubmitting(true);

    try {
      const slug = onboardingForm.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let logoUrl: string | undefined;

      // Upload logo if provided.
      // Path MUST be prefixed with the uploader's tenant_id to satisfy
      // the tenant-scoped storage RLS policy.
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `${tenant.id}/${slug}-logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('tenant-logos')
          .upload(path, logoFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('tenant-logos').getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      }

      // Create tenant
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          name: onboardingForm.businessName,
          slug,
          parent_tenant_id: tenant.id,
          primary_color: onboardingForm.primaryColor,
          secondary_color: onboardingForm.secondaryColor,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Client "${onboardingForm.businessName}" onboarded successfully!`);
      setShowOnboarding(false);
      setOnboardingForm({ businessName: '', contactEmail: '', contactName: '', primaryColor: '#3B82F6', secondaryColor: '#7C3AED' });
      setLogoFile(null);
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || 'Failed to onboard client');
    } finally {
      setSubmitting(false);
    }
  };

  const clientRows = clients.map((client) => [
    <div className="flex items-center gap-3">
      {client.logo_url ? (
        <img src={client.logo_url} alt={client.name} className="w-8 h-8 rounded-lg object-cover" />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground"
          style={{ backgroundColor: client.primary_color || 'hsl(217, 91%, 60%)' }}
        >
          {client.name.charAt(0)}
        </div>
      )}
      <span className="font-medium text-card-foreground">{client.name}</span>
    </div>,
    client.slug,
    <StatusBadge
      status={client.subscription_tier || 'starter'}
      variant={client.subscription_tier === 'enterprise' ? 'info' : client.subscription_tier === 'premium' ? 'success' : 'default'}
    />,
    <StatusBadge status={client.is_active ? 'Active' : 'Inactive'} variant={client.is_active ? 'success' : 'destructive'} />,
    new Date(client.created_at).toLocaleDateString(),
    <Button variant="ghost" size="icon" onClick={() => setShowPreview(client)}>
      <Eye className="w-4 h-4" />
    </Button>,
  ]);

  return (
    <AppLayout title="Reseller Dashboard" subtitle="Manage your client tenants">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Clients" value={String(clients.length)} change={10} icon={Building2} />
        <StatCard title="Active Users" value={String(clients.length * 5)} change={15} icon={Users} />
        <StatCard title="MRR" value={`$${clients.length * 249}`} change={12} icon={DollarSign} />
        <StatCard title="Growth" value="18%" change={18} icon={TrendingUp} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Client Tenants</h3>
        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary">
              <Plus className="w-4 h-4 mr-1" /> Onboard Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Onboard New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleOnboard} className="space-y-4 mt-4">
              <div>
                <Label>Business Name</Label>
                <Input
                  value={onboardingForm.businessName}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, businessName: e.target.value })}
                  placeholder="Client Business Name"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={onboardingForm.contactName}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, contactName: e.target.value })}
                  placeholder="Jane Smith"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={onboardingForm.contactEmail}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, contactEmail: e.target.value })}
                  placeholder="admin@client.com"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Logo</Label>
                <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {logoFile ? logoFile.name : 'Click to upload logo'}
                    </p>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="color"
                      value={onboardingForm.primaryColor}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={onboardingForm.primaryColor}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, primaryColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="color"
                      value={onboardingForm.secondaryColor}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={onboardingForm.secondaryColor}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, secondaryColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Client Tenant'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length > 0 ? (
        <DataTable
          headers={['Client', 'Slug', 'Tier', 'Status', 'Created', 'Preview']}
          rows={clientRows}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-card-foreground mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Onboard your first client to get started</p>
          <Button onClick={() => setShowOnboarding(true)} className="gradient-primary">
            <Plus className="w-4 h-4 mr-1" /> Onboard First Client
          </Button>
        </div>
      )}

      {/* Branding Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Branding Preview</DialogTitle>
          </DialogHeader>
          {showPreview && (
            <div className="space-y-4 mt-4">
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Mock header */}
                <div
                  className="h-14 flex items-center gap-3 px-4"
                  style={{ backgroundColor: showPreview.primary_color || '#3B82F6' }}
                >
                  {showPreview.logo_url ? (
                    <img src={showPreview.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {showPreview.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-semibold text-primary-foreground text-sm">{showPreview.name}</span>
                </div>
                {/* Mock content */}
                <div className="p-4 bg-card space-y-3">
                  <div className="h-3 rounded-full bg-muted w-3/4" />
                  <div className="h-3 rounded-full bg-muted w-1/2" />
                  <div className="flex gap-2 mt-4">
                    <div
                      className="h-8 rounded-md px-4 flex items-center text-xs font-medium text-primary-foreground"
                      style={{ backgroundColor: showPreview.primary_color || '#3B82F6' }}
                    >
                      Primary
                    </div>
                    <div
                      className="h-8 rounded-md px-4 flex items-center text-xs font-medium text-primary-foreground"
                      style={{ backgroundColor: showPreview.secondary_color || '#7C3AED' }}
                    >
                      Secondary
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Slug</p>
                  <p className="font-mono text-card-foreground">{showPreview.slug}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tier</p>
                  <p className="capitalize text-card-foreground">{showPreview.subscription_tier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Domain</p>
                  <p className="text-card-foreground">{showPreview.custom_domain || `${showPreview.slug}.tela-erp.com`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={showPreview.is_active ? 'Active' : 'Inactive'} variant={showPreview.is_active ? 'success' : 'destructive'} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
