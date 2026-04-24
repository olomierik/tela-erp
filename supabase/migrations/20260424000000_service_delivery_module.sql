-- Service Delivery Module
-- Adds a services catalog, service orders, and service order line items
-- so that service-oriented businesses (consulting, cleaning, healthcare,
-- construction, etc.) can use Tela ERP alongside product retailers.

-- ── Services catalog ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             TEXT          NOT NULL,
  description      TEXT,
  category         TEXT          NOT NULL DEFAULT 'General',
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER       DEFAULT 60,
  unit             TEXT          NOT NULL DEFAULT 'visit',  -- hour | visit | project | day | item
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  custom_fields    JSONB         NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_services" ON public.services
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER set_updated_at_services
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_services_tenant     ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_cat ON public.services(tenant_id, category);

-- ── Service orders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_orders (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number    TEXT          NOT NULL,
  customer_id     UUID          REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name   TEXT          NOT NULL,
  customer_email  TEXT,
  customer_phone  TEXT,
  -- Status lifecycle: pending → confirmed → in_progress → completed | cancelled
  status          TEXT          NOT NULL DEFAULT 'pending',
  scheduled_date  DATE,
  scheduled_time  TIME,
  completed_date  DATE,
  assigned_to     TEXT,         -- staff name or employee name
  location        TEXT,         -- service address or site
  notes           TEXT,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  custom_fields   JSONB         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_service_orders" ON public.service_orders
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER set_updated_at_service_orders
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_orders_tenant        ON public.service_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_tenant_status ON public.service_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled     ON public.service_orders(tenant_id, scheduled_date);

-- ── Service order line items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_order_lines (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_order_id UUID          NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  service_id       UUID          REFERENCES public.services(id) ON DELETE SET NULL,
  description      TEXT          NOT NULL,
  quantity         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_service_order_lines" ON public.service_order_lines
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER set_updated_at_service_order_lines
  BEFORE UPDATE ON public.service_order_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_order_lines_tenant ON public.service_order_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_order_lines_order  ON public.service_order_lines(service_order_id);
