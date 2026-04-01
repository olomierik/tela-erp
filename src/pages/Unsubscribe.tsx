import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, MailX } from 'lucide-react';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        if (!res.ok) { setStatus('invalid'); return; }
        const data = await res.json();
        setStatus(data.valid === false && data.reason === 'already_unsubscribed' ? 'already' : 'valid');
      } catch { setStatus('invalid'); }
    })();
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      setStatus(error ? 'error' : 'success');
    } catch { setStatus('error'); }
    finally { setSubmitting(false); }
  };

  const content: Record<Status, JSX.Element> = {
    loading: <><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" /><p className="text-muted-foreground mt-4">Validating…</p></>,
    valid: <>
      <MailX className="w-12 h-12 text-primary mx-auto" />
      <h2 className="text-xl font-bold mt-4 text-foreground">Unsubscribe</h2>
      <p className="text-muted-foreground mt-2 mb-6">Are you sure you want to unsubscribe from our emails?</p>
      <Button onClick={handleConfirm} disabled={submitting} variant="destructive">{submitting ? 'Processing…' : 'Confirm Unsubscribe'}</Button>
    </>,
    already: <><CheckCircle className="w-12 h-12 text-muted-foreground mx-auto" /><h2 className="text-xl font-bold mt-4 text-foreground">Already Unsubscribed</h2><p className="text-muted-foreground mt-2">You've already been unsubscribed from our emails.</p></>,
    success: <><CheckCircle className="w-12 h-12 text-green-500 mx-auto" /><h2 className="text-xl font-bold mt-4 text-foreground">Unsubscribed</h2><p className="text-muted-foreground mt-2">You've been successfully unsubscribed.</p></>,
    invalid: <><XCircle className="w-12 h-12 text-destructive mx-auto" /><h2 className="text-xl font-bold mt-4 text-foreground">Invalid Link</h2><p className="text-muted-foreground mt-2">This unsubscribe link is invalid or expired.</p></>,
    error: <><XCircle className="w-12 h-12 text-destructive mx-auto" /><h2 className="text-xl font-bold mt-4 text-foreground">Something went wrong</h2><p className="text-muted-foreground mt-2">Please try again later.</p></>,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full"><CardContent className="p-8 text-center">{content[status]}</CardContent></Card>
    </div>
  );
}
