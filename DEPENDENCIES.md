# TELA-ERP Dependency Inventory

> Last audited: 2026-04-09 | `npm audit` run on Node v22.22.0

---

## Security Audit Summary

```
Critical:  0
High:      7  (all in electron/electron-builder — dev-only, not in web bundle)
Moderate:  2  (esbuild — dev-only build tool)
Low:       5  (http-proxy-agent chain via electron)
Total:    14
```

**Web bundle risk: ZERO** — all vulnerabilities are in `devDependencies` used only for the optional Electron desktop build. The production web app (`npm run build` → `dist/`) contains none of these packages.

`npm audit fix` was run — no auto-fixable issues remained (all require `--force` / breaking version bumps that risk breaking the desktop build pipeline).

---

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | React DOM renderer |
| `react-router-dom` | ^6.27.0 | Client-side routing |
| `@supabase/supabase-js` | ^2.47.2 | Supabase client (auth, DB, storage) |
| `@tanstack/react-query` | ^5.56.2 | Server state / async data fetching |
| `react-hook-form` | ^7.53.0 | Form state management |
| `zod` | ^3.23.8 | Schema validation |
| `framer-motion` | ^11.9.0 | Animations and transitions |
| `recharts` | ^2.12.7 | Charts and data visualisation |
| `lucide-react` | ^0.462.0 | Icon library |
| `tailwind-merge` | ^2.5.2 | Tailwind class merging |
| `class-variance-authority` | ^0.7.1 | Variant-based component styling |
| `clsx` | ^2.1.1 | Conditional class names |
| `sonner` | ^1.5.0 | Toast notifications |
| `next-themes` | ^0.3.0 | Dark/light theme switching |
| `react-helmet-async` | ^2.0.5 | Document head / SEO |
| `react-markdown` | ^9.0.1 | Markdown rendering |
| `date-fns` | ^3.6.0 | Date formatting |
| `jspdf` | ^2.5.2 | PDF generation |
| `jspdf-autotable` | ^3.8.4 | PDF table plugin |
| `xlsx` | ^0.18.5 | Excel export (SheetJS) |
| `tesseract.js` | ^5.1.1 | OCR engine (Document Scanner) |
| `cmdk` | ^1.0.0 | Command palette |
| `vaul` | ^0.9.3 | Drawer / bottom sheet |
| `embla-carousel-react` | ^8.3.0 | Carousel |
| `react-day-picker` | ^8.10.1 | Date picker |
| `react-resizable-panels` | ^2.1.3 | Resizable layouts |
| `input-otp` | ^1.2.4 | OTP input |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities |
| `@hookform/resolvers` | ^3.9.0 | Zod + react-hook-form adapter |
| `@radix-ui/*` (x28) | various | Headless UI primitives (shadcn/ui) |
| `@lovable.dev/cloud-auth-js` | ^0.0.4 | Lovable platform integration |

---

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^5.4.21 | Build tool and dev server |
| `@vitejs/plugin-react-swc` | ^3.5.0 | Fast React transform (SWC) |
| `typescript` | ^5.5.3 | Type checking |
| `typescript-eslint` | ^8.3.0 | ESLint TypeScript rules |
| `eslint` | ^9.9.0 | Linting |
| `tailwindcss` | ^3.4.11 | CSS utility framework |
| `postcss` | ^8.4.47 | CSS processing |
| `autoprefixer` | ^10.4.20 | Vendor prefixes |
| `@tailwindcss/typography` | ^0.5.16 | Prose typography |
| `vitest` | ^2.1.9 | Unit testing |
| `@testing-library/react` | ^16.0.0 | Component testing |
| `@testing-library/jest-dom` | ^6.6.0 | DOM matchers |
| `@testing-library/user-event` | ^14.5.2 | User interaction simulation |
| `jsdom` | ^25.0.1 | Browser DOM emulation |
| `@playwright/test` | ^1.49.0 | End-to-end testing |
| `electron` | ^33.0.0 | Desktop app wrapper |
| `electron-builder` | ^25.0.5 | Desktop packager |
| `better-sqlite3` | ^11.3.0 | Local SQLite for Electron |
| `concurrently` | ^9.0.1 | Parallel npm scripts |
| `wait-on` | ^8.0.1 | Wait for port before starting |

---

## Vulnerability Detail

All 14 vulnerabilities are in the Electron desktop build toolchain, not in the web application:

| Severity | Package | Issue | In Web Bundle? |
|----------|---------|-------|---------------|
| High | `electron` | GHSA-vmqv-hx8q-j7mg | No (devDep) |
| High | `electron-builder` | via app-builder-lib | No (devDep) |
| High | `app-builder-lib` | via builder-util | No (devDep) |
| High | `dmg-builder` | via app-builder-lib | No (devDep) |
| High | `electron-builder-squirrel-windows` | via app-builder-lib | No (devDep) |
| Moderate | `esbuild` | GHSA-67mh-4wv8-2f99 (dev server) | No (build tool) |
| Low | `http-proxy-agent` | GHSA-vpq2-c234-7xj6 | No (devDep) |

**Action**: To fix desktop build vulns, update `electron` to latest stable and test the Electron build independently.

---

## Dependency Hygiene Recommendations

1. **Pin `xlsx` to `^0.18.x`** — SheetJS changed to a proprietary license in v0.20+. Current `^0.18.5` is Apache-2.0.

2. **Lazy-load `tesseract.js`** — The OCR WASM is ~10 MB. Dynamic import it only when the Document Scanner page is opened.

3. **Update browserslist**: `npx update-browserslist-db@latest` (eliminates build warning, no code change).

4. **Consider removing `@lovable.dev/cloud-auth-js`** if the project is no longer hosted on the Lovable platform.

5. **Add bundle splitting** in `vite.config.ts` — the main JS chunk is ~3 MB (952 KB gzip). Split with `manualChunks: { vendor, supabase, charts, pdf, ocr }`.

6. **CI audit**: Add `npm audit --audit-level=critical` to your CI pipeline to block critical vulns from merging.
