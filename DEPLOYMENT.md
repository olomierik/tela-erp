# TELA-ERP Deployment Guide

> Last updated: 2026-04-09

---

## 1. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20 LTS | v22 used in CI |
| npm | ≥ 10 | Bundled with Node 20+ |
| Supabase CLI | latest | `npm i -g supabase` |
| Git | any | For cloning |

---

## 2. Environment Variables

Create `.env.local` at the project root. **Never commit this file.**

```bash
# .env.local — copy this template, fill in your values
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find these values:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project → **Settings → API**
3. Copy `Project URL` → `VITE_SUPABASE_URL`
4. Copy `anon public` key → `VITE_SUPABASE_ANON_KEY`

The anon key is safe to include in the frontend bundle — Row Level Security (RLS) on the database prevents unauthorized data access regardless of who holds the key.

> **Never** put the `service_role` key in the frontend. It bypasses all RLS.

---

## 3. Local Development

```bash
# Clone the repo
git clone https://github.com/olomierik/tela-erp.git
cd tela-erp

# Install dependencies
npm install

# Create env file
cp .env.example .env.local   # if .env.example exists, otherwise create manually
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server (port 8080)
npm run dev
```

The app opens at `http://localhost:8080`. Hot module replacement is enabled.

### Local Supabase (optional)

To develop without a remote Supabase project:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase stack (Postgres + Auth + Studio)
supabase start

# Apply all migrations
supabase db push

# The CLI prints local URLs and keys — use those in .env.local
```

---

## 4. Supabase Project Setup (Production)

### 4.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users (e.g. `eu-west-1` for Africa)
3. Set a strong database password and save it

### 4.2 Run Migrations

Migrations live in `supabase/migrations/` and must be applied in filename order (they are timestamped). Apply via Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste each migration file into the **SQL Editor** in the Supabase dashboard in timestamp order.

**Key migrations and what they do:**

| File | Purpose |
|------|---------|
| `20260320*` – `20260324*` | Core schema: tenants, profiles, user_roles, base ERP tables |
| `20260325100000_hr_module.sql` | HR: employees, departments, payroll, attendance |
| `20260325100001_crm_module.sql` | CRM: deals, activities |
| `20260325100002_invoices_module.sql` | Invoices + invoice lines |
| `20260325100003_projects_module.sql` | Projects + tasks |
| `20260327100000_enterprise_features.sql` | White-label, reseller, automation |
| `20260329110000_invite_link_system.sql` | Team invite tokens + email flow |
| `20260402080000_multi_company_membership.sql` | Reseller multi-company access |
| `20260406120000_schema_reconciliation.sql` | Consolidation / gap fill |
| `20260407100000_subscription_tiers.sql` | starter/premium/enterprise tier column |
| `20260409000000_fix_module_schemas.sql` | Fleet, Maintenance, POS, Subscriptions tables |
| `20260409100000_security_hardening.sql` | Invite RLS fix, rate limits |

> **Critical**: The `get_user_tenant_id(auth.uid())` function is defined in early migrations. All RLS policies depend on it. Migrations must run in order.

### 4.3 Configure Auth

In Supabase Dashboard → **Authentication → Settings**:

- **Email confirmations**: Enable (prevents fake account creation)
- **Site URL**: Set to your production domain (e.g. `https://app.tela-erp.com`)
- **Redirect URLs**: Add `https://app.tela-erp.com` and `http://localhost:8080` (for dev)
- **Password minimum length**: 8 characters (matches app validation)
- **Magic link**: Enable if desired (used for `signInWithOtp`)

### 4.4 Storage Buckets

If using the Document Scanner or file upload features, create a storage bucket:
- Bucket name: `documents`
- Access: Private (RLS-controlled)

### 4.5 Edge Functions (if needed)

Currently no Edge Functions are required for the web app. The desktop Electron build uses local SQLite.

---

## 5. Build for Production

```bash
npm run build
```

Output goes to `dist/`. Verify:

```
dist/
  index.html       (entry point)
  assets/
    index-*.js     (~3MB, consider code-splitting)
    index-*.css
    *.png / *.jpg  (images)
```

**Bundle size note**: The main JS chunk is ~3 MB (952 KB gzip). This is large — consider adding `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor libs if load time becomes a concern.

---

## 6. Deployment Targets

### Vercel (Recommended)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output dir: `dist`
6. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
7. Deploy

Vercel handles SPA routing automatically (serves `index.html` for all routes).

### Netlify

1. Add `public/_redirects` file:

```
/*    /index.html    200
```

2. `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. Add env vars in Netlify dashboard → Site Settings → Environment Variables

### Self-Hosted (NGINX)

Build first: `npm run build`

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    root /var/www/tela-erp/dist;
    index index.html;

    # SPA routing — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

For HTTPS, use Certbot:
```bash
sudo certbot --nginx -d app.yourdomain.com
```

### Docker

```dockerfile
# Multi-stage build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`nginx.conf` (same as above, adjusted for Docker path).

`docker-compose.yml` for local testing:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
```

> **Note**: Vite env vars are embedded at build time, not runtime. Bake them in with `--build-arg` or use a `.env` file during the Docker build stage.

---

## 7. Database Migration Strategy

**Applying migrations to production:**

```bash
# Link to production project
supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD

# Push pending migrations
supabase db push
```

Or run each `.sql` file manually in the Supabase SQL Editor.

**Naming convention:**
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

**Rollback:** Supabase does not have automated rollback. To reverse a migration:
1. Write a reverse SQL script manually
2. Apply it as a new migration (higher timestamp)
3. Never delete or modify applied migration files

**Safe migrations** (can run on live DB without downtime):
- Adding nullable columns
- Adding new tables
- Adding indexes (use `CONCURRENTLY` for large tables)

**Risky migrations** (require maintenance window or careful execution):
- Dropping columns or tables
- Changing column types
- Renaming columns

---

## 8. Monitoring & Observability

### Built-in Telemetry

Visit `/admin/telemetry` in the running app to see:
- Web Vitals (FCP, LCP, CLS, FID, INP, TTFB)
- Recent JavaScript errors with stack traces
- Page view timeline
- Custom event counts

All data is stored in the browser's `localStorage`. Export as JSON for analysis.

### Supabase Dashboard

- **Database**: Query metrics, slow queries, connection count
- **Auth**: Active users, sign-in events
- **Logs**: API request logs, Edge Function logs
- **Storage**: Bucket usage

### External Monitoring (recommended for production)

Integrate one of:
- **Sentry** (error tracking): Add `@sentry/react` and initialize in `main.tsx`
- **PostHog** (analytics + session replay): Free tier available
- **Datadog / New Relic**: For infrastructure monitoring if self-hosting

---

## 9. Scaling Considerations

| Component | Scaling path |
|-----------|-------------|
| Frontend | Static files on CDN — scales infinitely |
| Database | Supabase Pro → connection pooling (PgBouncer) → read replicas |
| Auth | Handled by Supabase — auto-scales |
| File storage | Supabase Storage (backed by S3) — auto-scales |
| Compute (edge) | Supabase Edge Functions on Deno Deploy |

**Supabase Free tier limits:**
- 500 MB database
- 2 GB file storage
- 50,000 monthly active users
- 2 GB bandwidth

Upgrade to **Pro** ($25/mo) for production workloads.

---

## 10. Security Checklist

Before going live:

- [ ] `VITE_SUPABASE_ANON_KEY` in env (not service_role key)
- [ ] Service role key only in backend/Edge Functions — never in frontend
- [ ] HTTPS enabled (Vercel/Netlify handle this; self-hosted use Certbot)
- [ ] RLS enabled on all tables (verify in Supabase dashboard → Table Editor)
- [ ] Email confirmation enabled in Supabase Auth settings
- [ ] Password minimum 8 characters configured
- [ ] All migrations applied in order
- [ ] `.env.local` is in `.gitignore` (verify: `git check-ignore .env.local`)
- [ ] Supabase dashboard MFA enabled for your account
- [ ] Run `npm audit` and fix any critical/high vulns before launch

---

## 11. Desktop Build (Electron)

The project includes an optional Electron wrapper for offline desktop use.

```bash
# Development
npm run electron:dev

# Build distributable
npm run electron:build
```

> **Security note**: The desktop build stores passwords in plaintext in a local SQLite database. This is not suitable for production multi-user scenarios. Hash passwords with bcrypt before any desktop distribution.
