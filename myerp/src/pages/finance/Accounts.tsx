import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/erp/Modal';

import {
  CHART_OF_ACCOUNTS,
  Account,
  AccountType,
  TYPE_COLORS,
  TYPE_LABELS,
} from '@/lib/finance-data';
import { formatCurrency, genId } from '@/lib/mock';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChildren(accounts: Account[], parentId: string | null): Account[] {
  return accounts.filter(a => a.parentId === parentId);
}

/** Collects the IDs of every ancestor of the given matched IDs. */
function getAncestorIds(accounts: Account[], matchIds: Set<string>): Set<string> {
  const result = new Set<string>();
  const idMap = new Map(accounts.map(a => [a.id, a]));

  function addAncestors(id: string) {
    const acct = idMap.get(id);
    if (!acct || acct.parentId === null) return;
    if (!result.has(acct.parentId)) {
      result.add(acct.parentId);
      addAncestors(acct.parentId);
    }
  }

  matchIds.forEach(id => addAncestors(id));
  return result;
}

// ─── AccountTreeNode ──────────────────────────────────────────────────────────

interface AccountTreeNodeProps {
  account: Account;
  depth: number;
  allAccounts: Account[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  /** null = show everything; Set = only show accounts in this set */
  visibleIds: Set<string> | null;
}

function AccountTreeNode({
  account,
  depth,
  allAccounts,
  expanded,
  onToggle,
  visibleIds,
}: AccountTreeNodeProps) {
  const children = getChildren(allAccounts, account.id).filter(
    child => visibleIds === null || visibleIds.has(child.id),
  );
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(account.id);
  const isNegative = account.balance < 0;

  return (
    <>
      <div
        className="flex items-center border-b border-border/40 hover:bg-muted/40 transition-colors"
        style={{ paddingLeft: depth * 20 + 12 }}
      >
        {/* Chevron toggle — fixed 20px slot */}
        <div className="w-5 shrink-0 flex items-center justify-center">
          {hasChildren ? (
            <button
              onClick={() => onToggle(account.id)}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : null}
        </div>

        {/* Code — 100px */}
        <div className="w-[100px] shrink-0 py-2.5 pr-2">
          <span className="text-xs text-muted-foreground font-mono">{account.code}</span>
        </div>

        {/* Name — flex-1 */}
        <div className="flex-1 min-w-0 py-2.5 pr-3">
          <span
            className={
              account.isHeader
                ? 'text-sm font-semibold text-foreground'
                : 'text-sm text-foreground'
            }
          >
            {account.name}
          </span>
          {account.description && !account.isHeader && (
            <span className="hidden lg:inline text-xs text-muted-foreground ml-2 truncate">
              — {account.description}
            </span>
          )}
        </div>

        {/* Type — 110px */}
        <div className="w-[110px] shrink-0 py-2.5 pr-3">
          <Badge variant={TYPE_COLORS[account.type] as any}>
            {TYPE_LABELS[account.type]}
          </Badge>
        </div>

        {/* Currency — 80px */}
        <div className="w-[80px] shrink-0 py-2.5 pr-3">
          <span className="text-xs text-muted-foreground">{account.currency}</span>
        </div>

        {/* Balance — 130px right-aligned */}
        <div className="w-[130px] shrink-0 py-2.5 pr-4 text-right">
          {account.isHeader ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <span
              className={`text-sm font-medium tabular-nums ${
                isNegative ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatCurrency(account.balance)}
            </span>
          )}
        </div>
      </div>

      {/* Recursive children */}
      {hasChildren &&
        isExpanded &&
        children.map(child => (
          <AccountTreeNode
            key={child.id}
            account={child}
            depth={depth + 1}
            allAccounts={allAccounts}
            expanded={expanded}
            onToggle={onToggle}
            visibleIds={visibleIds}
          />
        ))}
    </>
  );
}

// ─── Add Account Form types ───────────────────────────────────────────────────

interface AddAccountForm {
  code: string;
  name: string;
  type: AccountType | '';
  parentId: string;
  currency: string;
  description: string;
}

const EMPTY_FORM: AddAccountForm = {
  code: '',
  name: '',
  type: '',
  parentId: '',
  currency: 'USD',
  description: '',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'TZS'];

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'asset',     label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity',    label: 'Equity' },
  { value: 'revenue',   label: 'Revenue' },
  { value: 'expense',   label: 'Expense' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>(CHART_OF_ACCOUNTS);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['1000', '2000', '3000', '4000', '5000']),
  );
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddAccountForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddAccountForm, string>>>({});

  // ── KPIs ────────────────────────────────────────────────────────────────

  const totalAccounts = accounts.length;

  const totalAssets = useMemo(
    () =>
      accounts
        .filter(a => a.type === 'asset' && !a.isHeader)
        .reduce((s, a) => s + a.balance, 0),
    [accounts],
  );

  const totalLiabilities = useMemo(
    () =>
      accounts
        .filter(a => a.type === 'liability' && !a.isHeader)
        .reduce((s, a) => s + a.balance, 0),
    [accounts],
  );

  const netEquity = totalAssets - totalLiabilities;

  // ── Filtering / visible set ──────────────────────────────────────────────

  const searchActive = search.trim().length > 0 || typeFilter !== 'all';

  /**
   * When a filter is active, compute the set of IDs that should be rendered
   * (matched accounts + all their ancestors for tree context).
   * null means "show everything".
   */
  const visibleIds = useMemo<Set<string> | null>(() => {
    if (!search.trim() && typeFilter === 'all') return null;

    const q = search.trim().toLowerCase();

    const matched = new Set<string>(
      accounts
        .filter(a => {
          const matchesType = typeFilter === 'all' || a.type === typeFilter;
          const matchesSearch =
            !q ||
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q);
          return matchesType && matchesSearch;
        })
        .map(a => a.id),
    );

    const ancestors = getAncestorIds(accounts, matched);
    return new Set([...matched, ...ancestors]);
  }, [accounts, search, typeFilter]);

  /**
   * When a search is active, auto-expand every node that has visible
   * descendants so the user can see the matching rows immediately.
   */
  const effectiveExpanded = useMemo<Set<string>>(() => {
    if (visibleIds === null) return expanded;

    const auto = new Set<string>(expanded);
    visibleIds.forEach(id => {
      let current = accounts.find(a => a.id === id);
      while (current?.parentId) {
        auto.add(current.parentId);
        current = accounts.find(a => a.id === current!.parentId);
      }
    });
    return auto;
  }, [visibleIds, expanded, accounts]);

  function handleToggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rootAccounts = useMemo(
    () =>
      accounts
        .filter(a => a.parentId === null)
        .filter(a => visibleIds === null || visibleIds.has(a.id)),
    [accounts, visibleIds],
  );

  // ── Add Account ──────────────────────────────────────────────────────────

  function handleFormChange(field: keyof AddAccountForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof AddAccountForm, string>> = {};
    if (!form.code.trim()) {
      errors.code = 'Account code is required';
    } else if (accounts.some(a => a.code === form.code.trim())) {
      errors.code = 'Account code already exists';
    }
    if (!form.name.trim()) errors.name = 'Account name is required';
    if (!form.type) errors.type = 'Type is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleAddSubmit() {
    if (!validateForm()) return;

    const newAccount: Account = {
      id: genId(),
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type as AccountType,
      parentId: form.parentId || null,
      currency: form.currency,
      balance: 0,
      isHeader: false,
      description: form.description.trim(),
    };

    setAccounts(prev => [...prev, newAccount]);
    toast.success('Account created');
    setAddOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function handleCloseModal() {
    setAddOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  // Group accounts by type for parent select optgroups
  const accountsByType = useMemo(() => {
    const groups: Record<AccountType, Account[]> = {
      asset: [], liability: [], equity: [], revenue: [], expense: [],
    };
    accounts.forEach(a => groups[a.type].push(a));
    return groups;
  }, [accounts]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Chart of Accounts">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your account structure and hierarchy"
        primaryAction={{
          label: 'Add Account',
          onClick: () => setAddOpen(true),
          icon: Plus,
        }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Total Accounts</p>
                <p className="text-2xl font-bold text-foreground leading-tight">{totalAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Total Assets</p>
                <p className="text-lg font-bold text-foreground tabular-nums truncate">
                  {formatCurrency(totalAssets)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Total Liabilities</p>
                <p className="text-lg font-bold text-foreground tabular-nums truncate">
                  {formatCurrency(totalLiabilities)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Net Equity</p>
                <p
                  className={`text-lg font-bold tabular-nums truncate ${
                    netEquity >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(netEquity)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Tree Card */}
      <Card className="shadow-sm">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by code or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Types</option>
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {searchActive && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setSearch(''); setTypeFilter('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Table Header Row */}
        <div className="flex items-center bg-muted/30 border-b border-border sticky top-0 z-10">
          {/* spacer matching chevron slot + left indent */}
          <div className="w-[29px] shrink-0" />

          <div className="w-[100px] shrink-0 py-2.5 pr-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Code
            </span>
          </div>

          <div className="flex-1 min-w-0 py-2.5 pr-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </span>
          </div>

          <div className="w-[110px] shrink-0 py-2.5 pr-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </span>
          </div>

          <div className="w-[80px] shrink-0 py-2.5 pr-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Currency
            </span>
          </div>

          <div className="w-[130px] shrink-0 py-2.5 pr-4 text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Balance
            </span>
          </div>
        </div>

        {/* Tree */}
        <div className="overflow-x-auto">
          {rootAccounts.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No accounts match your filters.
            </div>
          ) : (
            rootAccounts.map(root => (
              <AccountTreeNode
                key={root.id}
                account={root}
                depth={0}
                allAccounts={accounts}
                expanded={effectiveExpanded}
                onToggle={handleToggle}
                visibleIds={visibleIds}
              />
            ))
          )}
        </div>
      </Card>

      {/* Add Account Modal */}
      <Modal
        open={addOpen}
        onClose={handleCloseModal}
        title="Add Account"
        size="md"
        footer={{
          confirmLabel: 'Create Account',
          onConfirm: handleAddSubmit,
        }}
      >
        <div className="space-y-4">
          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-code">
                Account Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc-code"
                placeholder="e.g. 1115"
                value={form.code}
                onChange={e => handleFormChange('code', e.target.value)}
                className={formErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formErrors.code && (
                <p className="text-xs text-destructive">{formErrors.code}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-name">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc-name"
                placeholder="e.g. Forex Reserve"
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
                className={formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <select
              id="acc-type"
              value={form.type}
              onChange={e => handleFormChange('type', e.target.value)}
              className={`w-full h-9 rounded-md border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                formErrors.type ? 'border-destructive' : 'border-input'
              }`}
            >
              <option value="">Select type…</option>
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {formErrors.type && (
              <p className="text-xs text-destructive">{formErrors.type}</p>
            )}
          </div>

          {/* Parent Account */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-parent">Parent Account</Label>
            <select
              id="acc-parent"
              value={form.parentId}
              onChange={e => handleFormChange('parentId', e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">— None (top-level) —</option>
              {TYPE_OPTIONS.map(o => {
                const group = accountsByType[o.value];
                if (!group.length) return null;
                return (
                  <optgroup key={o.value} label={o.label}>
                    {group.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-currency">Currency</Label>
            <select
              id="acc-currency"
              value={form.currency}
              onChange={e => handleFormChange('currency', e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-desc">Description</Label>
            <Textarea
              id="acc-desc"
              placeholder="Optional description…"
              rows={3}
              value={form.description}
              onChange={e => handleFormChange('description', e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
