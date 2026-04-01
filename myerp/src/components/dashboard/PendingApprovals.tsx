import { Check, X, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type ApprovalType = 'Purchase Order' | 'Leave Request' | 'Expense Claim' | 'Invoice' | 'Production Order';

interface Approval {
  id: number;
  type: ApprovalType;
  title: string;
  requester: string;
  amount?: string;
  date: string;
}

const INITIAL_APPROVALS: Approval[] = [
  { id: 1, type: 'Purchase Order',   title: 'PO-0158 — Office Supplies',      requester: 'Alice Chen',    amount: '$3,450',  date: 'Today' },
  { id: 2, type: 'Leave Request',    title: '5-day annual leave',              requester: 'Bob Martinez',               date: 'Today' },
  { id: 3, type: 'Expense Claim',    title: 'Business travel — Nairobi',      requester: 'Carol White',   amount: '$1,200',  date: 'Yesterday' },
  { id: 4, type: 'Invoice',          title: 'INV-0043 — Software License',    requester: 'IT Dept',       amount: '$8,900',  date: 'Yesterday' },
  { id: 5, type: 'Production Order', title: 'Batch #PB-0099 — 500 units',     requester: 'Factory Floor',             date: '2 days ago' },
];

const TYPE_BADGE: Record<ApprovalType, { variant: 'default' | 'info' | 'warning' | 'success' | 'destructive'; label: string }> = {
  'Purchase Order':   { variant: 'info',    label: 'Purchase' },
  'Leave Request':    { variant: 'warning', label: 'Leave' },
  'Expense Claim':    { variant: 'warning', label: 'Expense' },
  'Invoice':          { variant: 'default', label: 'Invoice' },
  'Production Order': { variant: 'success', label: 'Production' },
};

export default function PendingApprovals() {
  const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
  const [actioned, setActioned] = useState<Record<number, 'approved' | 'rejected'>>({});

  const handleAction = (id: number, action: 'approved' | 'rejected') => {
    setActioned(prev => ({ ...prev, [id]: action }));
    setTimeout(() => {
      setApprovals(prev => prev.filter(a => a.id !== id));
      setActioned(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, 600);
  };

  return (
    <Card className="rounded-xl border-border h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pending Approvals</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{approvals.length} item{approvals.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
          <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Check className="w-8 h-8 text-success mb-2" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending approvals</p>
          </div>
        ) : (
          approvals.map(a => {
            const { variant, label } = TYPE_BADGE[a.type];
            const done = actioned[a.id];
            return (
              <div
                key={a.id}
                className={cn(
                  'flex items-center gap-3 py-2.5 border-b border-border last:border-0 transition-all duration-300',
                  done === 'approved' && 'opacity-50',
                  done === 'rejected' && 'opacity-30',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant={variant} className="text-[10px] px-1.5 py-0 shrink-0">{label}</Badge>
                    <span className="text-sm font-medium text-foreground truncate">{a.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.requester}{a.amount ? ` · ${a.amount}` : ''} · {a.date}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-success hover:bg-success/10 hover:text-success"
                    onClick={() => handleAction(a.id, 'approved')}
                    disabled={!!done}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleAction(a.id, 'rejected')}
                    disabled={!!done}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
