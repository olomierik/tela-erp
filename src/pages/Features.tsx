import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, Package, DollarSign, ShoppingCart, Users, Bot, Shield,
  ChevronRight, Zap, BarChart3, Globe, Lock, Cpu, FileText,
  Truck, Factory, Wrench, ClipboardList, Store, CreditCard,
  Receipt, Building2, FolderKanban, Megaphone, Car, HardHat,
  Layers, ScanLine, BookOpen,
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
      'Inventory adjustments with reason tracking',
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
      'Sales orders with automatic inventory deduction',
      'Customer management with segmentation and tiers',
      'CRM deals pipeline with stage tracking',
      'CRM activities logging (calls, meetings, emails)',
      'Automatic invoice generation on order fulfillment',
      'Sales performance dashboards and reports',
    ],
  },
  {
    id: 'pos',
    icon: CreditCard,
    label: 'Point of Sale',
    headline: 'Fast, reliable POS that syncs with your entire operation.',
    description:
      'Ring up sales in-store or on the go. Every POS transaction instantly updates your inventory, accounting, and customer records.',
    bullets: [
      'Quick checkout with product search',
      'Real-time inventory sync on every sale',
      'Session-based cash management',
      'Customer-linked transactions for loyalty tracking',
      'Works across multiple store locations',
      'Integrated with accounting for automatic journal entries',
    ],
  },
  {
    id: 'procurement',
    icon: ClipboardList,
    label: 'Procurement',
    headline: 'Streamline purchasing from request to receipt.',
    description:
      'Manage vendors, create purchase orders, and receive goods — all with automatic stock updates and accounting entries.',
    bullets: [
      'Vendor/supplier management with contact details',
      'Purchase order creation and approval workflows',
      'Goods receipt with automatic stock-in',
      'Purchase order line items linked to inventory',
      'Supplier performance tracking',
      'Auto accounting voucher on goods receipt',
    ],
  },
  {
    id: 'production',
    icon: Factory,
    label: 'Production & Manufacturing',
    headline: 'From raw materials to finished goods, fully tracked.',
    description:
      'Plan production runs using Bills of Materials, track work-in-progress, and automatically update inventory when production completes.',
    bullets: [
      'Bill of Materials (BOM) with component tracking',
      'Production orders with status workflows',
      'Automatic finished goods stock-in on completion',
      'Raw material consumption tracking',
      'Quality checks integration',
      'Work center management',
    ],
  },
  {
    id: 'finance',
    icon: DollarSign,
    label: 'Accounting & Finance',
    headline: 'Full double-entry accounting built into every transaction.',
    description:
      'Every sale, purchase, and production run automatically generates the correct journal entries. No manual bookkeeping — just accurate, real-time financials.',
    bullets: [
      'Double-entry bookkeeping with auto journal entries',
      'Chart of Accounts seeded per business type',
      'Accounting vouchers (payment, receipt, journal, sale, purchase)',
      'Ledger balances updated in real-time',
      'Invoices with line items and PDF generation',
      'Multi-currency support with live exchange rates',
    ],
  },
  {
    id: 'budgets',
    icon: BarChart3,
    label: 'Budgets & Expenses',
    headline: 'Plan, track, and control spending across your business.',
    description:
      'Set department and store-level budgets, track actuals against plans, and manage employee expense claims with approval workflows.',
    bullets: [
      'Budget creation by department and fiscal year',
      'Budget lines with monthly/yearly tracking',
      'Budget vs actuals variance analysis',
      'Expense claims with approval workflows',
      'Expense items with receipt uploads',
      'Integrated with accounting for auto entries',
    ],
  },
  {
    id: 'hr',
    icon: Users,
    label: 'HR & Payroll',
    headline: 'Manage your people with the same precision as your inventory.',
    description:
      'A complete human resources suite that handles employee records, attendance, leave, departments, and payroll.',
    bullets: [
      'Employee profiles with department assignment',
      'Attendance tracking and daily logs',
      'Leave request management with approval',
      'Payroll runs with salary and allowances',
      'Department and position management',
      'Employee contracts and employment types',
    ],
  },
  {
    id: 'projects',
    icon: FolderKanban,
    label: 'Projects & Tasks',
    headline: 'Plan projects, assign tasks, and track time — all in one place.',
    description:
      'Manage client projects with task breakdowns, time tracking, and progress dashboards integrated with your financial data.',
    bullets: [
      'Project creation with budgets and deadlines',
      'Task assignment with status tracking',
      'Timesheet logging per employee',
      'Project cost tracking and profitability',
      'Kanban and list views for tasks',
      'Linked to customers for billing',
    ],
  },
  {
    id: 'marketing',
    icon: Megaphone,
    label: 'Marketing & Campaigns',
    headline: 'Run campaigns, track leads, and measure ROI.',
    description:
      'Plan multi-channel marketing campaigns, track spending vs budget, and measure lead generation — all tied to your sales pipeline.',
    bullets: [
      'Campaign management with budget tracking',
      'Multi-channel support (email, social, ads)',
      'Lead generation tracking per campaign',
      'Spend vs budget monitoring',
      'Campaign performance dashboards',
      'Integrated with CRM deals pipeline',
    ],
  },
  {
    id: 'fleet',
    icon: Car,
    label: 'Fleet Management',
    headline: 'Track vehicles, fuel, and maintenance in one dashboard.',
    description:
      'Manage your fleet of vehicles with fuel logging, service scheduling, and cost tracking for logistics-driven businesses.',
    bullets: [
      'Vehicle registry with details and status',
      'Fuel log tracking with cost per unit',
      'Vehicle service and maintenance scheduling',
      'Mileage tracking per vehicle',
      'Fleet cost analysis and reports',
      'Driver assignment and history',
    ],
  },
  {
    id: 'maintenance',
    icon: Wrench,
    label: 'Maintenance & Equipment',
    headline: 'Keep your equipment running and your downtime minimal.',
    description:
      'Track equipment, schedule preventive maintenance, and manage work requests to maximize asset uptime.',
    bullets: [
      'Equipment registry with serial numbers',
      'Maintenance request management',
      'Preventive maintenance scheduling',
      'Warranty and acquisition tracking',
      'Technician assignment per equipment',
      'Equipment category and location tracking',
    ],
  },
  {
    id: 'assets',
    icon: Building2,
    label: 'Fixed Assets',
    headline: 'Track, depreciate, and manage every asset your business owns.',
    description:
      'Maintain a full register of fixed assets with automated depreciation calculations and GL account linking.',
    bullets: [
      'Asset register with purchase cost and dates',
      'Multiple depreciation methods (straight-line, reducing balance)',
      'Accumulated depreciation tracking',
      'Asset condition and location management',
      'GL account linking for accounting',
      'Asset disposal and write-off workflows',
    ],
  },
  {
    id: 'storefront',
    icon: Store,
    label: 'Online Store',
    headline: 'Sell online with a storefront connected to your ERP.',
    description:
      'Build a storefront that automatically creates sales orders, updates inventory, and manages customers — no third-party e-commerce needed.',
    bullets: [
      'Product catalog from your inventory',
      'Customer checkout with order creation',
      'Auto sales order generation from storefront orders',
      'Customer auto-creation from checkout details',
      'Inventory sync on every storefront sale',
      'Shipping address and contact management',
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
      'Automated document scanning and data extraction (OCR)',
      'Smart reorder recommendations based on sales velocity',
      'AI-generated business health summaries',
      'Configurable AI model per tenant',
    ],
  },
  {
    id: 'platform',
    icon: Shield,
    label: 'Platform & Security',
    headline: 'Enterprise-grade security with multi-tenant architecture.',
    description:
      'Built with Row Level Security at its core, TELA ensures each business sees only their own data — with multi-store, white-labeling, and reseller capabilities.',
    bullets: [
      'Row Level Security — total data isolation per tenant',
      'Role-based access control (admin, store_admin, user, viewer)',
      'Multi-store support with store-scoped data',
      'White-label: custom logo, colors, and domain per tenant',
      'Reseller portal to manage and onboard client businesses',
      'Audit logs for every critical action across all modules',
    ],
  },
  {
    id: 'automation',
    icon: Zap,
    label: 'Automation & Integrations',
    headline: 'Automate workflows and connect to external services.',
    description:
      'Set up trigger-based automation rules, API access, and real-time data sync across all modules.',
    bullets: [
      'Automation rules with trigger conditions and actions',
      'Real-time data sync via Realtime subscriptions',
      'API keys management for external integrations',
      'Auto accounting entries on sales, purchases, production',
      'Auto invoice generation on sales order fulfillment',
      'Webhook-style event-driven workflows',
    ],
  },
];

const allModules = [
  { name: 'Inventory', icon: Package },
  { name: 'Sales & CRM', icon: ShoppingCart },
  { name: 'Point of Sale', icon: CreditCard },
  { name: 'Procurement', icon: ClipboardList },
  { name: 'Production', icon: Factory },
  { name: 'Accounting', icon: DollarSign },
  { name: 'Budgets & Expenses', icon: BarChart3 },
  { name: 'HR & Payroll', icon: Users },
  { name: 'Projects & Tasks', icon: FolderKanban },
  { name: 'Marketing', icon: Megaphone },
  { name: 'Fleet Management', icon: Car },
  { name: 'Maintenance', icon: Wrench },
  { name: 'Fixed Assets', icon: Building2 },
  { name: 'Online Store', icon: Store },
  { name: 'AI Intelligence', icon: Bot },
  { name: 'Reports & Analytics', icon: BarChart3 },
  { name: 'Automation', icon: Zap },
];

export default function Features() {
  const [activeSection, setActiveSection] = useState('inventory');
  const active = featureSections.find((s) => s.id === activeSection)!;
  const ActiveIcon = active.icon;

  return (
    <div className="min-h-screen bg-background text-foreground font-['Plus_Jakarta_Sans',sans-serif]">
      <Helmet>
        <title>Features — TELA-ERP | Inventory, Sales, Production, Accounting & More</title>
        <meta name="description" content="Explore TELA-ERP's full feature set: inventory management, sales & POS, production, double-entry accounting, procurement, HR & payroll, AI insights, and more." />
        <link rel="canonical" href="https://tela-erp.com/features" />
        <meta property="og:title" content="Features — TELA-ERP | All-in-One ERP for SMEs" />
        <meta property="og:description" content="17+ integrated ERP modules — inventory, sales, production, accounting, HR, AI & more. $100/year for unlimited access." />
        <meta property="og:url" content="https://tela-erp.com/features" />
      </Helmet>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/features" className="text-primary">Features</Link>
            <Link to="/modules" className="text-muted-foreground hover:text-foreground transition-colors">Modules</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 py-24 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="max-w-4xl mx-auto px-4"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            Full Feature Overview
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Everything You Need to Run{' '}
            <span className="text-primary">a Modern Business</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            TELA-ERP unifies 17+ interconnected modules — from inventory to AI — so every part of your business talks to every other part, automatically.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" asChild>
              <Link to="/signup">Start for free <ChevronRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">View pricing</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ALL MODULES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">All Modules at a Glance</h2>
          <p className="text-muted-foreground">Every module included in one simple plan — $100/year.</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {allModules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 bg-card hover:shadow-md transition-shadow text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-semibold">{mod.name}</span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FEATURE SECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Deep Dive into Features</h2>
          <p className="text-muted-foreground">Click a module to explore what it offers.</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Tab list */}
          <div className="lg:w-64 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Feature Areas</p>
            <div className="flex flex-row lg:flex-col gap-2 flex-wrap max-h-[60vh] lg:max-h-none overflow-y-auto">
              {featureSections.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full ${
                      activeSection === s.id
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">{s.label}</span>
                    <span className="lg:hidden text-xs">{s.label}</span>
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
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ActiveIcon className="w-6 h-6 text-primary" />
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
                      <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-accent" />
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

      {/* CTA */}
      <section className="py-24 text-center bg-muted/30">
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
          <p className="text-muted-foreground mb-2">
            All 17+ modules included. One simple plan.
          </p>
          <p className="text-2xl font-bold text-primary mb-8">$100/year</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" asChild>
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
