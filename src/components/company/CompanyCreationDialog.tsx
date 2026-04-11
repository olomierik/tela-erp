import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2, Factory, Wrench, ShoppingBag, HardHat, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BUSINESS_TYPES = [
  { value: 'trading', label: 'Trading', icon: Building2, desc: 'Buy & sell goods' },
  { value: 'manufacturing', label: 'Manufacturing', icon: Factory, desc: 'Produce finished goods' },
  { value: 'service', label: 'Service', icon: Wrench, desc: 'Consulting, professional services' },
  { value: 'retail', label: 'Retail', icon: ShoppingBag, desc: 'POS, walk-in customers' },
  { value: 'construction', label: 'Construction', icon: HardHat, desc: 'Projects, contracts, WIP' },
  { value: 'logistics', label: 'Logistics', icon: Truck, desc: 'Fleet, freight, delivery' },
] as const;

const CURRENCIES = ['TZS', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'ZAR', 'INR'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyCreated?: (tenantId: string) => void;
}

export default function CompanyCreationDialog({ open, onOpenChange, onCompanyCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');

  // Form state
  const [businessType, setBusinessType] = useState('trading');
  const [companyName, setCompanyName] = useState('');
  const [tin, setTin] = useState('');
  const [vrn, setVrn] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [fyStart, setFyStart] = useState(new Date().getFullYear() + '-01-01');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const reset = () => {
    setStep(1);
    setCreating(false);
    setCreated(false);
    setNewTenantId('');
    setBusinessType('trading');
    setCompanyName('');
    setTin('');
    setVrn('');
    setCurrency('TZS');
    setFyStart(new Date().getFullYear() + '-01-01');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  const handleCreate = async () => {
    if (!companyName.trim()) { toast.error('Company name is required'); return; }
    if (!user?.id) { toast.error('You must be logged in'); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_company', {
        _user_id: user.id,
        _company_name: companyName.trim(),
        _business_type: businessType,
        _tin: tin.trim(),
        _vrn: vrn.trim(),
        _currency: currency,
        _financial_year_start: fyStart,
        _email: email.trim(),
        _phone: phone.trim(),
        _address: address.trim(),
      });

      if (error) throw error;

      setNewTenantId(data as string);
      setCreated(true);
      setStep(3);
      toast.success(`${companyName} created with full accounting setup!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = () => {
    // Flag this as a new company so onboarding shows the industry selector
    localStorage.setItem('tela_new_company', 'true');
    onCompanyCreated?.(newTenantId);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {step === 3 ? 'Company Created!' : 'Create New Company'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Select your business type to get a customized accounting setup.'}
            {step === 2 && 'Fill in your company details.'}
            {step === 3 && 'Your company is ready with a full Chart of Accounts.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted'
            )} />
          ))}
        </div>

        {/* Step 1: Business Type */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map(bt => {
                const Icon = bt.icon;
                return (
                  <button
                    key={bt.value}
                    onClick={() => setBusinessType(bt.value)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                      businessType === bt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', businessType === bt.value ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <p className="text-sm font-medium">{bt.label}</p>
                      <p className="text-xs text-muted-foreground">{bt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setStep(2)} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Company Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Trading Ltd" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>TIN</Label>
                <Input value={tin} onChange={e => setTin(e.target.value)} placeholder="Tax ID Number" />
              </div>
              <div className="space-y-1.5">
                <Label>VRN</Label>
                <Input value={vrn} onChange={e => setVrn(e.target.value)} placeholder="VAT Reg Number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Financial Year Start</Label>
                <Input type="date" value={fyStart} onChange={e => setFyStart(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="info@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255 7XX XXX XXX" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Region" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={handleCreate} disabled={creating || !companyName.trim()} className="flex-1 gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && created && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-semibold">{companyName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Business type: <span className="font-medium capitalize">{businessType}</span> · Currency: {currency}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-left space-y-1">
              <p className="font-medium text-foreground">✅ Auto-initialized:</p>
              <p className="text-muted-foreground">• Chart of Accounts ({businessType} template)</p>
              <p className="text-muted-foreground">• System ledgers (Cash, Bank, AR, AP, Capital)</p>
              <p className="text-muted-foreground">• Account mappings for all modules</p>
              <p className="text-muted-foreground">• VAT accounts (18%)</p>
            </div>
            <Button onClick={handleSwitch} className="w-full gap-2">
              <ArrowRight className="w-4 h-4" /> Switch to {companyName}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
