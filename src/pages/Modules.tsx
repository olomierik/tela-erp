import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, ShoppingCart, Truck, Factory, Calculator, Megaphone,
  FileBarChart, Bot, Users, Building2, CreditCard, BarChart3,
  Globe, Layers, Palette, Shield, Zap, FileText, ChevronRight,
  ArrowRight, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const modules = [
  {
    icon: Factory,
    color: 'from-orange-500 to-amber-500',
    category: 'Operations',
    title: 'Production',
    tagline: 'From raw materials to finished goods.',
    description:
      'Plan production orders, track work-in-progress, allocate raw material, and automatically move finished goods to inventory with full cost tracking.',
    bullets: [
      'Bill of Materials (BOM) management',
      'Work order creation and progress tracking',
      'Raw material allocation and consumption',
      'Auto-add finished goods to inventory on completion',
      'Production cost calculation and variance reporting',
    ],
    link: '/production',
  },
  {
    icon: Package,
    color: 'from-blue-500 to-primary',
    category: 'Operations',
    title: 'Inventory',
    tagline: 'Always know exactly what you have.',
    description:
      'Real-time multi-warehouse stock tracking with categories, status management, AI demand forecasting, and automated low-stock and expiry alerts.',
    bullets: [
      'Multi-warehouse stock levels in real time',
      'Item categories, statuses, and batch tracking',
      'AI-powered demand forecasting',
      'Low-stock and expiry date alerts',
      'Stock adjustment, write-off, and audit trail',
    ],
    link: '/inventory',
  },
  {
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500',
    category: 'Revenue',
    title: 'Sales & POS',
    tagline: 'Sell faster, track everything.',
    description:
      'Fast order entry with live stock validation, automatic invoice generation, COGS calculation, and full order lifecycle management from quote to fulfillment.',
    bullets: [
      'Quick order creation with stock validation',
      'Automatic invoice and receipt generation',
      'COGS calculated on every sale',
      'Customer credit and payment tracking',
      'Sales performance dashboards and reports',
    ],
    link: '/sales',
  },
  {
    icon: Truck,
    color: 'from-purple-500 to-violet-500',
    category: 'Operations',
    title: 'Procurement',
    tagline: 'Buy smart, never run short.',
    description:
      'Manage suppliers, raise purchase orders, track expected deliveries, and automatically create accounting entries when stock is received.',
    bullets: [
      'Supplier management and pricing history',
      'Purchase order creation and approval workflow',
      'Expected delivery tracking',
      'Auto GRN and accounting entries on receipt',
      'Spend analytics and supplier scorecards',
    ],
    link: '/procurement',
  },
  {
    icon: Calculator,
    color: 'from-rose-500 to-pink-500',
    category: 'Finance',
    title: 'Accounting',
    tagline: 'Books that balance themselves.',
    description:
      'Full double-entry bookkeeping with automatic journal entries from sales, purchases, and production. Cash flow, P&L, and balance sheet — always up to date.',
    bullets: [
      'Automatic double-entry from all transactions',
      'Cash flow, income vs. expense charts',
      'Profit & Loss and Balance Sheet reports',
      'Multi-currency accounting with exchange rates',
      'Tax rates and VAT reporting',
    ],
    link: '/accounting',
  },
  {
    icon: FileText,
    color: 'from-cyan-500 to-sky-500',
    category: 'Finance',
    title: 'Invoices',
    tagline: 'Professional invoicing, fast.',
    description:
      'Create itemized invoices, track payment status, mark as paid, and maintain a full audit trail — all connected to your accounting ledger.',
    bullets: [
      'Itemized invoices with line items',
      'Draft, Sent, Paid, and Overdue status tracking',
      'One-click mark as paid',
      'Linked to accounting entries automatically',
      'Filter, search, and export invoice history',
    ],
    link: '/invoices',
  },
  {
    icon: Megaphone,
    color: 'from-yellow-500 to-amber-500',
    category: 'Revenue',
    title: 'Marketing',
    tagline: 'Run campaigns that convert.',
    description:
      'Plan and track marketing campaigns across channels, manage budgets, capture leads, and measure ROI with built-in analytics.',
    bullets: [
      'Campaign creation with channels and budgets',
      'Lead capture and pipeline tracking',
      'Campaign performance metrics and ROI',
      'Target audience and segment management',
      'Integration with CRM for lead follow-up',
    ],
    link: '/marketing',
  },
  {
    icon: Users,
    color: 'from-indigo-500 to-blue-500',
    category: 'Revenue',
    title: 'CRM',
    tagline: 'Relationships that drive revenue.',
    description:
      'Manage contacts, track deals through your pipeline, log activities, and forecast revenue — all in one connected CRM.',
    bullets: [
      'Contact management with company and tags',
      'Visual deal pipeline with stages',
      'Activity logging (calls, emails, meetings)',
      'Deal value and close probability tracking',
      'Revenue forecasting and win/loss reports',
    ],
    link: '/crm',
  },
  {
    icon: Building2,
    color: 'from-teal-500 to-cyan-500',
    category: 'People',
    title: 'HR & Payroll',
    tagline: 'People management, simplified.',
    description:
      'Manage employees, departments, attendance, leave requests, and run payroll — all linked to your accounting for automatic payroll journal entries.',
    bullets: [
      'Employee profiles and department management',
      'Leave request and approval workflow',
      'Attendance tracking and summaries',
      'Automated payroll calculation',
      'Payroll journal entries in accounting',
    ],
    link: '/hr',
  },
  {
    icon: Bot,
    color: 'from-primary to-blue-600',
    category: 'AI',
    title: 'Tela AI',
    tagline: 'Your AI-powered business advisor.',
    description:
      'Platform-hosted AI with no setup required. Get CFO-level insights, demand forecasts, document scanning, and intelligent recommendations across all modules.',
    bullets: [
      'AI CFO assistant for financial analysis',
      'Demand forecasting for inventory planning',
      'AI document scanner and data extraction',
      'Natural language queries on your business data',
      'Automated insights and anomaly detection',
    ],
    link: '/ai-cfo',
  },
  {
    icon: FileBarChart,
    color: 'from-slate-600 to-slate-500',
    category: 'Analytics',
    title: 'Reports',
    tagline: 'Data that drives decisions.',
    description:
      'Generate cross-module reports with date filters, visual charts, and one-click PDF export for sales, inventory, production, and accounting.',
    bullets: [
      'Sales, inventory, and production reports',
      'Financial statements (P&L, cash flow)',
      'Date range filtering and comparisons',
      'Chart visualizations and trend lines',
      'One-click PDF export for any report',
    ],
    link: '/reports',
  },
  {
    icon: Zap,
    color: 'from-amber-500 to-orange-500',
    category: 'Platform',
    title: 'Automation',
    tagline: 'Work less, automate more.',
    description:
      'Build no-code automation rules that trigger actions across modules — reorder stock, send alerts, update records — when conditions are met.',
    bullets: [
      'Trigger-based automation rules',
      'Cross-module actions and notifications',
      'Condition builder with AND/OR logic',
      'Run history and audit logs',
      'Pre-built templates for common workflows',
    ],
    link: '/automations',
  },
];

const categories = ['All', 'Operations', 'Revenue', 'Finance', 'People', 'AI', 'Analytics', 'Platform'];

export default function Modules() {
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
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/modules" className="text-foreground">Modules</Link>
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Sign In</Link></Button>
            <Button className="gradient-primary" asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">12 Modules — One Platform</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Every Module Your Business{' '}
              <span className="text-gradient">Will Ever Need</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              From production floors to payroll runs — TELA-ERP covers every corner of your business in a single interconnected platform. No integrations. No data silos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="gradient-primary text-base px-8" asChild>
                <Link to="/signup">Start Free <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/features">See All Features</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MODULES GRID */}
      <section className="py-16 pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                custom={i % 3}
              >
                <Card className="h-full border-border hover:shadow-lg transition-all duration-300 group overflow-hidden">
                  <div className={`h-1 w-full bg-gradient-to-r ${mod.color}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0`}>
                        <mod.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">{mod.category}</Badge>
                        </div>
                        <CardTitle className="text-lg leading-tight">{mod.title}</CardTitle>
                        <p className="text-sm text-primary font-medium mt-0.5">{mod.tagline}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{mod.description}</p>
                    <ul className="space-y-1.5 mb-5">
                      {mod.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary p-0 h-auto font-medium group-hover:underline" asChild>
                      <Link to={mod.link}>
                        Explore {mod.title} <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERCONNECTION CALLOUT */}
      <section className="py-20 bg-muted/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4">Why TELA is Different</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Not Just Modules — An Ecosystem</h2>
            <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
              Every module talks to every other. A sale updates inventory and creates an accounting entry. A production order consumes raw materials and moves finished goods.
              Payroll generates journal entries. Everything is connected, in real time.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 text-left">
              {[
                { icon: Layers, title: 'Real-Time Sync', desc: 'Every transaction updates all related modules instantly — no batch processing, no delays.' },
                { icon: Globe, title: 'Multi-Currency', desc: '165+ currencies with live rates. Every transaction, report, and invoice in the currency you choose.' },
                { icon: Shield, title: 'Row-Level Security', desc: 'Enterprise-grade data isolation. Each tenant sees only their own data, enforced at the database layer.' },
              ].map((item, i) => (
                <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  <Card className="border-border h-full">
                    <CardContent className="p-5">
                      <item.icon className="w-5 h-5 text-primary mb-3" />
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="rounded-2xl gradient-primary p-10 md:p-16 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-primary-foreground blur-3xl" />
                <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-primary-foreground blur-3xl" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                  All 12 Modules. Zero Cost.
                </h2>
                <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
                  TELA-ERP is free and open source. Get every module, fully featured, with no subscription required.
                </p>
                <Button size="lg" variant="secondary" className="text-base px-8" asChild>
                  <Link to="/signup">Create Your Free Account <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">TELA-ERP</span>
            <span>— Free &amp; Open Source</span>
          </div>
          <span className="text-xs">© 2026 Erick Elibariki Olomi — +255 752 401 012 | Erick.olomi@primeauditors.co.tz</span>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
