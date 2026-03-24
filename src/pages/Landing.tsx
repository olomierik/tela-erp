import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Package, ShoppingCart, Truck, Factory, Calculator,
  FileBarChart, Megaphone, Bot, Shield, Globe, Zap, ChevronRight,
  Check, ArrowRight, Star, Users, BarChart3, Layers, Palette,
  CreditCard, Menu, X, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import heroImg from '@/assets/hero-dashboard.png';
import paymentQr from '@/assets/payment-qr.jpeg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const modules = [
  { icon: Package, title: 'Inventory', desc: 'Real-time stock tracking with categories, status management, and automated alerts for low stock and expiring items.' },
  { icon: ShoppingCart, title: 'Sales & POS', desc: 'Fast checkout with stock validation, automatic invoicing, COGS calculation, and full order lifecycle management.' },
  { icon: Truck, title: 'Procurement', desc: 'Manage suppliers, purchase orders, and expected deliveries with automated accounting entries on receipt.' },
  { icon: Factory, title: 'Production', desc: 'Plan production orders, track progress, and auto-add finished goods to inventory on completion.' },
  { icon: Calculator, title: 'Accounting', desc: 'Double-entry bookkeeping with auto journal entries, cash-flow tracking, income vs expense charts, and profit & loss.' },
  { icon: Megaphone, title: 'Marketing', desc: 'Run campaigns across channels, track budgets and leads, and measure ROI with integrated analytics.' },
  { icon: FileBarChart, title: 'Reports & PDF', desc: 'Generate sales, inventory, production, and accounting reports with date filters and one-click PDF export.' },
  { icon: Bot, title: 'Tela AI', desc: 'AI-powered business insights, trend analysis, and intelligent recommendations to optimize operations.' },
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
  { q: 'What is TELA-ERP?', a: 'TELA-ERP is a cloud-based enterprise resource planning platform designed for African businesses. It manages production, inventory, sales, marketing, accounting, and procurement in one interconnected system.' },
  { q: 'Is it suitable for my business size?', a: 'Yes. Whether you run a single shop or manage operations across multiple locations and countries, TELA-ERP scales with you.' },
  { q: 'How does multi-tenancy work?', a: 'Each business gets fully isolated data with Row Level Security. Resellers can onboard and manage multiple client businesses from a single dashboard.' },
  { q: 'What currencies are supported?', a: 'TELA-ERP supports 165+ currencies with live exchange rates. Set your default currency and view reports in any currency on-the-fly.' },
  { q: 'Can I white-label the platform?', a: 'Absolutely. Customize logos, colors, domains, and branding per tenant. Your clients see your brand, not ours.' },
  { q: 'How are the modules interconnected?', a: 'Completing production auto-adds inventory. Sales orders validate and deduct stock. Every transaction creates accounting entries. Everything syncs in real-time.' },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TELA-ERP</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#modules" className="hover:text-foreground transition-colors">Modules</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
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
              <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="py-2">Modules</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2">Features</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2">Pricing</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2">FAQ</a>
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
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <motion.div className="flex-1 text-center lg:text-left" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              🚀 Enterprise ERP for Africa
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              The All-in-One{' '}
              <span className="text-gradient">AI System</span>{' '}
              for African Business Success
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              Manage production, inventory, sales, accounting, and more in one interconnected platform. TELA-ERP keeps your business running smoothly, efficiently, and intelligently.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="lg" className="gradient-primary text-base px-8" asChild>
                <Link to="/signup">Get a Free Trial <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
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
            <p className="text-muted-foreground max-w-2xl mx-auto">Six fully interconnected modules powered by real-time sync and enterprise-grade accounting.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* SUPPORT / OPEN SOURCE */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-3">🌍 Open Source</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Free & Open Source ERP for Everyone</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              TELA-ERP is proudly open source — built to empower SMEs in Africa and across the world.
              No subscriptions, no hidden fees. Just a powerful ERP system, completely free to use.
            </p>
          </motion.div>

          <div className="max-w-lg mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-2 border-primary/20">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5">
                    <CreditCard className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">Support the Project</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    TELA-ERP is maintained by a small team passionate about making enterprise software accessible to all.
                    You can support the continued development of this project by contributing via the QR code below.
                    Every contribution helps us build new features, fix bugs, and keep the platform running.
                  </p>
                  <img src={paymentQr} alt="CRDB Bank Lipa Hapa QR code for TELA-ERP support" className="w-64 mx-auto rounded-lg border border-border mb-4" />
                  <p className="text-xs text-muted-foreground">Lipa Namba: 10689981 — ERICK ELIBARIKI OLOMI</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
                  Join thousands of African businesses using TELA-ERP to streamline operations and drive growth.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" variant="secondary" className="text-base px-8" asChild>
                    <Link to="/signup">Start Free Trial <ArrowRight className="w-4 h-4 ml-2" /></Link>
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
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">TELA-ERP</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The complete AI-powered ERP platform built for African businesses with white-label reseller capabilities.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Modules</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Production</li><li>Inventory</li><li>Sales & POS</li><li>Accounting</li><li>Marketing</li><li>Procurement</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Multi-Tenant</li><li>White-Label</li><li>Reseller Portal</li><li>Multi-Currency</li><li>Reports & PDF</li><li>Tela AI</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} TELA-ERP. All rights reserved.</span>
            <span>Built with ❤️ for African businesses</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
