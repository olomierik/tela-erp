import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriptionAlerts } from '@/hooks/use-subscription-alerts';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function SubscriptionAlertWidget() {
  const { overdueCount, overdueAmount, pendingCount, customers, loading } = useSubscriptionAlerts();
  const { formatMoney } = useCurrency();

  if (loading || (overdueCount === 0 && pendingCount === 0)) return null;

  const isOverdue = overdueCount > 0;
  return (
    <Card className={isOverdue
      ? 'border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900'
      : 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900'}>
      <CardContent className="p-4 flex items-start gap-3">
        {isOverdue
          ? <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          : <CheckCircle2 className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {isOverdue
              ? `${overdueCount} customer subscription invoice${overdueCount !== 1 ? 's' : ''} overdue`
              : `${pendingCount} subscription invoice${pendingCount !== 1 ? 's' : ''} pending`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isOverdue && <>Total overdue: <span className="font-semibold text-foreground">{formatMoney(overdueAmount)}</span> · </>}
            {customers.slice(0, 4).map(c => c.customer_name).join(', ')}
            {customers.length > 4 && ` +${customers.length - 4} more`}
          </p>
        </div>
        <Link to="/subscriptions">
          <Button size="sm" variant={isOverdue ? 'destructive' : 'outline'} className="h-8 text-xs">
            Review
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
