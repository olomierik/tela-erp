import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';

type PaymentType   = 'incoming' | 'outgoing';
type PaymentMethod = 'bank' | 'cash' | 'card' | 'cheque';
type PaymentStatus = 'pending' | 'cleared' | 'failed';

interface Payment {
  id: string;
  reference: string;
  type: PaymentType;
  party: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

const PAYMENTS: Payment[] = [
  { id: '1',  reference: 'PAY-0001', type: 'incoming', party: 'Acme Corp',           date: '2026-02-05', amount: 12400.00, method: 'bank',   status: 'cleared'  },
  { id: '2',  reference: 'PAY-0002', type: 'outgoing', party: 'Eastside Properties', date: '2026-02-10', amount: 18500.00, method: 'bank',   status: 'cleared'  },
  { id: '3',  reference: 'PAY-0003', type: 'incoming', party: 'TechVision Ltd',      date: '2026-02-12', amount:  8750.50, method: 'bank',   status: 'cleared'  },
  { id: '4',  reference: 'PAY-0004', type: 'outgoing', party: 'PowerGrid Utilities', date: '2026-02-18', amount:  4200.00, method: 'bank',   status: 'cleared'  },
  { id: '5',  reference: 'PAY-0005', type: 'incoming', party: 'Sunrise Retail',      date: '2026-03-01', amount:  5500.00, method: 'card',   status: 'cleared'  },
  { id: '6',  reference: 'PAY-0006', type: 'outgoing', party: 'OfficePro Supplies',  date: '2026-03-05', amount:  1340.50, method: 'cash',   status: 'cleared'  },
  { id: '7',  reference: 'PAY-0007', type: 'incoming', party: 'BlueSky Ventures',    date: '2026-03-12', amount: 16800.00, method: 'bank',   status: 'pending'  },
  { id: '8',  reference: 'PAY-0008', type: 'outgoing', party: 'TechGear Depot',      date: '2026-03-15', amount:  8450.00, method: 'cheque', status: 'pending'  },
  { id: '9',  reference: 'PAY-0009', type: 'incoming', party: 'GlobalMart',          date: '2026-03-20', amount: 31500.00, method: 'bank',   status: 'pending'  },
  { id: '10', reference: 'PAY-0010', type: 'outgoing', party: 'CloudBase Solutions', date: '2026-03-22', amount:  6750.00, method: 'card',   status: 'failed'   },
];

const TYPE_BADGE: Record<PaymentType, 'success' | 'destructive'> = {
  incoming: 'success',
  outgoing: 'destructive',
};

const STATUS_BADGE: Record<PaymentStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  cleared: 'success',
  failed:  'destructive',
};

export default function Payments() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const totalIn     = PAYMENTS.filter(p => p.type === 'incoming').reduce((s, p) => s + p.amount, 0);
  const totalOut    = PAYMENTS.filter(p => p.type === 'outgoing').reduce((s, p) => s + p.amount, 0);
  const net         = totalIn - totalOut;
  const pendingCount = PAYMENTS.filter(p => p.status === 'pending').length;

  const filtered = PAYMENTS.filter(p => {
    const matchSearch = p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.party.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  function handleView(ref: string) {
    toast.success(`Viewing payment ${ref}`);
  }

  return (
    <AppLayout title="Payments">
      <PageHeader
        title="Payments"
        subtitle="Record and reconcile incoming and outgoing payments."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total In</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-success">{formatCurrency(totalIn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Out</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOut)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-warning">{pendingCount} payment{pendingCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search reference or party…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="sm:max-w-[160px]">
          <option value="all">All Types</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No payments match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(pmt => (
                  <TableRow key={pmt.id}>
                    <TableCell className="font-medium">{pmt.reference}</TableCell>
                    <TableCell>
                      <Badge variant={TYPE_BADGE[pmt.type]} className="capitalize">{pmt.type}</Badge>
                    </TableCell>
                    <TableCell>{pmt.party}</TableCell>
                    <TableCell>{formatDate(pmt.date)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(pmt.amount)}</TableCell>
                    <TableCell className="capitalize">{pmt.method}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[pmt.status]} className="capitalize">{pmt.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => handleView(pmt.reference)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
