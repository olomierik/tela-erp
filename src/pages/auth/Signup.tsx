import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Briefcase, ArrowRight } from 'lucide-react';
import telaLogo from '@/assets/tela-erp-logo.png';
import { toast } from 'sonner';
import type { UserRole } from '@/types/erp';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
    accountType: 'admin' as UserRole,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName, form.companyName, form.accountType);
      toast.success('Account created! Check your email to verify.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(220,30%,15%)] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <img src={telaLogo} alt="TELA-ERP" className="w-48 h-48 object-contain mx-auto mb-8 drop-shadow-2xl" />
          <h1 className="text-4xl font-bold text-white mb-4">Get Started</h1>
          <p className="text-white/70 text-lg">
            Create your business account and start managing everything in one place.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={telaLogo} alt="TELA-ERP" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold text-foreground">TELA-ERP</h1>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Create your account</h2>
          <p className="text-muted-foreground mb-8">Start your 14-day free trial</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <div className="relative mt-1.5">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Acme Corp"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Account Type</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                {[
                  { value: 'admin', label: 'Business', desc: 'Manage your own business' },
                  { value: 'reseller', label: 'Reseller', desc: 'Manage multiple clients' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, accountType: type.value as UserRole })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.accountType === type.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full gradient-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
