import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  { name: 'Starter', price: '$99', features: ['5 Users', '2 Modules', 'Basic Reports', 'Email Support'], tier: 'starter' },
  { name: 'Pro', price: '$249', features: ['25 Users', 'All Modules', 'Advanced Analytics', 'Priority Support', 'White Label'], tier: 'pro', popular: true },
  { name: 'Enterprise', price: '$599', features: ['Unlimited Users', 'All Modules', 'Custom Reports', 'Dedicated Support', 'White Label', 'API Access'], tier: 'enterprise' },
];

const invoices = [
  ['INV-0024', 'Mar 1, 2026', '$249.00', <StatusBadge status="Paid" variant="success" />],
  ['INV-0023', 'Feb 1, 2026', '$249.00', <StatusBadge status="Paid" variant="success" />],
  ['INV-0022', 'Jan 1, 2026', '$249.00', <StatusBadge status="Paid" variant="success" />],
];

export default function Billing() {
  const { tenant } = useAuth();

  return (
    <AppLayout title="Billing" subtitle="Subscription and payment management">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrent = plan.tier === tenant?.subscription_tier;
          return (
            <div
              key={plan.name}
              className={cn(
                "bg-card rounded-xl border p-6 relative",
                plan.popular ? "border-primary shadow-glow" : "border-border",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}
              <h3 className="font-semibold text-card-foreground text-lg">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-card-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-card-foreground">
                    <Check className="w-4 h-4 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={cn("w-full", plan.popular ? "gradient-primary" : "")}
                variant={plan.popular ? "default" : "outline"}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current Plan' : 'Upgrade'}
              </Button>
            </div>
          );
        })}
      </div>

      <h3 className="font-semibold text-foreground mb-3">Invoice History</h3>
      <DataTable headers={['Invoice', 'Date', 'Amount', 'Status']} rows={invoices} />
    </AppLayout>
  );
}
