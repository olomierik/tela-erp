import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, ChevronRight, Shield, Globe, BarChart3, Lock, Zap,
  HeadphonesIcon, HelpCircle, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import telaLogo from '@/assets/tela-erp-logo.png';
import { useState } from 'react';

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

const features = [
  'Unlimited users',
  'All 15+ modules',
  'Unlimited warehouses',
  'AI CFO Assistant',
  'Multi-currency (165+)',
  'Advanced reports + PDF exports',
  'Full API access',
  'White-label branding',
  'Reseller portal',
  'Priority support',
  'Real-time updates',
  'Role-based access control',
];

const allPlansInclude = [
  { icon: Shield, label: 'Row Level Security', desc: 'Your data is fully isolated from all other tenants.' },
  { icon: Globe, label: 'Cloud-powered', desc: 'Reliable, scalable Postgres with real-time sync.' },
  { icon: BarChart3, label: 'Full Analytics', desc: 'Dashboard KPIs and module-level reporting.' },
  { icon: Lock, label: 'Role-based access', desc: 'Owner, admin, and staff roles out of the box.' },
  { icon: Zap, label: 'Real-time updates', desc: 'Live inventory, sales, and financial data.' },
  { icon: HeadphonesIcon, label: 'Priority support', desc: 'Direct email support with fast response times.' },
];

const faqs = [
  {
    q: 'What do I get for $100/year?',
    a: 'Full access to every module, feature, and tool in TELA-ERP — unlimited users, warehouses, reports, AI assistant, API access, white-labeling, and more. No restrictions.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. You get a 14-day free trial — no credit card required. You only start paying after you decide to continue.',
  },
  {
    q: 'How does renewal work?',
    a: 'Your subscription renews automatically every year. You can cancel anytime from your billing settings and retain access until the end of your billing period.',
  },
  {
    q: 'Are there any hidden fees?',
    a: 'None. $100/year covers everything. No per-user fees, no module add-ons, no setup charges.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your billing settings at any time. You keep full access until the end of your current billing year.',
  },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Pricing — TELA-ERP | $100/Year Full Access ERP</title>
        <meta name="description" content="TELA-ERP: $100/year for full access to all modules, unlimited users, AI assistant, and more. No hidden fees." />
        <link rel="canonical" href="https://tela-erp.com/pricing" />
        <meta property="og:title" content="Pricing — TELA-ERP | $100/Year Full Access" />
        <meta property="og:description" content="Get full access to every ERP module for just $100/year. Unlimited users, AI-powered, no hidden fees." />
        <meta property="og:url" content="https://tela-erp.com/pricing" />
      </Helmet>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
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
            Simple Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
            One plan.{' '}
            <span style={{ color: P }}>Full access.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to run your business — all modules, unlimited users, no restrictions. Just <strong>$100/year</strong>.
          </p>
        </motion.div>
      </section>

      {/* PRICING CARD */}
      <section className="max-w-lg mx-auto px-4 sm:px-6 pb-24 -mt-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="relative border-2 shadow-2xl shadow-[hsl(230,65%,52%)]/20" style={{ borderColor: P }}>
            <div
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: P }}
            >
              Full Access
            </div>
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-2xl font-bold">TELA-ERP</CardTitle>
              <div className="flex items-end justify-center gap-1 mt-4">
                <span className="text-5xl font-extrabold">$100</span>
                <span className="text-muted-foreground text-sm mb-1">/year</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                That's less than $8.33/month
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Access every module, every feature, unlimited users. Renews annually.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col">
              <ul className="space-y-3 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${A}20` }}>
                      <Check className="w-3 h-3" style={{ color: A }} />
                    </div>
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full gap-2 text-white"
                size="lg"
                style={{ background: P }}
                asChild
              >
                <Link to="/signup">
                  Start 14-day free trial <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                No credit card required to start
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="bg-muted/30 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3">Everything included</h2>
            <p className="text-muted-foreground">No tiers, no add-ons — every feature ships with your subscription.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPlansInclude.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
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
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
          <h2 className="text-3xl font-extrabold mb-3">Pricing FAQ</h2>
          <p className="text-muted-foreground">Common questions about billing and access.</p>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
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
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mx-auto px-4">
          <Star className="w-8 h-8 mx-auto mb-4" style={{ color: A }} />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Start your 14-day free trial today
          </h2>
          <p className="text-muted-foreground mb-8">
            No credit card needed. Full access to every module for 14 days, then just $100/year.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="gap-2 text-white" style={{ background: P }} asChild>
              <Link to="/signup">Get started free <ChevronRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Talk to us</Link>
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
