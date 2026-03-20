import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Palette, Globe, Upload, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { tenantBrandingSchema } from '@/lib/input-validation';

export default function WhiteLabel() {
  const { tenant, isDemo, refreshProfile } = useAuth();
  const { applyTenantTheme } = useTheme();

  const [name, setName] = useState(tenant?.name || '');
  const [primaryColor, setPrimaryColor] = useState(tenant?.primary_color || '#3B82F6');
  const [accentColor, setAccentColor] = useState(tenant?.secondary_color || '#7C3AED');
  const [subdomain, setSubdomain] = useState(tenant?.slug || '');
  const [customDomain, setCustomDomain] = useState(tenant?.custom_domain || '');
  const [saving, setSaving] = useState(false);

  const handlePreview = () => {
    applyTenantTheme(primaryColor, accentColor);
    toast.success('Theme preview applied');
  };

  const handleSave = async () => {
    const validation = tenantBrandingSchema.safeParse({
      name,
      primary_color: primaryColor,
      secondary_color: accentColor,
      custom_domain: customDomain || undefined,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Invalid input');
      return;
    }

    if (isDemo) {
      applyTenantTheme(primaryColor, accentColor);
      toast.success('Branding preview applied (demo mode)');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name,
          primary_color: primaryColor,
          secondary_color: accentColor,
          custom_domain: customDomain || null,
          slug: subdomain,
        })
        .eq('id', tenant!.id);

      if (error) throw error;
      applyTenantTheme(primaryColor, accentColor);
      await refreshProfile();
      toast.success('Branding saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="White Label Settings" subtitle="Customize branding for your tenants">
      <div className="max-w-2xl space-y-6">
        {/* Branding */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Branding</h3>
              <p className="text-sm text-muted-foreground">Logo, colors, and appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Organization Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drop your logo here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG up to 2MB</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                </div>
              </div>
              <div>
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domain */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Custom Domain</h3>
              <p className="text-sm text-muted-foreground">Set up a custom domain for your tenants</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Subdomain</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input value={subdomain} onChange={e => setSubdomain(e.target.value)} maxLength={50} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.tela-erp.com</span>
              </div>
            </div>
            <div>
              <Label>Custom Domain (Pro+)</Label>
              <Input
                value={customDomain}
                onChange={e => setCustomDomain(e.target.value)}
                placeholder="erp.yourdomain.com"
                className="mt-1.5"
                maxLength={255}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={handlePreview} variant="outline" className="gap-2">
            <Eye className="w-4 h-4" /> Preview Theme
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
