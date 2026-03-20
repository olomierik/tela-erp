import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { downloadInventoryTemplate, parseInventoryExcel, ParsedInventoryRow } from '@/lib/excel-utils';
import { toast } from 'sonner';

interface BulkUploadProps {
  onUpload: (rows: ParsedInventoryRow[]) => void;
  isPending?: boolean;
}

export function BulkUpload({ onUpload, isPending }: BulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<{ rows: ParsedInventoryRow[]; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const result = await parseInventoryExcel(file);
      setParsed(result);
    } catch {
      toast.error('Failed to parse file');
    }
  };

  const handleSubmit = () => {
    if (!parsed?.rows.length) return;
    onUpload(parsed.rows);
    setOpen(false);
    setParsed(null);
    setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setParsed(null); setFileName(''); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" /> Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Inventory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={downloadInventoryTemplate}>
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
                {parsed.rows.length} items ready to import
              </div>
              {parsed.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    {parsed.errors.length} warning(s)
                  </div>
                  {parsed.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-muted-foreground text-xs">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!parsed?.rows.length || isPending}>
            {isPending ? 'Importing…' : `Import ${parsed?.rows.length ?? 0} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
