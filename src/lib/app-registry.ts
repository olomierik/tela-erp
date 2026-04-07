/**
 * App Registry — Odoo-style installable modules/apps catalog.
 * Each app has a unique key, category, icon name, and metadata.
 * Apps that match existing routes are "core" and always available.
 */

export interface AppDefinition {
  key: string;
  name: string;
  summary: string;
  description: string;
  category: AppCategory;
  icon: string; // lucide icon name
  color: string; // HSL-based tailwind class for the icon bg
  routes: string[]; // routes this app enables in sidebar
  dependencies?: string[]; // other app keys required
  isCore?: boolean; // core apps are always installed
  tags?: string[];
}

export type AppCategory =
  | 'sales'
  | 'finance'
  | 'inventory'
  | 'manufacturing'
  | 'hr'
  | 'marketing'
  | 'services'
  | 'productivity';

export const APP_CATEGORIES: Record<AppCategory, { label: string; description: string }> = {
  sales: { label: 'Sales', description: 'Manage your sales pipeline, orders, and customer relationships' },
  finance: { label: 'Finance & Accounting', description: 'Accounting, invoicing, expenses, and financial reports' },
  inventory: { label: 'Inventory & Supply Chain', description: 'Warehouse, procurement, and stock management' },
  manufacturing: { label: 'Manufacturing', description: 'Production planning, BOMs, and shop floor control' },
  hr: { label: 'Human Resources', description: 'Employee management, payroll, recruitment, and timesheets' },
  marketing: { label: 'Marketing', description: 'Campaigns, email marketing, and social media' },
  services: { label: 'Services', description: 'Project management, helpdesk, and field service' },
  productivity: { label: 'Productivity', description: 'Tools to boost team collaboration and efficiency' },
};

export const APP_CATALOG: AppDefinition[] = [
  // ─── Core (always installed) ─────────────────────────────────
  {
    key: 'dashboard',
    name: 'Dashboard',
    summary: 'Central business overview',
    description: 'Real-time KPIs, charts, and activity feed for your business at a glance.',
    category: 'productivity',
    icon: 'LayoutDashboard',
    color: 'bg-blue-500',
    routes: ['/dashboard'],
    isCore: true,
  },
  {
    key: 'settings',
    name: 'Settings',
    summary: 'System configuration',
    description: 'Company info, team management, integrations, and preferences.',
    category: 'productivity',
    icon: 'Settings',
    color: 'bg-gray-500',
    routes: ['/settings'],
    isCore: true,
  },

  // ─── Sales ───────────────────────────────────────────────────
  {
    key: 'crm',
    name: 'CRM',
    summary: 'Track leads & close deals',
    description: 'Manage your sales pipeline with a visual Kanban board, activity tracking, and deal forecasting.',
    category: 'sales',
    icon: 'UserCircle',
    color: 'bg-purple-500',
    routes: ['/crm'],
    tags: ['pipeline', 'leads', 'deals'],
  },
  {
    key: 'sales',
    name: 'Sales',
    summary: 'Quotes, orders & invoicing',
    description: 'Create quotations, manage sales orders, and track order fulfillment from a single interface.',
    category: 'sales',
    icon: 'ShoppingCart',
    color: 'bg-green-500',
    routes: ['/sales'],
    tags: ['orders', 'quotes'],
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    summary: 'Professional invoices & payments',
    description: 'Generate, send, and track invoices. Automate payment reminders and aging reports.',
    category: 'sales',
    icon: 'FileText',
    color: 'bg-emerald-500',
    routes: ['/invoices'],
    tags: ['billing', 'payments'],
  },
  {
    key: 'customers',
    name: 'Customers',
    summary: 'Customer database',
    description: 'Centralized customer records with contact details, credit limits, and transaction history.',
    category: 'sales',
    icon: 'Users',
    color: 'bg-sky-500',
    routes: ['/customers'],
  },

  // ─── Finance ─────────────────────────────────────────────────
  {
    key: 'accounting',
    name: 'Accounting',
    summary: 'Double-entry bookkeeping',
    description: 'Full chart of accounts, journal entries, vouchers, ledger views, and automated postings.',
    category: 'finance',
    icon: 'Calculator',
    color: 'bg-indigo-500',
    routes: ['/accounting', '/accounting/vouchers', '/accounting/ledger', '/accounting/reports'],
    tags: ['ledger', 'journals', 'vouchers'],
  },
  {
    key: 'expenses',
    name: 'Expenses',
    summary: 'Track & approve expenses',
    description: 'Employee expense claims with receipt scanning, approval workflows, and reimbursement tracking.',
    category: 'finance',
    icon: 'Receipt',
    color: 'bg-orange-500',
    routes: ['/expenses'],
  },
  {
    key: 'budgets',
    name: 'Budgets',
    summary: 'Plan & control spending',
    description: 'Create departmental budgets, track actual vs. planned, and get variance alerts.',
    category: 'finance',
    icon: 'PiggyBank',
    color: 'bg-pink-500',
    routes: ['/budgets'],
  },
  {
    key: 'fixed-assets',
    name: 'Fixed Assets',
    summary: 'Asset lifecycle management',
    description: 'Register assets, compute depreciation schedules, and track asset disposals.',
    category: 'finance',
    icon: 'Landmark',
    color: 'bg-amber-600',
    routes: ['/assets'],
  },

  // ─── Inventory & Supply Chain ────────────────────────────────
  {
    key: 'inventory',
    name: 'Inventory',
    summary: 'Warehouse & stock control',
    description: 'Multi-warehouse inventory with real-time stock levels, reorder rules, and barcode support.',
    category: 'inventory',
    icon: 'Package',
    color: 'bg-teal-500',
    routes: ['/inventory'],
    tags: ['warehouse', 'stock'],
  },
  {
    key: 'procurement',
    name: 'Purchase',
    summary: 'Purchase orders & receiving',
    description: 'Create POs, manage supplier quotes, automate reordering, and track goods receipts.',
    category: 'inventory',
    icon: 'Truck',
    color: 'bg-cyan-600',
    routes: ['/procurement'],
    tags: ['purchasing', 'suppliers'],
  },
  {
    key: 'suppliers',
    name: 'Suppliers',
    summary: 'Vendor management',
    description: 'Maintain supplier database with contact info, payment terms, and performance ratings.',
    category: 'inventory',
    icon: 'UserPlus',
    color: 'bg-slate-500',
    routes: ['/suppliers'],
  },
  {
    key: 'transfers',
    name: 'Stock Transfers',
    summary: 'Inter-warehouse transfers',
    description: 'Move stock between warehouses and locations with full audit trail.',
    category: 'inventory',
    icon: 'ArrowRightLeft',
    color: 'bg-violet-500',
    routes: ['/transfers'],
  },

  // ─── Manufacturing ───────────────────────────────────────────
  {
    key: 'manufacturing',
    name: 'Manufacturing',
    summary: 'Production & BOMs',
    description: 'Define bills of materials, plan production orders, and track work-in-progress on the shop floor.',
    category: 'manufacturing',
    icon: 'Factory',
    color: 'bg-red-500',
    routes: ['/production'],
    tags: ['production', 'bom'],
  },

  // ─── HR ──────────────────────────────────────────────────────
  {
    key: 'hr',
    name: 'HR & Payroll',
    summary: 'People management',
    description: 'Employee records, payroll processing, leave management, and attendance tracking.',
    category: 'hr',
    icon: 'Briefcase',
    color: 'bg-rose-500',
    routes: ['/hr'],
    tags: ['payroll', 'employees', 'leave'],
  },

  // ─── Marketing ───────────────────────────────────────────────
  {
    key: 'marketing',
    name: 'Marketing',
    summary: 'Campaigns & analytics',
    description: 'Plan multi-channel campaigns, track ROI, and manage marketing budgets.',
    category: 'marketing',
    icon: 'Megaphone',
    color: 'bg-fuchsia-500',
    routes: ['/marketing'],
    tags: ['campaigns', 'email'],
  },

  // ─── Services ────────────────────────────────────────────────
  {
    key: 'projects',
    name: 'Projects',
    summary: 'Task & project management',
    description: 'Plan projects with Kanban boards, Gantt charts, task assignments, and time tracking.',
    category: 'services',
    icon: 'FolderKanban',
    color: 'bg-lime-600',
    routes: ['/projects'],
    tags: ['tasks', 'timesheets'],
  },

  // ─── Productivity ────────────────────────────────────────────
  {
    key: 'ai-assistant',
    name: 'AI Assistant',
    summary: 'AI-powered business insights',
    description: 'Ask questions about your business data, get AI-generated reports, and automate routine decisions.',
    category: 'productivity',
    icon: 'Brain',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    routes: ['/ai-cfo'],
    tags: ['ai', 'analytics'],
  },
  {
    key: 'online-store',
    name: 'Online Store',
    summary: 'E-commerce storefront',
    description: 'Launch a customer-facing online store synced with your inventory and order management.',
    category: 'sales',
    icon: 'Globe',
    color: 'bg-blue-600',
    routes: ['/online-store'],
    tags: ['ecommerce', 'shop'],
  },
  {
    key: 'doc-scanner',
    name: 'Document Scanner',
    summary: 'OCR & document digitization',
    description: 'Scan receipts, invoices, and documents using AI-powered OCR and auto-file them.',
    category: 'productivity',
    icon: 'ScanLine',
    color: 'bg-yellow-500',
    routes: ['/documents'],
  },
  {
    key: 'reports',
    name: 'Reports',
    summary: 'Business intelligence',
    description: 'Pre-built and custom reports across all modules with export to PDF and Excel.',
    category: 'productivity',
    icon: 'BarChart3',
    color: 'bg-indigo-600',
    routes: ['/reports'],
  },
  {
    key: 'stores',
    name: 'Multi-Store',
    summary: 'Location management',
    description: 'Manage multiple business locations with separate inventory, staff, and reporting.',
    category: 'productivity',
    icon: 'Store',
    color: 'bg-emerald-600',
    routes: ['/stores'],
  },
];

/** Get app definition by key */
export function getAppByKey(key: string): AppDefinition | undefined {
  return APP_CATALOG.find(a => a.key === key);
}

/** Get all apps in a category */
export function getAppsByCategory(category: AppCategory): AppDefinition[] {
  return APP_CATALOG.filter(a => a.category === category);
}

/** Get core apps (always installed) */
export function getCoreApps(): AppDefinition[] {
  return APP_CATALOG.filter(a => a.isCore);
}

/** Get installable (non-core) apps */
export function getInstallableApps(): AppDefinition[] {
  return APP_CATALOG.filter(a => !a.isCore);
}
