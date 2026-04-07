import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, ChevronRight, Zap, Shield, Globe, Star, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import telaLogo from '@/assets/tela-erp-logo.png';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Get started with the essentials — no credit card needed.',
    highlight: false,
    cta: 'Start Free',
    ctaLink: '/signup',
    color: 'border-border',
    badge: null,
    users: '1 user',
    features: [
      { label: 'Sales module', included: true },
      { label: 'Inventory module', included: true },
      { label: 'Dashboard & Reports', included: true },
      { label: 'Multi-currency', included: false },
      { label: 'All 17 modules', included: false },
      { label: 'HR & Payroll', included: false },
      { label: 'Projects & CRM', included: false },
      { label: 'Fleet & Maintenance', included: false },
      { label: 'AI CFO Assistant', included: false },
      { label: 'White-label branding', included: false },
      { label: 'API access', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '$6',
    period: '/month',
    description: 'Everything your growing business needs in one place.',
    highlight: true,
    cta: 'Get Premium',
    ctaLink: '/signup?plan=premium',
    color: 'border-primary ring-2 ring-primary/20',
    badge: 'Most Popular',
    users: 'Up to 5 users',
    features: [
      { label: 'All 17 modules', included: true },
      { label: 'Multi-currency (165+)', included: true },
      { label: 'Industry presets (13)', included: true },
      { label: 'AI CFO Assistant', included: true },
      { label: 'Advanced reports & PDF', included: true },
      { label: 'HR & Payroll', included: true },
      { label: 'Fleet & Maintenance', included: true },
      { label: 'POS & Subscriptions', included: true },
      { label: 'Real-time sync', included: true },
      { label: 'Email support', included: true },
      { label: 'White-label branding', included: false },
      { label: 'API access', included: false },
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$13',
    period: '/month',
    description: 'Unlimited scale, white-label, and full platform control.',
    highlight: false,
    cta: 'Get Enterprise',
    ctaLink: '/signup?plan=enterprise',
    color: 'border-border',
    badge: null,
    users: 'Unlimited users',
    features: [
      { label: 'Everything in Premium', included: true },
      { label: 'Unlimited users', included: true },
      { label: 'White-label branding', included: true },
      { label: 'Custom domain', included: true },
      { label: 'Reseller portal', included: true },
      { label: 'Full API access', included: true },
      { label: 'Priority support', included: true },
      { label: 'Dedicated onboarding', included: true },
      { label: 'SLA guarantee', included: true },
      { label: 'Audit logging', included: true },
      { label: 'Multi-company management', included: true },
      { label: 'Custom integrations', included: true },
    ],
  },
];

const ALL_MODULES = [
  'Sales Orders', 'Invoices', 'Inventory', 'Procurement', 'Production',
  'Accounting & Vouchers', 'Fixed Assets', 'Expenses', 'Budgets',
  'HR & Payroll', 'CRM Pipeline', 'Projects', 'Marketing',
  'Fleet Management', 'Maintenance', 'Point of Sale', 'Subscriptions',
];

const MODULE_TIERS: Record<string, { starter: boolean; premium: boolean; enterprise: boolean }> = {
  'Sales Orders':         { starter: true,  premium: true, enterprise: true },
  'Inventory':            { starter: true,  premium: true, enterprise: true },
  'Invoices':             { starter: false, premium: true, enterprise: true },
  'Procurement':          { starter: false, premium: true, enterprise: true },
  'Production':           { starter: false, premium: true, enterprise: true },
  'Accounting & Vouchers':{ starter: false, premium: true, enterprise: true },
  'Fixed Assets':         { starter: false, premium: true, enterprise: true },
  'Expenses':             { starter: false, premium: true, enterprise: true },
  'Budgets':              { starter: false, premium: true, enterprise: true },
  'HR & Payroll':         { starter: false, premium: true, enterprise: true },
  'CRM Pipeline':         { starter: false, premium: true, enterprise: true },
  'Projects':             { starter: false, premium: true, enterprise: true },
  'Marketing':            { starter: false, premium: true, enterprise: true },
  'Fleet Management':     { starter: false, premium: true, enterprise: true },
  'Maintenance':          { starter: false, premium: true, enterprise: true },
  'Point of Sale':        { starter: false, premium: true, enterprise: true },
  'Subscriptions':        { starter: false, premium: true, enterprise: true },
};

const FAQS = [
  { q: 'Can I upgrade or downgrade at any time?', a: 'Yes. You can upgrade instantly and your new modules become available immediately. Downgrading takes effect at the end of your billing period.' },
  { q: 'What happens if I exceed the user limit on Starter?', a: 'The system will notify you when you reach your limit. You can upgrade to Premium (5 users) or Enterprise (unlimited) at any time.' },
  { q: 'Is there a free trial for Premium or Enterprise?', a: 'Yes — all new accounts start with a 14-day free trial of Premium features so you can explore all 17 modules before committing.' },
  { q: 'Do you support mobile money payments?', a: 'Yes. We accept M-Pesa, Airtel Money, Tigo Pesa, and other regional mobile money methods in addition to card payments.' },
  { q: 'Can I white-label TELA-ERP for my clients?', a: 'Absolutely. Enterprise plan includes full white-labeling — custom logo, colors, domain, and the Reseller Portal to manage multiple client tenants.' },
  { q: 'Is my data safe?', a: 'Yes. All data is isolated with Row Level Security (RLS) in Supabase PostgreSQL. Each tenant can only see their own data.' },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Pricing — TELA-ERP | Starter Free, Premium $6/mo, Enterprise $13/mo</title>
        <meta name="description" content="TELA-ERP pricing: Free Starter plan, Premium at $6/month (all modules, 5 users), Enterprise at $13/month (unlimited everything). Start free today." />
      </Helmet>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-foreground">Pricing</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Sign In</Link></Button>
            <Button className="gradient-primary" asChild><Link to="/signup">Start Free</Link></Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-20 text-center px-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Badge variant="secondary" className="mb-4">Transparent Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple plans for every <span className="text-primary">stage of growth</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free with the essentials, unlock everything for $6/month, or go unlimited for $13/month.
            No hidden fees, no per-module charges.
          </p>
        </motion.div>
      </section>

      {/* PRICING CARDS */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {TIERS.map((tier, i) => (
            <motion.div key={tier.key} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
              <Card className={`relative h-full flex flex-col ${tier.color}`}>
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-white px-4 py-1 text-xs font-semibold shadow-lg">
                      <Star className="w-3 h-3 mr-1" />{tier.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pt-8 pb-4 text-center">
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  <div className="flex items-end justify-center gap-1">
                    <span className={`font-extrabold ${tier.price === 'Free' ? 'text-3xl' : 'text-5xl'}`}>{tier.price}</span>
                    {tier.period !== 'forever' && <span className="text-muted-foreground text-sm mb-1">{tier.period}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{tier.users}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <Button
                    className={`w-full mb-6 ${tier.highlight ? 'gradient-primary' : ''}`}
                    variant={tier.highlight ? 'default' : 'outline'}
                    asChild
                  >
                    <Link to={tier.ctaLink}>{tier.cta} <ChevronRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                  <ul className="space-y-3">
                    {tier.features.map(f => (
                      <li key={f.label} className="flex items-start gap-2.5 text-sm">
                        {f.included
                          ? <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          : <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                        <span className={f.included ? 'text-foreground' : 'text-muted-foreground'}>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 14-day trial note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          <Zap className="inline w-4 h-4 mr-1 text-amber-500" />
          All new accounts include a <strong>14-day free trial</strong> of Premium — no credit card required.
        </p>
      </section>

      {/* MODULE COMPARISON TABLE */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Module Availability by Plan</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Module</th>
                  <th className="text-center p-4 font-semibold">Starter</th>
                  <th className="text-center p-4 font-semibold text-primary">Premium</th>
                  <th className="text-center p-4 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod, i) => {
                  const t = MODULE_TIERS[mod];
                  return (
                    <tr key={mod} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                      <td className="p-3 pl-4 font-medium">{mod}</td>
                      <td className="p-3 text-center">{t.starter ? <Check className="w-4 h-4 text-emerald-500 inline" /> : <X className="w-4 h-4 text-muted-foreground/40 inline" />}</td>
                      <td className="p-3 text-center">{t.premium ? <Check className="w-4 h-4 text-emerald-500 inline" /> : <X className="w-4 h-4 text-muted-foreground/40 inline" />}</td>
                      <td className="p-3 text-center">{t.enterprise ? <Check className="w-4 h-4 text-emerald-500 inline" /> : <X className="w-4 h-4 text-muted-foreground/40 inline" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* TRUST BADGES */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'Bank-Grade Security', desc: 'Row Level Security, encrypted at rest, SOC-2 grade infrastructure' },
            { icon: Globe, title: 'Multi-Currency', desc: '165+ currencies with live exchange rates across all modules' },
            { icon: Zap, title: 'Real-Time Sync', desc: 'Live updates across inventory, sales, accounting, and dashboards' },
          ].map(b => (
            <Card key={b.title}>
              <CardContent className="p-5 flex items-start gap-3">
                <b.icon className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <Card key={i} className="cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-sm">{faq.q}</p>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </div>
                {openFaq === i && <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">{faq.a}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-primary/5 border-t border-border py-16 text-center px-4">
        <h2 className="text-3xl font-bold mb-3">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">Join thousands of businesses running on TELA-ERP. Start free today.</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Button size="lg" className="gradient-primary" asChild><Link to="/signup">Start Free — No Credit Card</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/contact">Talk to Sales</Link></Button>
        </div>
      </section>
    </div>
  );
}
