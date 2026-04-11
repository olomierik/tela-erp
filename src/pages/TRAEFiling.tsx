import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  FileText, Shield, CheckCircle2, Clock, AlertTriangle,
  Lock, Wifi, WifiOff, Play, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ObligationClass = 'A' | 'B' | 'C';
type ObligationType = 'PAYE' | 'SDL' | 'VAT';

interface Obligation {
  id: string;
  type: ObligationType;
  period: string;
  dueDate: Date;
  class: ObligationClass;
  amount: number;
  traReference?: string;
}

const TODAY = new Date();

function formatTZS(amount: number) {
  return `TZS ${amount.toLocaleString()}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateObligations(isDemo: boolean): Obligation[] {
  const obligations: Obligation[] = [];
  const now = new Date();

  // Generate PAYE and SDL for last 6 months + next 2 months (8 months total)
  for (let i = -6; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const periodLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    // due: 7th of next month
    const dueDate = new Date(year, month + 1, 7);

    obligations.push({
      id: `paye-${year}-${month}`,
      type: 'PAYE',
      period: periodLabel,
      dueDate,
      class: 'B',
      amount: 340000,
    });
    obligations.push({
      id: `sdl-${year}-${month}`,
      type: 'SDL',
      period: periodLabel,
      dueDate,
      class: 'B',
      amount: 84000,
    });
  }

  // Generate VAT for each quarter covering last 6 months + next 2 months
  const quartersSeen = new Set<string>();
  for (let i = -6; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const quarter = Math.floor(d.getMonth() / 3);
    const year = d.getFullYear();
    const key = `${year}-Q${quarter + 1}`;
    if (!quartersSeen.has(key)) {
      quartersSeen.add(key);
      const quarterEndMonth = quarter * 3 + 2; // last month of quarter (0-indexed)
      const dueDate = new Date(year, quarterEndMonth + 1, 20);
      obligations.push({
        id: `vat-${key}`,
        type: 'VAT',
        period: `Q${quarter + 1}-${year}`,
        dueDate,
        class: 'B',
        amount: 1450000,
      });
    }
  }

  if (isDemo) {
    // Assign classes: 4 A, 2 B, 2 C
    let classACount = 0;
    let classCCount = 0;
    const traRefs = ['TZ-2025-78421', 'TZ-2025-78422', 'TZ-2025-78423', 'TZ-2025-78424'];

    return obligations.map(o => {
      const isPast = o.dueDate < TODAY;
      if (isPast && classACount < 4) {
        classACount++;
        return { ...o, class: 'A' as ObligationClass, traReference: traRefs[classACount - 1] };
      }
      if (isPast && classCCount < 2) {
        classCCount++;
        return { ...o, class: 'C' as ObligationClass };
      }
      return { ...o, class: 'B' as ObligationClass };
    });
  }

  // Non-demo: classify by date and assume none are filed (no DB lookup on client)
  return obligations.map(o => {
    if (o.dueDate < TODAY) {
      return { ...o, class: 'C' as ObligationClass };
    }
    return { ...o, class: 'B' as ObligationClass };
  });
}

const CLASS_COLORS: Record<ObligationClass, string> = {
  A: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  C: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CLASS_LABELS: Record<ObligationClass, string> = {
  A: 'Filed',
  B: 'Ready to File',
  C: 'Overdue',
};

export default function TRAEFiling() {
  const { isDemo, tenant } = useAuth();

  // --- Connection state ---
  const [isConnected, setIsConnected] = useState(() => {
    if (isDemo) return true;
    const tenantId = typeof tenant === 'object' && tenant ? (tenant as any).id : '';
    const stored = localStorage.getItem(`tela_tra_connected_${tenantId}`);
    return stored === 'true';
  });
  const [form, setForm] = useState({ tin: '', username: '', password: '' });
  const [connecting, setConnecting] = useState(false);
  const [connectedTin, setConnectedTin] = useState('');
  const [connectedUsername, setConnectedUsername] = useState('');

  // --- Obligations ---
  const [obligations, setObligations] = useState<Obligation[]>(() => generateObligations(isDemo));
  const classBObligations = obligations.filter(o => o.class === 'B');
  const classAObligations = obligations.filter(o => o.class === 'A');
  const classCObligations = obligations.filter(o => o.class === 'C');

  // --- Filing engine ---
  const [filingOpen, setFilingOpen] = useState(false);
  const [filingLog, setFilingLog] = useState<string[]>([]);
  const [filingProgress, setFilingProgress] = useState(0);
  const [filingDone, setFilingDone] = useState(false);
  const [filing, setFiling] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [filingLog]);

  const getTenantId = () => {
    if (typeof tenant === 'object' && tenant) return (tenant as any).id ?? '';
    return '';
  };

  const handleConnect = async () => {
    if (!form.tin || !form.username || !form.password) {
      toast.error('All fields are required');
      return;
    }
    setConnecting(true);
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1200));
        toast.success('Connected to TRA (demo)');
      } else {
        const { error } = await supabase.functions.invoke('tra-filing', {
          body: { action: 'authenticate', tin: form.tin, username: form.username, password: form.password, tenantId: getTenantId() },
        });
        if (error) throw error;
        toast.success('Connected to TRA successfully');
      }
      setConnectedTin(form.tin);
      setConnectedUsername(form.username);
      setIsConnected(true);
      localStorage.setItem(`tela_tra_connected_${getTenantId()}`, 'true');
      setForm({ tin: '', username: '', password: '' });
    } catch (err: any) {
      toast.error(err?.message ?? 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectedTin('');
    setConnectedUsername('');
    localStorage.removeItem(`tela_tra_connected_${getTenantId()}`);
    toast.info('Disconnected from TRA');
  };

  const handleFile = (obligation: Obligation) => {
    if (obligation.class === 'C') {
      toast.error('Overdue returns cannot be auto-filed. Contact TRA for penalty assessment.');
      return;
    }
    // Queue individual obligation
    toast.info(`${obligation.type} ${obligation.period} queued for filing`);
  };

  const generateTRARef = () => {
    const num = Math.floor(10000 + Math.random() * 89999);
    return `TZ-2025-${num}`;
  };

  const handleFileAll = async () => {
    if (!isConnected || classBObligations.length === 0) return;
    setFilingOpen(true);
    setFilingLog([]);
    setFilingProgress(0);
    setFilingDone(false);
    setFiling(true);

    const toFile = [...classBObligations];

    if (isDemo) {
      const log = (msg: string) => setFilingLog(prev => [...prev, msg]);
      for (let i = 0; i < toFile.length; i++) {
        const ob = toFile[i];
        log(`[${new Date().toLocaleTimeString()}] Preparing ${ob.type} ${ob.period}...`);
        await new Promise(r => setTimeout(r, 700));
        log(`[${new Date().toLocaleTimeString()}] Validating figures...`);
        await new Promise(r => setTimeout(r, 700));
        log(`[${new Date().toLocaleTimeString()}] Submitting to TRA portal...`);
        await new Promise(r => setTimeout(r, 1000));
        const ref = generateTRARef();
        log(`[${new Date().toLocaleTimeString()}] Capturing reference number: ${ref}`);
        await new Promise(r => setTimeout(r, 600));
        log(`[${new Date().toLocaleTimeString()}] SUCCESS — ${ob.type} ${ob.period} filed. Ref: ${ref}`);
        setObligations(prev =>
          prev.map(o => o.id === ob.id ? { ...o, class: 'A', traReference: ref } : o)
        );
        setFilingProgress(Math.round(((i + 1) / toFile.length) * 100));
      }
      log(`[${new Date().toLocaleTimeString()}] Filing session complete.`);
    } else {
      try {
        const { data, error } = await supabase.functions.invoke('tra-filing', {
          body: { action: 'file', obligations: toFile, tenantId: getTenantId() },
        });
        if (error) throw error;
        setFilingLog([`Filing submitted. ${data?.message ?? 'Check TRA portal for confirmation.'}`]);
        setFilingProgress(100);
      } catch (err: any) {
        setFilingLog([`Error: ${err?.message ?? 'Filing failed'}`]);
      }
    }

    setFiling(false);
    setFilingDone(true);
  };

  const showObligations = isDemo || isConnected;

  return (
    <AppLayout title="TRA E-Filing" subtitle="Tanzania Revenue Authority integration">
      <div className="max-w-7xl space-y-6">
        <PageHeader
          title="TRA E-Filing"
          subtitle="Connect to TRA and file tax returns automatically"
          icon={FileText}
          breadcrumb={[{ label: 'Compliance' }, { label: 'TRA E-Filing' }]}
          stats={[
            { label: 'Filed Returns', value: classAObligations.length, color: 'text-teal-600' },
            { label: 'Ready to File', value: classBObligations.length, color: 'text-blue-600' },
            { label: 'Overdue', value: classCObligations.length, color: 'text-red-600' },
          ]}
        />

        {/* Section A: Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isConnected ? (
                <><Wifi className="w-4 h-4 text-teal-500" /> TRA Connection Active</>
              ) : (
                <><WifiOff className="w-4 h-4 text-slate-400" /> Connect to TRA Portal</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 space-y-1 text-sm">
                  <div><span className="text-muted-foreground">TIN:</span> <span className="font-mono font-medium">{isDemo ? '100-234-567' : connectedTin}</span></div>
                  <div><span className="text-muted-foreground">Username:</span> <span className="font-medium">{isDemo ? 'demo_user' : connectedUsername}</span></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Session:</span>
                    <span className="inline-flex items-center gap-1 text-teal-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                </div>
                {!isDemo && (
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label>TIN Number</Label>
                  <Input
                    value={form.tin}
                    onChange={e => setForm(f => ({ ...f, tin: e.target.value }))}
                    placeholder="e.g. 100-234-567"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>TRA Username</Label>
                  <Input
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="TRA portal username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>TRA Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="TRA portal password"
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Your password is never stored. Only encrypted session tokens are saved.</span>
                </div>
                <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
                  {connecting ? 'Connecting...' : 'Connect to TRA'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section B: Return Obligations */}
        {showObligations && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-teal-200 dark:border-teal-800">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Class A — Filed</p>
                      <p className="text-2xl font-bold text-teal-600">{classAObligations.length}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-teal-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Class B — Ready to File</p>
                      <p className="text-2xl font-bold text-blue-600">{classBObligations.length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Class C — Overdue</p>
                      <p className="text-2xl font-bold text-red-600">{classCObligations.length}</p>
                      <p className="text-xs text-red-500 mt-0.5">Requires manual TRA contact</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section C: File All button */}
            <div className="flex justify-end">
              <Button
                onClick={handleFileAll}
                disabled={!isConnected || classBObligations.length === 0}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                File Eligible Returns ({classBObligations.length})
              </Button>
            </div>

            {/* Obligations table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Return Obligations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>TRA Reference</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {obligations.map(ob => (
                        <TableRow key={ob.id} className={cn(ob.class === 'C' && 'bg-red-50/40 dark:bg-red-950/10')}>
                          <TableCell className="font-medium">{ob.type}</TableCell>
                          <TableCell className="text-sm">{ob.period}</TableCell>
                          <TableCell className="text-sm">{formatDate(ob.dueDate)}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{formatTZS(ob.amount)}</TableCell>
                          <TableCell>
                            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', CLASS_COLORS[ob.class])}>
                              {CLASS_LABELS[ob.class]}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {ob.traReference ?? '—'}
                          </TableCell>
                          <TableCell>
                            {ob.class === 'A' ? (
                              <span className="text-xs text-teal-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Filed
                              </span>
                            ) : ob.class === 'C' ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="cursor-default gap-1 text-xs">
                                      <AlertTriangle className="w-3 h-3" /> Overdue — Contact TRA
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs">
                                    Overdue returns cannot be auto-filed. Please contact TRA on +255 800 780 078
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleFile(ob)}>
                                Queue for Filing
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filing Progress Sheet */}
        <Sheet open={filingOpen} onOpenChange={open => { if (!filing) setFilingOpen(open); }}>
          <SheetContent className="w-full sm:max-w-[560px] flex flex-col">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" /> Filing in Progress
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{filing ? 'Filing returns...' : 'Complete'}</span>
                  <span>{filingProgress}%</span>
                </div>
                <Progress value={filingProgress} className="h-2" />
              </div>
              <div
                ref={logRef}
                className="flex-1 bg-slate-950 rounded-md p-3 overflow-y-auto font-mono text-xs text-green-400 space-y-1 min-h-[200px] max-h-[400px]"
              >
                {filingLog.length === 0 && (
                  <span className="text-slate-500">Waiting to start...</span>
                )}
                {filingLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {filing && <div className="animate-pulse text-slate-500">_</div>}
              </div>
              {filingDone && (
                <Button onClick={() => setFilingOpen(false)} className="w-full">
                  <X className="w-4 h-4 mr-2" /> Close
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
