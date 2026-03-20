import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Palette, Globe, Upload } from 'lucide-react';

export default function WhiteLabel() {
  const { tenant } = useAuth();

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
              <Input defaultValue={tenant?.name || ''} className="mt-1.5" />
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
                  <div className="w-10 h-10 rounded-lg bg-primary border border-border" />
                  <Input defaultValue="#3B82F6" className="font-mono text-sm" />
                </div>
              </div>
              <div>
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-10 h-10 rounded-lg bg-accent border border-border" />
                  <Input defaultValue="#7C3AED" className="font-mono text-sm" />
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
                <Input defaultValue={tenant?.slug || 'your-company'} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.tela-erp.com</span>
              </div>
            </div>
            <div>
              <Label>Custom Domain (Pro+)</Label>
              <Input placeholder="erp.yourdomain.com" className="mt-1.5" />
            </div>
          </div>
        </div>

        <Button className="gradient-primary">Save Changes</Button>
      </div>
    </AppLayout>
  );
}
