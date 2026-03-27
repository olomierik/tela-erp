import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  Zap, Plus, Play, Pause, Trash2, ChevronRight, Bell,
  Mail, CheckSquare, Webhook, Clock, MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import EmptyState from '@/components/erp/EmptyState';

const TRIGGERS = [
  { value: 'invoice_created', label: 'Invoice Created', icon: '🧾' },
  { value: 'invoice_overdue', label: 'Invoice Overdue', icon: '⏰' },
  { value: 'payment_received', label: 'Payment Received', icon: '💰' },
  { value: 'stock_low', label: 'Stock Below Threshold', icon: '📦' },
  { value: 'stock_out', label: 'Item Out of Stock', icon: '🚫' },
  { value: 'sales_order_created', label: 'Sales Order Created', icon: '🛒' },
  { value: 'deal_won', label: 'Deal Won', icon: '🏆' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed', icon: '📊' },
  { value: 'expense_submitted', label: 'Expense Submitted', icon: '🧾' },
  { value: 'new_customer', label: 'New Customer Added', icon: '👤' },
  { value: 'po_created', label: 'Purchase Order Created', icon: '📑' },
];

const ACTIONS = [
  { value: 'send_notification', label: 'Send In-App Notification', icon: Bell },
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'create_task', label: 'Create Task', icon: CheckSquare },
  { value: 'webhook', label: 'Call Webhook', icon: Webhook },
];

const TEMPLATES = [
  {
    name: 'Overdue Invoice Alert',
    trigger: 'invoice_overdue',
    description: 'Notify team when an invoice becomes overdue',
    actions: [{ type: 'send_notification', config: { message: 'Invoice {{invoice_number}} is overdue' } }],
  },
  {
    name: 'Low Stock Alert',
    trigger: 'stock_low',
    description: 'Alert when inventory drops below reorder level',
    actions: [{ type: 'send_notification', config: { message: '{{product_name}} is running low ({{quantity}} left)' } }],
  },
  {
    name: 'New Customer Welcome',
    trigger: 'new_customer',
    description: 'Send welcome email to new customers',
    actions: [{ type: 'send_email', config: { subject: 'Welcome to {{company_name}}!', template: 'welcome' } }],
  },
  {
    name: 'Deal Won Celebration',
    trigger: 'deal_won',
    description: 'Notify team when a deal is won',
    actions: [{ type: 'send_notification', config: { message: '🏆 Deal won: {{deal_name}} ({{deal_value}})' } }],
  },
];

export default function AutomationBuilder() {
  const { isDemo } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '',
    trigger_event: '',
    actions: [{ type: 'send_notification', config: { message: '' } }],
  });

  const { data: rawData, isLoading } = useTenantQuery('automation_rules' as any);
  const insertRule = useTenantInsert('automation_rules' as any);
  const updateRule = useTenantUpdate('automation_rules' as any);
  const deleteRule = useTenantDelete('automation_rules' as any);

  const demoRules = [
    { id: '1', name: 'Overdue Invoice Alert', trigger_event: 'invoice_overdue', is_active: true, run_count: 23, last_run_at: new Date(Date.now() - 86400000).toISOString(), actions: [{ type: 'send_notification' }] },
    { id: '2', name: 'Low Stock Reorder Alert', trigger_event: 'stock_low', is_active: true, run_count: 8, last_run_at: new Date(Date.now() - 3600000 * 2).toISOString(), actions: [{ type: 'send_notification' }, { type: 'send_email' }] },
    { id: '3', name: 'New Customer Welcome Email', trigger_event: 'new_customer', is_active: false, run_count: 45, last_run_at: new Date(Date.now() - 86400000 * 3).toISOString(), actions: [{ type: 'send_email' }] },
    { id: '4', name: 'Deal Won Webhook', trigger_event: 'deal_won', is_active: true, run_count: 12, last_run_at: new Date().toISOString(), actions: [{ type: 'webhook' }] },
  ];

  const rules: any[] = isDemo ? demoRules : (rawData ?? []);

  const toggleRule = async (rule: any) => {
    if (isDemo) { toast.success(`Rule ${rule.is_active ? 'paused' : 'activated'} (demo)`); return; }
    await updateRule.mutateAsync({ id: rule.id, is_active: !rule.is_active });
  };

  const handleCreate = async () => {
    if (!form.name || !form.trigger_event) { toast.error('Name and trigger are required'); return; }
    if (isDemo) { toast.success('Automation rule created (demo)'); setCreateOpen(false); return; }
    await insertRule.mutateAsync({
      name: form.name, description: form.description,
      trigger_event: form.trigger_event,
      actions: form.actions,
      is_active: true,
    });
    setCreateOpen(false);
  };

  const getTriggerLabel = (event: string) => TRIGGERS.find(t => t.value === event)?.label ?? event;
  const getTriggerIcon = (event: string) => TRIGGERS.find(t => t.value === event)?.icon ?? '⚡';

  const activeCount = rules.filter(r => r.is_active).length;
  const totalRuns = rules.reduce((s, r) => s + (r.run_count ?? 0), 0);

  return (
    <AppLayout title="Automations" subtitle="Build no-code workflow automations">
      <div className="max-w-5xl">
        <PageHeader
          title="Automation Builder"
          subtitle="Create triggers, conditions, and actions to automate your business workflows"
          icon={Zap}
          iconColor="text-amber-600"
          breadcrumb={[{ label: 'Operations' }, { label: 'Automations' }]}
          actions={[
            { label: 'New Automation', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Total Rules', value: rules.length },
            { label: 'Active', value: activeCount, color: 'text-emerald-600' },
            { label: 'Total Executions', value: totalRuns },
          ]}
        />

        {/* Templates */}
        {rules.length === 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Start Templates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATES.map(template => (
                <button
                  key={template.name}
                  onClick={() => {
                    setForm({ name: template.name, description: template.description, trigger_event: template.trigger, actions: template.actions as any });
                    setCreateOpen(true);
                  }}
                  className="text-left p-4 rounded-xl border border-border hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getTriggerIcon(template.trigger)}</span>
                    <span className="font-medium text-sm text-foreground group-hover:text-indigo-600 transition-colors">{template.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rules List */}
        {rules.length === 0 && !isLoading ? (
          <EmptyState icon={Zap} title="No automations yet" description="Create your first automation rule to streamline business workflows."
            action={{ label: 'New Automation', onClick: () => setCreateOpen(true) }} />
        ) : (
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <motion.div key={rule.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={cn('border-border rounded-xl transition-colors', !rule.is_active && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Toggle */}
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule)} />

                      {/* Trigger */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl">{getTriggerIcon(rule.trigger_event)}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{rule.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              When: {getTriggerLabel(rule.trigger_event)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">→</span>
                            {(rule.actions ?? []).map((a: any, j: number) => {
                              const actionDef = ACTIONS.find(x => x.value === a.type);
                              return actionDef ? (
                                <Badge key={j} variant="outline" className="text-[10px] gap-1">
                                  <actionDef.icon className="w-2.5 h-2.5" />
                                  {actionDef.label.split(' ')[1]}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold text-foreground">{rule.run_count ?? 0} runs</p>
                        {rule.last_run_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Last: {new Date(rule.last_run_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleRule(rule)}>
                            {rule.is_active ? <><Pause className="w-3.5 h-3.5 mr-2" /> Pause</> : <><Play className="w-3.5 h-3.5 mr-2" /> Activate</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => isDemo ? toast.info('Demo mode') : deleteRule.mutate(rule.id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Sheet */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> New Automation Rule</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              <div className="space-y-1.5">
                <Label>Rule Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Alert on low stock" />
              </div>

              {/* Trigger */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center text-xs font-bold">1</span>
                  Trigger — When this happens...
                </Label>
                <Select value={form.trigger_event} onValueChange={v => setForm(f => ({ ...f, trigger_event: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select trigger event" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
                  Actions — Do this...
                </Label>
                {form.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={action.type} onValueChange={v => setForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? { ...a, type: v } : a) }))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map(a => (
                          <SelectItem key={a.value} value={a.value}>
                            <div className="flex items-center gap-2"><a.icon className="w-3.5 h-3.5" />{a.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {action.type === 'send_notification' && (
                      <Input
                        className="flex-1 text-xs h-9"
                        placeholder="Notification message..."
                        value={action.config?.message ?? ''}
                        onChange={e => setForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? { ...a, config: { message: e.target.value } } : a) }))}
                      />
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5"
                  onClick={() => setForm(f => ({ ...f, actions: [...f.actions, { type: 'send_notification', config: { message: '' } }] }))}>
                  <Plus className="w-3.5 h-3.5" /> Add Another Action
                </Button>
              </div>
            </div>
            <SheetFooter className="mt-8 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={insertRule.isPending} onClick={handleCreate}>
                {insertRule.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
