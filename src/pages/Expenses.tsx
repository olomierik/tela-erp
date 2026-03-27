import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import DataTable, { Column } from '@/components/erp/DataTable';
import {
  Receipt, Plus, CheckCircle2, XCircle, Clock, DollarSign,
  Upload, ChevronDown, MoreHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useTenantQuery, useTenantInsert, useTenantUpdate } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  paid: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const EXPENSE_CATEGORIES = [
  'Travel', 'Meals & Entertainment', 'Accommodation', 'Office Supplies',
  'Software & Subscriptions', 'Marketing', 'Training', 'Equipment', 'Other',
];

export default function Expenses() {
  const { tenant, isDemo, profile } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    employee_name: profile?.full_name ?? '',
    notes: '',
    items: [{ category: 'Travel', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), merchant: '' }],
  });

  const { data: rawData, isLoading } = useTenantQuery('expense_claims' as any);
  const insertClaim = useTenantInsert('expense_claims' as any);
  const updateClaim = useTenantUpdate('expense_claims' as any);

  const demoData = [
    { id: '1', claim_number: 'EXP-001', employee_name: 'Alice Johnson', total_amount: 1250, status: 'approved', submitted_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: '2', claim_number: 'EXP-002', employee_name: 'Bob Smith', total_amount: 380, status: 'submitted', submitted_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', claim_number: 'EXP-003', employee_name: 'Carol Williams', total_amount: 2100, status: 'paid', submitted_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: '4', claim_number: 'EXP-004', employee_name: 'David Lee', total_amount: 750, status: 'rejected', submitted_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '5', claim_number: 'EXP-005', employee_name: 'Emma Davis', total_amount: 420, status: 'draft', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  const claims: any[] = (isDemo ? demoData : rawData) ?? [];

  const totalPending = claims.filter(c => c.status === 'submitted').reduce((s, c) => s + Number(c.total_amount), 0);
  const totalApproved = claims.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.total_amount), 0);
  const totalPaid = claims.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.total_amount), 0);

  const handleApprove = async (id: string) => {
    if (isDemo) { toast.success('Claim approved (demo). Accounting entry created.'); return; }
    await updateClaim.mutateAsync({ id, status: 'approved', approved_at: new Date().toISOString() });
    // Auto-create accounting entry
    const claim = claims.find(c => c.id === id);
    if (claim && tenant?.id) {
      await (supabase.from('transactions') as any).insert({
        tenant_id: tenant.id, type: 'expense', category: 'Employee Expenses',
        amount: claim.total_amount,
        description: `Expense claim ${claim.claim_number} — ${claim.employee_name}`,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    toast.success('Claim approved and accounting entry created');
  };

  const handleSubmit = async (id: string) => {
    if (isDemo) { toast.success('Claim submitted for approval (demo)'); return; }
    await updateClaim.mutateAsync({ id, status: 'submitted', submitted_at: new Date().toISOString() });
    toast.success('Claim submitted for approval');
  };

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { category: 'Other', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), merchant: '' }],
  }));

  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));

  const updateItem = (i: number, k: string, v: string) => setForm(f => ({
    ...f, items: f.items.map((item, j) => j === i ? { ...item, [k]: v } : item),
  }));

  const totalAmount = form.items.reduce((s, item) => s + (Number(item.amount) || 0), 0);

  const handleCreate = async () => {
    if (isDemo) { toast.success('Expense claim created (demo)'); setCreateOpen(false); return; }
    const claim = await insertClaim.mutateAsync({
      claim_number: `EXP-${Date.now().toString(36).toUpperCase()}`,
      employee_name: form.employee_name,
      total_amount: totalAmount,
      notes: form.notes,
      status: 'draft',
    });
    // Insert items
    for (const item of form.items) {
      await (supabase.from('expense_items') as any).insert({
        claim_id: claim.id, tenant_id: tenant?.id,
        ...item, amount: Number(item.amount),
      });
    }
    toast.success('Expense claim created');
    setCreateOpen(false);
  };

  const columns: Column[] = [
    { key: 'claim_number', label: 'Claim #', className: 'font-mono text-xs' },
    { key: 'employee_name', label: 'Employee', render: v => <span className="font-medium">{v}</span> },
    { key: 'total_amount', label: 'Amount', render: v => <span className="font-semibold">{formatMoney(v)}</span> },
    { key: 'status', label: 'Status', render: v => (
      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', STATUS_COLORS[v] ?? STATUS_COLORS.draft)}>{v}</span>
    )},
    { key: 'created_at', label: 'Date', render: v => new Date(v).toLocaleDateString() },
  ];

  return (
    <AppLayout title="Expenses" subtitle="Employee expense claims and approvals">
      <div className="max-w-7xl">
        <PageHeader
          title="Expense Management"
          subtitle="Manage employee expense claims, approvals, and reimbursements"
          icon={Receipt}
          breadcrumb={[{ label: 'Finance' }, { label: 'Expenses' }]}
          actions={[
            { label: 'New Claim', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Total Claims', value: claims.length },
            { label: 'Pending Approval', value: formatMoney(totalPending), color: 'text-amber-600' },
            { label: 'Approved', value: formatMoney(totalApproved), color: 'text-emerald-600' },
            { label: 'Paid Out', value: formatMoney(totalPaid) },
          ]}
        />

        <DataTable
          data={claims}
          columns={columns}
          loading={isLoading && !isDemo}
          searchPlaceholder="Search claims..."
          emptyTitle="No expense claims yet"
          emptyDescription="Submit your first expense claim for reimbursement."
          emptyAction={{ label: 'New Claim', onClick: () => setCreateOpen(true) }}
          rowActions={row => (
            <div className="flex gap-1.5">
              {row.status === 'draft' && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSubmit(row.id)}>Submit</Button>
              )}
              {row.status === 'submitted' && (
                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(row.id)}>Approve</Button>
              )}
            </div>
          )}
        />

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-indigo-600" /> New Expense Claim</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label>Employee Name</Label>
                <Input value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Expense Items</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2.5 relative">
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Category</Label>
                          <Select value={item.category} onValueChange={v => updateItem(i, 'category', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Amount *</Label>
                          <Input className="h-8 text-xs" type="number" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
                          <Input className="h-8 text-xs" type="date" value={item.expense_date} onChange={e => updateItem(i, 'expense_date', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Merchant</Label>
                          <Input className="h-8 text-xs" value={item.merchant} onChange={e => updateItem(i, 'merchant', e.target.value)} placeholder="Merchant name" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input className="h-8 text-xs" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="What was this for?" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold text-foreground">{formatMoney(totalAmount)}</span>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." />
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={insertClaim.isPending} onClick={handleCreate}>
                {insertClaim.isPending ? 'Creating...' : 'Create Claim'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
