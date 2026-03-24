import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-reset-otp', {
        body: { email },
      });
      if (error) throw error;
      setSent(true);
      toast.success('Password reset code sent! Check your email.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TELA-ERP</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">
              We've sent a 5-digit reset code to <strong>{email}</strong>
            </p>
            <Link
              to={`/reset-password?email=${encodeURIComponent(email)}`}
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              Enter your code →
            </Link>
            <div className="mt-4">
              <Link to="/login" className="text-sm text-muted-foreground hover:underline flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-1">Reset your password</h2>
            <p className="text-muted-foreground mb-8">Enter your email and we'll send you a 5-digit reset code</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-primary hover:underline flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
