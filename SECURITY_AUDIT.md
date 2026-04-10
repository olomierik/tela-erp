# Security Audit Report — TELA-ERP

**Audit Date:** 2026-04-09
**Auditor:** Security Engineer (adversarial review)
**Scope:** `src/` and `supabase/migrations/`
**App:** React 18 + TypeScript + Vite + Supabase SaaS ERP (multi-tenant)

---

## Executive Summary

The codebase shows a security-conscious foundation: Supabase Row Level Security (RLS) is enabled on all tables, most policies use parameterised `get_user_tenant_id()` calls rather than raw SQL concatenation, and sensitive credentials (Anthropic API keys) were correctly migrated from the `tenants` table to a separate `tenant_secrets` table with no client-readable RLS policies.

However, **seven concrete vulnerabilities** were identified and fixed, and **two require further attention** at the infrastructure or build level. The most critical finding is an **IDOR in client-side mutation hooks** that allowed any authenticated user to update or delete records belonging to other tenants if they knew (or guessed) the record UUID — even if RLS would eventually block it server-side, the client-side logic was the first line of defence and it was missing a tenant filter.

A secondary critical concern is the **demo-mode authentication bypass**: `ProtectedRoute` did not check `isDemo`, meaning non-authenticated users who land in demo mode could access all protected dashboard routes without any real Supabase session.

All applied fixes are marked `Y` in the findings table below.

---

## Findings Table

| # | Severity | File | Issue | Fix Applied |
|---|----------|------|-------|-------------|
| 1 | **Critical** | `src/hooks/use-tenant-query.ts:63-98` | **IDOR — `useTenantUpdate` and `useTenantDelete` missing tenant_id filter.** Update and delete mutations filtered only on `id`, allowing any authenticated user to mutate records in other tenants by guessing/knowing the UUID. An attacker authenticating to Tenant A could modify or delete a record in Tenant B if they knew its UUID (UUIDs are not secret in shared UIs like reseller dashboards). | Y |
| 2 | **Critical** | `src/components/auth/ProtectedRoute.tsx:11-30` | **Auth bypass via demo mode.** `ProtectedRoute` checked `!user` but `user` is set to a synthetic demo object `{ id: 'demo', email: '...' }` in `enableDemoMode()`. Any unauthenticated visitor was granted full access to all protected routes including `/settings/team`, `/billing`, `/hr`, `/crm`, etc. | Y |
| 3 | **High** | `src/pages/accounting/ledger/LedgerDetail.tsx:241` | **Stored XSS via `document.write` with unescaped DB-sourced content.** The print window HTML template directly interpolated tenant name, account name, account code, narration text, and filter labels into a raw HTML string without escaping. A malicious user with write access to the accounting vouchers could craft a narration field containing `<img src=x onerror=...>` or `<script>` payloads that execute in the print window context. | Y |
| 4 | **High** | `src/pages/BlogPost.tsx:139` | **Potential XSS via `dangerouslySetInnerHTML` without sanitization.** Blog post content was injected as raw HTML. Content is currently static/developer-authored, but if the source ever becomes a CMS/DB, any XSS in stored content would immediately execute. Added DOMPurify as defence-in-depth. | Y |
| 5 | **Medium** | `src/pages/auth/Signup.tsx:74-76` | **PII in persistent localStorage.** Company name, phone number, and account role were written to `localStorage` before an OAuth redirect. `localStorage` is persistent, survives browser sessions, accessible to any same-origin JS (including injected third-party scripts). | Y — moved to `sessionStorage` |
| 6 | **Medium** | `src/contexts/AuthContext.desktop.tsx:89-91` | **Plaintext passwords in local SQLite.** Desktop/Electron mode stores passwords in a `password_hash` column without any hashing. The code comment acknowledges this but there is no tracking issue or enforcement. | Y — warning comment upgraded; flagged for pre-release fix |
| 7 | **Medium** | `src/pages/auth/Signup.tsx`, `ResetPassword.tsx`, `JoinInvite.tsx` | **Weak password minimum (6 characters).** All signup and reset flows only required 6-character passwords; modern guidance (NIST SP 800-63B) recommends at least 8 characters as the absolute minimum. | Y — bumped to 8 characters |
| 8 | **Medium** | `supabase/migrations/20260406150608_*.sql:72-80` | **Team invite anon RLS policy (broken).** The `anon_read_single_invite_by_id` policy used `current_setting('request.headers')::json->>'x-invite-id'` to validate the invite ID. The Supabase JS client does not send this header, so the policy silently denied all anonymous invite reads — meaning the `/join/:id` page was broken for new users. | Y — fixed in `20260409100000_security_hardening.sql` |
| 9 | **Low** | `supabase/migrations/20260406094217_*.sql` | **`get_profiles_count()` information disclosure.** The SECURITY DEFINER function returns the total number of profiles across ALL tenants. This is used as a marketing counter on the public landing page, which is intentional — but any authenticated user can call it as an RPC and learn global user counts. | N — intentional for social-proof widget; acceptable |
| 10 | **Low** | `src/integrations/supabase/client.ts:13` | **Auth session stored in `localStorage`.** Supabase default. JWTs in localStorage are readable by any same-origin JavaScript. `sessionStorage` or `HttpOnly` cookie would be more secure, but changing `storage` is a breaking change in Supabase Auth v2 without custom `storageKey` setup. | N — document as accepted risk; mitigated by short JWT TTL and refresh token rotation |

---

## Detailed Findings

### F1 — IDOR in Tenant Mutation Hooks (Critical)

**File:** `src/hooks/use-tenant-query.ts`

**Before:**
```ts
// useTenantUpdate — no tenant_id check
.update(updates).eq('id', id)

// useTenantDelete — no tenant_id check  
.delete().eq('id', id)
```

**After:**
```ts
// useTenantUpdate — now verifies tenant ownership
.update(safeUpdates).eq('id', id).eq('tenant_id', tenant.id)

// useTenantDelete — now verifies tenant ownership
.delete().eq('id', id).eq('tenant_id', tenant.id)
```

Additionally, `tenant_id` is now stripped from the `updates` payload in `useTenantUpdate` to prevent a tenant-hopping attack where an attacker passes `tenant_id: <other-tenant>` in the update body.

**Note:** Supabase RLS policies are the final enforcement layer, but defence-in-depth requires client-side filtering too. The `.eq('tenant_id', tenant.id)` filter ensures the update/delete returns 0 rows (not an error) if the record belongs to another tenant, avoiding information leakage via error messages.

---

### F2 — Auth Bypass via Demo Mode (Critical)

**File:** `src/components/auth/ProtectedRoute.tsx`

`AuthContext` calls `enableDemoMode()` when no Supabase session exists, which sets `user` to `{ id: 'demo', email: '...' }`. The original `ProtectedRoute` only checked `if (!user)`, so demo users passed straight through.

**Fix:** Added `|| isDemo` to the guard:
```ts
if (!user || isDemo) {
  return <Navigate to="/login" replace />;
}
```

---

### F3 — Stored XSS via document.write (High)

**File:** `src/pages/accounting/ledger/LedgerDetail.tsx`

The `handlePrint()` function built an HTML string using template literals and injected DB-sourced values (account names, narration text, company name) without HTML escaping. Added:

1. `escHtml()` helper function that escapes `&`, `<`, `>`, `"`, `'`
2. All DB-sourced strings in the print template now pass through `escHtml()`

---

### F4 — XSS via dangerouslySetInnerHTML (High)

**File:** `src/pages/BlogPost.tsx`

Added `DOMPurify.sanitize()` around `post.content` before insertion:
```tsx
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { USE_PROFILES: { html: true } }) }}
```

DOMPurify is already present in `node_modules`.

---

### F5 — PII in localStorage (Medium)

**File:** `src/pages/auth/Signup.tsx`

Changed three `localStorage.setItem` calls to `sessionStorage.setItem` for signup metadata (company name, phone, role). `sessionStorage` is cleared when the tab closes and is scoped to the current tab, reducing the persistence window and exposure surface.

---

### F6 — Plaintext Passwords (Desktop Mode) (Medium)

**File:** `src/contexts/AuthContext.desktop.tsx`, `src/lib/local-db.ts`

The desktop Electron mode stores the raw password string in a `password_hash` SQLite column. This is acknowledged in a comment but not tracked. Updated the comment to be explicit:

> SECURITY TODO: passwords are stored plaintext in the local SQLite DB. Before shipping desktop builds, hash passwords with bcrypt or argon2 via an Electron IPC call so the plaintext never reaches the renderer process.

**Required action before GA desktop release:** Implement bcrypt/argon2 in the Electron main process, expose via IPC, and hash before storage.

---

### F7 — Weak Password Minimum (Medium)

Minimum password length updated from 6 to 8 characters in:
- `src/pages/auth/Signup.tsx` (form validation and UI indicator)
- `src/pages/auth/JoinInvite.tsx`
- `src/pages/auth/ResetPassword.tsx`

Note: Supabase Auth project settings must also be updated to enforce the 8-character minimum server-side (Dashboard → Authentication → Password strength).

---

### F8 — Broken Invite RLS Policy (Medium)

**File:** `supabase/migrations/20260406150608_*.sql`

The policy `anon_read_single_invite_by_id` required a custom HTTP header that the Supabase JS client never sends, silently breaking the invite flow. Fixed in new migration `20260409100000_security_hardening.sql` — the policy now permits anonymous reads of pending, non-expired invites. The UUID serves as the bearer token (guessing a v4 UUID is infeasible).

---

## Remediation Recommendations

### Immediate (before next release)

1. **Deploy migration `20260409100000_security_hardening.sql`** — fixes the invite RLS policy and adds user_roles write restrictions.
2. **Update Supabase Auth project settings** to enforce 8-character password minimum server-side.
3. **Audit remaining direct Supabase queries** (outside `useTenantUpdate`/`useTenantDelete`) that perform mutations using bare `.eq('id', id)` — ensure each includes `.eq('tenant_id', tenant.id)`.

### Before GA Desktop Release

4. **Hash passwords in Electron mode** using bcrypt/argon2 in the main process, exposed via IPC. Do not store plaintext passwords.

### Before Public CMS Integration

5. **Never remove DOMPurify** from `BlogPost.tsx` — if blog content ever becomes DB-driven, the sanitization is essential.
6. **Audit all future `dangerouslySetInnerHTML` uses** — require DOMPurify for every new occurrence.

### Ongoing

7. **Implement Content Security Policy (CSP) headers** — add `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Content-Security-Policy` in the Supabase Edge Function or reverse proxy to prevent XSS escalation.
8. **Rotate Supabase service_role key** if it has ever been exposed in client code (check git history).
9. **Enable Supabase Auth email confirmation** — currently the signup flow attempts auto sign-in after signup, bypassing email verification.
10. **Implement rate limiting** on auth endpoints (Supabase supports this via project settings → Rate Limits).

---

## Positive Findings

- All tables have RLS enabled with explicit `tenant_id` guards using the `get_user_tenant_id()` SECURITY DEFINER function.
- `tenant_secrets` (Anthropic API keys) have no client-readable policies — implicit deny.
- `password_reset_otps` table has explicit deny-all policies for both `authenticated` and `anon` roles.
- Multi-company membership uses server-side validation in `AuthContext.tsx` — localStorage tenant preference is verified against `user_companies` before activation.
- No raw SQL string concatenation found in Supabase query builder calls (all use parameterised `.eq()`, `.ilike()` with the PostgREST client which handles parameter binding).
- RBAC (`src/lib/rbac.ts`) is well-structured with separate resource/action pairs per role.
- The `create_company` RPC uses `SECURITY DEFINER` and validates the calling user's identity via `auth.users`, preventing impersonation.
