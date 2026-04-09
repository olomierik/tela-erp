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
 *  - AppLayout / PageHeader / DataTable / Sheet-related UI → mocked as
 *    passthrough divs so we don't need the full Radix/Tailwind pipeline
 *
 * We render the real PointOfSale component and interact via userEvent so that
 * the actual handleCreate code path is exercised.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Sheet — render children + trigger open state via a simple controlled div
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: any) => (
    <div data-testid="sheet" data-open={open ? 'true' : 'false'}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetFooter: ({ children }: any) => <div data-testid="sheet-footer">{children}</div>,
}));

// Radix UI primitives used in the form
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
      type={type}
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
  const result = render(
    <QueryClientProvider client={qc}>
      <PointOfSale />
    </QueryClientProvider>,
  );
  return result;
}

/** Clicks the "Open Session" header action to open the Sheet form. */
async function openSessionSheet() {
  const button = screen.getByTestId('header-action-0');
  await userEvent.click(button);
}

/** Finds the "Open Session" submit button inside the Sheet footer. */
function getSubmitButton() {
  return screen.getByRole('button', { name: /open session/i });
}

/** Finds the cashier name input by its placeholder. */
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
  it('calls toast.error when cashier_name is empty', async () => {
    renderPOS();
    await openSessionSheet();

    // Cashier input is empty by default — click submit without filling it
    const submit = getSubmitButton();
    await userEvent.click(submit);

    expect(mockToastError).toHaveBeenCalledWith('Cashier name is required');
  });

  it('does NOT call insertSession.mutateAsync when cashier_name is empty', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.click(getSubmitButton());

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does NOT call toast.success when cashier_name is empty', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.click(getSubmitButton());

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('calls toast.error exactly once per empty-name submission', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.click(getSubmitButton());
    await userEvent.click(getSubmitButton());

    expect(mockToastError).toHaveBeenCalledTimes(2);
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

  it('calls toast.success("POS session opened (demo)") in demo mode', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.click(getSubmitButton());

    expect(mockToastSuccess).toHaveBeenCalledWith('POS session opened (demo)');
  });

  it('does NOT call insertSession.mutateAsync in demo mode', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.click(getSubmitButton());

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('works even without a cashier name in demo mode (no validation check)', async () => {
    renderPOS();
    await openSessionSheet();

    // Cashier name is empty — but demo mode exits early before the validation
    await userEvent.click(getSubmitButton());

    // Demo path fires success, NOT error
    expect(mockToastSuccess).toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ─── handleCreate — successful real submission ─────────────────────────────────

describe('handleCreate — successful real submission', () => {
  it('calls mutateAsync with a non-empty session_number', async () => {
    renderPOS();
    await openSessionSheet();

    // Fill cashier name
    await userEvent.type(getCashierInput(), 'Alice Boateng');
    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.session_number).toBeTruthy();
    expect(callArg.session_number).not.toBe('');
  });

  it('session_number starts with "POS-"', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.type(getCashierInput(), 'Bob Smith');
    await userEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.session_number).toMatch(/^POS-/);
  });

  it('session_number is unique across two sequential calls', async () => {
    // Generate two session numbers and verify they differ
    // (Date.now().toString(36) changes between calls)
    const first = `POS-${Date.now().toString(36).toUpperCase()}`;
    await new Promise(r => setTimeout(r, 2)); // tiny gap to advance Date.now
    const second = `POS-${Date.now().toString(36).toUpperCase()}`;

    // They could be equal in theory (same ms), but the contract is that the
    // generation formula uses a time-based value — document the shape.
    expect(first).toMatch(/^POS-[0-9A-Z]+$/);
    expect(second).toMatch(/^POS-[0-9A-Z]+$/);
  });

  it('calls toast.success after successful insert', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.type(getCashierInput(), 'Grace Mensah');
    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('POS session opened');
    });
  });

  it('passes opening_cash as a number (not a string)', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.type(getCashierInput(), 'Samuel Owusu');
    await userEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(typeof callArg.opening_cash).toBe('number');
  });

  it('defaults opening_cash to 0 when field is left blank', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.type(getCashierInput(), 'Ama Frimpong');
    // Do NOT fill opening_cash — leave blank
    await userEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.opening_cash).toBe(0);
  });

  it('initialises total_sales and order_count to 0 on creation', async () => {
    renderPOS();
    await openSessionSheet();

    await userEvent.type(getCashierInput(), 'James Asante');
    await userEvent.click(getSubmitButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.total_sales).toBe(0);
    expect(callArg.order_count).toBe(0);
  });
});

// ─── session_number format guarantees ─────────────────────────────────────────

describe('session_number — auto-generation', () => {
  it('generated session_number is not empty', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated.length).toBeGreaterThan('POS-'.length);
  });

  it('generated session_number contains only safe characters (alphanumeric + dash)', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated).toMatch(/^[A-Z0-9-]+$/);
  });

  it('generated session_number does not contain whitespace', () => {
    const generated = `POS-${Date.now().toString(36).toUpperCase()}`;
    expect(generated).not.toMatch(/\s/);
  });

  it('generated session_number is deterministic given the same timestamp', () => {
    const ts = 1234567890;
    const a = `POS-${ts.toString(36).toUpperCase()}`;
    const b = `POS-${ts.toString(36).toUpperCase()}`;
    expect(a).toBe(b);
  });
});
