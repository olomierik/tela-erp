import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User,
  Users,
  Building2,
  Building,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useModules, INDUSTRY_PRESETS, ALL_MODULES, type ModuleKey, MODULE_LABELS } from '@/contexts/ModulesContext';
import { useAuth } from '@/contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRY_ORDER = [
  'retail', 'manufacturing', 'services', 'hospitality', 'healthcare',
  'construction', 'logistics', 'ecommerce', 'nonprofit', 'agriculture',
  'realestate', 'technology', 'general',
] as const;

type TeamSize = 'solo' | 'small' | 'medium' | 'large';

const TEAM_SIZES: { key: TeamSize; label: string; description: string; Icon: React.ElementType }[] = [
  { key: 'solo',   label: 'Solo',   description: '1 person',      Icon: User      },
  { key: 'small',  label: 'Small',  description: '2–20 people',   Icon: Users     },
  { key: 'medium', label: 'Medium', description: '21–100 people', Icon: Building2 },
  { key: 'large',  label: 'Large',  description: '100+ people',   Icon: Building  },
];

const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  finance:       'Invoices, bills, payments, budgets, journal entries',
  sales:         'Leads, customers, quotes, and sales orders',
  procurement:   'Vendors, purchase orders, goods receipt',
  inventory:     'Products, stock, warehouses, transfers',
  hr:            'Employees, payroll, attendance, leave',
  manufacturing: 'BOMs, production orders, work centers, quality',
  projects:      'Projects, tasks, timesheets',
  assets:        'Asset register and depreciation',
  expenses:      'Employee expense claims and approvals',
  helpdesk:      'Customer support tickets',
  fleet:         'Vehicles, services, fuel logs',
  maintenance:   'Equipment register and maintenance requests',
  marketing:     'Mailing lists and email campaigns',
  subscriptions: 'Recurring billing and subscription management',
  pos:           'Point of sale sessions and orders',
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <p className="text-sm text-muted-foreground text-center mt-8">
      Step {step} of 3
    </p>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / 3) * 100);
  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-border z-50">
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex flex-col items-center mb-10">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
        <span className="text-primary-foreground font-bold text-sm tracking-tight">ERP</span>
      </div>
      <span className="text-xl font-bold text-foreground tracking-tight">myERP</span>
    </div>
  );
}

// ─── Animated Step Wrapper ────────────────────────────────────────────────────

function StepWrapper({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
        position: visible ? 'relative' : 'absolute',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { completeOnboarding } = useModules();

  const [step,              setStep]              = useState<1 | 2 | 3>(1);
  const [selectedIndustry,  setSelectedIndustry]  = useState<string | null>(null);
  const [selectedTeamSize,  setSelectedTeamSize]  = useState<TeamSize | null>(null);
  const [selectedModules,   setSelectedModules]   = useState<ModuleKey[]>([]);
  const [submitting,        setSubmitting]        = useState(false);

  // When an industry is picked, seed the module selection from its preset
  function handleIndustrySelect(key: string) {
    setSelectedIndustry(key);
    setSelectedModules([...INDUSTRY_PRESETS[key].modules]);
  }

  function handleNext() {
    if (step === 1 && selectedIndustry) setStep(2);
    else if (step === 2 && selectedTeamSize) setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function toggleModule(key: ModuleKey) {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key],
    );
  }

  async function handleGetStarted() {
    if (!selectedIndustry) return;
    setSubmitting(true);
    try {
      await completeOnboarding(selectedIndustry, selectedModules);
      toast.success('Welcome to myERP! Your workspace is ready.');
      navigate('/');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // Derive first name for greeting
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ProgressBar step={step} />

      <div className="max-w-4xl mx-auto px-4 py-12 w-full flex-1 flex flex-col">
        <Logo />

        {/* ── Step 1: Industry ── */}
        <StepWrapper visible={step === 1}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              {firstName ? `Welcome, ${firstName}! Let's set up your workspace` : "Let's set up your workspace"}
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Tell us about your business so we can activate the right tools
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {INDUSTRY_ORDER.map(key => {
              const preset  = INDUSTRY_PRESETS[key];
              const selected = selectedIndustry === key;
              return (
                <button
                  key={key}
                  onClick={() => handleIndustrySelect(key)}
                  className={cn(
                    'group relative text-left p-4 rounded-xl border-2 transition-all duration-150 bg-card hover:shadow-md',
                    selected
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  {selected && (
                    <span className="absolute top-2.5 right-2.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </span>
                  )}
                  <div className="text-2xl mb-2 leading-none">{preset.icon}</div>
                  <div className={cn('font-semibold text-sm mb-0.5', selected ? 'text-primary' : 'text-foreground')}>
                    {preset.label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug line-clamp-2">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!selectedIndustry}
              size="lg"
              className="min-w-32 gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <StepIndicator step={1} />
        </StepWrapper>

        {/* ── Step 2: Team Size ── */}
        <StepWrapper visible={step === 2}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              How big is your team?
            </h1>
            <p className="text-muted-foreground text-base">
              This helps us tailor your setup experience
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-xl mx-auto w-full">
            {TEAM_SIZES.map(({ key, label, description, Icon }) => {
              const selected = selectedTeamSize === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTeamSize(key)}
                  className={cn(
                    'flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-150 bg-card hover:shadow-md text-left',
                    selected
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={cn('font-semibold text-sm', selected ? 'text-primary' : 'text-foreground')}>
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                  {selected && (
                    <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} size="lg" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedTeamSize}
              size="lg"
              className="min-w-32 gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <StepIndicator step={2} />
        </StepWrapper>

        {/* ── Step 3: Modules ── */}
        <StepWrapper visible={step === 3}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              Your recommended apps
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Based on your industry. You can change these anytime in Settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {ALL_MODULES.map(key => {
              const active = selectedModules.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleModule(key)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-150 text-left',
                    active
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                      : 'border-border bg-card opacity-60 hover:opacity-80 hover:border-border',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {active
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <Circle className="w-5 h-5" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className={cn(
                      'font-semibold text-sm leading-snug',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {MODULE_LABELS[key]}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {MODULE_DESCRIPTIONS[key]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} size="lg" className="gap-2" disabled={submitting}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={handleGetStarted}
              disabled={submitting || selectedModules.length === 0}
              size="lg"
              className="min-w-36 gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
                : <>Get Started <ArrowRight className="w-4 h-4" /></>
              }
            </Button>
          </div>
          <StepIndicator step={3} />
        </StepWrapper>
      </div>
    </div>
  );
}
