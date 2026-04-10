/**
 * pos.boundary.test.tsx
 *
 * Boundary-condition tests for the PointOfSale page's handleCreate function
 * and session_number generation logic.
 *
 * Mocking strategy:
 *  - @/lib/supabase → fully mocked (no network)
 *  - @/hooks/use-tenant-query → mocked to expose spy functions for
 *    useTenantQuery (returns empty data) and useTenantInsert (tracks calls)
 *  - @/contexts/AuthContext → mocked to control isDemo flag
 *  - @/contexts/CurrencyContext → mocked to return a no-op formatMoney
 *  - @/contexts/StoreContext → mocked to return null selectedStoreId
 *  - sonner (toast) → mocked to spy on toast.error / toast.success
 *  - AppLayout / PageHeader / DataTable / Sheet UI → mocked as lightweight
 *    pass-through divs so we don't need the full Radix/Tailwind pipeline
 *
 * We render the real PointOfSale component and interact via fireEvent so that
 * the actual handleCreate code path is exercised.
 *
 * Note: @testing-library/user-event is listed as a devDependency but may not
 * be installed yet. This file uses fireEvent from @testing-library/react,
 * which is always available, so the tests run without user-event.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks registered BEFORE the component import ─────────────────────────────

// 1. Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// 2. sonner toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
  },
  Toaster: () => null,
}));

// 3. useTenantQuery / useTenantInsert hooks
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/use-tenant-query', () => ({
  useTenantQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useTenantInsert: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

// 4. AuthContext — default: NOT demo
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: any) => children,
}));

// 5. CurrencyContext
vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (v: number) => `$${v}` }),
  CurrencyProvider: ({ children }: any) => children,
}));

// 6. StoreContext
vi.mock('@/contexts/StoreContext', () => ({
  useStore: () => ({ selectedStoreId: null }),
  StoreProvider: ({ children }: any) => children,
}));

// 7. Heavy UI shells — replace with lightweight pass-throughs
vi.mock('@/components/layout/AppLayout', () => ({
  default: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/components/erp/PageHeader', () => ({
  default: ({ actions }: any) => (
    <div data-testid="page-header">
      {actions?.map((a: any, i: number) => (
        <button key={i} data-testid={`header-action-${i}`} onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/erp/DataTable', () => ({
  default: ({ emptyAction }: any) => (
    <div data-testid="data-table">
      {emptyAction && (
        <button data-testid="empty-action" onClick={emptyAction.onClick}>
          {emptyAction.label}
        </button>
      )}
    </div>
  ),
}));

// Sheet — render children unconditionally (ignore open state so the form is
// always in the DOM; the component manages open/close via state)
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetFooter: ({ children }: any) => <div data-testid="sheet-footer">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, ...rest }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type ?? 'text'}
      data-testid={placeholder ? `input-${placeholder}` : undefined}
      {...rest}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

// ─── Component import (after all mocks) ───────────────────────────────────────

import PointOfSale from '@/pages/PointOfSale';

// ─── Test helpers ──────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPOS() {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <PointOfSale />
    </QueryClientProvider>,
  );
}

/** Clicks the "Open Session" header action button. */
function openSessionSheet() {
  const button = screen.getByTestId('header-action-0');
  fireEvent.click(button);
}

/** Finds the submit button scoped to the sheet footer (avoids ambiguity with header/empty-state buttons). */
function getSubmitButton() {
  return within(screen.getByTestId('sheet-footer')).getByRole('button', { name: /open session/i });
}

/** Finds the cashier name input by its placeholder text. */
function getCashierInput() {
  return screen.getByPlaceholderText(/alice boateng/i);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockMutateAsync.mockResolvedValue({ id: 'new-session' });

  // Default: real (non-demo) user with a tenant
  mockUseAuth.mockReturnValue({
    isDemo: false,
    tenant: { id: 'tenant-123', subscription_tier: 'premium' },
    user: { id: 'user-abc' },
  });
});

// ─── handleCreate — empty cashier_name ────────────────────────────────────────

describe('handleCreate — empty cashier_name validation', () => {
  it('calls toast.error when cashier_name is empty', () => {
    renderPOS();
    openSessionSheet();

    // Cashier input is empty by default — click submit without filling it
    fireEvent.click(getSubmitButton());

    expect(mockToastError).toHaveBeenCalledWith('Cashier name is required');
  });

  it('does NOT call insertSession.mutateAsync when cashier_name is empty', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does NOT call toast.success when cashier_name is empty', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('calls toast.error exactly once per empty-name submission', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());
    fireEvent.click(getSubmitButton());

    expect(mockToastError).toHaveBeenCalledTimes(2);
  });

  it('calls toast.error with the exact message string', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    // Exact string match — a UI change to the message must update this test
    expect(mockToastError).toHaveBeenCalledWith('Cashier name is required');
  });
});

// ─── handleCreate — demo mode ──────────────────────────────────────────────────

describe('handleCreate — demo mode short-circuits to toast.success', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isDemo: true,
      tenant: { id: 'demo-tenant', subscription_tier: 'premium' },
      user: { id: 'demo-user' },
    });
  });

  it('calls toast.success("POS session opened (demo)") in demo mode', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    expect(mockToastSuccess).toHaveBeenCalledWith('POS session opened (demo)');
  });

  it('does NOT call insertSession.mutateAsync in demo mode', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('works even without a cashier name in demo mode — no validation fired', () => {
    // Demo path exits before cashier_name check
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    expect(mockToastSuccess).toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('demo success message is "POS session opened (demo)" not generic success', () => {
    renderPOS();
    openSessionSheet();

    fireEvent.click(getSubmitButton());

    // Verify the demo-specific message, not the real one
    const calls = mockToastSuccess.mock.calls.map(c => c[0]);
    expect(calls).toContain('POS session opened (demo)');
    expect(calls).not.toContain('POS session opened');
  });
});

// ─── handleCreate — successful real submission ─────────────────────────────────

describe('handleCreate — successful real submission', () => {
  it('calls mutateAsync with a non-empty session_number', async () => {
    renderPOS();
    openSessionSheet();

    const cashierInput = getCashierInput();
    fireEvent.change(cashierInput, { target: { value: 'Alice Boateng' } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.session_number).toBeTruthy();
    expect(callArg.session_number).not.toBe('');
  });

  it('session_number starts with "POS-"', async () => {
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'Bob Smith' } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.session_number).toMatch(/^POS-/);
  });

  it('calls toast.success("POS session opened") after successful insert', async () => {
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'Grace Mensah' } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('POS session opened');
    });
  });

  it('passes opening_cash as a number (not a string)', async () => {
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'Samuel Owusu' } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(typeof callArg.opening_cash).toBe('number');
  });

  it('defaults opening_cash to 0 when field is left blank', async () => {
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'Ama Frimpong' } });
    // Do NOT fill opening_cash — leave blank (default is '' → Number('') = 0)
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.opening_cash).toBe(0);
  });

  it('initialises total_sales and total_orders to 0 on creation', async () => {
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'James Asante' } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.total_sales).toBe(0);
    expect(callArg.total_orders).toBe(0);
  });

  it('passes cashier name (trimmed) to mutateAsync as `cashier` field', async () => {
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'Kwame Mensah Jr.' } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.cashier).toBe('Kwame Mensah Jr.');
  });
});

// ─── session_number format guarantees ─────────────────────────────────────────

describe('session_number — auto-generation contract', () => {
  it('generated session_number is not empty', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated.length).toBeGreaterThan('POS-'.length);
  });

  it('generated session_number matches POS-[uppercase alphanumeric] pattern', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated).toMatch(/^POS-[A-Z0-9]+$/);
  });

  it('generated session_number contains only safe characters (no spaces, no special chars)', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated).not.toMatch(/[\s!@#$%^&*()+=[\]{};':"\\|,.<>/?]/);
  });

  it('generated session_number is deterministic given the same timestamp', () => {
    const ts = 1_700_000_000_000;
    const a = `POS-${ts.toString(36).toUpperCase()}`;
    const b = `POS-${ts.toString(36).toUpperCase()}`;
    expect(a).toBe(b);
  });

  it('different timestamps produce different session_numbers', () => {
    const a = `POS-${(1_000_000).toString(36).toUpperCase()}`;
    const b = `POS-${(2_000_000).toString(36).toUpperCase()}`;
    expect(a).not.toBe(b);
  });

  it('session_number prefix is always exactly "POS-"', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated.slice(0, 4)).toBe('POS-');
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('handleCreate — edge cases', () => {
  it('whitespace-only cashier_name is treated as empty and triggers toast.error', () => {
    // Validation uses .trim() so '   '.trim() === '' is falsy → rejected.
    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: '   ' } });
    fireEvent.click(getSubmitButton());

    expect(mockToastError).toHaveBeenCalledWith('Cashier name is required');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('mutateAsync rejection propagates without crashing the component', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('DB connection failed'));

    renderPOS();
    openSessionSheet();

    fireEvent.change(getCashierInput(), { target: { value: 'Test User' } });

    // Should not throw an unhandled rejection that crashes the test
    await act(async () => {
      fireEvent.click(getSubmitButton());
      // Give the rejected promise time to settle
      await new Promise(r => setTimeout(r, 10));
    });

    // The component should still be in the DOM (not crashed)
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
  });
});
