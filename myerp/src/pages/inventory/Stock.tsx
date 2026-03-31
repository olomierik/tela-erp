import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Layers, Package, Lock, CheckSquare } from 'lucide-react';

interface StockLine {
  id: string;
  product: string;
  sku: string;
  warehouse: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_level: number;
}

type StockStatus = 'OK' | 'Low' | 'Out';

function getStatus(available: number, reorder_level: number): StockStatus {
  if (available === 0) return 'Out';
  if (available <= reorder_level) return 'Low';
  return 'OK';
}

const WAREHOUSES = ['Main Warehouse', 'North Hub', 'South Depot'] as const;
type Warehouse = typeof WAREHOUSES[number];

// Product distribution across 3 warehouses — 15 products × 3 = 45 stock lines
const RAW_STOCK: Array<{ product: string; sku: string; dist: [number, number, number]; reserved: [number, number, number]; reorder: number }> = [
  { product: 'USB-C Hub 7-Port',          sku: 'EL-001', dist: [60, 40, 20], reserved: [5,  2, 1],  reorder: 10 },
  { product: 'Wireless Keyboard',         sku: 'EL-002', dist: [8,  5,  2],  reserved: [1,  0, 0],  reorder: 7  },
  { product: "Men's Running Shorts",      sku: 'AP-001', dist: [100,60, 40], reserved: [10, 5, 5],  reorder: 15 },
  { product: 'Sport Socks (Pair)',        sku: 'AP-002', dist: [0,  0,  0],  reserved: [0,  0, 0],  reorder: 30 },
  { product: 'Organic Oat Flour',         sku: 'FB-001', dist: [250,150,100],reserved: [20, 10, 5], reorder: 30 },
  { product: 'Cold Brew Coffee 1L',       sku: 'FB-002', dist: [40, 25, 15], reserved: [5,  2, 1],  reorder: 12 },
  { product: 'A4 Copy Paper (Box 5)',     sku: 'OS-001', dist: [30, 20, 10], reserved: [3,  1, 0],  reorder: 6  },
  { product: 'Ballpoint Pens (12-Pack)', sku: 'OS-002', dist: [4,  3,  1],  reserved: [0,  0, 0],  reorder: 4  },
  { product: 'Stainless Steel Bolts M8', sku: 'HW-001', dist: [150,100,50], reserved: [10, 5, 2],  reorder: 15 },
  { product: 'Industrial Drill Bit Set', sku: 'HW-002', dist: [0,  0,  0],  reserved: [0,  0, 0],  reorder: 2  },
  { product: 'Ergonomic Office Chair',   sku: 'FN-001', dist: [6,  4,  2],  reserved: [1,  0, 0],  reorder: 2  },
  { product: 'Standing Desk 140cm',      sku: 'FN-002', dist: [2,  1,  1],  reserved: [0,  0, 0],  reorder: 2  },
  { product: 'HDMI Cable 2m',            sku: 'EL-003', dist: [40, 20, 15], reserved: [4,  2, 1],  reorder: 6  },
  { product: 'Waterproof Jacket',        sku: 'AP-003', dist: [0,  0,  0],  reserved: [0,  0, 0],  reorder: 4  },
  { product: 'Whey Protein 1kg',         sku: 'FB-003', dist: [12, 6,  4],  reserved: [1,  1, 0],  reorder: 8  },
];

let _idSeq = 0;
const STOCK_LINES: StockLine[] = RAW_STOCK.flatMap(row =>
  WAREHOUSES.map((wh, i) => {
    const on_hand = row.dist[i];
    const reserved = Math.min(row.reserved[i], on_hand);
    const available = Math.max(0, on_hand - reserved);
    return {
      id: `sl-${++_idSeq}`,
      product: row.product,
      sku: row.sku,
      warehouse: wh,
      on_hand,
      reserved,
      available,
      reorder_level: row.reorder,
    };
  })
);

const statusVariant: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
  OK:  'success',
  Low: 'warning',
  Out: 'destructive',
};

export default function Stock() {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('All');

  const filtered = STOCK_LINES.filter(line => {
    const matchesSearch =
      search === '' ||
      line.product.toLowerCase().includes(search.toLowerCase()) ||
      line.sku.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse =
      warehouseFilter === 'All' || line.warehouse === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  const distinctSKUs = new Set(STOCK_LINES.map(l => l.sku)).size;
  const totalOnHand = STOCK_LINES.reduce((s, l) => s + l.on_hand, 0);
  const totalReserved = STOCK_LINES.reduce((s, l) => s + l.reserved, 0);
  const totalAvailable = STOCK_LINES.reduce((s, l) => s + l.available, 0);

  return (
    <AppLayout title="Stock Levels">
      <PageHeader
        title="Stock Levels"
        subtitle="Real-time inventory visibility across all warehouses"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total SKUs</CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{distinctSKUs}</div>
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

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search product or SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={warehouseFilter}
          onChange={e => setWarehouseFilter(e.target.value)}
          className="max-w-[200px]"
        >
          <option value="All">All Warehouses</option>
          {WAREHOUSES.map(wh => <option key={wh} value={wh}>{wh}</option>)}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>On Hand</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No stock lines match your filters.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(line => {
                  const status = getStatus(line.available, line.reorder_level);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.product}</TableCell>
                      <TableCell className="font-mono text-sm">{line.sku}</TableCell>
                      <TableCell>{line.warehouse}</TableCell>
                      <TableCell>{line.on_hand}</TableCell>
                      <TableCell>{line.reserved}</TableCell>
                      <TableCell className="font-medium">{line.available}</TableCell>
                      <TableCell>{line.reorder_level}</TableCell>
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
