import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Lock, Mail, ArrowRight, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function DesktopSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { session, error } = await window.electronAPI.authSignup({
        email:       form.email,
        password:    form.password,
        fullName:    form.fullName,
        companyName: form.companyName,
      });
      if (error) { toast.error(error); return; }
      if (session) {
        toast.success(`Welcome to TELA ERP, ${form.companyName}!`);
        // Small delay so the auth bootstrap fires before navigating
        setTimeout(() => navigate('/dashboard', { replace: true }), 300);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <Database className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Set up TELA ERP</h1>
          <p className="text-sm text-muted-foreground">
            Your data stays on this device — no internet required.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className={step === 1 ? 'text-primary font-medium' : ''}>1 Company</span>
              <ArrowRight className="w-3 h-3" />
              <span className={step === 2 ? 'text-primary font-medium' : ''}>2 Admin account</span>
            </div>
            <CardTitle className="text-base">
              {step === 1 ? 'Your company' : 'Create admin account'}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? 'Enter your company name to get started.'
                : 'This account lets you sign in to the desktop app.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSetup}
                  className="space-y-4">

              {step === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="Acme Ltd."
                      className="pl-9"
                      value={form.companyName}
                      onChange={set('companyName')}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Your name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Jane Smith"
                        className="pl-9"
                        value={form.fullName}
                        onChange={set('fullName')}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        className="pl-9"
                        value={form.email}
                        onChange={set('email')}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="At least 6 characters"
                        className="pl-9"
                        value={form.password}
                        onChange={set('password')}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repeat password"
                        className="pl-9"
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                {step === 2 && (
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                )}
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Setting up…' : step === 1 ? 'Next' : 'Finish setup'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          All data is stored locally on your computer in a SQLite database.
        </p>
      </div>
    </div>
  );
}
