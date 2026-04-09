import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Lock, User, Briefcase, ArrowRight, Phone, ArrowLeft,
  CheckCircle2, Building2, Shield, Eye, EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import telaLogo from '@/assets/tela-erp-logo.png';
import { toast } from 'sonner';
import type { UserRole } from '@/types/erp';

/* ------------------------------------------------------------------ */
/*  Two-step signup:                                                   */
/*  Step 1 → Company/Business Name + Phone (mandatory)                */
/*  Step 2 → Full Name, Email, Password  OR  Google / Apple OAuth     */
/* ------------------------------------------------------------------ */

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const [form, setForm] = useState({
    companyName: '',
    phone: '',
    fullName: '',
    email: '',
    password: '',
    accountType: 'admin' as UserRole,
  });

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  /* ---------- Step 1 validation ---------- */
  const canProceedToStep2 = form.companyName.trim().length >= 2 && form.phone.trim().length >= 6;

  const handleStep1Continue = () => {
    if (!form.companyName.trim()) { toast.error('Business / Company name is required'); return; }
    if (form.phone.trim().length < 6) { toast.error('Please enter a valid phone number'); return; }
    setStep(2);
  };

  /* ---------- Email / password submit ---------- */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName, form.companyName, form.accountType, form.phone);
      toast.success('Account created! Check your email to verify.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- OAuth (Google / Apple) ---------- */
  const handleOAuth = async (provider: 'google' | 'apple') => {
    // Store business info in sessionStorage (cleared on tab close; not persisted to disk)
    // Phone number especially should not be in persistent localStorage
    sessionStorage.setItem('tela_signup_company', form.companyName);
    sessionStorage.setItem('tela_signup_phone', form.phone);
    sessionStorage.setItem('tela_signup_role', form.accountType);

    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error((error as any).message || `${provider} sign-up failed`);
    } catch {
      toast.error(`${provider} sign-up failed. Please try again.`);
    } finally {
      setOauthLoading(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex">
      <Helmet>
        <title>Get Started Free — TELA-ERP | Create Your Account</title>
        <meta name="description" content="Create your free TELA-ERP account. No credit card required." />
        <link rel="canonical" href="https://tela-erp.com/signup" />
      </Helmet>

      {/* ─── Left decorative panel ─── */}
      <div className="hidden lg:flex lg:w-[45%] items-center justify-center p-12 relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-accent/15 blur-[120px]"
          animate={{ x: [0, 30, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/15 blur-[120px]"
          animate={{ x: [0, -25, 0], y: [0, 35, 0], scale: [1.05, 0.95, 1.05] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating grid dots */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative z-10 text-center max-w-md">
          <motion.img
            src={telaLogo}
            alt="TELA-ERP"
            className="w-48 h-48 object-contain mx-auto mb-8 drop-shadow-[0_20px_60px_rgba(14,165,233,0.25)]"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.h1
            className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] bg-clip-text text-transparent"
            animate={{ backgroundPosition: ['0% center', '200% center'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            Start for Free
          </motion.h1>

          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            Join thousands of businesses managing
            <br />
            <span className="text-accent font-semibold">everything in one place.</span>
          </p>

          {/* Trust signals */}
          <div className="space-y-3 text-left max-w-xs mx-auto">
            {[
              { icon: Shield, text: 'No credit card required' },
              { icon: Building2, text: 'Multi-store & multi-currency' },
              { icon: CheckCircle2, text: 'Works offline — perfect for Africa & Asia' },
            ].map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                className="flex items-center gap-3 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                {text}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src={telaLogo} alt="TELA-ERP" className="w-9 h-9 object-contain" />
            <span className="text-xl font-bold text-foreground">TELA-ERP</span>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>1</div>
            <div className={`flex-1 h-0.5 rounded transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>2</div>
          </div>

          {/* ─── Glass card ─── */}
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-xl p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* ═══════════════ STEP 1: Business Info ═══════════════ */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-xl font-bold text-foreground mb-1">Your Business</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Tell us about your company to get started
                  </p>

                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <Label htmlFor="companyName" className="text-sm font-medium">
                        Business / Company Name <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          value={form.companyName}
                          onChange={e => set('companyName', e.target.value)}
                          placeholder="e.g. Acme Trading Ltd"
                          className="pl-10 h-11 text-base"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={form.phone}
                          onChange={e => set('phone', e.target.value)}
                          placeholder="+254 712 345 678"
                          className="pl-10 h-11 text-base"
                          required
                        />
                      </div>
                    </div>

                    {/* Account Type */}
                    <div>
                      <Label className="text-sm font-medium">Account Type</Label>
                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        {[
                          { value: 'admin', label: 'Business', desc: 'Manage your own business', icon: Building2 },
                          { value: 'reseller', label: 'Reseller', desc: 'Manage multiple clients', icon: Briefcase },
                        ].map(type => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => set('accountType', type.value)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              form.accountType === type.value
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                                : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            }`}
                          >
                            <type.icon className={`w-4 h-4 mb-1.5 ${form.accountType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="text-sm font-semibold text-foreground">{type.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full h-11 text-base font-semibold gradient-primary mt-2"
                      disabled={!canProceedToStep2}
                      onClick={handleStep1Continue}
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ═══════════════ STEP 2: Auth Method ═══════════════ */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to business info
                  </button>

                  <h2 className="text-xl font-bold text-foreground mb-1">Create Your Account</h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    for <span className="font-semibold text-foreground">{form.companyName}</span>
                  </p>

                  {/* ── OAuth buttons ── */}
                  <div className="space-y-2.5 mb-5">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 text-sm font-medium rounded-xl border-border/70 hover:bg-muted/50 transition-all"
                      disabled={oauthLoading !== null}
                      onClick={() => handleOAuth('google')}
                    >
                      {oauthLoading === 'google' ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Continue with Google
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 text-sm font-medium rounded-xl border-border/70 hover:bg-muted/50 transition-all"
                      disabled={oauthLoading !== null}
                      onClick={() => handleOAuth('apple')}
                    >
                      {oauthLoading === 'apple' ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                          </svg>
                          Continue with Apple
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">or sign up with email</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* ── Email form ── */}
                  <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          value={form.fullName}
                          onChange={e => set('fullName', e.target.value)}
                          placeholder="John Doe"
                          className="pl-10 h-11 text-base"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={e => set('email', e.target.value)}
                          placeholder="you@company.com"
                          className="pl-10 h-11 text-base"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => set('password', e.target.value)}
                          placeholder="Min. 6 characters"
                          className="pl-10 pr-10 h-11 text-base"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {form.password.length > 0 && form.password.length < 8 && (
                        <p className="text-[11px] text-destructive mt-1">Password must be at least 8 characters</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold gradient-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating account...
                        </span>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                    By creating an account, you agree to our{' '}
                    <a href="/terms" className="underline hover:text-foreground">Terms of Service</a> and{' '}
                    <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
