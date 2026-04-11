import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Building2, Users, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useModules,
  INDUSTRY_PRESETS,
  MODULE_LABELS,
  ALL_MODULES,
  ModuleKey,
} from '@/contexts/ModulesContext';
import { useTenantApps } from '@/hooks/use-tenant-apps';
import { moduleKeysToAppKeys } from '@/lib/app-registry';

const BUSINESS_SIZES = [
  { key: 'solo', label: 'Solo / Freelancer', description: '1 person — just you running the show', icon: '👤' },
  { key: 'small', label: 'Small Business', description: '2–20 employees', icon: '🏪' },
  { key: 'medium', label: 'Medium Business', description: '21–200 employees', icon: '🏢' },
  { key: 'enterprise', label: 'Enterprise', description: '200+ employees across teams', icon: '🏙️' },
];

const STEPS = ['Industry', 'Business Size', 'Modules'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useModules();
  const { installApp } = useTenantApps();

  const [step, setStep] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const handleIndustrySelect = (key: string) => {
    setSelectedIndustry(key);
    const preset = INDUSTRY_PRESETS[key];
    setSelectedModules(preset?.modules ?? ALL_MODULES);
  };

  const toggleModule = (key: ModuleKey) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const handleFinish = () => {
    completeOnboarding(selectedIndustry || 'general', selectedModules);
    // Auto-install the selected modules as apps in the tenant
    const appKeys = moduleKeysToAppKeys(selectedModules);
    appKeys.forEach(appKey => {
      installApp.mutate(appKey);
    });
    navigate('/dashboard');
  };

  const canAdvance = () => {
    if (step === 0) return !!selectedIndustry;
    if (step === 1) return !!selectedSize;
    if (step === 2) return selectedModules.length > 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-5 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-indigo-200" />
              <span className="font-bold text-xl tracking-tight">Tela ERP</span>
            </div>
            <span className="text-sm text-indigo-200">Setup Wizard</span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-3 mb-4">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  i < step
                    ? 'bg-white border-white text-indigo-600'
                    : i === step
                    ? 'bg-white/20 border-white text-white'
                    : 'bg-transparent border-white/40 text-white/50'
                )}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  i === step ? 'text-white' : i < step ? 'text-indigo-200' : 'text-white/40'
                )}>{label}</span>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-white/30 ml-1" />}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-10 px-6">
        <div className="max-w-4xl mx-auto">

          {/* Step 0: Industry */}
          {step === 0 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">What industry are you in?</h1>
                <p className="text-muted-foreground text-lg">We'll pre-select the best modules for your business type.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleIndustrySelect(key)}
                    className={cn(
                      'group text-left rounded-xl border-2 p-4 transition-all hover:shadow-md',
                      selectedIndustry === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md'
                        : 'border-border bg-white dark:bg-slate-900 hover:border-indigo-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            'font-semibold text-sm',
                            selectedIndustry === key ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'
                          )}>{preset.label}</p>
                          {selectedIndustry === key && (
                            <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{preset.description}</p>
                        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1.5 font-medium">
                          {preset.modules.length} modules
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Business Size */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">How big is your business?</h1>
                <p className="text-muted-foreground text-lg">This helps us tailor features and defaults to your scale.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {BUSINESS_SIZES.map(size => (
                  <button
                    key={size.key}
                    onClick={() => setSelectedSize(size.key)}
                    className={cn(
                      'group text-left rounded-xl border-2 p-5 transition-all hover:shadow-md',
                      selectedSize === size.key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md'
                        : 'border-border bg-white dark:bg-slate-900 hover:border-indigo-300'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{size.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            'font-semibold',
                            selectedSize === size.key ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'
                          )}>{size.label}</p>
                          {selectedSize === size.key && (
                            <Check className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{size.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Modules */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Choose your modules</h1>
                <p className="text-muted-foreground text-lg">
                  We've pre-selected modules based on your industry. Toggle any on or off.
                </p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-indigo-600">{selectedModules.length}</span> of {ALL_MODULES.length} modules active
                  </span>
                  <button
                    onClick={() => setSelectedModules(ALL_MODULES)}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() => setSelectedModules([])}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALL_MODULES.map(key => {
                  const active = selectedModules.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleModule(key)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all text-left',
                        active
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-border bg-white dark:bg-slate-900 opacity-60 hover:opacity-100 hover:border-slate-300'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-medium',
                        active ? 'text-indigo-700 dark:text-indigo-300' : 'text-muted-foreground'
                      )}>
                        {MODULE_LABELS[key]}
                      </span>
                      {active
                        ? <ToggleRight className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        : <ToggleLeft className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t border-border bg-white dark:bg-slate-900 px-6 py-4 shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canAdvance()}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <Zap className="w-4 h-4" /> Launch My ERP
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
