import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowUpRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useModules, TIER_LABELS, TIER_PRICES, type ModuleKey, type SubscriptionTier } from '@/contexts/ModulesContext';
import { cn } from '@/lib/utils';

interface SubscriptionGateProps {
  /** The module key to check */
  moduleKey: ModuleKey;
  /** Content to render when allowed */
  children: ReactNode;
  /** Optional: show inline locked badge instead of full gate */
  inline?: boolean;
}

const REQUIRED_TIER: Record<ModuleKey, SubscriptionTier> = {
  sales:         'starter',
  inventory:     'starter',
  accounting:    'premium',
  production:    'premium',
  procurement:   'premium',
  hr:            'premium',
  crm:           'premium',
  projects:      'premium',
  assets:        'premium',
  expenses:      'premium',
  budgets:       'premium',
  marketing:     'premium',
  pos:           'premium',
  subscriptions: 'premium',
  fleet:         'premium',
  maintenance:   'premium',
  ai:            'premium',
};

export function SubscriptionGate({ moduleKey, children, inline = false }: SubscriptionGateProps) {
  const { tierAllows } = useModules();

  if (tierAllows(moduleKey)) return <>{children}</>;

  const requiredTier = REQUIRED_TIER[moduleKey];
  const tierLabel = TIER_LABELS[requiredTier];
  const tierPrice = TIER_PRICES[requiredTier];

  if (inline) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Lock className="w-3 h-3" />
        {tierLabel}
      </Badge>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Upgrade to unlock this module</h3>
            <p className="text-sm text-muted-foreground">
              This feature is available on the <strong>{tierLabel}</strong> plan ({tierPrice}).
              Upgrade to access all modules and grow your business.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button asChild>
              <Link to="/pricing">
                <Zap className="w-4 h-4 mr-2" />
                Upgrade to {tierLabel}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/billing">
                View Plans <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Locked overlay for sidebar nav items */
export function LockedBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400', className)}>
      <Lock className="w-2.5 h-2.5" />
      PRO
    </span>
  );
}
