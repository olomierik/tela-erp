import { Link } from 'react-router-dom';
import { Clock, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModules } from '@/contexts/ModulesContext';

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function TrialBanner() {
  const { tenant, isDemo } = useAuth();
  const { tier } = useModules();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isDemo || tier !== 'starter') return null;

  const trialEndsAt = (tenant as any)?.trial_ends_at;
  const days = daysUntil(trialEndsAt);

  // Only show when trial is active (days > 0)
  if (days === null || days <= 0) return null;

  const urgency = days <= 3;

  return (
    <div className={`w-full py-2 px-4 flex items-center justify-between gap-3 text-sm ${
      urgency
        ? 'bg-red-500/10 border-b border-red-500/20 text-red-700 dark:text-red-400'
        : 'bg-primary/5 border-b border-primary/10 text-foreground'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock className={`w-4 h-4 shrink-0 ${urgency ? 'text-red-500' : 'text-primary'}`} />
        <span className="truncate">
          {urgency
            ? <><strong>{days} day{days !== 1 ? 's' : ''} left</strong> in your free trial — upgrade to keep all 17 modules.</>
            : <>Your <strong>14-day free trial</strong> expires in <strong>{days} day{days !== 1 ? 's' : ''}</strong>. Upgrade to keep Premium features.</>
          }
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" className="h-7 text-xs gradient-primary" asChild>
          <Link to="/billing">
            <Zap className="w-3 h-3 mr-1" />
            Upgrade
          </Link>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
