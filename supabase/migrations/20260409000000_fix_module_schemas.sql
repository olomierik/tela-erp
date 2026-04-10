-- ============================================================
-- Fix schema mismatches between frontend and database
-- Drops and recreates new module tables with correct columns.
-- Safe: tables were newly created and had save errors, so no
-- production data exists in them yet.
-- ============================================================

-- =====================
-- DROP OLD TABLES (order matters for FKs)
-- =====================
DROP TABLE IF EXISTS public.pos_order_lines CASCADE;
DROP TABLE IF EXISTS public.pos_orders CASCADE;
DROP TABLE IF EXISTS public.pos_sessions CASCADE;
DROP TABLE IF EXISTS public.vehicle_services CASCADE;
DROP TABLE IF EXISTS public.fuel_logs CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;


-- =====================
-- FLEET MODULE (corrected to match Fleet.tsx)
-- =====================

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                  -- "Delivery Van 01"
  license_plate TEXT NOT NULL,         -- "ABC-1234"
  make TEXT,
  model TEXT,
  year INTEGER,
  fuel_type TEXT DEFAULT 'Diesel',
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'in_repair', 'idle', 'sold', 'retired')),
  driver_name TEXT,                    -- assigned driver name
  mileage NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vehicle_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL,
  mileage_at_service NUMERIC,
  cost NUMERIC DEFAULT 0,
  service_provider TEXT,
  notes TEXT,
  next_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  liters NUMERIC NOT NULL,
  cost_per_liter NUMERIC,
  total_cost NUMERIC,
  mileage NUMERIC,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_vehicles"  ON public.vehicles FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_vehicles"  ON public.vehicles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_vehicles"  ON public.vehicles FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_vehicles"  ON public.vehicles FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: vehicle_services
ALTER TABLE public.vehicle_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_vsvc" ON public.vehicle_services FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_vsvc" ON public.vehicle_services FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_vsvc" ON public.vehicle_services FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_vsvc" ON public.vehicle_services FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: fuel_logs
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_fuel" ON public.fuel_logs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_fuel" ON public.fuel_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_fuel" ON public.fuel_logs FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_fuel" ON public.fuel_logs FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- MAINTENANCE MODULE (corrected to match Maintenance.tsx)
-- =====================

-- Maintenance uses inline equipment text, not a separate equipment table.
-- The equipment table is kept for asset tracking but is separate from requests.
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  serial_number TEXT,
  location TEXT,
  status TEXT DEFAULT 'operational'
    CHECK (status IN ('operational', 'maintenance', 'retired')),
  purchase_date DATE,
  purchase_cost NUMERIC,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_number TEXT,                 -- "MNT-001"
  equipment TEXT NOT NULL,             -- free-text equipment name
  type TEXT DEFAULT 'Preventive'
    CHECK (type IN ('Preventive','Corrective','Inspection','Emergency','Upgrade','Other')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'on_hold', 'done', 'cancelled')),
  assigned_to TEXT,
  scheduled_date DATE,
  estimated_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_equip" ON public.equipment FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_equip" ON public.equipment FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_equip" ON public.equipment FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_equip" ON public.equipment FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: maintenance_requests
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_mreq" ON public.maintenance_requests FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_mreq" ON public.maintenance_requests FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_mreq" ON public.maintenance_requests FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_mreq" ON public.maintenance_requests FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- POINT OF SALE MODULE (corrected to match PointOfSale.tsx)
-- =====================

CREATE TABLE public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_number TEXT,                 -- "POS-001"
  cashier_name TEXT NOT NULL,
  opening_cash NUMERIC DEFAULT 0,      -- was "opening_float" — renamed
  closing_cash NUMERIC,
  total_sales NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,       -- was "total_transactions" — renamed
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'paused', 'closed')),  -- added 'paused'
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  order_number TEXT,
  customer_name TEXT,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'mixed')),
  amount_paid NUMERIC DEFAULT 0,
  change_given NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'refunded', 'voided')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: pos_sessions
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_psess" ON public.pos_sessions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_psess" ON public.pos_sessions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_psess" ON public.pos_sessions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_psess" ON public.pos_sessions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: pos_orders
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_pord" ON public.pos_orders FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_pord" ON public.pos_orders FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_pord" ON public.pos_orders FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_pord" ON public.pos_orders FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: pos_order_lines
ALTER TABLE public.pos_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_pol" ON public.pos_order_lines FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_pol" ON public.pos_order_lines FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_pol" ON public.pos_order_lines FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_pol" ON public.pos_order_lines FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- SUBSCRIPTIONS MODULE (unchanged — schema was correct)
-- =====================

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually')),
  trial_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  trial_end_date DATE,
  amount NUMERIC,
  billing_cycle TEXT DEFAULT 'monthly',
  next_billing_date DATE,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_splans" ON public.subscription_plans FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_splans" ON public.subscription_plans FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_splans" ON public.subscription_plans FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_splans" ON public.subscription_plans FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_subs" ON public.subscriptions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ins_subs" ON public.subscriptions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_upd_subs" ON public.subscriptions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_del_subs" ON public.subscriptions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));
