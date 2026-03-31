import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, ListTree, CheckCircle2, FileEdit, Archive, Loader2 } from 'lucide-react';

type BOMStatus = 'active' | 'draft' | 'obsolete';

interface BOM extends Record<string, unknown> {
  id: string;
  product_name: string;
  version: string;
  status: BOMStatus;
  notes: string;
}

type BOMForm = { product_name: string; version: string; status: BOMStatus; notes: string; };

const BLANK: BOMForm = {
  product_name: '', version: '1.0', status: 'draft', notes: '',
};

const statusVariant: Record<BOMStatus, 'success' | 'secondary' | 'outline'> = {
  active: 'success', draft: 'secondary', obsolete: 'outline',
};

export default function BOMs() {
  const { rows: items, loading, insert, update, remove } = useTable<BOM>('myerp_boms');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BOM | null>(null);
  const [form, setForm] = useState<BOMForm>(BLANK);

  const activeCount   = items.filter(b => b.status === 'active').length;
  const draftCount    = items.filter(b => b.status === 'draft').length;
  const obsoleteCount = items.filter(b => b.status === 'obsolete').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(bom: BOM) {
    setEditing(bom);
    setForm({ product_name: bom.product_name, version: bom.version, status: bom.status, notes: bom.notes });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.product_name.trim()) { toast.error('Product name is required'); return; }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success('BOM updated');
      } else {
        await insert(form);
        toast.success('BOM created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('BOM removed');
    } catch (e) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  function field(key: keyof BOMForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <AppLayout title="Bill of Materials">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Bill of Materials">
      <PageHeader title="Bill of Materials" subtitle="Create multi-level BOMs specifying raw materials and components required for production." action={{ label: 'New BOM', onClick: openNew }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total BOMs',  value: items.length,  icon: ListTree,    color: 'text-primary'     },
          { label: 'Active',      value: activeCount,   icon: CheckCircle2,color: 'text-success'     },
          { label: 'Draft',       value: draftCount,    icon: FileEdit,    color: 'text-warning'     },
          { label: 'Obsolete',    value: obsoleteCount, icon: Archive,     color: 'text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(bom => (
                <TableRow key={bom.id}>
                  <TableCell className="font-medium">{bom.product_name}</TableCell>
                  <TableCell className="font-mono text-xs">{bom.version}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[bom.status]} className="capitalize">{bom.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{bom.notes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(bom)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(bom.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit BOM' : 'New Bill of Materials'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input value={form.product_name} onChange={e => field('product_name', e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label>Version</Label>
              <Input value={form.version} onChange={e => field('version', e.target.value)} placeholder="e.g. 1.0" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="obsolete">Obsolete</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => field('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create BOM'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
