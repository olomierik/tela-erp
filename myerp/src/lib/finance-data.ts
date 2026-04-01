// ─── Types ────────────────────────────────────────────────────────────────────
// DB column names are snake_case to match the Supabase myerp_accounts /
// myerp_journal_entries / myerp_journal_lines tables.

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type JEStatus    = 'draft' | 'posted' | 'cancelled';

export interface Account extends Record<string, unknown> {
  id:          string;
  code:        string;
  name:        string;
  type:        AccountType;
  parent_id:   string | null;
  currency:    string;
  balance:     number;
  is_header:   boolean;
  description: string;
  user_id?:    string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalLine extends Record<string, unknown> {
  id:           string;
  entry_id:     string;
  account_id:   string;
  account_code: string;
  account_name: string;
  description:  string;
  debit:        number;
  credit:       number;
  department:   string;
  created_at?:  string;
}

export interface JournalEntry extends Record<string, unknown> {
  id:          string;
  reference:   string;
  date:        string;
  description: string;
  status:      JEStatus;
  lines:       JournalLine[];
  user_id?:    string;
  created_at?: string;
  updated_at?: string;
}

// ─── Badge / label maps (used by multiple pages) ──────────────────────────────

export const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  liability: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  equity:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  revenue:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  expense:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

export const TYPE_LABELS: Record<AccountType, string> = {
  asset:     'Asset',
  liability: 'Liability',
  equity:    'Equity',
  revenue:   'Revenue',
  expense:   'Expense',
};

// ─── Helper: generate the next JE reference from a list of entries ────────────

export function nextJEReference(entries: { reference: string }[]): string {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  const nums = entries
    .map(e => e.reference)
    .filter(r => r.startsWith(prefix))
    .map(r => parseInt(r.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}
