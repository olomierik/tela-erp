'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path  = require('path');
const fs    = require('fs');
const crypto = require('crypto');

// ─── Database ─────────────────────────────────────────────────────────────

let _db = null;

function getDb() {
  if (_db) return _db;
  const Database = require('better-sqlite3');
  const dbPath = path.join(app.getPath('userData'), 'tela-erp.db');
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000');   // 64 MB page cache
  _db.pragma('temp_store = MEMORY');
  return _db;
}

function initSchema() {
  const db = getDb();
  const schemaPath = app.isPackaged
    ? path.join(process.resourcesPath, 'schema.sql')
    : path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }
}

// ─── Password hashing (Node built-in crypto, no deps) ────────────────────

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pwd, stored) {
  try {
    const [salt, hash] = stored.split(':');
    return crypto.scryptSync(pwd, salt, 64).toString('hex') === hash;
  } catch { return false; }
}

// ─── Session (in-memory; survives app reload only) ───────────────────────

let _session = null;

// Persist session across restarts in userData
const SESSION_PATH = () => path.join(app.getPath('userData'), 'session.json');

function loadPersistedSession() {
  try {
    const raw = fs.readFileSync(SESSION_PATH(), 'utf8');
    _session = JSON.parse(raw);
  } catch { /* no persisted session */ }
}

function persistSession(s) {
  _session = s;
  if (s) fs.writeFileSync(SESSION_PATH(), JSON.stringify(s));
  else { try { fs.unlinkSync(SESSION_PATH()); } catch {} }
}

// ─── Serialise / deserialise rows ─────────────────────────────────────────

function deserializeRow(row) {
  if (!row) return null;
  try {
    const extra = JSON.parse(row._data || '{}');
    const { _data, ...base } = row;
    return { ...base, ...extra };
  } catch { return row; }
}

function serializeRow(table, data) {
  const INDEXED = ['id', 'tenant_id', 'store_id', 'status', 'created_at', 'updated_at'];
  const base = {};
  const extra = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_')) continue; // strip _dirty, _version etc.
    if (INDEXED.includes(k)) base[k] = v == null ? null : String(v);
    else extra[k] = v;
  }
  base._data = JSON.stringify(extra);
  return base;
}

// Fetch a row from an auth/identity table (no _data column)
function isIdentityTable(t) {
  return ['tenants','profiles','user_companies','user_roles'].includes(t);
}

// ─── IPC: structured CRUD ─────────────────────────────────────────────────

ipcMain.handle('db:crud', (_e, { op, table, where = [], data, orderBy, orderDir, limitN, single }) => {
  try {
    const db = getDb();

    if (op === 'select') {
      const identity = isIdentityTable(table);
      const whereParts = [];
      const params = [];
      for (const [col, val] of where) {
        if (Array.isArray(val)) {
          whereParts.push(`${col} IN (${val.map(() => '?').join(',')})`);
          params.push(...val);
        } else if (val === null) {
          whereParts.push(`${col} IS NULL`);
        } else {
          whereParts.push(`${col} = ?`);
          params.push(val);
        }
      }
      const w = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
      const ord = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'DESC'}` : '';
      const lim = limitN ? `LIMIT ${limitN}` : '';
      const sql = `SELECT * FROM ${table} ${w} ${ord} ${lim}`;
      const rows = db.prepare(sql).all(...params);
      const out = identity ? rows : rows.map(deserializeRow);
      return { data: single ? (out[0] ?? null) : out, error: null };
    }

    if (op === 'insert' || op === 'upsert') {
      const items = Array.isArray(data) ? data : [data];
      const now = new Date().toISOString();
      const results = [];
      for (const item of items) {
        const row = isIdentityTable(table) ? item : serializeRow(table, item);
        row.id = row.id || crypto.randomUUID();
        row.created_at = row.created_at || now;
        row.updated_at = now;
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(',');
        db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(cols.map(c => row[c]));
        results.push({ ...item, id: row.id, created_at: row.created_at, updated_at: row.updated_at });
      }
      return { data: Array.isArray(data) ? results : (results[0] ?? null), error: null };
    }

    if (op === 'update') {
      const whereParts = [];
      const params = [];
      for (const [col, val] of where) {
        whereParts.push(`${col} = ?`);
        params.push(val);
      }
      if (!whereParts.length) return { data: null, error: 'update requires where' };
      const now = new Date().toISOString();

      if (isIdentityTable(table)) {
        const sets = Object.keys(data).map(k => `${k} = ?`).join(',');
        db.prepare(`UPDATE ${table} SET ${sets}, updated_at = ? WHERE ${whereParts.join(' AND ')}`)
          .run([...Object.values(data), now, ...params]);
      } else {
        // Merge with existing _data
        const existing = db.prepare(`SELECT * FROM ${table} WHERE ${whereParts.join(' AND ')}`).get(...params);
        if (existing) {
          const merged = deserializeRow(existing);
          Object.assign(merged, data);
          const serialized = serializeRow(table, merged);
          serialized.updated_at = now;
          const cols = Object.keys(serialized);
          const placeholders = cols.map(() => '?').join(',');
          db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`)
            .run(cols.map(c => serialized[c]));
        }
      }
      const updated = db.prepare(`SELECT * FROM ${table} WHERE ${whereParts.join(' AND ')}`).get(...params);
      return { data: isIdentityTable(table) ? updated : deserializeRow(updated), error: null };
    }

    if (op === 'delete') {
      const whereParts = [];
      const params = [];
      for (const [col, val] of where) {
        whereParts.push(`${col} = ?`);
        params.push(val);
      }
      if (!whereParts.length) return { data: null, error: 'delete requires where' };
      db.prepare(`DELETE FROM ${table} WHERE ${whereParts.join(' AND ')}`).run(...params);
      return { data: null, error: null };
    }

    return { data: null, error: `Unknown op: ${op}` };
  } catch (err) {
    return { data: null, error: err.message };
  }
});

// ─── IPC: auth ───────────────────────────────────────────────────────────

ipcMain.handle('auth:getSession', () => {
  if (_session) return { session: _session, needsSetup: false };
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as n FROM profiles').get();
  return { session: null, needsSetup: count.n === 0 };
});

ipcMain.handle('auth:signup', (_e, { email, password, fullName, companyName }) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    if (existing) return { error: 'Email already registered' };

    const tenantId = crypto.randomUUID();
    const userId   = crypto.randomUUID();
    const profileId = userId;
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare('INSERT INTO tenants (id,name,plan,created_at,updated_at) VALUES (?,?,?,?,?)')
        .run(tenantId, companyName || 'My Company', 'enterprise', now, now);
      db.prepare('INSERT INTO profiles (id,user_id,tenant_id,full_name,email,password_hash,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(profileId, userId, tenantId, fullName || email, email, hashPassword(password), 'admin', now, now);
      db.prepare('INSERT INTO user_companies (id,user_id,tenant_id,role,is_active,is_default,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(crypto.randomUUID(), userId, tenantId, 'admin', 1, 1, now);
      db.prepare('INSERT INTO user_roles (id,user_id,tenant_id,role,permissions,created_at) VALUES (?,?,?,?,?,?)')
        .run(crypto.randomUUID(), userId, tenantId, 'admin', '["*"]', now);
    })();

    const session = buildSession(db, userId, tenantId);
    persistSession(session);
    return { session, error: null };
  } catch (err) {
    return { session: null, error: err.message };
  }
});

ipcMain.handle('auth:signin', (_e, { email, password }) => {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
    if (!profile) return { session: null, error: 'Invalid email or password' };
    if (!verifyPassword(password, profile.password_hash)) return { session: null, error: 'Invalid email or password' };

    const session = buildSession(db, profile.user_id, profile.tenant_id);
    persistSession(session);
    return { session, error: null };
  } catch (err) {
    return { session: null, error: err.message };
  }
});

ipcMain.handle('auth:signout', () => {
  persistSession(null);
  return { error: null };
});

ipcMain.handle('app:getDataPath', () => app.getPath('userData'));

ipcMain.handle('app:backup', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Backup TELA ERP Database',
    defaultPath: `tela-erp-backup-${new Date().toISOString().slice(0,10)}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  });
  if (!filePath) return { error: 'Cancelled' };
  try {
    await getDb().backup(filePath);
    return { path: filePath, error: null };
  } catch (err) {
    return { error: err.message };
  }
});

function buildSession(db, userId, tenantId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const tenant  = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  return {
    access_token: crypto.randomBytes(32).toString('hex'),
    user: {
      id:    userId,
      email: profile.email,
      user_metadata: { full_name: profile.full_name, tenant_id: tenantId },
    },
    tenant: { id: tenantId, name: tenant?.name || 'My Company', plan: tenant?.plan || 'enterprise' },
  };
}

// ─── Window ──────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'TELA ERP',
    show: false,
  });

  // Try to set icon without crashing if file doesn't exist
  const iconFile = path.join(__dirname, '..', 'public', 'favicon.ico');
  if (fs.existsSync(iconFile)) win.setIcon(iconFile);

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));
  } else {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080');
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.once('ready-to-show', () => win.show());

  // Open external links in the OS browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  loadPersistedSession();
  initSchema();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
