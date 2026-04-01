import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, X, ChevronRight, Zap, Shield, Cpu, HelpCircle,
  Users, Globe, BarChart3, Lock, HeadphonesIcon, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const P = 'hsl(230,65%,52%)';
const A = 'hsl(32,95%,52%)';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    badge: 'Free forever',
    badgeColor: 'secondary' as const,
    description: 'Perfect for small teams getting started with ERP.',
    cta: 'Get started free',
    ctaLink: '/signup',
    highlighted: false,
    features: [
      { label: '3 users included', included: true },
      { label: '5 core modules', included: true },
      { label: '1 warehouse', included: true },
      { label: 'Basic reports', included: true },
      { label: 'Community support', included: true },
      { label: 'AI CFO Assistant', included: false },
      { label: 'Multi-currency', included: false },
      { label: 'API access', included: false },
      { label: 'White-label', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 29,
    annualPrice: 23,
    badge: 'Most popular',
    badgeColor: 'default' as const,
    description: 'For growing businesses that need the full suite.',
    cta: 'Start Growth plan',
    ctaLink: '/signup',
    highlighted: true,
    features: [
      { label: '25 users included', included: true },
      { label: 'All 15 modules', included: true },
      { label: '5 warehouses', included: true },
      { label: 'Advanced reports + PDF', included: true },
      { label: 'Email support (48h SLA)', included: true },
      { label: 'AI CFO Assistant', included: true },
      { label: 'Multi-currency (165+)', included: true },
      { label: 'API access', included: true },
      { label: 'White-label', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 99,
    annualPrice: 79,
    badge: 'Full power',
    badgeColor: 'secondary' as const,
    description: 'Unlimited scale with white-labeling and reseller tools.',
    cta: 'Talk to sales',
    ctaLink: '/contact',
    highlighted: false,
    features: [
      { label: 'Unlimited users', included: true },
      { label: 'All 15 modules', included: true },
      { label: 'Unlimited warehouses', included: true },
      { label: 'Custom reports + exports', included: true },
      { label: 'Priority support (4h SLA)', included: true },
      { label: 'AI CFO Assistant', included: true },
      { label: 'Multi-currency (165+)', included: true },
      { label: 'Full API access', included: true },
      { label: 'White-label branding', included: true },
      { label: 'Reseller portal', included: true },
    ],
  },
];

const faqs = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. You can upgrade or downgrade your plan at any time from your billing settings. Upgrades take effect immediately; downgrades apply at the end of your current billing cycle.',
  },
  {
    q: 'What happens when I exceed my user limit?',
    a: 'We will notify you when you approach your limit. You can add extra users at a per-seat rate or upgrade to the next plan — no service interruption either way.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'Yes. All paid plans come with a 14-day free trial — no credit card required. You only start paying after you decide to continue.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual billing is charged once per year at a 20% discount versus the monthly rate. You can still cancel and receive a prorated refund for unused months.',
  },
  {
    q: 'Are there setup or onboarding fees?',
    a: 'No setup fees on Starter or Growth. Enterprise customers receive a complimentary onboarding session with our solutions team at no extra charge.',
  },
];

const allPlansInclude = [
  { icon: Shield, label: 'Row Level Security', desc: 'Your data is fully isolated from all other tenants.' },
  { icon: Globe, label: 'Supabase-powered', desc: 'Reliable, scalable Postgres with real-time sync.' },
  { icon: BarChart3, label: 'Core Analytics', desc: 'Dashboard KPIs and module-level reporting.' },
  { icon: Lock, label: 'Role-based access', desc: 'Owner, admin, and staff roles out of the box.' },
  { icon: Zap, label: 'Real-time updates', desc: 'Live inventory, sales, and financial data.' },
  { icon: HeadphonesIcon, label: 'Community forum', desc: 'Access to our public help center and GitHub issues.' },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: P }}>
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">TELA-ERP</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/modules" className="text-muted-foreground hover:text-foreground transition-colors">Modules</Link>
            <Link to="/pricing" style={{ color: P }}>Pricing</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" style={{ background: P }} className="text-white hover:opacity-90" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-24 text-center relative overflow-hidden" style={{
        background: `linear-gradient(135deg, hsl(230,65%,52%,0.08) 0%, transparent 50%, hsl(32,95%,52%,0.05) 100%)`,
      }}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-3xl mx-auto px-4">
          <Badge className="mb-4" style={{ background: `${P}18`, color: P, border: `1px solid ${P}33` }}>
            Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
            Simple, Transparent{' '}
            <span style={{ color: P }}>Pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Start free. Upgrade when you need more. No hidden fees, no vendor lock-in — just a platform that grows with your business.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-muted/60 rounded-full px-2 py-1.5 border border-border/60">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              Annual
              <Badge className="text-[10px] py-0 px-1.5" style={{ background: `${A}20`, color: A, border: `1px solid ${A}40` }}>
                20% off
              </Badge>
            </button>
          </div>
        </motion.div>
      </section>

      {/* PRICING CARDS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div key={plan.id} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
              <Card
                className={`relative h-full flex flex-col transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-2 shadow-2xl shadow-[hsl(230,65%,52%)]/20 scale-[1.02]'
                    : 'border-border/60 shadow-md hover:shadow-lg'
                }`}
                style={plan.highlighted ? { borderColor: P } : {}}
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: P }}
                  >
                    Most Popular
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    <Badge
                      variant={plan.highlighted ? 'default' : 'secondary'}
                      style={plan.highlighted ? { background: P } : {}}
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-extrabold">
                      ${annual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-muted-foreground text-sm mb-1">/mo</span>
                    )}
                    {plan.monthlyPrice === 0 && (
                      <span className="text-muted-foreground text-sm mb-1">forever</span>
                    )}
                  </div>
                  {annual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Billed ${plan.annualPrice * 12}/year
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-center gap-3 text-sm">
                        {f.included ? (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${A}20` }}>
                            <Check className="w-3 h-3" style={{ color: A }} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <X className="w-3 h-3 text-muted-foreground/40" />
                          </div>
                        )}
                        <span className={f.included ? 'text-foreground' : 'text-muted-foreground/60'}>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full gap-2"
                    style={plan.highlighted ? { background: P } : {}}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link to={plan.ctaLink}>
                      {plan.cta} <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="bg-muted/30 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-extrabold mb-3">All plans include</h2>
            <p className="text-muted-foreground">Every TELA account ships with these fundamentals — no tier required.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPlansInclude.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i + 1}
                >
                  <Card className="border-border/60 hover:shadow-md transition-shadow">
                    <CardContent className="pt-6 flex gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${P}12` }}>
                        <Icon className="w-5 h-5" style={{ color: P }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-extrabold mb-3">Pricing FAQ</h2>
          <p className="text-muted-foreground">Common questions about plans, billing, and limits.</p>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
            >
              <Card
                className="border-border/60 cursor-pointer hover:shadow-sm transition-all"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <CardContent className="py-4 px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: P }} />
                      <span className="font-medium text-sm">{faq.q}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${openFaq === i ? 'rotate-90' : ''}`}
                    />
                  </div>
                  {openFaq === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pl-7 text-sm text-muted-foreground leading-relaxed"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center" style={{ background: `linear-gradient(135deg, ${P}10 0%, transparent 60%)` }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto px-4"
        >
          <Star className="w-8 h-8 mx-auto mb-4" style={{ color: A }} />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Start free today. No credit card needed.
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your account in under 2 minutes and start managing your business with TELA-ERP.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="gap-2 text-white" style={{ background: P }} asChild>
              <Link to="/signup">Create free account <ChevronRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Talk to sales</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2026 Erick Elibariki Olomi — +255 752 401 012 | Erick.olomi@primeauditors.co.tz</span>
          <div className="flex gap-4">
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
