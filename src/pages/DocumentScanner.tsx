import { useState, useCallback, useRef, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  ScanLine, Upload, X, FileText, Plus, CheckCircle2,
  Loader2, Camera, CameraOff, Copy, Download, RotateCcw,
  History, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTenantQuery, useTenantDelete } from '@/hooks/use-tenant-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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

// ─── Camera Component ─────────────────────────────────────────────────────
function CameraCapture({ onCapture, onClose }: { onCapture: (file: File, preview: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    startCamera();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      stream?.getTracks().forEach(t => t.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      setError('Camera access denied. Please allow camera permissions in your browser settings.');
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onCapture(file, dataUrl);
      stream?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black">
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <CameraOff className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-red-400 font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
          <canvas ref={canvasRef} className="hidden" />
          {/* Scan overlay guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/30 rounded-lg" />
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-md" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-md" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-md" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-md" />
          </div>
          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <Button className="h-14 w-14 rounded-full bg-white hover:bg-gray-200 text-black shadow-lg" onClick={capture}>
              <Camera className="w-6 h-6" />
            </Button>
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full"
              onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}>
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── OCR Engine ───────────────────────────────────────────────────────────
async function runOCR(imageDataUrl: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(imageDataUrl);
  await worker.terminate();
  return text;
}

// ─── Simple text parser to extract structured data from OCR text ──────────
function parseOCRText(text: string): ExtractedData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: ExtractedData = {};

  // Try to find amounts (numbers with decimals)
  const amountRegex = /[\$€£]?\s*(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2}))/g;
  const amounts: number[] = [];
  let match;
  while ((match = amountRegex.exec(text)) !== null) {
    amounts.push(parseFloat(match[1].replace(/,/g, '')));
  }
  if (amounts.length > 0) {
    const sorted = [...amounts].sort((a, b) => b - a);
    result.total_amount = sorted[0];
    if (sorted.length > 1) result.subtotal = sorted[1];
    if (sorted.length > 2) result.tax_amount = sorted[2];
  }

  // Try to find dates
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g;
  const dates: string[] = [];
  while ((match = dateRegex.exec(text)) !== null) {
    dates.push(match[1]);
  }
  if (dates.length > 0) result.document_date = dates[0];
  if (dates.length > 1) result.due_date = dates[1];

  // Try to find invoice/PO number
  const invNumRegex = /(?:inv(?:oice)?|po|receipt|bill|ref)[\s#:.-]*([A-Z0-9][\w-]{2,20})/i;
  const invMatch = text.match(invNumRegex);
  if (invMatch) result.document_number = invMatch[1];

  // Try to find email
  const emailRegex = /[\w.-]+@[\w.-]+\.\w{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) result.vendor_email = emailMatch[0];

  // Try to find phone
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) result.vendor_phone = phoneMatch[0];

  // First non-empty line as vendor name (heuristic)
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length < 60 && !firstLine.match(/^\d/)) {
      result.vendor_name = firstLine;
    }
  }

  return result;
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DocumentScanner() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [docType, setDocType] = useState<'invoice' | 'receipt' | 'purchase_order'>('invoice');
  const [showCamera, setShowCamera] = useState(false);
  const [activeTab, setActiveTab] = useState('scan');
  const [creating, setCreating] = useState(false);

  // Scan history from DB
  const { data: historyData, isLoading: historyLoading } = useTenantQuery('scanned_documents');
  const deleteDoc = useTenantDelete('scanned_documents');
  const history = historyData ?? [];

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
    setOcrText('');
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleCameraCapture = (capturedFile: File, capturedPreview: string) => {
    setFile(capturedFile);
    setPreview(capturedPreview);
    setShowCamera(false);
    setExtracted(null);
    setOcrText('');
    toast.success('Photo captured! Click "Extract Data" to scan the document.');
  };

  const handleExtract = async () => {
    if (!file && !isDemo) return;
    setExtracting(true);
    setOcrProgress('Initializing OCR engine...');

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      const demoText = 'Acme Supplies Co.\nbilling@acmesupplies.com\n+1 (555) 234-5678\nInvoice #INV-2024-04521\nDate: 04/01/2026\nDue: 05/01/2026\nOffice Chairs (x10) $1,850.00\nStanding Desks (x2) $600.00\nSubtotal: $2,450.00\nTax (8%): $196.00\nTotal: $2,646.00';
      setOcrText(demoText);
      setExtracted({
        vendor_name: 'Acme Supplies Co.',
        vendor_email: 'billing@acmesupplies.com',
        vendor_phone: '+1 (555) 234-5678',
        document_number: 'INV-2024-04521',
        document_date: '04/01/2026',
        due_date: '05/01/2026',
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
      setOcrProgress('');
      return;
    }

    try {
      // Step 1: Try AI parser first (Supabase Edge Function)
      let aiSuccess = false;
      try {
        const base64 = preview?.split(',')[1];
        const { data, error } = await supabase.functions.invoke('ai-document-parser', {
          body: { imageBase64: base64, documentType: docType },
        });
        if (!error && !data?.error && data?.extracted) {
          setExtracted(data.extracted);
          setOcrText(data.rawText || JSON.stringify(data.extracted, null, 2));
          aiSuccess = true;
          toast.success('Document parsed with AI successfully');
        }
      } catch {
        // AI parser not available, fall back to OCR
      }

      // Step 2: Fall back to local Tesseract.js OCR
      if (!aiSuccess && preview) {
        setOcrProgress('Loading OCR engine (first time may take a moment)...');
        const text = await runOCR(preview);
        setOcrText(text);
        setOcrProgress('Parsing extracted text...');
        const parsed = parseOCRText(text);
        setExtracted(parsed);
        toast.success('Text extracted via OCR. Review and edit the parsed data.');
      }

      // Save to DB
      if (tenant?.id) {
        await (supabase.from as any)('scanned_documents').insert({
          tenant_id: tenant.id,
          file_name: file?.name || 'camera-capture.jpg',
          document_type: docType,
          extracted_data: extracted || {},
          ocr_text: ocrText,
          source: showCamera ? 'camera' : 'upload',
          status: 'processed',
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to parse document');
    } finally {
      setExtracting(false);
      setOcrProgress('');
    }
  };

  const createRecord = async (type: 'invoice' | 'purchase_order') => {
    if (!extracted || !tenant?.id) {
      toast.error(isDemo ? 'Record creation disabled in demo mode' : 'No extracted data available');
      return;
    }
    setCreating(true);
    try {
      if (type === 'invoice') {
        const invNum = `INV-SCAN-${Date.now().toString(36).toUpperCase()}`;
        const subtotal = extracted.subtotal ?? extracted.line_items?.reduce((s, l) => s + l.amount, 0) ?? 0;
        const taxRate = extracted.tax_rate ?? 0;
        const taxAmount = extracted.tax_amount ?? subtotal * taxRate / 100;
        const totalAmount = extracted.total_amount ?? subtotal + taxAmount;

        const { data: inv, error: invErr } = await (supabase as any).from('invoices').insert({
          tenant_id: tenant.id,
          invoice_number: invNum,
          customer_name: extracted.vendor_name || 'Scanned Document',
          issue_date: extracted.document_date || new Date().toISOString().slice(0, 10),
          due_date: extracted.due_date || null,
          subtotal, tax_rate: taxRate, tax_amount: taxAmount, total_amount: totalAmount,
          status: 'draft',
          notes: `Auto-created from scanned document: ${file?.name || 'unknown'}. Ref: ${extracted.document_number || 'N/A'}`,
        }).select('id').single();
        if (invErr) throw invErr;

        if (inv?.id && extracted.line_items?.length) {
          const lines = extracted.line_items.map((li, idx) => ({
            tenant_id: tenant.id, invoice_id: inv.id,
            description: li.description, quantity: li.quantity,
            unit_price: li.unit_price, amount: li.amount, sort_order: idx,
          }));
          await (supabase as any).from('invoice_lines').insert(lines);
        }
        toast.success(`Invoice ${invNum} created with ${extracted.line_items?.length || 0} line items`);

      } else if (type === 'purchase_order') {
        const poNum = `PO-SCAN-${Date.now().toString(36).toUpperCase()}`;
        const subtotal = extracted.subtotal ?? extracted.line_items?.reduce((s, l) => s + l.amount, 0) ?? 0;
        const taxRate = extracted.tax_rate ?? 0;
        const taxAmount = extracted.tax_amount ?? subtotal * taxRate / 100;
        const totalAmount = extracted.total_amount ?? subtotal + taxAmount;

        const { data: po, error: poErr } = await (supabase as any).from('purchase_orders').insert({
          tenant_id: tenant.id, po_number: poNum,
          supplier_name: extracted.vendor_name || 'Scanned Vendor',
          order_date: extracted.document_date || new Date().toISOString().slice(0, 10),
          expected_delivery: extracted.due_date || null,
          subtotal, tax_rate: taxRate, tax_amount: taxAmount, total_amount: totalAmount,
          status: 'draft',
          notes: `Auto-created from scanned document: ${file?.name || 'unknown'}. Ref: ${extracted.document_number || 'N/A'}`,
        }).select('id').single();
        if (poErr) throw poErr;

        if (po?.id && extracted.line_items?.length) {
          const lines = extracted.line_items.map((li, idx) => ({
            tenant_id: tenant.id, purchase_order_id: po.id,
            description: li.description, quantity: li.quantity,
            unit_price: li.unit_price, amount: li.amount, sort_order: idx,
          }));
          await (supabase as any).from('purchase_order_lines').insert(lines);
        }
        toast.success(`Purchase Order ${poNum} created with ${extracted.line_items?.length || 0} line items`);
      }
    } catch (err: any) {
      console.error('[createRecord]', err);
      toast.error(err.message || `Failed to create ${type}`);
    } finally {
      setCreating(false);
    }
  };

  const copyOCRText = () => {
    navigator.clipboard.writeText(ocrText);
    toast.success('OCR text copied to clipboard');
  };

  return (
    <AppLayout title="Document Scanner" subtitle="Scan, capture, and extract text from documents">
      <div className="max-w-6xl">
        <PageHeader
          title="Document Scanner"
          subtitle="Scan documents with your camera or upload files — AI + OCR extracts text and data automatically"
          icon={ScanLine}
          iconColor="text-violet-600"
          breadcrumb={[{ label: 'Tools' }, { label: 'Document Scanner' }]}
          badge={{ label: 'OCR + AI', variant: 'secondary' }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="scan" className="gap-1.5"><ScanLine className="w-3.5 h-3.5" /> Scan</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> History
              {history.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{history.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left: Upload / Camera */}
              <div className="space-y-4">
                {showCamera ? (
                  <Card className="border-border rounded-xl overflow-hidden">
                    <CameraCapture
                      onCapture={handleCameraCapture}
                      onClose={() => setShowCamera(false)}
                    />
                  </Card>
                ) : (
                  <Card className="border-border rounded-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Capture or Upload Document</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Source buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2 h-12" onClick={() => setShowCamera(true)}>
                          <Camera className="w-5 h-5 text-indigo-600" />
                          <div className="text-left">
                            <p className="text-xs font-medium">Camera</p>
                            <p className="text-[10px] text-muted-foreground">Scan with device camera</p>
                          </div>
                        </Button>
                        <Button variant="outline" className="gap-2 h-12" onClick={() => document.getElementById('file-input')?.click()}>
                          <Upload className="w-5 h-5 text-emerald-600" />
                          <div className="text-left">
                            <p className="text-xs font-medium">Upload</p>
                            <p className="text-[10px] text-muted-foreground">From file system</p>
                          </div>
                        </Button>
                      </div>

                      {/* Document type selector */}
                      <div className="flex gap-2">
                        {(['invoice', 'receipt', 'purchase_order'] as const).map(t => (
                          <button key={t} onClick={() => setDocType(t)}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                              docType === t
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            )}>
                            {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </button>
                        ))}
                      </div>

                      {/* Drop zone / Preview */}
                      <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => !preview && document.getElementById('file-input')?.click()}
                        className={cn(
                          'relative border-2 border-dashed rounded-xl transition-colors',
                          !preview && 'cursor-pointer',
                          dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-border hover:border-indigo-400 hover:bg-muted/50',
                        )}>
                        {preview ? (
                          <div className="relative">
                            <img src={preview} alt="Document preview" className="w-full rounded-xl object-contain max-h-64" />
                            <button
                              onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setExtracted(null); setOcrText(''); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center px-6 py-10">
                            <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm font-medium text-foreground">Drop document here or click to browse</p>
                            <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, PDF</p>
                          </div>
                        )}
                        <input id="file-input" type="file" className="hidden" accept="image/*,.pdf"
                          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                      </div>

                      {(file || isDemo) && (
                        <Button className="w-full gap-2" onClick={handleExtract} disabled={extracting}>
                          {extracting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> {ocrProgress || 'Analyzing...'}</>
                          ) : (
                            <><ScanLine className="w-4 h-4" /> Extract Data</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* OCR Raw Text Output */}
                {ocrText && (
                  <Card className="border-border rounded-xl">
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" /> Extracted Text (OCR)
                      </CardTitle>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={copyOCRText}>
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-foreground">
                        {ocrText}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Extracted structured data */}
              <div className="space-y-4">
                <Card className="border-border rounded-xl">
                  <CardHeader className="pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Parsed Data
                    </CardTitle>
                    {extracted && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => createRecord('invoice')} disabled={creating}>
                          {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Create Invoice
                        </Button>
                        <Button size="sm" className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => createRecord('purchase_order')} disabled={creating}>
                          {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create PO
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {extracting ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : extracted ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document Information</h4>
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
                          {extracted.total_amount !== undefined && (
                            <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5">
                              <span>Total</span>
                              <span className="text-indigo-600">{formatMoney(extracted.total_amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={ScanLine}
                        title="No document scanned yet"
                        description="Use the camera or upload a file, then click Extract Data to see parsed results."
                        size="sm"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="border-border rounded-xl">
              <CardContent className="p-0">
                {historyLoading ? (
                  <div className="p-6 space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : history.length === 0 ? (
                  <div className="p-12 text-center">
                    <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No scanned documents yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left px-4 py-3 font-medium">File</th>
                          <th className="text-left px-4 py-3 font-medium">Type</th>
                          <th className="text-left px-4 py-3 font-medium">Source</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Date</th>
                          <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {history.map((doc: any) => (
                          <motion.tr key={doc.id} className="hover:bg-accent/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <td className="px-4 py-3 font-medium text-foreground">{doc.file_name || 'Unknown'}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px]">
                                {(doc.document_type || 'other').replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{doc.source || 'upload'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={doc.status === 'processed' ? 'default' : 'secondary'} className="text-[10px]">
                                {doc.status || 'pending'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteDoc.mutate(doc.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
