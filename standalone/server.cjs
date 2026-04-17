/**
 * TELA ERP — Standalone local server
 * Uses Express + better-sqlite3 to provide the same REST API that
 * client.desktop.ts uses as its HTTP fallback backend.
 *
 * Endpoints:
 *   POST /api/crud               — all DB read/write operations
 *   POST /api/auth/session       — get current session
 *   POST /api/auth/signup        — create account + tenant
 *   POST /api/auth/signin        — authenticate
 *   POST /api/auth/signout       — clear session
 *   GET  /                       — serve the React app
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const crypto  = require('crypto');
const express = require('express');
const cors    = require('cors');
const Database = require('better-sqlite3');

// ─── Paths ────────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(os.homedir(), '.tela-erp');
const DB_PATH     = path.join(DATA_DIR, 'tela.db');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const APP_DIR     = path.join(__dirname, 'app');
const PORT        = 4321;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── SQLite setup ─────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -65536');  // 64 MB
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
db.exec(schema);

console.log(`[TELA] Database ready at ${DB_PATH}`);

// ─── Session persistence ──────────────────────────────────────────────────
let _session = null;
try {
  if (fs.existsSync(SESSION_FILE)) {
    _session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  }
} catch { _session = null; }

function saveSession(s) {
  _session = s;
  if (s) fs.writeFileSync(SESSION_FILE, JSON.stringify(s), 'utf8');
  else if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
}

// ─── Password helpers ─────────────────────────────────────────────────────
function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pwd, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(pwd, salt, 64).toString('hex');
  return attempt === hash;
}

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// ─── Row serialisation ────────────────────────────────────────────────────
// Core columns that live as real DB columns. Everything else → _data JSON blob.
const CORE_COLS = new Set(['id', 'tenant_id', 'store_id', 'status', 'created_at', 'updated_at']);

function serializeRow(row) {
  if (!row) return null;
  const core = {};
  const data = {};
  for (const [k, v] of Object.entries(row)) {
    if (CORE_COLS.has(k)) core[k] = v;
    else data[k] = v;
  }
  return { ...core, _data: JSON.stringify(data) };
}

function deserializeRow(row) {
  if (!row) return null;
  try {
    const extra = JSON.parse(row._data ?? '{}');
    const { _data, ...rest } = row;
    return { ...rest, ...extra };
  } catch {
    const { _data, ...rest } = row;
    return rest;
  }
}

// Tables with identity-style schemas (don't use _data pattern)
const IDENTITY_TABLES = new Set(['tenants', 'profiles', 'user_companies', 'user_roles']);

// ─── CRUD handler ─────────────────────────────────────────────────────────
function handleCrud({ op, table, where = [], data, orderBy, orderDir, limitN, single }) {
  // Block unknown tables
  const tableOk = /^[a-z_][a-z0-9_]*$/.test(table);
  if (!tableOk) throw new Error(`Invalid table: ${table}`);

  const isIdentity = IDENTITY_TABLES.has(table);

  // ── SELECT ──────────────────────────────────────────────────────────────
  if (op === 'select') {
    let sql = `SELECT * FROM "${table}"`;
    const params = [];

    if (where.length > 0) {
      const clauses = where.map(([col, val]) => {
        if (!col || !/^[a-z_][a-z0-9_]*$/.test(col)) throw new Error(`Bad column: ${col}`);
        if (Array.isArray(val)) {
          const placeholders = val.map(() => '?').join(',');
          params.push(...val);
          return `"${col}" IN (${placeholders})`;
        }
        if (val === null || val === undefined) {
          return `"${col}" IS NULL`;
        }
        params.push(val);
        return `"${col}" = ?`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    const ob = (orderBy || 'created_at').replace(/[^a-z_]/gi, '');
    const od = orderDir === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY "${ob}" ${od}`;
    if (limitN) { sql += ` LIMIT ?`; params.push(limitN); }

    const rows = db.prepare(sql).all(...params);
    const deserialized = isIdentity ? rows : rows.map(deserializeRow);

    if (single) return { data: deserialized[0] ?? null, error: null };
    return { data: deserialized, error: null };
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (op === 'delete') {
    let sql = `DELETE FROM "${table}"`;
    const params = [];
    if (where.length > 0) {
      const clauses = where.map(([col, val]) => {
        if (!col || !/^[a-z_][a-z0-9_]*$/.test(col)) throw new Error(`Bad column: ${col}`);
        params.push(val);
        return `"${col}" = ?`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    db.prepare(sql).run(...params);
    return { data: null, error: null };
  }

  // ── INSERT / UPSERT ──────────────────────────────────────────────────────
  if (op === 'insert' || op === 'upsert') {
    const rows = Array.isArray(data) ? data : [data];
    const results = [];
    const insertStmt = db.transaction((rows) => {
      for (const row of rows) {
        const r = { id: row.id || genId(), ...row };
        const serialized = isIdentity ? r : serializeRow(r);
        const cols = Object.keys(serialized);
        const vals = Object.values(serialized);
        const placeholders = cols.map(() => '?').join(',');
        const colList = cols.map(c => `"${c}"`).join(',');
        const keyword = op === 'upsert' ? 'INSERT OR REPLACE' : 'INSERT';
        db.prepare(`${keyword} INTO "${table}" (${colList}) VALUES (${placeholders})`).run(...vals);
        results.push(deserializeRow({ ...serialized, _data: serialized._data }));
      }
    });
    insertStmt(rows);
    if (single) return { data: results[0] ?? null, error: null };
    return { data: results, error: null };
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  if (op === 'update') {
    if (!where.length) throw new Error('Update requires WHERE clause');
    if (!isIdentity) {
      // Merge update into existing _data blob
      const whereClauses = where.map(([col, val]) => {
        if (!col || !/^[a-z_][a-z0-9_]*$/.test(col)) throw new Error(`Bad column: ${col}`);
        return `"${col}" = ?`;
      });
      const whereParams = where.map(([, v]) => v);
      const existing = db.prepare(`SELECT * FROM "${table}" WHERE ${whereClauses.join(' AND ')}`).get(...whereParams);
      if (!existing) return { data: null, error: null };

      const existingData = JSON.parse(existing._data ?? '{}');
      const merged = { ...existingData };

      for (const [k, v] of Object.entries(data)) {
        if (CORE_COLS.has(k)) {
          existing[k] = v;
        } else {
          merged[k] = v;
        }
      }
      existing._data = JSON.stringify(merged);
      existing.updated_at = new Date().toISOString();

      const setCols = Object.keys(existing).filter(k => k !== 'id');
      const setVals = setCols.map(k => existing[k]);
      const setClause = setCols.map(c => `"${c}" = ?`).join(', ');
      db.prepare(`UPDATE "${table}" SET ${setClause} WHERE ${whereClauses.join(' AND ')}`).run(...setVals, ...whereParams);
      return { data: deserializeRow(existing), error: null };
    } else {
      // Identity table: direct update
      const setCols = Object.keys(data).filter(k => k !== 'id');
      if (!setCols.length) return { data: null, error: null };
      const setClause = setCols.map(c => `"${c}" = ?`).join(', ');
      const setVals = setCols.map(k => data[k]);
      const whereClauses = where.map(([col]) => `"${col}" = ?`);
      const whereParams = where.map(([, v]) => v);
      db.prepare(`UPDATE "${table}" SET ${setClause} WHERE ${whereClauses.join(' AND ')}`).run(...setVals, ...whereParams);
      return { data: null, error: null };
    }
  }

  throw new Error(`Unknown op: ${op}`);
}

// ─── Auth handlers ────────────────────────────────────────────────────────
function handleGetSession() {
  if (_session) return { session: _session, needsSetup: false };
  const row = db.prepare('SELECT COUNT(*) as n FROM profiles').get();
  return { session: null, needsSetup: row.n === 0 };
}

function handleSignup({ email, password, fullName, companyName }) {
  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
  if (existing) return { session: null, error: 'Email already registered' };

  const tenantId = genId();
  const userId   = genId();
  const token    = crypto.randomBytes(32).toString('hex');

  db.transaction(() => {
    db.prepare(`INSERT INTO tenants (id, name, plan) VALUES (?, ?, 'enterprise')`).run(tenantId, companyName || 'My Company');
    db.prepare(`INSERT INTO profiles (id, user_id, tenant_id, full_name, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?, ?, 'admin')`).run(userId, userId, tenantId, fullName || email, email, hashPassword(password));
    db.prepare(`INSERT INTO user_companies (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'admin')`).run(genId(), userId, tenantId);
    db.prepare(`INSERT INTO user_roles (id, user_id, tenant_id, role, permissions) VALUES (?, ?, ?, 'admin', '["*"]')`).run(genId(), userId, tenantId);
  })();

  const session = {
    access_token: token,
    user: {
      id: userId,
      email,
      user_metadata: { full_name: fullName, tenant_id: tenantId },
    },
    tenant: { id: tenantId, name: companyName },
  };
  saveSession(session);
  return { session, error: null };
}

function handleSignin({ email, password }) {
  const profile = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!profile) return { session: null, error: 'Invalid email or password' };
  if (!verifyPassword(password, profile.password_hash)) return { session: null, error: 'Invalid email or password' };

  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(profile.tenant_id);
  const token  = crypto.randomBytes(32).toString('hex');
  const session = {
    access_token: token,
    user: {
      id: profile.user_id,
      email: profile.email,
      user_metadata: { full_name: profile.full_name, tenant_id: profile.tenant_id },
    },
    tenant: { id: tenant?.id, name: tenant?.name },
  };
  saveSession(session);
  return { session, error: null };
}

function handleSignout() {
  saveSession(null);
  return { error: null };
}

// ─── Express app ─────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// API routes
app.post('/api/crud', (req, res) => {
  try {
    const result = handleCrud(req.body);
    res.json(result);
  } catch (err) {
    res.json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/session', (_req, res) => {
  try { res.json(handleGetSession()); }
  catch (err) { res.json({ session: null, needsSetup: true, error: err.message }); }
});

app.post('/api/auth/signup', (req, res) => {
  try { res.json(handleSignup(req.body)); }
  catch (err) { res.json({ session: null, error: err.message }); }
});

app.post('/api/auth/signin', (req, res) => {
  try { res.json(handleSignin(req.body)); }
  catch (err) { res.json({ session: null, error: err.message }); }
});

app.post('/api/auth/signout', (_req, res) => {
  try { res.json(handleSignout()); }
  catch (err) { res.json({ error: err.message }); }
});

// Serve React app (if built app folder exists)
if (fs.existsSync(APP_DIR)) {
  app.use(express.static(APP_DIR));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(APP_DIR, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('<h2>TELA ERP — app folder not found. Run setup.bat first.</h2>');
  });
}

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║        TELA ERP is running            ║`);
  console.log(`║  Open: http://localhost:${PORT}          ║`);
  console.log(`║  Data: ${DATA_DIR.slice(0, 28).padEnd(28)} ║`);
  console.log(`╚═══════════════════════════════════════╝\n`);
  console.log('Press Ctrl+C to stop the server.\n');

  // Auto-open browser on Windows / Mac / Linux
  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;
  if (process.platform === 'win32') exec(`start "" "${url}"`);
  else if (process.platform === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
});
