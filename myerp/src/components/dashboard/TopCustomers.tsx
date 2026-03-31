import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CUSTOMERS = [
  { rank: 1, name: 'Acme Corporation',     orders: 48, revenue: '$124,500', status: 'active' },
  { rank: 2, name: 'GlobalTech Ltd',       orders: 36, revenue: '$98,200',  status: 'active' },
  { rank: 3, name: 'Sunrise Enterprises',  orders: 29, revenue: '$74,800',  status: 'active' },
  { rank: 4, name: 'Nordic Solutions',     orders: 21, revenue: '$56,300',  status: 'pending' },
  { rank: 5, name: 'Bright Future Inc.',   orders: 18, revenue: '$41,700',  status: 'active' },
];

const INITIALS_COLORS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
];

export default function TopCustomers() {
  return (
    <Card className="rounded-xl border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle>Top Customers</CardTitle>
        <p className="text-xs text-muted-foreground">By revenue this month</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {CUSTOMERS.map((c, i) => (
            <div key={c.rank} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${INITIALS_COLORS[i]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.orders} orders</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{c.revenue}</p>
                <Badge
                  variant={c.status === 'active' ? 'success' : 'warning'}
                  className="text-[10px] px-1.5 py-0 mt-0.5"
                >
                  {c.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
