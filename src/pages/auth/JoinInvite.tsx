import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Lock, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface InviteDetails {
  id: string;
  email: string;
  role: string;
  store_id: string | null;
  store_role: string | null;
  tenant_id: string;
  tenant_name?: string;
  expires_at: string;
}

export default function JoinInvite() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteId) { setInviteError('Invalid invite link.'); setLoadingInvite(false); return; }
    (async () => {
      const { data, error } = await (supabase.from as any)('team_invites')
        .select('id, email, role, store_id, store_role, tenant_id, expires_at')
        .eq('id', inviteId)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        setInviteError('This invite link is invalid or has already been used.');
        setLoadingInvite(false);
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        setInviteError('This invite link has expired. Ask your admin to send a new one.');
        setLoadingInvite(false);
        return;
      }

      // Fetch tenant name
      const { data: tenantData } = await (supabase.from as any)('tenants')
        .select('name')
        .eq('id', data.tenant_id)
        .single();

      setInvite({ ...data, tenant_name: tenantData?.name ?? 'Your Organisation' });
      setLoadingInvite(false);
    })();
  }, [inviteId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (!fullName.trim()) { toast.error('Please enter your full name'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setSubmitting(true);
    try {
      // Sign up with invite metadata — the handle_new_user trigger reads these
      // and auto-creates the profile, sets the role, assigns the store, and marks invite accepted
      const { error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            tenant_id: invite.tenant_id,
            role: invite.role,
            store_id: invite.store_id ?? undefined,
            store_role: invite.store_role ?? undefined,
            invite_id: invite.id,
          },
        },
      });

      if (error) {
        // If user already exists, just sign them in
        if (error.message.toLowerCase().includes('already registered')) {
          await signIn(invite.email, password);
          toast.success('Welcome back! You have been signed in.');
          navigate('/dashboard');
          return;
        }
        throw error;
      }

      // Auto sign-in (if email confirmation is disabled in Supabase)
      try {
        await signIn(invite.email, password);
        toast.success(`Welcome to ${invite.tenant_name}! Your account is ready.`);
        navigate('/dashboard');
      } catch {
        // Email confirmation may be required
        toast.success('Account created! Check your email to confirm, then sign in.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Invite Not Found</h1>
          <p className="text-muted-foreground mb-6">{inviteError}</p>
          <Button asChild variant="outline">
            <Link to="/login">Go to Sign In</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're Invited!</h1>
          <p className="text-muted-foreground mt-1">
            Join <span className="font-semibold text-foreground">{invite?.tenant_name}</span> on TELA-ERP
          </p>
        </div>

        {/* Invite details card */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Invited email:</span>
            <span className="font-medium text-foreground">{invite?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium capitalize text-foreground">{invite?.role}</span>
          </div>
        </div>

        {/* Sign-up form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Your Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="pl-10"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address (fixed by invite)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                value={invite?.email}
                readOnly
                className="pl-10 bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Create a Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="pl-10"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <Button type="submit" className="w-full gradient-primary mt-2" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
            ) : (
              'Accept Invite & Join'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
