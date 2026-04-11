# TELA ERP — Desktop (Electron + SQLite) Edition

This branch adds a fully **offline desktop** version of TELA ERP built with Electron and SQLite.
The online web version on the `main` branch is **not affected** by these changes.

---

## Architecture Overview

| Layer | Online (main) | Desktop (this branch) |
|---|---|---|
| Database | Supabase (PostgreSQL) | SQLite via `better-sqlite3` |
| Auth | Supabase Auth | Local session in `localStorage` |
| Hosting | Browser / Vercel | Electron desktop app |
| Vite config | `vite.config.ts` | `vite.desktop.config.ts` |

Key files added on this branch:

- `electron/main.ts` — Electron main process + IPC/SQLite handlers
- `electron/preload.ts` — Exposes `window.electronAPI` to renderer
- `electron/schema.sql` — Full SQLite schema (CREATE TABLE IF NOT EXISTS)
- `src/lib/local-db.ts` — Supabase-compatible chainable query builder
- `src/integrations/supabase/client.desktop.ts` — Desktop supabase client shim
- `src/contexts/AuthContext.desktop.tsx` — Offline auth context + first-run setup UI
- `vite.desktop.config.ts` — Vite config that aliases supabase client → desktop shim
- `electron-builder.json` — Electron Builder config for packaging

---

## Prerequisites

- **Node.js 18+** — https://nodejs.org
- **npm 9+** (bundled with Node)
- **Git**

---

## Getting Started

### 1. Clone the repo & switch to the desktop branch

```bash
git clone <repo-url>
cd tela-erp
git checkout desktop
```

### 2. Install dependencies

```bash
npm install
```

> `better-sqlite3` requires native compilation. If you hit build errors, install
> the Windows Build Tools: `npm install --global windows-build-tools` (run as Administrator).

---

## Running in Development Mode

```bash
npm run electron:dev
```

This runs two things in parallel:
1. Vite dev server on `http://localhost:5173`
2. Electron, which loads `http://localhost:5173` automatically once Vite is ready

DevTools are opened automatically in dev mode.

---

## Building a Distributable Installer

```bash
npm run electron:build
```

This:
1. Builds the React app into `dist-desktop/` using `vite.desktop.config.ts`
2. Packages with Electron Builder into `release/`

### Output files

| Platform | Output |
|---|---|
| Windows | `release/TELA ERP Setup x.x.x.exe` (NSIS installer) |
| macOS | `release/TELA ERP-x.x.x.dmg` |
| Linux | `release/TELA ERP-x.x.x.AppImage` |

> **Note:** Building for macOS requires a macOS machine. Building for Linux requires a Linux machine (or Docker).

---

## First Launch

On first launch, TELA ERP shows a **Setup** screen asking for:
- Company name
- Admin email
- Password

This creates the local SQLite database with your company and admin account.

---

## Where Data Is Stored

SQLite database location by OS:

| OS | Path |
|---|---|
| Windows | `%APPDATA%\TELA ERP\data.db` (e.g. `C:\Users\YourName\AppData\Roaming\TELA ERP\data.db`) |
| macOS | `~/Library/Application Support/TELA ERP/data.db` |
| Linux | `~/.config/TELA ERP/data.db` |

---

## Backing Up Your Data

Simply copy `data.db` to a safe location:

### Windows (PowerShell)
```powershell
Copy-Item "$env:APPDATA\TELA ERP\data.db" "D:\Backups\tela-erp-backup-$(Get-Date -Format 'yyyy-MM-dd').db"
```

### macOS / Linux
```bash
cp ~/Library/Application\ Support/TELA\ ERP/data.db ~/Desktop/tela-erp-backup-$(date +%Y-%m-%d).db
```

To restore: replace `data.db` in the app data folder with your backup, then restart the app.

---

## Resetting / Starting Fresh

Delete `data.db` and restart the app — the setup screen will appear again.

---

## Switching Back to Online Mode

The `main` branch is the online version. The `desktop` branch is isolated.
Run `git checkout main` and `npm install` to return to the Supabase-connected version.

---

## Technical Notes

- `VITE_DESKTOP=true` is injected at build time — the app knows it's running offline.
- The Supabase client alias in `vite.desktop.config.ts` replaces all `@/integrations/supabase/client` imports with the local shim automatically — no source files are modified.
- The query builder (`local-db.ts`) falls back to an **in-memory Map store** when running in a browser (not Electron), allowing browser-based UI testing without a database.
- Passwords are stored as plain text in the desktop demo. For production hardening, integrate `bcrypt` or `argon2`.
