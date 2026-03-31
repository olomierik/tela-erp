import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTable } from '@/lib/useTable';
import { Layers, Package, Lock, CheckSquare, Loader2 } from 'lucide-react';

interface StockLevel extends Record<string, unknown> {
  id: string;
  user_id: string;
  product_id: string;
  warehouse_id: string;
  on_hand: number;
  reserved: number;
}

type StockStatus = 'OK' | 'Low' | 'Out';

function getStatus(available: number): StockStatus {
  if (available === 0) return 'Out';
  if (available <= 5) return 'Low';
  return 'OK';
}

const statusVariant: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
  OK:  'success',
  Low: 'warning',
  Out: 'destructive',
};

export default function Stock() {
  const { rows: stockLevels, loading } = useTable<StockLevel>('myerp_stock_levels');
  const [search, setSearch] = useState('');

  const filtered = stockLevels.filter(line => {
    if (search === '') return true;
    const q = search.toLowerCase();
    return (
      String(line.product_id).toLowerCase().includes(q) ||
      String(line.warehouse_id).toLowerCase().includes(q)
    );
  });

  const totalRows = stockLevels.length;
  const totalOnHand = stockLevels.reduce((s, l) => s + Number(l.on_hand), 0);
  const totalReserved = stockLevels.reduce((s, l) => s + Number(l.reserved), 0);
  const totalAvailable = stockLevels.reduce((s, l) => s + Math.max(0, Number(l.on_hand) - Number(l.reserved)), 0);

  if (loading) {
    return (
      <AppLayout title="Stock Levels">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Stock Levels">
      <PageHeader
        title="Stock Levels"
        subtitle="Real-time inventory visibility across all warehouses"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Stock Lines</CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total On Hand</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalOnHand.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Reserved</CardTitle>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalReserved.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Available</CardTitle>
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalAvailable.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search by product ID or warehouse ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Warehouse ID</TableHead>
                  <TableHead>On Hand</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No stock lines found.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(line => {
                  const available = Math.max(0, Number(line.on_hand) - Number(line.reserved));
                  const status = getStatus(available);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-sm">{line.product_id}</TableCell>
                      <TableCell className="font-mono text-sm">{line.warehouse_id}</TableCell>
                      <TableCell>{line.on_hand}</TableCell>
                      <TableCell>{line.reserved}</TableCell>
                      <TableCell className="font-medium">{available}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[status]}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
