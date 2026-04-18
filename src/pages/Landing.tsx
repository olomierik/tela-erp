import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, ShoppingCart, Truck, Factory, Calculator,
  FileBarChart, Megaphone, Bot, Shield, Globe, Zap, ChevronRight,
  Check, ArrowRight, Star, Users, BarChart3, Layers, Palette,
  Menu, X, Car, Wrench, Briefcase, FolderKanban, Building,
  Receipt, RefreshCw, CreditCard, ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import UserCountWidget from '@/components/ui/UserCountWidget';
import heroImg from '@/assets/hero-dashboard.png';
import telaLogo from '@/assets/tela-erp-logo.png';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const modules = [
  { icon: Package, title: 'Inventory', desc: 'Real-time stock tracking, low-stock alerts, and expiry management across unlimited warehouses.' },
  { icon: ShoppingCart, title: 'Sales & Invoices', desc: 'Fast checkout, automatic invoicing, COGS calculation, and full order lifecycle management.' },
  { icon: CreditCard, title: 'Point of Sale', desc: 'Table-side or counter POS with session management, multiple payment methods, and receipt printing.' },
  { icon: Truck, title: 'Procurement', desc: 'Manage suppliers, purchase orders, and deliveries with automated accounting entries on receipt.' },
  { icon: Factory, title: 'Production', desc: 'Plan production orders, manage BOM, track progress, and auto-add finished goods to inventory.' },
  { icon: Calculator, title: 'Accounting', desc: 'Double-entry bookkeeping, vouchers, ledger, journal entries, P&L, and cash-flow reports.' },
  { icon: Briefcase, title: 'HR & Payroll', desc: 'Employee records, attendance, leave management, and automated payroll processing.' },
  { icon: FolderKanban, title: 'Projects', desc: 'Track projects, tasks, milestones, budgets, and team assignments in one place.' },
  { icon: Car, title: 'Fleet Management', desc: 'Track vehicles, schedule services, log fuel consumption, and manage driver assignments.' },
  { icon: Wrench, title: 'Maintenance', desc: 'Equipment maintenance requests, preventive scheduling, technician assignment, and cost tracking.' },
  { icon: RefreshCw, title: 'Subscriptions', desc: 'Manage recurring billing, subscription plans, MRR tracking, and customer lifecycle.' },
  { icon: Megaphone, title: 'Marketing', desc: 'Run email campaigns, manage mailing lists, track opens/clicks, and measure campaign ROI.' },
  { icon: Receipt, title: 'Expenses & Budgets', desc: 'Submit and approve expense claims, set departmental budgets, and track spending in real-time.' },
  { icon: Building, title: 'Fixed Assets', desc: 'Track business assets, depreciation schedules, and maintenance history.' },
  { icon: BarChart3, title: 'Reports & PDF', desc: 'Generate reports across all modules with date filters, charts, and one-click PDF export.' },
  { icon: Bot, title: 'AI CFO Assistant', desc: 'AI-powered business insights, trend analysis, and intelligent recommendations to grow faster.' },
  { icon: ScanLine, title: 'Document Scanner', desc: 'Scan and digitize invoices, receipts, and business documents with OCR extraction and intelligent filing.' },
];

const features = [
  { icon: Globe, title: 'Multi-Currency', desc: '165+ currencies with live exchange rates and on-the-fly conversion across all modules.' },
  { icon: Layers, title: 'Multi-Tenant', desc: 'Full data isolation with Row Level Security. Each business sees only their own data.' },
  { icon: Palette, title: 'White-Label', desc: 'Custom logos, colors, domains, and branding — your platform, your identity.' },
  { icon: Users, title: 'Reseller Portal', desc: 'Onboard clients, manage tenants, and scale your SaaS with built-in reseller tools.' },
  { icon: Shield, title: 'Enterprise Security', desc: 'RLS policies, input validation, audit logging, and role-based access control.' },
  { icon: Zap, title: 'Real-Time Sync', desc: 'Live updates across all modules — inventory, sales, accounting, and dashboards update instantly.' },
];

const faqs = [
  { q: 'What is TELA-ERP?', a: 'TELA-ERP is a cloud-based enterprise resource planning platform built for businesses of all sizes and industries. It unifies inventory, sales, production, accounting, HR, CRM, fleet, maintenance, projects, and more in one interconnected system.' },
  { q: 'Which plan is right for me?', a: 'Start with Starter (free) if you only need Sales and Inventory with 1 user. Upgrade to Premium ($6/mo) to unlock all 17 modules for up to 5 users. Choose Enterprise ($13/mo) for unlimited users, white-labeling, reseller tools, and API access.' },
  { q: 'Can I upgrade or downgrade later?', a: 'Yes. You can upgrade at any time and your new modules become available immediately. Downgrading takes effect at the end of your current billing period.' },
  { q: 'How does multi-tenancy work?', a: 'Each business gets fully isolated data with Row Level Security. Resellers can onboard and manage multiple client businesses from a single dashboard.' },
  { q: 'What currencies are supported?', a: 'TELA-ERP supports 165+ currencies with live exchange rates. Set your default currency and view reports in any currency on-the-fly.' },
  { q: 'Can I white-label the platform?', a: 'White-labeling is available on the Enterprise plan. Customize logos, colors, domains, and branding per tenant — your clients see your brand, not ours.' },
  { q: 'How are the modules interconnected?', a: 'Completing production auto-adds inventory. Sales orders validate and deduct stock. Every transaction creates accounting entries. Everything syncs in real-time.' },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>TELA-ERP — Complete ERP for Every Business | Free Starter, $6/mo Premium</title>
        <meta name="description" content="TELA-ERP: Free Starter plan, Premium at $6/month (all 17 modules), Enterprise at $13/month. Manage inventory, sales, production, fleet, accounting & more for any industry." />
        <link rel="canonical" href="https://tela-erp.com/" />
      </Helmet>
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link to="/modules" className="hover:text-foreground transition-colors">Modules</Link>
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Sign In</Link></Button>
            <Button className="gradient-primary" asChild><Link to="/signup">Get Started</Link></Button>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:hidden border-t border-border bg-background px-4 pb-4">
            <div className="flex flex-col gap-3 py-3 text-sm font-medium">
              <Link to="/modules" onClick={() => setMobileMenuOpen(false)} className="py-2">Modules</Link>
              <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="py-2">Features</Link>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="py-2">Pricing</Link>
              <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="py-2">Blog</Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-2">About</Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2">Contact</Link>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" asChild><Link to="/login">Sign In</Link></Button>
                <Button className="flex-1 gradient-primary" asChild><Link to="/signup">Get Started</Link></Button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <motion.div className="flex-1 text-center lg:text-left" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Enterprise Resource Planning, Reimagined
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              The Complete ERP for{' '}
              <span className="text-gradient">Modern Business</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              17 integrated modules. 13 industry presets. Built for teams that demand precision, speed, and clarity at every level of operation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="lg" className="gradient-primary text-base px-8" asChild>
                <Link to="/signup">Start 14-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
            <div className="mt-6 flex justify-center lg:justify-start">
              <UserCountWidget />
            </div>
          </motion.div>

          <motion.div className="flex-1 max-w-2xl" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
              <img src={heroImg} alt="TELA-ERP Dashboard showing sales charts and inventory tracking" className="w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="py-20 md:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">Modules</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">All Business Operations, Simplified</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">17 fully interconnected modules powered by real-time sync and enterprise-grade accounting.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m, i) => (
              <motion.div key={m.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <Card className="h-full hover:shadow-md transition-shadow border-border group">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <m.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{m.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERCONNECTION HIGHLIGHT */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Fully Interconnected, Fully Automated</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Production Completes', desc: 'Finished goods are automatically added to inventory with batch tracking and cost valuation.', icon: Factory },
              { step: '02', title: 'Sales Validates Stock', desc: 'Orders only process with sufficient "good" stock. Inventory is reserved then deducted on fulfillment.', icon: ShoppingCart },
              { step: '03', title: 'Accounting Auto-Posts', desc: 'Every movement creates double-entry journal entries — revenue, COGS, AR, and cash-flow update instantly.', icon: Calculator },
            ].map((item, i) => (
              <motion.div key={item.step} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <Card className="h-full border-border relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-5xl font-black text-primary/[0.06]">{item.step}</div>
                  <CardContent className="p-6 pt-8">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                      <item.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">Platform</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for Scale, Security & Customization</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <Card className="h-full border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <f.icon className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">13 Industries</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for Your Industry</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Select your industry during onboarding and get a pre-configured module set tailored to your business type.</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: '🛍️', label: 'Retail', modules: 'POS, Inventory, Sales' },
              { icon: '🏭', label: 'Manufacturing', modules: 'Production, Maintenance, Assets' },
              { icon: '💼', label: 'Services', modules: 'Projects, CRM, HR' },
              { icon: '🍽️', label: 'Hospitality', modules: 'POS, Inventory, HR' },
              { icon: '🏥', label: 'Healthcare', modules: 'Assets, CRM, HR' },
              { icon: '🏗️', label: 'Construction', modules: 'Projects, Maintenance, Assets' },
              { icon: '🚚', label: 'Logistics', modules: 'Fleet, Procurement, HR' },
              { icon: '🌐', label: 'E-Commerce', modules: 'Subscriptions, Marketing, CRM' },
              { icon: '❤️', label: 'Non-Profit', modules: 'Projects, Budgets, HR' },
              { icon: '🌱', label: 'Agriculture', modules: 'Inventory, Production, Assets' },
              { icon: '🏢', label: 'Real Estate', modules: 'Assets, Maintenance, CRM' },
              { icon: '💻', label: 'Technology', modules: 'Subscriptions, Projects, AI' },
              { icon: '🏬', label: 'General Business', modules: 'Sales & POS, Accounting, HR' },
            ].map((ind, i) => (
              <motion.div key={ind.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i * 0.3}>
                <Card className="h-full hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <span className="text-2xl">{ind.icon}</span>
                    <p className="font-semibold text-sm mt-2">{ind.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ind.modules}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">Simple Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Plans for Every Stage of Growth</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you're ready. No per-module fees, no surprises.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {[
              { name: 'Starter', price: 'Free', period: 'forever', users: '1 user', desc: 'Perfect for solo entrepreneurs getting started.', features: ['Sales module', 'Inventory module', 'Dashboard & Reports', '14-day Premium trial'], cta: 'Start Free', link: '/signup', highlight: false },
              { name: 'Premium', price: '$6', period: '/month', users: 'Up to 5 users', desc: 'All 17 modules for growing businesses.', features: ['All 17 modules', 'AI CFO Assistant', 'Multi-currency (165+)', 'Industry presets', 'Fleet & Maintenance', 'Email support'], cta: 'Get Premium', link: '/signup?plan=premium', highlight: true },
              { name: 'Enterprise', price: '$13', period: '/month', users: 'Unlimited users', desc: 'White-label and full platform control.', features: ['Everything in Premium', 'Unlimited users', 'White-label branding', 'Reseller portal', 'API access', 'Priority support'], cta: 'Contact Sales', link: '/contact', highlight: false },
            ].map((tier, i) => (
              <motion.div key={tier.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="relative">
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="gradient-primary text-white px-4 py-1 shadow-lg"><Star className="w-3 h-3 mr-1" />Most Popular</Badge>
                  </div>
                )}
                <Card className={`h-full flex flex-col ${tier.highlight ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
                      <div className="flex items-end gap-1 mt-3">
                        <span className="text-4xl font-extrabold">{tier.price}</span>
                        {tier.period !== 'forever' && <span className="text-muted-foreground text-sm mb-1">{tier.period}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tier.users}</p>
                    </div>
                    <Button className={`w-full mb-5 ${tier.highlight ? 'gradient-primary' : ''}`} variant={tier.highlight ? 'default' : 'outline'} asChild>
                      <Link to={tier.link}>{tier.cta} <ArrowRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                    <ul className="space-y-2 flex-1">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Zap className="inline w-4 h-4 mr-1 text-amber-500" />
            All new accounts get a <strong>14-day Premium trial</strong> — no credit card required.
            <Link to="/pricing" className="ml-2 text-primary underline underline-offset-2">See full comparison →</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 bg-muted/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i * 0.5}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-5 rounded-xl bg-card border border-border hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                  </div>
                  {openFaq === i && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {faq.a}
                    </motion.p>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="rounded-2xl gradient-primary p-10 md:p-16 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-primary-foreground blur-3xl" />
                <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-primary-foreground blur-3xl" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">Ready to Transform Your Business?</h2>
                <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
                  Join businesses across Africa and the world using TELA-ERP. Start free, scale when you grow.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" variant="secondary" className="text-base px-8" asChild>
                    <Link to="/signup">Start 14-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="text-primary-foreground border border-primary-foreground/30 text-base px-8 hover:bg-primary-foreground/10" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Free Starter plan. Premium at $6/month. Enterprise at $13/month. 17 modules for every business.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Modules</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/modules" className="hover:text-foreground transition-colors">Production Management</Link></li>
                <li><Link to="/modules" className="hover:text-foreground transition-colors">Inventory Management</Link></li>
                <li><Link to="/modules" className="hover:text-foreground transition-colors">Sales & POS Software</Link></li>
                <li><Link to="/modules" className="hover:text-foreground transition-colors">Accounting Software</Link></li>
                <li><Link to="/modules" className="hover:text-foreground transition-colors">Procurement Management</Link></li>
                <li><Link to="/modules" className="hover:text-foreground transition-colors">HR & Payroll</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground transition-colors">Multi-Tenant ERP</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">White-Label ERP</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">Reseller Portal</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">Multi-Currency (165+)</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">Reports & PDF Export</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">AI Business Insights</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} TELA-ERP by Erick Elibariki Olomi — Tanga, Tanzania</span>
            <div className="flex gap-4">
              <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <a href="https://github.com/olomierik/tela-erp" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
