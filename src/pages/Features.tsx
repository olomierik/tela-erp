import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, Package, DollarSign, ShoppingCart, Users, Bot, Shield,
  ChevronRight, Zap, BarChart3, Globe, Lock, Cpu, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import telaLogo from '@/assets/tela-erp-logo.png';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const featureSections = [
  {
    id: 'inventory',
    icon: Package,
    label: 'Inventory Management',
    headline: 'Know exactly what you have, where it is, and when to reorder.',
    description:
      'TELA\'s inventory engine gives you real-time visibility across every warehouse and location. Eliminate stockouts, reduce waste, and automate your replenishment workflows.',
    bullets: [
      'Real-time stock levels across multiple warehouses',
      'Automated low-stock alerts and reorder triggers',
      'Batch and expiry date tracking for perishable goods',
      'Category, SKU, and barcode management',
      'Inter-warehouse stock transfers with audit trail',
      'Supplier-linked purchase order automation',
    ],
  },
  {
    id: 'finance',
    icon: DollarSign,
    label: 'Financial Suite',
    headline: 'Full double-entry accounting built into every transaction.',
    description:
      'Every sale, purchase, and production run automatically generates the correct journal entries. No manual bookkeeping — just accurate, real-time financials.',
    bullets: [
      'Double-entry bookkeeping with auto journal entries',
      'Multi-currency support with live exchange rates',
      'Income statement, balance sheet, and cash flow reports',
      'Bank reconciliation and payment matching',
      'Tax configuration and VAT reporting',
      'Budget vs actuals tracking and variance analysis',
    ],
  },
  {
    id: 'sales',
    icon: ShoppingCart,
    label: 'Sales & CRM',
    headline: 'Close deals faster and keep your customers coming back.',
    description:
      'From lead capture to invoice delivery, TELA\'s sales suite connects your pipeline, your stock, and your accounting in one seamless flow.',
    bullets: [
      'Sales pipeline with stage tracking and forecasting',
      'Point-of-sale (POS) with instant stock deduction',
      'Customer segmentation and purchase history',
      'Automatic invoice generation on order completion',
      'Discount, tax, and promotion rule engine',
      'Sales performance dashboards per rep and region',
    ],
  },
  {
    id: 'hr',
    icon: Users,
    label: 'HR & Payroll',
    headline: 'Manage your people with the same precision as your inventory.',
    description:
      'A complete human resources suite that handles recruitment, attendance, leave, and payroll — all in one place and integrated with your accounting.',
    bullets: [
      'Employee profiles, departments, and org chart',
      'Attendance tracking and leave management',
      'Automated payroll calculation with deductions',
      'Payslip generation and employee self-service',
      'Performance review cycles and goal tracking',
      'Payroll accounting entries synced automatically',
    ],
  },
  {
    id: 'ai',
    icon: Bot,
    label: 'AI Intelligence',
    headline: 'Your AI CFO, analyst, and operations advisor — always on.',
    description:
      'TELA\'s built-in AI layer analyzes your business data to surface insights, answer financial questions, and flag risks before they become problems.',
    bullets: [
      'AI CFO assistant for natural-language financial queries',
      'Demand forecasting and inventory optimization',
      'Anomaly detection on transactions and stock movements',
      'Automated document scanning and data extraction',
      'Smart reorder recommendations based on sales velocity',
      'AI-generated business health summaries',
    ],
  },
  {
    id: 'platform',
    icon: Shield,
    label: 'Platform & Security',
    headline: 'Enterprise-grade security with the flexibility of open source.',
    description:
      'Built on Supabase with Row Level Security at its core, TELA ensures each business sees only their own data — with full white-labeling and reseller capabilities on top.',
    bullets: [
      'Row Level Security — total data isolation per tenant',
      'Role-based access control with granular permissions',
      'White-label: custom logo, colors, and domain per tenant',
      'Reseller portal to manage and onboard client businesses',
      'Audit logs for every critical action across all modules',
      'Real-time sync powered by Supabase Realtime',
    ],
  },
];

const comparisonRows = [
  { feature: 'Users', free: '3', growth: '25', enterprise: 'Unlimited' },
  { feature: 'Modules', free: '5 core', growth: 'All 15', enterprise: 'All 15' },
  { feature: 'Warehouses', free: '1', growth: '5', enterprise: 'Unlimited' },
  { feature: 'AI CFO Assistant', free: false, growth: true, enterprise: true },
  { feature: 'Multi-currency', free: false, growth: true, enterprise: true },
  { feature: 'White-label', free: false, growth: false, enterprise: true },
  { feature: 'Reseller Portal', free: false, growth: false, enterprise: true },
  { feature: 'API Access', free: false, growth: true, enterprise: true },
  { feature: 'Priority Support', free: false, growth: false, enterprise: true },
  { feature: 'Custom Domain', free: false, growth: false, enterprise: true },
];

export default function Features() {
  const [activeSection, setActiveSection] = useState('inventory');
  const active = featureSections.find((s) => s.id === activeSection)!;
  const ActiveIcon = active.icon;

  return (
    <div className="min-h-screen bg-background text-foreground font-[\'Plus_Jakarta_Sans\',sans-serif]">
      <Helmet>
        <title>Features — TELA-ERP | Inventory, Sales, Production, Accounting & More</title>
        <meta name="description" content="Explore TELA-ERP's full feature set: inventory management, sales & POS, production, double-entry accounting, procurement, HR & payroll, AI insights, and more. Free for small businesses." />
        <link rel="canonical" href="https://tela-erp.com/features" />
        <meta property="og:title" content="Features — TELA-ERP | Free ERP for Small Businesses" />
        <meta property="og:description" content="15+ integrated ERP modules — inventory, sales, production, accounting, HR, AI & more. Free and open source." />
        <meta property="og:url" content="https://tela-erp.com/features" />
      </Helmet>
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/features" className="text-[hsl(230,65%,52%)]">Features</Link>
            <Link to="/modules" className="text-muted-foreground hover:text-foreground transition-colors">Modules</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" className="bg-[hsl(230,65%,52%)] hover:bg-[hsl(230,65%,45%)] text-white" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(230,65%,52%)]/10 via-background to-[hsl(32,95%,52%)]/5 py-24 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="max-w-4xl mx-auto px-4"
        >
          <Badge className="mb-4 bg-[hsl(230,65%,52%)]/10 text-[hsl(230,65%,52%)] border-[hsl(230,65%,52%)]/20 hover:bg-[hsl(230,65%,52%)]/20">
            Full Feature Overview
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Everything You Need to Run{' '}
            <span className="text-[hsl(230,65%,52%)]">a Modern Business</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            TELA-ERP unifies 15 interconnected modules — from inventory to AI — so every part of your business talks to every other part, automatically.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-[hsl(230,65%,52%)] hover:bg-[hsl(230,65%,45%)] text-white gap-2" asChild>
              <Link to="/signup">Start for free <ChevronRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">View pricing</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* FEATURE SECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Tab list */}
          <div className="lg:w-64 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Feature Areas</p>
            <div className="flex flex-row lg:flex-col gap-2 flex-wrap">
              {featureSections.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full ${
                      activeSection === s.id
                        ? 'bg-[hsl(230,65%,52%)] text-white shadow-md'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
            className="flex-1"
          >
            <Card className="border-border/60 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(230,65%,52%)]/10 flex items-center justify-center">
                    <ActiveIcon className="w-6 h-6 text-[hsl(230,65%,52%)]" />
                  </div>
                  <Badge variant="secondary">{active.label}</Badge>
                </div>
                <CardTitle className="text-2xl font-bold leading-snug">{active.headline}</CardTitle>
                <p className="text-muted-foreground mt-2">{active.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {active.bullets.map((b, i) => (
                    <motion.li
                      key={b}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-[hsl(32,95%,52%)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[hsl(32,95%,52%)]" />
                      </div>
                      <span className="text-sm leading-relaxed">{b}</span>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-muted/30 py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Feature Comparison</h2>
            <p className="text-muted-foreground">See exactly what each plan includes.</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="overflow-x-auto rounded-2xl border border-border/60 bg-background shadow-sm"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Feature</th>
                  <th className="px-6 py-4 font-bold text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>Starter</span>
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-bold text-center bg-[hsl(230,65%,52%)]/5">
                    <div className="flex flex-col items-center gap-1">
                      <span>Growth</span>
                      <Badge className="text-xs bg-[hsl(230,65%,52%)] text-white">$29/mo</Badge>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-bold text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>Enterprise</span>
                      <Badge variant="secondary" className="text-xs bg-[hsl(32,95%,52%)]/15 text-[hsl(32,95%,52%)]">$99/mo</Badge>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-border/40 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-6 py-3 font-medium">{row.feature}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground">
                      {typeof row.free === 'boolean' ? (
                        row.free ? <Check className="w-4 h-4 text-[hsl(32,95%,52%)] mx-auto" /> : <span className="text-muted-foreground/40">—</span>
                      ) : row.free}
                    </td>
                    <td className="px-6 py-3 text-center bg-[hsl(230,65%,52%)]/5">
                      {typeof row.growth === 'boolean' ? (
                        row.growth ? <Check className="w-4 h-4 text-[hsl(32,95%,52%)] mx-auto" /> : <span className="text-muted-foreground/40">—</span>
                      ) : row.growth}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {typeof row.enterprise === 'boolean' ? (
                        row.enterprise ? <Check className="w-4 h-4 text-[hsl(32,95%,52%)] mx-auto" /> : <span className="text-muted-foreground/40">—</span>
                      ) : row.enterprise}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto px-4"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start free with 3 users and 5 core modules. Upgrade as you grow.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-[hsl(230,65%,52%)] hover:bg-[hsl(230,65%,45%)] text-white gap-2" asChild>
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
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
