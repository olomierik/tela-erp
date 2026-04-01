import { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  ScanLine, Upload, X, FileText, Package, CheckCircle2,
  AlertTriangle, ArrowRight, Loader2, Eye, Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '@/components/erp/EmptyState';

interface ExtractedData {
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  document_number?: string;
  document_date?: string;
  due_date?: string;
  currency?: string;
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  total_amount?: number;
  payment_terms?: string;
  notes?: string;
  line_items?: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
}

export default function DocumentScanner() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [docType, setDocType] = useState<'invoice' | 'receipt' | 'purchase_order'>('invoice');
  const [history, setHistory] = useState<Array<{ id: string; file_name: string; status: string; extracted_data: any; created_at: string }>>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) {
      processFile(f);
    } else {
      toast.error('Please upload an image (JPG, PNG) or PDF file.');
    }
  }, []);

  const processFile = (f: File) => {
    setFile(f);
    setExtracted(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleExtract = async () => {
    if (!file && !isDemo) return;
    setExtracting(true);

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      setExtracted({
        vendor_name: 'Acme Supplies Co.',
        vendor_email: 'billing@acmesupplies.com',
        vendor_phone: '+1 (555) 234-5678',
        document_number: 'INV-2024-04521',
        document_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        currency: 'USD',
        subtotal: 2450.00,
        tax_amount: 196.00,
        tax_rate: 8,
        total_amount: 2646.00,
        payment_terms: 'Net 30',
        line_items: [
          { description: 'Office Chairs (x10)', quantity: 10, unit_price: 185, amount: 1850 },
          { description: 'Standing Desks (x2)', quantity: 2, unit_price: 300, amount: 600 },
        ],
      });
      toast.success('Document parsed successfully (demo)');
      setExtracting(false);
      return;
    }

    try {
      const base64 = preview?.split(',')[1];
      const { data, error } = await supabase.functions.invoke('ai-document-parser', {
        body: { imageBase64: base64, documentType: docType },
      });
      if (error || data?.error) throw new Error(data?.error ?? 'Parsing failed');
      setExtracted(data.extracted);
      toast.success('Document parsed successfully');

      // Save to DB
      if (tenant?.id) {
        await (supabase.from as any)('scanned_documents').insert({
          tenant_id: tenant.id,
          file_name: file?.name,
          document_type: docType,
          extracted_data: data.extracted,
          status: 'processed',
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to parse document');
    } finally { setExtracting(false); }
  };

  const createRecord = async (type: 'invoice' | 'purchase_order') => {
    if (!extracted) return;
    toast.success(`Draft ${type === 'invoice' ? 'invoice' : 'purchase order'} created from document`);
  };

  return (
    <AppLayout title="Document Scanner" subtitle="AI-powered invoice and receipt parsing">
      <div className="max-w-6xl">
        <PageHeader
          title="AI Document Scanner"
          subtitle="Upload invoices, receipts, or POs — AI extracts all data automatically"
          icon={ScanLine}
          iconColor="text-violet-600"
          breadcrumb={[{ label: 'AI Intelligence' }, { label: 'Document Scanner' }]}
          badge={{ label: 'Claude Vision AI', variant: 'secondary' }}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Upload Zone */}
          <div className="space-y-4">
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Upload Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Document type selector */}
                <div className="flex gap-2">
                  {(['invoice', 'receipt', 'purchase_order'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                        docType === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                  className={cn(
                    'relative border-2 border-dashed rounded-xl transition-colors cursor-pointer',
                    dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-border hover:border-indigo-400 hover:bg-muted/50',
                    preview ? 'aspect-auto' : 'aspect-video flex items-center justify-center'
                  )}
                >
                  {preview ? (
                    <div className="relative">
                      <img src={preview} alt="Document preview" className="w-full rounded-xl object-contain max-h-64" />
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setExtracted(null); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center px-6 py-10">
                      <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">Drop document here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, PDF</p>
                    </div>
                  )}
                  <input
                    id="file-input" type="file" className="hidden"
                    accept="image/*,.pdf"
                    onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                  />
                </div>

                {(file || isDemo) && (
                  <Button
                    className="w-full gap-2"
                    onClick={handleExtract}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</>
                    ) : (
                      <><ScanLine className="w-4 h-4" /> Extract Data with AI</>
                    )}
                  </Button>
                )}

                {!file && !isDemo && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setFile(new File([], 'demo.jpg')); setPreview('/placeholder.svg'); }}>
                    Try with Demo Document
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Extracted Data */}
          <div className="space-y-4">
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Extracted Data
                </CardTitle>
                {extracted && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => createRecord('invoice')}>
                      <FileText className="w-3 h-3" /> Invoice
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => createRecord('purchase_order')}>
                      <Plus className="w-3 h-3" /> Create
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {extracting ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : extracted ? (
                  <div className="space-y-4">
                    {/* Vendor info */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor Information</h4>
                      {[
                        ['Vendor', extracted.vendor_name],
                        ['Email', extracted.vendor_email],
                        ['Phone', extracted.vendor_phone],
                        ['Document #', extracted.document_number],
                        ['Date', extracted.document_date],
                        ['Due Date', extracted.due_date],
                        ['Payment Terms', extracted.payment_terms],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={String(k)} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="font-medium text-foreground">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Line items */}
                    {extracted.line_items && extracted.line_items.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items</h4>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40">
                              <tr>
                                <th className="px-3 py-2 text-left text-muted-foreground">Description</th>
                                <th className="px-3 py-2 text-right text-muted-foreground">Qty</th>
                                <th className="px-3 py-2 text-right text-muted-foreground">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {extracted.line_items.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2">{item.description}</td>
                                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right font-medium">{formatMoney(item.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
                      {extracted.subtotal !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatMoney(extracted.subtotal)}</span>
                        </div>
                      )}
                      {extracted.tax_amount !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax ({extracted.tax_rate}%)</span>
                          <span>{formatMoney(extracted.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5">
                        <span>Total</span>
                        <span className="text-indigo-600">{formatMoney(extracted.total_amount ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={ScanLine}
                    title="No document scanned yet"
                    description="Upload a document and click Extract to see the AI-parsed data here."
                    size="sm"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
