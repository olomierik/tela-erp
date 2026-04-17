/**
 * Desktop Supabase-compatible client.
 *
 * Works in two modes, auto-detected at runtime:
 *   1. Electron IPC  – when window.electronAPI is present (packaged .exe / dev mode)
 *   2. HTTP REST     – when running from browser against standalone/server.cjs
 *                       (http://localhost:4321)
 */

// ─── IPC bridge (exposed by electron/preload.cjs) ─────────────────────────

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      dbCrud: (args: any) => Promise<{ data: any; error: any }>;
      authGetSession: () => Promise<{ session: any; needsSetup: boolean }>;
      authSignup: (args: any) => Promise<{ session: any; error: any }>;
      authSignin: (args: any) => Promise<{ session: any; error: any }>;
      authSignout: () => Promise<{ error: any }>;
      getDataPath: () => Promise<string>;
      backupDatabase: () => Promise<{ path?: string; error?: string }>;
    };
  }
}

const HTTP_BASE = 'http://localhost:4321/api';

async function httpPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${HTTP_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

// Unified backend — IPC when available, HTTP fallback otherwise
const backend = {
  isElectron: () => !!(typeof window !== 'undefined' && window.electronAPI?.isElectron),

  async dbCrud(args: any): Promise<{ data: any; error: any }> {
    if (backend.isElectron()) return window.electronAPI!.dbCrud(args);
    return httpPost('/crud', args);
  },

  async authGetSession(): Promise<{ session: any; needsSetup: boolean }> {
    if (backend.isElectron()) return window.electronAPI!.authGetSession();
    return httpPost('/auth/session', {});
  },

  async authSignup(args: any): Promise<{ session: any; error: any }> {
    if (backend.isElectron()) return window.electronAPI!.authSignup(args);
    return httpPost('/auth/signup', args);
  },

  async authSignin(args: any): Promise<{ session: any; error: any }> {
    if (backend.isElectron()) return window.electronAPI!.authSignin(args);
    return httpPost('/auth/signin', args);
  },

  async authSignout(): Promise<{ error: any }> {
    if (backend.isElectron()) return window.electronAPI!.authSignout();
    return httpPost('/auth/signout', {});
  },
};

// ─── Auth state ───────────────────────────────────────────────────────────

type AuthCallback = (event: string, session: any) => void;
const authListeners = new Set<AuthCallback>();
let cachedSession: any = null;

function notifyAuth(event: string, session: any) {
  cachedSession = session;
  authListeners.forEach(cb => cb(event, session));
}

// Bootstrap: load persisted session on first import
(async () => {
  try {
    const { session, needsSetup } = await backend.authGetSession();
    if (session) {
      cachedSession = session;
      setTimeout(() => notifyAuth('SIGNED_IN', buildSupabaseSession(session)), 100);
    } else if (needsSetup) {
      setTimeout(() => notifyAuth('DESKTOP_SETUP_REQUIRED', null), 100);
    }
  } catch { /* backend not ready yet */ }
})();

function buildSupabaseSession(raw: any) {
  if (!raw) return null;
  return {
    access_token:  raw.access_token,
    refresh_token: 'desktop',
    expires_at:    Date.now() / 1000 + 86400 * 365,
    user: {
      id:            raw.user.id,
      email:         raw.user.email,
      user_metadata: raw.user.user_metadata ?? {},
      app_metadata:  {},
    },
  };
}

// ─── Query builder ────────────────────────────────────────────────────────

type WhereClause = [string, any];
type QOp = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

class DesktopQuery {
  private _table:   string;
  private _op:      QOp = 'select';
  private _where:   WhereClause[] = [];
  private _data:    any = null;
  private _orderBy: string | null = null;
  private _orderDir = 'DESC';
  private _limit:   number | null = null;
  private _single   = false;

  constructor(table: string) { this._table = table; }

  // ── Filters
  eq(col: string, val: any)       { this._where.push([col, val]);   return this; }
  neq(_col: string, _val: any)    { return this; }
  gt(_col: string, _val: any)     { return this; }
  gte(_col: string, _val: any)    { return this; }
  lt(_col: string, _val: any)     { return this; }
  lte(_col: string, _val: any)    { return this; }
  is(col: string, val: any)       { this._where.push([col, val]);   return this; }
  in(col: string, vals: any[])    { this._where.push([col, vals]);  return this; }
  ilike(_col: string, _p: string) { return this; }
  like(_col: string, _p: string)  { return this; }
  contains(_c: string, _v: any)   { return this; }
  overlaps(_c: string, _v: any)   { return this; }
  not(_c: string, _op: string, _v: any) { return this; }
  filter(_c: string, _op: string, _v: any) { return this; }
  textSearch(_c: string, _q: string) { return this; }

  // ── Operations
  select(_cols = '*') { this._op = 'select'; return this; }
  insert(data: any)   { this._op = 'insert'; this._data = data; return this; }
  upsert(data: any, _opts?: any) { this._op = 'upsert'; this._data = data; return this; }
  update(data: any)   { this._op = 'update'; this._data = data; return this; }
  delete()            { this._op = 'delete'; return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderBy  = col;
    this._orderDir = opts?.ascending ? 'ASC' : 'DESC';
    return this;
  }
  limit(n: number)  { this._limit = n; return this; }
  single()          { this._single = true; return this; }
  maybeSingle()     { this._single = true; return this; }
  range(_from: number, _to: number) { return this; }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return this._run().then(resolve, reject);
  }

  private async _run(): Promise<{ data: any; error: any }> {
    try {
      if (this._op === 'select') {
        const synthetic = this._syntheticIdentityRow();
        if (synthetic !== undefined) return synthetic;
      }

      if (this._op === 'select' || this._op === 'delete') {
        return await backend.dbCrud({
          op:       this._op,
          table:    this._table,
          where:    this._where,
          orderBy:  this._orderBy ?? 'created_at',
          orderDir: this._orderDir,
          limitN:   this._limit,
          single:   this._single,
        });
      }

      // insert / update / upsert — auto-attach tenant_id
      const tenantId = cachedSession?.user?.user_metadata?.tenant_id ?? null;
      let data = this._data;
      if (this._op === 'insert' || this._op === 'upsert') {
        const addTenant = (row: any) =>
          tenantId && !row.tenant_id ? { ...row, tenant_id: tenantId } : row;
        data = Array.isArray(data) ? data.map(addTenant) : addTenant(data);
      }

      return await backend.dbCrud({
        op:     this._op,
        table:  this._table,
        where:  this._where,
        data,
        single: this._single,
      });
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  /** Synthetic rows for auth/identity tables so AuthContext bootstraps correctly. */
  private _syntheticIdentityRow(): { data: any; error: null } | undefined {
    if (!cachedSession) return undefined;
    const s        = cachedSession;
    const userId   = s.user.id;
    const tenantId = s.user.user_metadata?.tenant_id;
    const email    = s.user.email;
    const fullName = s.user.user_metadata?.full_name ?? email;

    const userFilter   = this._where.find(([c]) => c === 'user_id');
    const tenantFilter = this._where.find(([c]) => c === 'tenant_id');
    const idFilter     = this._where.find(([c]) => c === 'id');

    const matchUser   = !userFilter   || userFilter[1]   === userId;
    const matchTenant = !tenantFilter || tenantFilter[1] === tenantId;
    const matchId     = !idFilter     || idFilter[1]     === tenantId || idFilter[1] === userId;

    switch (this._table) {
      case 'profiles':
        if (matchUser || matchTenant) {
          const row = { id: userId, user_id: userId, tenant_id: tenantId, full_name: fullName, email, role: 'admin' };
          return { data: this._single ? row : [row], error: null };
        }
        break;
      case 'user_companies':
        if (matchUser || matchTenant) {
          const row = { id: `uc-${userId}`, user_id: userId, tenant_id: tenantId, role: 'admin', is_active: true, is_default: true };
          return { data: this._single ? row : [row], error: null };
        }
        break;
      case 'tenants':
        if (matchId || matchTenant) {
          const row = { id: tenantId, name: s.tenant?.name ?? 'My Company', plan: 'enterprise', settings: {} };
          return { data: this._single ? row : [row], error: null };
        }
        break;
      case 'user_roles':
        if (matchUser || matchTenant) {
          const row = { id: `ur-${userId}`, user_id: userId, tenant_id: tenantId, role: 'admin', permissions: ['*'] };
          return { data: this._single ? row : [row], error: null };
        }
        break;
      case 'subscription_plans':
      case 'subscriptions':
        return { data: this._single ? null : [], error: null };
    }
    return undefined;
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────

const auth = {
  async getSession() {
    try {
      const { session } = await backend.authGetSession();
      if (session) cachedSession = session;
      return { data: { session: session ? buildSupabaseSession(session) : null }, error: null };
    } catch (err: any) {
      return { data: { session: null }, error: { message: err.message } };
    }
  },

  async getUser() {
    const { data } = await auth.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  },

  onAuthStateChange(callback: AuthCallback) {
    authListeners.add(callback);
    if (cachedSession) {
      setTimeout(() => callback('SIGNED_IN', buildSupabaseSession(cachedSession)), 0);
    }
    return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { session, error } = await backend.authSignin({ email, password });
    if (error) return { data: { user: null, session: null }, error: { message: error } };
    cachedSession = session;
    const built = buildSupabaseSession(session);
    notifyAuth('SIGNED_IN', built);
    return { data: { user: built.user, session: built }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
    const fullName    = options?.data?.full_name ?? options?.data?.name ?? '';
    const companyName = options?.data?.company ?? options?.data?.company_name ?? 'My Company';
    const { session, error } = await backend.authSignup({ email, password, fullName, companyName });
    if (error) return { data: { user: null, session: null }, error: { message: error } };
    cachedSession = session;
    const built = buildSupabaseSession(session);
    notifyAuth('SIGNED_IN', built);
    return { data: { user: built.user, session: built }, error: null };
  },

  async signOut() {
    await backend.authSignout();
    cachedSession = null;
    notifyAuth('SIGNED_OUT', null);
    return { error: null };
  },

  async updateUser(_upd: any) { return { data: { user: cachedSession?.user ?? null }, error: null }; },
  async resetPasswordForEmail(_email: string) { return { error: null }; },
  async refreshSession() { return { data: { session: cachedSession ? buildSupabaseSession(cachedSession) : null }, error: null }; },
};

// ─── Realtime / functions / storage stubs ────────────────────────────────

function noopChannel() {
  const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => Promise.resolve(), send: () => Promise.resolve() };
  return ch;
}

const functions = {
  invoke: async (_fn: string, _opts?: any) => ({ data: null, error: null }),
};

const storage = {
  from: (_bucket: string) => ({
    upload:       async () => ({ data: null, error: null }),
    download:     async () => ({ data: null, error: null }),
    getPublicUrl: ()       => ({ data: { publicUrl: '' } }),
    remove:       async () => ({ data: null, error: null }),
    list:         async () => ({ data: [], error: null }),
  }),
};

// ─── Export — same shape as @supabase/supabase-js createClient() ──────────

export const supabase = {
  from:              (table: string) => new DesktopQuery(table),
  auth,
  functions,
  storage,
  channel:           (_name: string) => noopChannel(),
  removeChannel:     (_ch: any) => Promise.resolve(),
  removeAllChannels: () => Promise.resolve([]),
};
