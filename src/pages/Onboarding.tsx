import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Zap, Sparkles, Rocket } from 'lucide-react';
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
  { key: 'solo', label: 'Solo / Freelancer', description: '1 person — just you', icon: '👤' },
  { key: 'small', label: 'Small Business', description: '2–20 employees', icon: '🏪' },
  { key: 'medium', label: 'Medium Business', description: '21–200 employees', icon: '🏢' },
  { key: 'enterprise', label: 'Enterprise', description: '200+ employees', icon: '🏙️' },
];

const STEPS = ['Industry', 'Scale', 'Modules'];

/* --------------------------------- Background --------------------------------- */
function CinematicBackground() {
  // Pre-compute particle positions once
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 6,
        duration: Math.random() * 8 + 8,
      })),
    []
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0A0F1E]">
      {/* Aurora gradients */}
      <div className="absolute -top-1/3 -left-1/4 h-[120vh] w-[120vh] rounded-full bg-[radial-gradient(circle,rgba(0,229,204,0.18),transparent_60%)] blur-3xl" />
      <div className="absolute -bottom-1/3 -right-1/4 h-[120vh] w-[120vh] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.20),transparent_60%)] blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,229,204,0.06),transparent_70%)] blur-2xl" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,204,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,204,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#00E5CC]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: '0 0 8px rgba(0,229,204,0.8)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.9, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------- Orbital progress ring ---------------------------- */
function OrbitRing({ progress, step }: { progress: number; step: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          stroke="url(#ring-grad)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * progress) / 100 }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,204,0.8))' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00E5CC" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-semibold text-white/60 leading-none">STEP</span>
        <span className="text-sm font-bold text-white leading-none">
          {step + 1}/{STEPS.length}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------- Glass card -------------------------------- */
const glassBase =
  'relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-300';

/* ================================ Main page ================================ */
export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useModules();
  const { installApp } = useTenantApps();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);
  const [launching, setLaunching] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const handleIndustrySelect = (key: string) => {
    setSelectedIndustry(key);
    const preset = INDUSTRY_PRESETS[key];
    setSelectedModules(preset?.modules ?? ALL_MODULES);
  };

  const toggleModule = (key: ModuleKey) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const canAdvance = () => {
    if (step === 0) return !!selectedIndustry;
    if (step === 1) return !!selectedSize;
    if (step === 2) return selectedModules.length > 0;
    return false;
  };

  const next = () => {
    if (!canAdvance()) return;
    setDirection(1);
    setStep((s) => s + 1);
  };
  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleFinish = async () => {
    if (!canAdvance() || launching) return;
    setLaunching(true);
    completeOnboarding(selectedIndustry || 'general', selectedModules);
    const appKeys = moduleKeysToAppKeys(selectedModules);
    appKeys.forEach((appKey) => installApp.mutate(appKey));
    // Brief launch animation
    setTimeout(() => navigate('/dashboard'), 1200);
  };

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step < STEPS.length - 1) next();
        else handleFinish();
      } else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedIndustry, selectedSize, selectedModules, launching]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="relative min-h-screen text-white font-sans overflow-hidden">
      <CinematicBackground />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-[#00E5CC] to-[#7C3AED] flex items-center justify-center shadow-[0_0_24px_rgba(0,229,204,0.5)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Tela ERP</p>
            <p className="text-sm font-semibold tracking-tight">Setup Sequence</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all',
                    i < step
                      ? 'bg-[#00E5CC] text-[#0A0F1E]'
                      : i === step
                      ? 'bg-white/20 text-white ring-2 ring-[#00E5CC]/60'
                      : 'bg-white/5 text-white/40'
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium tracking-wide',
                    i === step ? 'text-white' : 'text-white/40'
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && <span className="text-white/20">·</span>}
              </div>
            ))}
          </div>
          <OrbitRing progress={progress} step={step} />
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 px-4 sm:px-6 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            >
              {/* ========== Step 0: Industry ========== */}
              {step === 0 && (
                <section>
                  <StepHeader
                    eyebrow="01 — Identity"
                    title="Your business, unified."
                    subtitle="Pick your industry. We'll calibrate the system for you."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
                    {Object.entries(INDUSTRY_PRESETS).map(([key, preset], idx) => {
                      const active = selectedIndustry === key;
                      return (
                        <motion.button
                          key={key}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleIndustrySelect(key)}
                          className={cn(
                            glassBase,
                            'p-5 text-left group overflow-hidden',
                            active
                              ? 'border-[#00E5CC]/60 shadow-[0_0_40px_-8px_rgba(0,229,204,0.6)] bg-[#00E5CC]/[0.06]'
                              : 'hover:border-white/25 hover:bg-white/[0.06]'
                          )}
                        >
                          {/* Glow corner */}
                          <div
                            className={cn(
                              'pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl transition-opacity duration-500',
                              active
                                ? 'bg-[#00E5CC]/40 opacity-100'
                                : 'bg-[#7C3AED]/30 opacity-0 group-hover:opacity-100'
                            )}
                          />
                          <div className="relative flex items-start gap-3">
                            <span className="text-3xl leading-none">{preset.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold tracking-tight text-white">
                                  {preset.label}
                                </p>
                                {active && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00E5CC]"
                                  >
                                    <Check className="h-3 w-3 text-[#0A0F1E]" />
                                  </motion.div>
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-white/50 line-clamp-2">
                                {preset.description}
                              </p>
                              <p className="mt-2 text-[11px] font-mono uppercase tracking-wider text-[#00E5CC]">
                                {preset.modules.length} modules · ready
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ========== Step 1: Scale ========== */}
              {step === 1 && (
                <section>
                  <StepHeader
                    eyebrow="02 — Scale"
                    title="How big is your operation?"
                    subtitle="We'll tune defaults, limits, and dashboards to your scale."
                  />
                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {BUSINESS_SIZES.map((size, idx) => {
                      const active = selectedSize === size.key;
                      return (
                        <motion.button
                          key={size.key}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedSize(size.key)}
                          className={cn(
                            glassBase,
                            'p-6 text-left group overflow-hidden',
                            active
                              ? 'border-[#7C3AED]/60 shadow-[0_0_40px_-8px_rgba(124,58,237,0.6)] bg-[#7C3AED]/[0.06]'
                              : 'hover:border-white/25 hover:bg-white/[0.06]'
                          )}
                        >
                          <div
                            className={cn(
                              'pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full blur-2xl transition-opacity duration-500',
                              active
                                ? 'bg-[#7C3AED]/40 opacity-100'
                                : 'bg-[#00E5CC]/20 opacity-0 group-hover:opacity-100'
                            )}
                          />
                          <div className="relative flex items-center gap-5">
                            <span className="text-4xl">{size.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-lg font-semibold tracking-tight text-white">
                                  {size.label}
                                </p>
                                {active && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED]"
                                  >
                                    <Check className="h-4 w-4 text-white" />
                                  </motion.div>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm text-white/50">{size.description}</p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ========== Step 2: Modules ========== */}
              {step === 2 && (
                <section>
                  <StepHeader
                    eyebrow="03 — Modules"
                    title="Activate your module universe."
                    subtitle="Each node is a power-up. Toggle any on or off."
                  />

                  <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
                      <span className="font-mono text-sm">
                        <span className="text-[#00E5CC] font-bold">{selectedModules.length}</span>
                        <span className="text-white/40"> / {ALL_MODULES.length} active</span>
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedModules(ALL_MODULES)}
                      className="text-xs font-medium text-[#00E5CC] hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Enable all
                    </button>
                    <button
                      onClick={() => setSelectedModules([])}
                      className="text-xs font-medium text-white/40 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ALL_MODULES.map((key, idx) => {
                      const active = selectedModules.includes(key);
                      return (
                        <motion.button
                          key={key}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.02, type: 'spring', stiffness: 260 }}
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleModule(key)}
                          className={cn(
                            glassBase,
                            'p-4 text-left flex items-center justify-between gap-2 overflow-hidden',
                            active
                              ? 'border-[#00E5CC]/50 bg-[#00E5CC]/[0.07] shadow-[0_0_24px_-8px_rgba(0,229,204,0.6)]'
                              : 'opacity-60 hover:opacity-100 hover:border-white/20'
                          )}
                        >
                          <span
                            className={cn(
                              'text-sm font-medium tracking-tight',
                              active ? 'text-white' : 'text-white/60'
                            )}
                          >
                            {MODULE_LABELS[key]}
                          </span>
                          <motion.div
                            animate={{ scale: active ? 1 : 0.8, opacity: active ? 1 : 0.4 }}
                            className={cn(
                              'h-2.5 w-2.5 rounded-full flex-shrink-0',
                              active
                                ? 'bg-[#00E5CC] shadow-[0_0_10px_rgba(0,229,204,1)]'
                                : 'bg-white/20'
                            )}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[#0A0F1E]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className="gap-1.5 text-white/70 hover:text-white hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-white/40">
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">←</span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">→</span>
            <span>navigate</span>
            <span className="text-white/20">·</span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">enter</span>
            <span>continue</span>
          </div>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={next}
              disabled={!canAdvance()}
              className={cn(
                'gap-1.5 relative overflow-hidden border-0',
                'bg-gradient-to-r from-[#00E5CC] to-[#00B8A8] text-[#0A0F1E] font-semibold',
                'hover:shadow-[0_0_24px_rgba(0,229,204,0.6)] hover:from-[#00E5CC] hover:to-[#00E5CC]',
                'disabled:opacity-40 disabled:shadow-none'
              )}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canAdvance() || launching}
              className={cn(
                'gap-2 relative overflow-hidden border-0 px-6',
                'bg-gradient-to-r from-[#00E5CC] via-[#00C9B8] to-[#7C3AED] text-white font-semibold',
                'hover:shadow-[0_0_32px_rgba(124,58,237,0.7)]',
                'disabled:opacity-40'
              )}
            >
              {launching ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Rocket className="h-4 w-4" />
                  </motion.span>
                  Launching…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Launch Tela
                </>
              )}
            </Button>
          )}
        </div>
      </footer>

      {/* Launch flash */}
      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 8, opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="h-32 w-32 rounded-full bg-gradient-to-br from-[#00E5CC] to-[#7C3AED] blur-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------- Step header ------------------------------- */
function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <motion.p
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] font-mono uppercase tracking-[0.4em] text-[#00E5CC]"
      >
        {eyebrow}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-3 text-base sm:text-lg text-white/50"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
