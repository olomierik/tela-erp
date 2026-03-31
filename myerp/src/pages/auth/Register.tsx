import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Boxes, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-destructive' };
  if (score <= 2) return { level: 2, label: 'Medium', color: 'bg-warning' };
  return { level: 3, label: 'Strong', color: 'bg-success' };
}

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ company: '', name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(form.password);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.company.trim()) errs.company = 'Company name is required';
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!form.confirm) errs.confirm = 'Please confirm your password';
    else if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    if (!agreed) errs.terms = 'You must agree to the Terms of Service';

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    const { error } = await signUp(form.email, form.password, form.name.trim(), form.company.trim());
    setLoading(false);

    if (error) {
      setErrors({ general: error });
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">myERP</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your account</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 p-8">

          {errors.general && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Company */}
            <Field label="Company Name" error={errors.company}>
              <TextInput
                id="company" placeholder="Acme Corp" value={form.company}
                onChange={set('company')} hasError={!!errors.company}
              />
            </Field>

            {/* Full Name */}
            <Field label="Your Full Name" error={errors.name}>
              <TextInput
                id="name" placeholder="Jane Smith" value={form.name}
                onChange={set('name')} hasError={!!errors.name}
              />
            </Field>

            {/* Email */}
            <Field label="Email" error={errors.email}>
              <TextInput
                id="email" type="email" autoComplete="email"
                placeholder="you@company.com" value={form.email}
                onChange={set('email')} hasError={!!errors.email}
              />
            </Field>

            {/* Password */}
            <Field label="Password" error={errors.password}>
              <div className="relative">
                <TextInput
                  id="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')}
                  hasError={!!errors.password} extraClass="pr-9"
                />
                <ToggleEye show={showPassword} onToggle={() => setShowPassword(v => !v)} />
              </div>
              {form.password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          strength.level >= i ? strength.color : 'bg-border',
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn('text-xs', strength.level === 1 && 'text-destructive', strength.level === 2 && 'text-warning', strength.level === 3 && 'text-success')}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password" error={errors.confirm}>
              <div className="relative">
                <TextInput
                  id="confirm" type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Repeat password"
                  value={form.confirm} onChange={set('confirm')}
                  hasError={!!errors.confirm} extraClass="pr-9"
                />
                <ToggleEye show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
              </div>
            </Field>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-input accent-primary shrink-0"
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-destructive mt-1 ml-6">{errors.terms}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TextInput({
  id, type = 'text', placeholder, value, onChange, hasError, autoComplete, extraClass,
}: {
  id: string; type?: string; placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasError?: boolean; autoComplete?: string; extraClass?: string;
}) {
  return (
    <input
      id={id} type={type} placeholder={placeholder} value={value}
      onChange={onChange} autoComplete={autoComplete}
      className={cn(
        'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        hasError ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
        extraClass,
      )}
    />
  );
}

function ToggleEye({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
