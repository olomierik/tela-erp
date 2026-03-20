import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  return (
    <AppLayout title="Settings" subtitle="General application settings">
      <div className="max-w-2xl space-y-6">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-card-foreground">General</h3>
          <div>
            <Label>Company Name</Label>
            <Input defaultValue="TELA Industries" className="mt-1.5" />
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
