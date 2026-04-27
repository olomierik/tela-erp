import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const HEADERS = [
  'full_name', 'email', 'phone', 'position', 'department',
  'employment_type', 'start_date', 'salary', 'allowances', 'status',
] as const;

const SAMPLE: (string | number)[][] = [
  ['Asha Mwakalebela', 'asha@example.com', '+255700000001', 'Accountant',  'Finance',    'permanent',  '2025-01-15',  900000, 150000, 'active'],
  ['John Kileo',       'john@example.com', '+255700000002', 'Sales Rep',   'Sales',      'permanent',  '2025-02-01',  650000, 100000, 'active'],
  ['Neema Massawe',    'neema@example.com','+255700000003', 'HR Officer',  'HR',         'contract',   '2025-03-10',  1200000, 200000,'active'],
];

export function downloadEmployeeTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS as unknown as string[], ...SAMPLE]);
  ws['!cols'] = HEADERS.map(h => ({ wch: h === 'email' ? 26 : 18 }));
  // Add an instructions sheet
  const notes = [
    ['TELA-ERP — Employee Bulk Upload Template'],
    [''],
    ['Required columns: full_name'],
    ['Optional columns: email, phone, position, department, employment_type, start_date, salary, allowances, status'],
    [''],
    ['Allowed values:'],
    ['  • employment_type: permanent | contract | casual | intern'],
    ['  • status: active | inactive'],
    ['  • start_date: YYYY-MM-DD (e.g. 2025-04-01)'],
    ['  • salary, allowances: numbers in your local currency (no commas)'],
    [''],
    ['Tip: Delete the sample rows in the Employees sheet before adding real data.'],
  ];
  const wsNotes = XLSX.utils.aoa_to_sheet(notes);
  wsNotes['!cols'] = [{ wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');
  XLSX.writeFile(wb, 'employees-template.xlsx');
}

interface ParsedEmployee {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  salary: number;
  allowances: number;
  status: string;
}

function normalizeStatus(v: string) {
  const s = v.toLowerCase().trim();
  return s === 'inactive' ? 'inactive' : 'active';
}
function normalizeEmploymentType(v: string) {
  const s = v.toLowerCase().trim();
  return ['permanent', 'contract', 'casual', 'intern'].includes(s) ? s : 'permanent';
}
function normalizeDate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseFile(file: File): Promise<{ rows: ParsedEmployee[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets['Employees'] || wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (raw.length < 2) return resolve({ rows: [], errors: ['File is empty or has no data rows.'] });

        const headers = raw[0].map((h: any) => String(h).toLowerCase().trim());
        const idx = (k: string) => headers.indexOf(k);
        const errors: string[] = [];
        const rows: ParsedEmployee[] = [];

        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.every((c: any) => c === undefined || c === '')) continue;

          const full_name = String(r[idx('full_name')] ?? '').trim();
          if (!full_name) { errors.push(`Row ${i + 1}: missing full_name`); continue; }

          rows.push({
            full_name,
            email:           r[idx('email')] ? String(r[idx('email')]).trim() : null,
            phone:           r[idx('phone')] ? String(r[idx('phone')]).trim() : null,
            position:        r[idx('position')] ? String(r[idx('position')]).trim() : null,
            department:      r[idx('department')] ? String(r[idx('department')]).trim() : null,
            employment_type: normalizeEmploymentType(String(r[idx('employment_type')] ?? '')),
            start_date:      normalizeDate(r[idx('start_date')]),
            salary:          Number(r[idx('salary')] ?? 0) || 0,
            allowances:      Number(r[idx('allowances')] ?? 0) || 0,
            status:          normalizeStatus(String(r[idx('status')] ?? 'active')),
          });
        }
        resolve({ rows, errors });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function BulkEmployeeUpload({ onComplete }: { onComplete?: () => void }) {
  const { tenant, isDemo } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<{ rows: ParsedEmployee[]; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const reset = () => { setParsed(null); setFileName(''); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      setParsed(await parseFile(file));
    } catch {
      toast.error('Failed to parse file. Please use the provided template.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!parsed?.rows.length || !tenant?.id) return;
    if (isDemo) { toast.error('Demo mode: bulk import is disabled.'); return; }
    setImporting(true);
    try {
      const payload = parsed.rows.map(r => ({ ...r, tenant_id: tenant.id }));
      const { error } = await (supabase as any).from('employees').insert(payload);
      if (error) throw error;
      toast.success(`Imported ${payload.length} employee${payload.length === 1 ? '' : 's'}`);
      setOpen(false);
      reset();
      onComplete?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to import employees');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" /> Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Download the template, fill in your employee list, then upload the file. Only{' '}
            <strong className="text-foreground">full_name</strong> is required — all other columns are optional.
          </div>

          <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={downloadEmployeeTemplate}>
            <Download className="w-4 h-4" /> Download Template (.xlsx)
          </Button>

          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {fileName || 'Click to select an Excel file (.xlsx)'}
            </p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </div>

          {parsed && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-4 h-4" />
                {parsed.rows.length} employee{parsed.rows.length === 1 ? '' : 's'} ready to import
              </div>
              {parsed.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    {parsed.errors.length} warning{parsed.errors.length === 1 ? '' : 's'}
                  </div>
                  {parsed.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-muted-foreground text-xs">{e}</p>
                  ))}
                  {parsed.errors.length > 5 && (
                    <p className="text-muted-foreground text-xs">…and {parsed.errors.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={!parsed?.rows.length || importing || isDemo}>
            {importing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Importing…</>
              : `Import ${parsed?.rows.length ?? 0} Employee${(parsed?.rows.length ?? 0) === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
