import AppLayout from '@/components/layout/AppLayout';
import { CheckCircle2, AlertCircle, Circle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  label: string;
  description: string;
  status: 'done' | 'warning' | 'todo';
  link?: string;
}

const checklist: { section: string; items: ChecklistItem[] }[] = [
  {
    section: 'Database & Security',
    items: [
      { label: 'RLS policies on all tables', description: 'All 7 ERP tables have tenant-scoped RLS with reseller read access', status: 'done' },
      { label: 'User roles table (separate)', description: 'Roles stored in user_roles, not on profiles — prevents privilege escalation', status: 'done' },
      { label: 'Security-definer helper functions', description: 'has_role(), get_user_tenant_id() prevent recursive RLS', status: 'done' },
      { label: 'Input validation schemas', description: 'Zod schemas for all CRUD operations with rate limiting', status: 'done' },
      { label: 'JSONB custom fields', description: 'Every ERP table supports no-code custom fields via JSONB', status: 'done' },
    ],
  },
  {
    section: 'White-Label Engine',
    items: [
      { label: 'Per-tenant branding', description: 'logo_url, primary_color, secondary_color, custom_domain stored in tenants', status: 'done' },
      { label: 'Dynamic CSS theming', description: 'ThemeProvider applies tenant colors as CSS custom properties at runtime', status: 'done' },
      { label: 'Custom domain routing', description: 'Hostname detection middleware — configure via custom_domain field', status: 'warning' },
      { label: 'Platform branding hidden', description: 'Sidebar shows tenant name/logo, no hardcoded "TELA" references in UI', status: 'done' },
    ],
  },
  {
    section: 'Stripe Integration',
    items: [
      { label: 'Enable Stripe connector', description: 'Run stripe--enable_stripe to connect your Stripe account', status: 'todo' },
      { label: 'Create pricing tiers', description: 'Starter $60/mo, Pro $180/mo, Unlimited $400/mo', status: 'todo' },
      { label: 'Webhook endpoint', description: 'Edge function for checkout.session.completed, invoice.paid/failed', status: 'todo' },
      { label: 'STRIPE_WEBHOOK_SECRET', description: 'Add webhook signing secret to edge function secrets', status: 'todo' },
    ],
  },
  {
    section: 'Cross-Module Automation',
    items: [
      { label: 'Sales → Inventory reservation', description: 'New sales order auto-checks inventory and reserves stock', status: 'done' },
      { label: 'Low stock → Production trigger', description: 'Auto-creates production order when inventory is critical', status: 'done' },
      { label: 'Sales → Accounting invoice', description: 'Auto-creates income transaction on new sales order', status: 'done' },
      { label: 'Low stock → Procurement PO', description: 'Suggests purchase order when stock is below reorder level', status: 'done' },
      { label: 'Real-time sync (all modules)', description: 'Supabase Realtime enabled for all 6 ERP tables', status: 'done' },
    ],
  },
  {
    section: 'Production Deployment',
    items: [
      { label: 'Error monitoring stub', description: 'Sentry placeholder with global error handlers — add DSN for production', status: 'done' },
      { label: 'PWA manifest', description: 'manifest.json configured for installable progressive web app', status: 'done' },
      { label: 'Environment variables', description: 'VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY configured', status: 'done' },
      { label: 'First reseller signup test', description: 'Sign up as reseller → create client tenant → verify data isolation', status: 'todo' },
    ],
  },
];

const statusIcon = {
  done: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
  warning: <AlertCircle className="w-5 h-5 text-warning shrink-0" />,
  todo: <Circle className="w-5 h-5 text-muted-foreground shrink-0" />,
};

export default function ProductionReadiness() {
  const total = checklist.flatMap(s => s.items).length;
  const done = checklist.flatMap(s => s.items).filter(i => i.status === 'done').length;
  const pct = Math.round((done / total) * 100);

  return (
    <AppLayout title="Production Readiness" subtitle={`${done}/${total} items complete (${pct}%)`}>
      <div className="max-w-3xl space-y-8">
        {/* Progress bar */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-card-foreground">Launch Progress</h3>
            <span className="text-sm font-mono text-muted-foreground">{pct}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {checklist.map((section) => (
          <div key={section.section} className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-card-foreground mb-4">{section.section}</h3>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  {statusIcon[item.status]}
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', item.status === 'done' ? 'text-card-foreground' : 'text-muted-foreground')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* App Store copy */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-card-foreground mb-4">PWA / App Store Listing Copy</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-card-foreground">Title</p>
              <p className="text-muted-foreground">TELA-ERP — Multi-Tenant Business Management</p>
            </div>
            <div>
              <p className="font-medium text-card-foreground">Short Description</p>
              <p className="text-muted-foreground">All-in-one ERP for production, inventory, sales, marketing, accounting, and procurement — built for resellers with white-label branding.</p>
            </div>
            <div>
              <p className="font-medium text-card-foreground">Keywords</p>
              <p className="text-muted-foreground font-mono text-xs">ERP, inventory management, sales orders, accounting, production planning, multi-tenant, white-label, SaaS</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
