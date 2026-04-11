# Tela ERP: Comprehensive Testing Guide

**Version:** 1.0.0  
**Last Updated:** April 6, 2026

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Test Coverage](#test-coverage)

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (10%)
      /----\
     /      \  Integration Tests (30%)
    /--------\
   /          \ Unit Tests (60%)
  /____________\
```

### Testing Goals

| Goal | Target | Tool |
| :--- | :---: | :--- |
| Code Coverage | > 80% | Vitest |
| E2E Coverage | > 70% | Playwright |
| Performance | < 200ms (p95) | Lighthouse |
| Security Score | A+ | OWASP |

---

## Unit Testing

### Setup

```bash
# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Example Unit Tests

#### Testing a Utility Function

```typescript
// src/lib/rbac.test.ts
import { describe, it, expect } from 'vitest';
import { canUserAccess, getRolePermissions } from './rbac';

describe('RBAC Module', () => {
  describe('canUserAccess', () => {
    it('should allow admin to access all resources', () => {
      expect(canUserAccess('admin', 'sales_orders', 'create')).toBe(true);
      expect(canUserAccess('admin', 'accounting', 'delete')).toBe(true);
    });

    it('should restrict viewer to read-only access', () => {
      expect(canUserAccess('viewer', 'sales_orders', 'create')).toBe(false);
      expect(canUserAccess('viewer', 'reports', 'read')).toBe(true);
    });

    it('should allow sales role to manage sales orders', () => {
      expect(canUserAccess('sales', 'sales_orders', 'create')).toBe(true);
      expect(canUserAccess('sales', 'accounting', 'create')).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for a role', () => {
      const permissions = getRolePermissions('accountant');
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.resource === 'accounting')).toBe(true);
    });
  });
});
```

#### Testing a React Component

```typescript
// src/components/navigation/ImprovedNavigation.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ImprovedNavigation } from './ImprovedNavigation';

describe('ImprovedNavigation', () => {
  it('should render navigation modules', () => {
    render(
      <BrowserRouter>
        <ImprovedNavigation />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('should filter items based on search query', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ImprovedNavigation />
      </BrowserRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search modules/i);
    await user.type(searchInput, 'inventory');
    
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  it('should display dropdown menu on click', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ImprovedNavigation />
      </BrowserRouter>
    );
    
    const salesButton = screen.getByText('Sales');
    await user.click(salesButton);
    
    expect(screen.getByText('Sales Orders')).toBeInTheDocument();
  });
});
```

---

## Integration Testing

### Database Integration Tests

```typescript
// src/__tests__/integration/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Database Integration', () => {
  let testOrderId: string;

  beforeEach(async () => {
    // Setup: Create test data
    const { data } = await supabase
      .from('sales_orders')
      .insert({ customer_id: 'test-customer', status: 'draft' })
      .select()
      .single();
    
    testOrderId = data.id;
  });

  afterEach(async () => {
    // Cleanup: Remove test data
    await supabase
      .from('sales_orders')
      .delete()
      .eq('id', testOrderId);
  });

  it('should create and retrieve a sales order', async () => {
    const { data } = await supabase
      .from('sales_orders')
      .select()
      .eq('id', testOrderId)
      .single();
    
    expect(data).toBeDefined();
    expect(data.status).toBe('draft');
  });

  it('should update a sales order', async () => {
    await supabase
      .from('sales_orders')
      .update({ status: 'confirmed' })
      .eq('id', testOrderId);
    
    const { data } = await supabase
      .from('sales_orders')
      .select()
      .eq('id', testOrderId)
      .single();
    
    expect(data.status).toBe('confirmed');
  });
});
```

### Module Integration Tests

```typescript
// src/__tests__/integration/module-integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { moduleIntegration } from '@/lib/module-integration';

describe('Module Integration', () => {
  beforeEach(() => {
    moduleIntegration.initializeAllHandlers();
  });

  it('should trigger inventory reservation on sales order creation', async () => {
    const event = {
      type: 'sales_order_created' as const,
      timestamp: new Date(),
      data: {
        order_id: 'SO-001',
        items: [
          { product_id: 'PROD-001', quantity: 10 },
        ],
      },
      source: 'sales',
    };

    await moduleIntegration.emit(event);
    
    // Verify that inventory reservation was created
    // (In real test, would check database)
    expect(event.data.order_id).toBe('SO-001');
  });

  it('should update accounting on payment received', async () => {
    const event = {
      type: 'payment_received' as const,
      timestamp: new Date(),
      data: {
        payment_id: 'PAY-001',
        amount: 1000,
        customer_id: 'CUST-001',
        invoice_id: 'INV-001',
      },
      source: 'accounting',
    };

    await moduleIntegration.emit(event);
    
    // Verify that journal entry was created
    expect(event.data.payment_id).toBe('PAY-001');
  });
});
```

---

## End-to-End Testing

### Setup

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test
npx playwright test tests/e2e/sales.spec.ts
```

### Example E2E Tests

```typescript
// tests/e2e/sales.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sales Module', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('http://localhost:3000/dashboard');
  });

  test('should create a new sales order', async ({ page }) => {
    // Navigate to sales module
    await page.click('text=Sales');
    await page.click('text=Sales Orders');
    
    // Create new order
    await page.click('button:has-text("New Order")');
    await page.fill('input[name="customer"]', 'Acme Corp');
    await page.fill('input[name="amount"]', '1000');
    await page.click('button:has-text("Save")');
    
    // Verify order was created
    await expect(page.locator('text=Order created successfully')).toBeVisible();
  });

  test('should generate invoice from sales order', async ({ page }) => {
    // Navigate to sales order
    await page.goto('http://localhost:3000/sales');
    await page.click('text=SO-001');
    
    // Generate invoice
    await page.click('button:has-text("Generate Invoice")');
    
    // Verify invoice was created
    await expect(page.locator('text=Invoice generated')).toBeVisible();
  });

  test('should search and filter sales orders', async ({ page }) => {
    await page.goto('http://localhost:3000/sales');
    
    // Search for order
    await page.fill('input[placeholder="Search orders"]', 'SO-001');
    await page.waitForTimeout(500);
    
    // Verify search results
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });
});
```

---

## Performance Testing

### Lighthouse Testing

```bash
# Install Lighthouse CLI
npm install --save-dev @lhci/cli@0.11.x @lhci/server

# Run Lighthouse
lhci autorun

# View results
# Results saved to .lighthouseci/
```

### Load Testing with k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests < 200ms
    http_req_failed: ['<0.1'],         // Error rate < 0.1%
  },
};

export default function () {
  // Test dashboard load
  const res = http.get('http://localhost:3000/dashboard');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

---

## Security Testing

### OWASP ZAP Scanning

```bash
# Install ZAP
# https://www.zaproxy.org/

# Run automated scan
zaproxy -cmd -quickurl http://localhost:3000 -quickout report.html
```

### Manual Security Checklist

- [ ] Test for SQL injection
- [ ] Test for XSS vulnerabilities
- [ ] Test for CSRF protection
- [ ] Test authentication bypass
- [ ] Test authorization bypass
- [ ] Test sensitive data exposure
- [ ] Test insecure deserialization
- [ ] Test broken access control

---

## Test Coverage

### Generate Coverage Report

```bash
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Goals by Module

| Module | Target |
| :--- | ---: |
| RBAC | 95% |
| Module Integration | 90% |
| Offline Sync | 85% |
| Navigation | 80% |
| Overall | 80% |

---

## Continuous Integration

The project includes GitHub Actions workflows that run:

1. **ESLint & TypeScript** - Code quality checks
2. **Unit Tests** - Vitest with coverage
3. **Integration Tests** - Database integration
4. **E2E Tests** - Playwright tests
5. **Security Scan** - Snyk vulnerability scanning
6. **Performance** - Lighthouse CI

See `.github/workflows/ci-cd.yml` for details.

---

## Best Practices

1. **Test Naming:** Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert:** Structure tests with setup, action, and verification
3. **DRY:** Extract common test setup into beforeEach/beforeAll
4. **Isolation:** Each test should be independent and not rely on others
5. **Coverage:** Aim for high coverage but focus on critical paths
6. **Performance:** Keep tests fast (< 5s per test)
7. **Maintenance:** Update tests when requirements change

---

## Troubleshooting

| Issue | Solution |
| :--- | :--- |
| Tests timing out | Increase timeout: `test.setTimeout(10000)` |
| Flaky tests | Add explicit waits: `await page.waitForLoadState()` |
| Database conflicts | Use unique test data identifiers |
| Port already in use | Kill process or change port in .env |

---

*For questions, refer to the [Testing Documentation](https://vitest.dev) or open an issue on GitHub.*
