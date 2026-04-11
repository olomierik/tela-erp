import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { formatCurrency } from '@/lib/mock';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2,
  MonitorCheck,
  CircleDot,
  TrendingUp,
  ShoppingBag,
  Eye,
  X,
  Unlock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = 'open' | 'closing' | 'closed';

interface PosSession extends Record<string, unknown> {
  id: string;
  user_id: string;
  session_number: string;
  cashier: string;
  opening_cash: number;
  closing_cash: number | null;
  total_sales: number;
  total_orders: number;
  opened_at: string;
  closed_at: string | null;
  status: SessionStatus;
  notes: string | null;
}

// ─── Form state (NOT extending Record) ───────────────────────────────────────

interface OpenForm {
  cashier: string;
  opening_cash: string;
  notes: string;
}

interface CloseForm {
  closing_cash: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<SessionStatus, 'success' | 'warning' | 'secondary'> = {
  open: 'success',
  closing: 'warning',
  closed: 'secondary',
};

function formatDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function todayPrefix() {
  const d = new Date();
  return d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function buildSessionNumber(existing: PosSession[]): string {
  const year = new Date().getFullYear();
  const prefix = `POS-${year}-`;
  const nums = existing
    .map(s => s.session_number)
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const emptyOpenForm: OpenForm = { cashier: '', opening_cash: '', notes: '' };
const emptyCloseForm: CloseForm = { closing_cash: '' };

export default function Sessions() {
  const navigate = useNavigate();
  const { rows, loading, insert, update, remove } = useTable<PosSession>('myerp_pos_sessions', 'opened_at', false);

  // Open session sheet
  const [openSheetOpen, setOpenSheetOpen] = useState(false);
  const [openForm, setOpenForm] = useState<OpenForm>(emptyOpenForm);

  // Close session dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [closeForm, setCloseForm] = useState<CloseForm>(emptyCloseForm);

  const [saving, setSaving] = useState(false);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const todayStr = todayPrefix();
  const todaySessions = rows.filter(s => s.opened_at.startsWith(todayStr));
  const openSessions = rows.filter(s => s.status === 'open' || s.status === 'closing');
  const todaySales = todaySessions.reduce((sum, s) => sum + (s.total_sales ?? 0), 0);
  const todayOrders = todaySessions.reduce((sum, s) => sum + (s.total_orders ?? 0), 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function startOpenSession() {
    setOpenForm(emptyOpenForm);
    setOpenSheetOpen(true);
  }

  async function handleOpenSession() {
    if (!openForm.cashier.trim()) { toast.error('Cashier name is required'); return; }
    if (openForm.opening_cash === '' || isNaN(Number(openForm.opening_cash))) {
      toast.error('Opening cash is required'); return;
    }
    setSaving(true);
    try {
      const session_number = buildSessionNumber(rows);
      await insert({
        session_number,
        cashier: openForm.cashier.trim(),
        opening_cash: Number(openForm.opening_cash),
        closing_cash: null,
        total_sales: 0,
        total_orders: 0,
        opened_at: new Date().toISOString(),
        closed_at: null,
        status: 'open',
        notes: openForm.notes.trim() || null,
      });
      toast.success(`Session ${session_number} opened`);
      setOpenSheetOpen(false);
    } catch {
      toast.error('Failed to open session');
    } finally {
      setSaving(false);
    }
  }

  function startCloseSession(sessionId: string) {
    setClosingSessionId(sessionId);
    setCloseForm(emptyCloseForm);
    setCloseDialogOpen(true);
  }

  async function handleCloseSession() {
    if (!closingSessionId) return;
    if (closeForm.closing_cash === '' || isNaN(Number(closeForm.closing_cash))) {
      toast.error('Closing cash is required'); return;
    }
    setSaving(true);
    try {
      await update(closingSessionId, {
        closing_cash: Number(closeForm.closing_cash),
        status: 'closed',
        closed_at: new Date().toISOString(),
      });
      toast.success('Session closed');
      setCloseDialogOpen(false);
    } catch {
      toast.error('Failed to close session');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="POS Sessions">
      <PageHeader
        title="POS Sessions"
        subtitle="Open, monitor, and close point-of-sale sessions."
        action={{ label: 'Open Session', onClick: startOpenSession }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{rows.length}</span>
              <MonitorCheck className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open Sessions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{openSessions.length}</span>
              <CircleDot className="w-4 h-4 text-success mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(todaySales)}</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{todayOrders}</span>
              <ShoppingBag className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading sessions…</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session #</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Opening Cash</TableHead>
                  <TableHead className="text-right">Closing Cash</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead>Closed At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      No sessions found. Open a new session to get started.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm font-medium">{s.session_number}</TableCell>
                    <TableCell>{s.cashier}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.opening_cash)}</TableCell>
                    <TableCell className="text-right">
                      {s.closing_cash != null ? formatCurrency(s.closing_cash) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(s.total_sales)}</TableCell>
                    <TableCell className="text-right">{s.total_orders}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(s.opened_at)}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(s.closed_at)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[s.status]} className="capitalize">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* View Orders */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => navigate(`/pos/orders?session=${encodeURIComponent(s.session_number)}`)}
                          title="View Orders"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Close Session */}
                        {(s.status === 'open' || s.status === 'closing') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => startCloseSession(s.id)}
                            title="Close Session"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Delete (closed only) */}
                        {s.status === 'closed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn('h-7 px-2 text-xs text-destructive hover:text-destructive')}
                            onClick={() => handleDelete(s.id)}
                            title="Delete"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Open Session Sheet ─────────────────────────────────────────────── */}
      <Sheet open={openSheetOpen} onOpenChange={setOpenSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Open New Session</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cashier Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Enter cashier name"
                value={openForm.cashier}
                onChange={e => setOpenForm(f => ({ ...f, cashier: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Opening Cash <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={openForm.opening_cash}
                onChange={e => setOpenForm(f => ({ ...f, opening_cash: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional session notes…"
                rows={3}
                value={openForm.notes}
                onChange={e => setOpenForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setOpenSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleOpenSession} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Open Session
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Close Session Dialog ───────────────────────────────────────────── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Session</DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the closing cash amount to finalise this session.
            </p>
            <div className="space-y-1.5">
              <Label>Closing Cash <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={closeForm.closing_cash}
                onChange={e => setCloseForm({ closing_cash: e.target.value })}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCloseSession} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Close Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
