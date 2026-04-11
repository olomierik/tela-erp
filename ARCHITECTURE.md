# TELA-ERP Architecture

> Last updated: 2026-04-09 | Branch: `claude/continue-tela-erp-8NAgI`

---

## 1. System Overview

TELA-ERP is a multi-tenant, SaaS ERP platform built for African SMEs. It covers 17 business modules (Sales, Inventory, Accounting, HR, POS, Fleet, Maintenance, etc.) and is sold under three subscription tiers: **Starter** (free), **Premium** ($6/mo), and **Enterprise** ($13/mo).

**Target users:** Small-to-medium businesses across 13 identified industries (retail, manufacturing, logistics, healthcare, etc.). Resellers can white-label the platform and manage multiple client companies.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 (functional components + hooks) |
| Language | TypeScript 5 (strict mode) |
| Build tool | Vite 5 + `@vitejs/plugin-react-swc` |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| Animations | Framer Motion |
| State / server cache | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 (`<BrowserRouter>`) |
| Backend / database | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Supabase client | `@supabase/supabase-js` v2 |
| Charts | Recharts |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | xlsx (SheetJS) |
| OCR | Tesseract.js |
| Notifications | Sonner (toasts) |
| SEO | react-helmet-async |
| Desktop (optional) | Electron + electron-builder |

---

## 3. Project Structure

```
tela-erp/
├── src/
│   ├── __tests__/          # Boundary/unit tests (Vitest)
│   ├── assets/             # Static images (logo, hero, payment QR)
│   ├── components/
│   │   ├── auth/           # ProtectedRoute, guards
│   │   ├── company/        # CompanySwitcher, CompanyCreationDialog
│   │   ├── erp/            # Shared ERP components (DataTable, PageHeader, SubscriptionGate…)
│   │   ├── layout/         # AppLayout, AppSidebar, TopBar, AiAssistant
│   │   └── ui/             # shadcn/ui primitives + custom (CommandPalette, WhatsAppButton…)
│   ├── contexts/           # React Context providers (see §5)
│   ├── data/               # Static data (blog-posts.ts)
│   ├── hooks/              # Custom hooks (use-tenant-query, use-realtime, use-cross-module…)
│   ├── integrations/
│   │   ├── lovable/        # Lovable platform integration
│   │   └── supabase/       # Auto-generated Supabase types + client alias
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client instance (VITE_SUPABASE_URL + ANON_KEY)
│   │   ├── telemetry.ts    # Page view / event / timing tracking (localStorage)
│   │   ├── web-vitals.ts   # FCP, LCP, CLS, FID, INP via PerformanceObserver
│   │   ├── error-monitoring.ts  # Global error + unhandledRejection listeners
│   │   └── utils.ts        # `cn()` Tailwind class merger
│   ├── pages/
│   │   ├── admin/          # TelemetryDashboard (/admin/telemetry)
│   │   ├── accounting/     # Vouchers, VoucherForm, LedgerView, FinancialReports + ledger/
│   │   ├── auth/           # Login, Signup, ForgotPassword, ResetPassword, JoinInvite
│   │   └── storefront/     # Public storefront pages (StorefrontHome, Checkout, Layout)
│   │   └── *.tsx           # 40+ top-level module pages
│   ├── test/
│   │   └── setup.ts        # @testing-library/jest-dom matchers setup
│   └── types/
│       └── erp.ts          # Shared TypeScript types (Tenant, UserRole, etc.)
├── supabase/
│   └── migrations/         # 60+ ordered SQL migration files
├── ARCHITECTURE.md         # This file
├── DEPLOYMENT.md           # Deployment guide
├── SECURITY_AUDIT.md       # Security audit findings
├── DEPENDENCIES.md         # Dependency inventory
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 4. Multi-Tenancy Architecture

Every row of user data is scoped to a tenant via a `tenant_id UUID` column. Data isolation is enforced at **two independent layers**:

### Layer 1 — Application (hooks)
`useTenantQuery`, `useTenantInsert`, `useTenantUpdate`, `useTenantDelete` in `src/hooks/use-tenant-query.ts` always add `.eq('tenant_id', tenant.id)` to every query and inject `tenant_id` into every insert. An update/delete also filters by `tenant_id` to prevent IDOR attacks.

### Layer 2 — Database (Row Level Security)
Every table has RLS enabled with policies that call the DB function `get_user_tenant_id(auth.uid())`. This resolves the authenticated user's tenant from the `profiles` table and compares it to the row's `tenant_id`:

```sql
CREATE POLICY "tenant_select" ON public.some_table
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
```

Even if a bug bypassed the application layer, the database would block cross-tenant reads/writes.

### Multi-Company (Reseller) Support
A reseller can manage multiple tenant companies via the `user_companies` table. On login, `AuthContext.fetchUserData()` checks `localStorage['tela_active_tenant']` and validates the user's membership before activating a different tenant. Switching companies changes `tenant.id` which cascades through all queries automatically.

---

## 5. Context Providers (State Management)

Providers are nested in `src/App.tsx` in this order (outer → inner):

```
HelmetProvider
  QueryClientProvider          (TanStack Query cache)
    ThemeProvider              (dark/light mode)
      AuthProvider             (auth session, user, tenant, role, isDemo)
        CurrencyProvider       (active currency + formatMoney)
          StoreProvider        (multi-store: selectedStoreId)
            ModulesProvider    (subscription tier, active modules, onboarding state)
              SidebarProvider  (collapsed state)
```

### Key Contexts

| Context | File | Responsibility |
|---------|------|---------------|
| `AuthContext` | `contexts/AuthContext.tsx` | Supabase auth session, user profile, active tenant, demo mode |
| `ModulesContext` | `contexts/ModulesContext.tsx` | Subscription tier enforcement, active modules, industry presets, onboarding state |
| `CurrencyContext` | `contexts/CurrencyContext.tsx` | Currency code, symbol, formatMoney() |
| `StoreContext` | `contexts/StoreContext.tsx` | Multi-store selection (for tenants with multiple retail locations) |
| `SidebarContext` | `contexts/SidebarContext.tsx` | Sidebar collapsed/expanded state |
| `ThemeContext` | `contexts/ThemeContext.tsx` | Dark/light theme (wraps next-themes) |

---

## 6. Authentication Flow

```
App loads
  └─ supabase.auth.getSession()
       ├─ Session exists → fetchUserData(userId)
       │    ├─ Load profile (profiles table)
       │    ├─ Resolve active tenant (own or switched-to via localStorage)
       │    ├─ Validate multi-company membership (user_companies)
       │    └─ Load role (user_roles table)
       └─ No session → enableDemoMode()
              sets isDemo=true, user=mock, tenant=DEMO_TENANT (premium tier)
```

**Demo mode**: No real Supabase calls for reads. `useTenantQuery` returns `[]` when `isDemo=true`; pages render `demoData` arrays instead. Demo always gets `premium` tier.

**Protected routes**: `<ProtectedRoute>` redirects to `/login` if `user === null`. Demo users have a mock `user` object, so they pass the check (intended — demo shows the full app).

**Company switching**: Stored in `localStorage['tela_active_tenant']`. On next `fetchUserData()`, the preferred tenant is validated against `user_companies` before activation.

---

## 7. Subscription & Module System

### Tiers

| Tier | Price | Modules | Max Users |
|------|-------|---------|-----------|
| `starter` | Free | Sales, Inventory | 1 |
| `premium` | $6/mo | All 17 modules | 5 |
| `enterprise` | $13/mo | All 17 modules | Unlimited |

### Enforcement

`ModulesContext` resolves the tier from `tenant.subscription_tier`. `isModuleActive(key)` returns `true` only when:
1. The tier allows the module (`TIER_MODULES[tier].includes(key)`)
2. The user has selected the module in their preferences

`AppSidebar` and `SubscriptionGate` use `isModuleActive()` to hide/lock unavailable modules.

### Onboarding

First-time users (no `localStorage['tela_modules_{tenantId}']`) are redirected to `/onboarding` where they pick an industry preset. This sets their initial active modules. Company-switchers (where `profile.tenant_id !== tenant.id`) skip onboarding and get defaults.

---

## 8. Data Layer

### Supabase Client

Two client entry points (aliased to each other):
- `src/lib/supabase.ts` — used directly by AuthContext
- `src/integrations/supabase/client.ts` — used by hooks and most pages

Both read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment.

### Query Pattern

```typescript
// Read
const { data, isLoading } = useTenantQuery('sales_orders');

// Write
const insert = useTenantInsert('sales_orders');
await insert.mutateAsync({ product_id: '...', quantity: 5 });

// Update (IDOR-safe: filters by tenant_id + id)
const update = useTenantUpdate('sales_orders');
await update.mutateAsync({ id: '...', status: 'shipped' });

// Delete (IDOR-safe)
const del = useTenantDelete('sales_orders');
await del.mutateAsync('record-uuid');
```

All mutations auto-invalidate their query key, triggering a re-fetch. `tenant_id` is injected automatically — callers never pass it manually.

---

## 9. Routing

All routes are defined in `src/App.tsx`. Key groups:

| Group | Pattern | Guard |
|-------|---------|-------|
| Public marketing | `/`, `/features`, `/pricing`, `/about`, `/blog/*` | None |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/join/:id` | Redirect to `/dashboard` if already authed |
| App (protected) | `/dashboard`, `/sales`, `/inventory`, etc. | `<ProtectedRoute>` |
| Accounting sub-routes | `/accounting/vouchers`, `/accounting/ledger/*` | `<ProtectedRoute>` |
| Storefront | `/store/:slug/*` | None (public) |
| Admin | `/admin/telemetry` | None (access via direct URL) |
| Settings | `/settings`, `/settings/team`, `/settings/readiness` | `<ProtectedRoute>` |

All app pages are wrapped in `<AppLayout>` which renders `AppSidebar` + `TopBar` and redirects to `/onboarding` if `!onboardingCompleted`.

---

## 10. Module Inventory

| ModuleKey | Label | DB Tables | Min Tier |
|-----------|-------|-----------|----------|
| `sales` | Sales | `sales_orders`, `invoices`, `invoice_lines` | starter |
| `inventory` | Inventory | `inventory_items`, `inventory_transactions`, `inventory_adjustments`, `categories` | starter |
| `accounting` | Accounting | `chart_of_accounts`, `journal_entries`, `transactions`, `tax_rates`, `recurring_templates` | premium |
| `procurement` | Procurement | `purchase_orders`, `suppliers` | premium |
| `production` | Production | `production_orders`, `bom_templates`, `bom_lines` | premium |
| `hr` | HR & Payroll | `employees`, `departments`, `attendance_logs`, `leave_requests`, `payroll_runs`, `payroll_lines` | premium |
| `crm` | CRM | `crm_deals`, `crm_activities`, `customers` | premium |
| `projects` | Projects | `projects`, `project_tasks` | premium |
| `marketing` | Marketing | `campaigns` | premium |
| `assets` | Fixed Assets | `fixed_assets` | premium |
| `expenses` | Expenses | `expense_claims`, `expense_items` | premium |
| `budgets` | Budgets | `budgets`, `budget_lines` | premium |
| `fleet` | Fleet | `vehicles`, `vehicle_services`, `fuel_logs` | premium |
| `maintenance` | Maintenance | `maintenance_requests`, `equipment` | premium |
| `pos` | Point of Sale | `pos_sessions`, `pos_orders`, `pos_order_lines` | premium |
| `subscriptions` | Subscriptions | `subscriptions`, `subscription_plans` | premium |
| `ai` | AI Intelligence | (uses Anthropic API via AICFOAssistant page) | premium |

---

## 11. Key Database Tables

### Core (always present)

```sql
tenants          -- id, name, slug, subscription_tier, primary_color, is_active
profiles         -- id, user_id (FK auth.users), tenant_id, email, full_name, phone
user_roles       -- id, user_id, tenant_id, role (admin|manager|staff|viewer|reseller)
user_companies   -- user_id, tenant_id, role, is_active  (multi-company membership)
stores           -- id, tenant_id, name, address  (multi-location retail)
notifications    -- id, tenant_id, user_id, title, body, read_at
team_invites     -- id, tenant_id, email, role, token, status, expires_at
```

### Relationships
- `profiles.tenant_id → tenants.id` (primary company)
- `user_companies` allows one user to belong to multiple tenants
- Every module table: `tenant_id → tenants.id ON DELETE CASCADE`

---

## 12. Security Model

- **RLS on all tables**: No table is readable/writable without a matching `tenant_id = get_user_tenant_id(auth.uid())`
- **`tenant_secrets`**: deny-all (no client RLS policy) — only accessible via Edge Functions with service role
- **ANON key**: Safe to expose in frontend — RLS ensures the anon key can only read public data
- **Service role key**: Never in frontend code. Only used in Edge Functions or migrations
- **XSS mitigation**: DOMPurify on all `dangerouslySetInnerHTML`; `escHtml()` on DB values in `document.write()` print windows
- **IDOR mitigation**: `useTenantUpdate/Delete` always filter by `tenant_id` in addition to `id`
- **OAuth pre-fill**: Stored in `sessionStorage` (clears on tab close), not `localStorage`

---

## 13. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (safe to expose) |

Create `.env.local` at the project root with these two values. Never commit `.env.local`.

---

## 14. Telemetry

Browser-side telemetry with no external service dependency:

| Store | Data | Cap |
|-------|------|-----|
| `tela_error_log` | React ErrorBoundary catches, with stack traces | 10 entries |
| `tela_perf_log` | Page view events + time-since-last-view | 100 entries |
| `tela_event_log` | Custom business events | 100 entries |
| `tela_vitals_log` | Web Vitals (FCP, LCP, CLS, FID, INP, TTFB) | 100 entries |

View at `/admin/telemetry`. Export as JSON or clear from the dashboard UI.
