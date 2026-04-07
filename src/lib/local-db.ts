/**
 * local-db.ts
 * Supabase-compatible chainable query builder for Electron + SQLite offline mode.
 * Falls back to in-memory store when not running in Electron (browser dev).
 */

// ------------------------------------------------------------------
// Type helpers
// ------------------------------------------------------------------
declare global {
  interface Window {
    electronAPI?: {
      dbQuery: (sql: string, params?: any[]) => Promise<{ data: any; error: string | null }>;
      dbRun: (sql: string, params?: any[]) => Promise<{ data: any; error: string | null }>;
      dbAll: (sql: string, params?: any[]) => Promise<{ data: any[]; error: string | null }>;
      isElectron: boolean;
    };
  }
}

const isElectron = () =>
  typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

// ------------------------------------------------------------------
// In-memory fallback store (browser dev mode)
// ------------------------------------------------------------------
const memStore: Map<string, Map<string, any>> = new Map();

function getTable(table: string): Map<string, any> {
  if (!memStore.has(table)) memStore.set(table, new Map());
  return memStore.get(table)!;
}

// ------------------------------------------------------------------
// UUID helper
// ------------------------------------------------------------------
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ------------------------------------------------------------------
// QueryBuilder
// ------------------------------------------------------------------
type WhereClause = { col: string; op: string; val: any };
type OrderClause = { col: string; ascending: boolean };

class QueryBuilder {
  private _table: string;
  private _operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private _columns: string = '*';
  private _where: WhereClause[] = [];
  private _orderBy: OrderClause[] = [];
  private _limitVal: number | null = null;
  private _isSingle: boolean = false;
  private _insertData: any = null;
  private _updateData: any = null;
  private _notFlag: boolean = false;

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*'): this {
    this._operation = 'select';
    this._columns = columns;
    return this;
  }

  insert(data: any | any[]): this {
    this._operation = 'insert';
    this._insertData = data;
    return this;
  }

  upsert(data: any | any[]): this {
    this._operation = 'upsert';
    this._insertData = data;
    return this;
  }

  update(data: any): this {
    this._operation = 'update';
    this._updateData = data;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this._where.push({ col: column, op: this._notFlag ? '!=' : '=', val: value });
    this._notFlag = false;
    return this;
  }

  neq(column: string, value: any): this {
    this._where.push({ col: column, op: '!=', val: value });
    return this;
  }

  in(column: string, values: any[]): this {
    this._where.push({ col: column, op: 'IN', val: values });
    return this;
  }

  like(column: string, pattern: string): this {
    this._where.push({ col: column, op: 'LIKE', val: pattern });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this._where.push({ col: column, op: 'ILIKE', val: pattern });
    return this;
  }

  is(column: string, value: null | boolean): this {
    this._where.push({ col: column, op: 'IS', val: value });
    return this;
  }

  not(column: string, op: string, value: any): this {
    // Supabase .not(column, 'eq', value) style
    const opMap: Record<string, string> = { eq: '!=', neq: '=', is: 'IS NOT' };
    this._where.push({ col: column, op: opMap[op] || `NOT ${op}`, val: value });
    return this;
  }

  filter(column: string, op: string, value: any): this {
    this._where.push({ col: column, op, val: value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this._orderBy.push({ col: column, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this._limitVal = n;
    return this;
  }

  single(): this {
    this._isSingle = true;
    this._limitVal = 1;
    return this;
  }

  // Make thenable
  then(
    resolve: (value: { data: any; error: any }) => any,
    reject?: (reason: any) => any
  ): Promise<any> {
    return this._execute().then(resolve, reject);
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    try {
      if (isElectron()) {
        return await this._executeElectron();
      } else {
        return this._executeMem();
      }
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  // ------------------------------------------------------------------
  // Electron / SQLite execution
  // ------------------------------------------------------------------
  private async _executeElectron(): Promise<{ data: any; error: any }> {
    const api = window.electronAPI!;

    if (this._operation === 'select') {
      const { sql, params } = this._buildSelectSQL();
      const result = await api.dbAll(sql, params);
      if (result.error) return { data: null, error: result.error };
      const rows = result.data || [];
      if (this._isSingle) {
        return { data: rows[0] ?? null, error: rows[0] ? null : { code: 'PGRST116', message: 'No rows found' } };
      }
      return { data: rows, error: null };
    }

    if (this._operation === 'insert') {
      const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
      for (const row of rows) {
        if (!row.id) row.id = generateId();
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT INTO "${this._table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        const res = await api.dbRun(sql, cols.map((c) => row[c]));
        if (res.error) return { data: null, error: res.error };
      }
      return { data: rows.length === 1 ? rows[0] : rows, error: null };
    }

    if (this._operation === 'upsert') {
      const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
      for (const row of rows) {
        if (!row.id) row.id = generateId();
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO "${this._table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        const res = await api.dbRun(sql, cols.map((c) => row[c]));
        if (res.error) return { data: null, error: res.error };
      }
      return { data: rows.length === 1 ? rows[0] : rows, error: null };
    }

    if (this._operation === 'update') {
      const { whereSQL, whereParams } = this._buildWhere();
      const cols = Object.keys(this._updateData);
      const setClause = cols.map((c) => `"${c}" = ?`).join(', ');
      const sql = `UPDATE "${this._table}" SET ${setClause}${whereSQL ? ' WHERE ' + whereSQL : ''}`;
      const params = [...cols.map((c) => this._updateData[c]), ...whereParams];
      const res = await api.dbRun(sql, params);
      if (res.error) return { data: null, error: res.error };
      return { data: res.data, error: null };
    }

    if (this._operation === 'delete') {
      const { whereSQL, whereParams } = this._buildWhere();
      const sql = `DELETE FROM "${this._table}"${whereSQL ? ' WHERE ' + whereSQL : ''}`;
      const res = await api.dbRun(sql, whereParams);
      if (res.error) return { data: null, error: res.error };
      return { data: res.data, error: null };
    }

    return { data: null, error: 'Unknown operation' };
  }

  private _buildSelectSQL(): { sql: string; params: any[] } {
    const { whereSQL, whereParams } = this._buildWhere();
    let sql = `SELECT ${this._columns} FROM "${this._table}"`;
    if (whereSQL) sql += ` WHERE ${whereSQL}`;
    if (this._orderBy.length) {
      sql += ' ORDER BY ' + this._orderBy.map((o) => `"${o.col}" ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
    }
    if (this._limitVal !== null) sql += ` LIMIT ${this._limitVal}`;
    return { sql, params: whereParams };
  }

  private _buildWhere(): { whereSQL: string; whereParams: any[] } {
    const parts: string[] = [];
    const params: any[] = [];
    for (const w of this._where) {
      if (w.op === 'IN' && Array.isArray(w.val)) {
        parts.push(`"${w.col}" IN (${w.val.map(() => '?').join(', ')})`);
        params.push(...w.val);
      } else if (w.op === 'ILIKE') {
        parts.push(`LOWER("${w.col}") LIKE LOWER(?)`);
        params.push(w.val);
      } else if (w.op === 'IS') {
        parts.push(`"${w.col}" IS ${w.val === null ? 'NULL' : w.val ? 'TRUE' : 'FALSE'}`);
      } else {
        parts.push(`"${w.col}" ${w.op} ?`);
        params.push(w.val);
      }
    }
    return { whereSQL: parts.join(' AND '), whereParams: params };
  }

  // ------------------------------------------------------------------
  // In-memory fallback (browser dev)
  // ------------------------------------------------------------------
  private _executeMem(): { data: any; error: any } {
    const tbl = getTable(this._table);

    if (this._operation === 'select') {
      let rows = Array.from(tbl.values());
      rows = this._applyWhereFilter(rows);
      if (this._orderBy.length) {
        rows.sort((a, b) => {
          for (const o of this._orderBy) {
            const diff = a[o.col] < b[o.col] ? -1 : a[o.col] > b[o.col] ? 1 : 0;
            if (diff !== 0) return o.ascending ? diff : -diff;
          }
          return 0;
        });
      }
      if (this._limitVal !== null) rows = rows.slice(0, this._limitVal);
      if (this._isSingle) {
        return { data: rows[0] ?? null, error: rows[0] ? null : { code: 'PGRST116', message: 'No rows found' } };
      }
      return { data: rows, error: null };
    }

    if (this._operation === 'insert') {
      const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
      for (const row of rows) {
        if (!row.id) row.id = generateId();
        tbl.set(row.id, { ...row });
      }
      return { data: rows.length === 1 ? rows[0] : rows, error: null };
    }

    if (this._operation === 'upsert') {
      const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
      for (const row of rows) {
        if (!row.id) row.id = generateId();
        tbl.set(row.id, { ...(tbl.get(row.id) ?? {}), ...row });
      }
      return { data: rows.length === 1 ? rows[0] : rows, error: null };
    }

    if (this._operation === 'update') {
      let rows = Array.from(tbl.values());
      rows = this._applyWhereFilter(rows);
      for (const row of rows) {
        tbl.set(row.id, { ...row, ...this._updateData });
      }
      return { data: rows.length, error: null };
    }

    if (this._operation === 'delete') {
      let rows = Array.from(tbl.values());
      rows = this._applyWhereFilter(rows);
      for (const row of rows) tbl.delete(row.id);
      return { data: rows.length, error: null };
    }

    return { data: null, error: 'Unknown operation' };
  }

  private _applyWhereFilter(rows: any[]): any[] {
    for (const w of this._where) {
      rows = rows.filter((row) => {
        const val = row[w.col];
        switch (w.op) {
          case '=': return val == w.val;
          case '!=': return val != w.val;
          case '>': return val > w.val;
          case '<': return val < w.val;
          case '>=': return val >= w.val;
          case '<=': return val <= w.val;
          case 'IN': return Array.isArray(w.val) && w.val.includes(val);
          case 'LIKE': return new RegExp(w.val.replace(/%/g, '.*')).test(String(val));
          case 'ILIKE': return new RegExp(w.val.replace(/%/g, '.*'), 'i').test(String(val));
          case 'IS': return w.val === null ? val == null : val === w.val;
          case 'IS NOT': return w.val === null ? val != null : val !== w.val;
          default: return true;
        }
      });
    }
    return rows;
  }
}

// ------------------------------------------------------------------
// localDB export
// ------------------------------------------------------------------
export const localDB = {
  from: (table: string): QueryBuilder => new QueryBuilder(table),
};

// ------------------------------------------------------------------
// localAuth export
// ------------------------------------------------------------------
const SESSION_KEY = 'tela_local_session';

export const localAuth = {
  async getSession(): Promise<{ data: { session: any } }> {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      return { data: { session } };
    } catch {
      return { data: { session: null } };
    }
  },

  onAuthStateChange(cb: (event: string, session: any) => void): {
    data: { subscription: { unsubscribe: () => void } };
  } {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      cb('INITIAL_SESSION', session);
    } catch {
      cb('INITIAL_SESSION', null);
    }
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }): Promise<{
    data: { user: any };
    error: any;
  }> {
    const user = { id: generateId(), email };
    const session = { user, access_token: 'local-token', expires_at: null };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { data: { user }, error: null };
  },

  async signUp({ email, password }: { email: string; password: string }): Promise<{
    data: { user: any };
    error: any;
  }> {
    return localAuth.signInWithPassword({ email, password });
  },

  async signOut(): Promise<{ error: any }> {
    localStorage.removeItem(SESSION_KEY);
    return { error: null };
  },

  async getUser(): Promise<{ data: { user: any }; error: any }> {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      return { data: { user: session?.user ?? null }, error: null };
    } catch {
      return { data: { user: null }, error: null };
    }
  },
};
