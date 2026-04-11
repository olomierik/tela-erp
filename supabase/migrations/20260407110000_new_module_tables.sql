-- New module tables: Fleet, Maintenance, POS, Subscriptions
-- All tables use tenant_id + get_user_tenant_id() RLS pattern

-- =====================
-- FLEET MODULE
-- =====================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vehicle_type TEXT DEFAULT 'car',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  assigned_to TEXT,
  fuel_type TEXT DEFAULT 'petrol',
  mileage NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_services (
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

CREATE TABLE IF NOT EXISTS public.fuel_logs (
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

-- RLS for vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_vehicles" ON public.vehicles FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_vehicles" ON public.vehicles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_vehicles" ON public.vehicles FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_vehicles" ON public.vehicles FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS for vehicle_services
ALTER TABLE public.vehicle_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_vehicle_services" ON public.vehicle_services FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_vehicle_services" ON public.vehicle_services FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_vehicle_services" ON public.vehicle_services FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_vehicle_services" ON public.vehicle_services FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS for fuel_logs
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_fuel_logs" ON public.fuel_logs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_fuel_logs" ON public.fuel_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_fuel_logs" ON public.fuel_logs FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_fuel_logs" ON public.fuel_logs FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- MAINTENANCE MODULE
-- =====================

CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  serial_number TEXT,
  location TEXT,
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'retired')),
  purchase_date DATE,
  purchase_cost NUMERIC,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_by TEXT,
  assigned_to TEXT,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_equipment" ON public.equipment FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_equipment" ON public.equipment FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_equipment" ON public.equipment FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_equipment" ON public.equipment FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS for maintenance_requests
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_maintenance_requests" ON public.maintenance_requests FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_maintenance_requests" ON public.maintenance_requests FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_maintenance_requests" ON public.maintenance_requests FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_maintenance_requests" ON public.maintenance_requests FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- POINT OF SALE MODULE
-- =====================

CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cashier_name TEXT,
  store_id UUID,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC DEFAULT 0,
  closing_float NUMERIC,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  total_sales NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  order_number TEXT,
  customer_name TEXT,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'mixed')),
  amount_paid NUMERIC DEFAULT 0,
  change_given NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'voided')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_order_lines (
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

-- RLS for pos_sessions
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_pos_sessions" ON public.pos_sessions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_pos_sessions" ON public.pos_sessions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_pos_sessions" ON public.pos_sessions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_pos_sessions" ON public.pos_sessions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS for pos_orders
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_pos_orders" ON public.pos_orders FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_pos_orders" ON public.pos_orders FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_pos_orders" ON public.pos_orders FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_pos_orders" ON public.pos_orders FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS for pos_order_lines
ALTER TABLE public.pos_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_pos_order_lines" ON public.pos_order_lines FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_pos_order_lines" ON public.pos_order_lines FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_pos_order_lines" ON public.pos_order_lines FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_pos_order_lines" ON public.pos_order_lines FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- SUBSCRIPTIONS MODULE
-- =====================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually')),
  trial_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
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

-- RLS for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_subscription_plans" ON public.subscription_plans FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_subscription_plans" ON public.subscription_plans FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_subscription_plans" ON public.subscription_plans FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_subscription_plans" ON public.subscription_plans FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_subscriptions" ON public.subscriptions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_subscriptions" ON public.subscriptions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_delete_subscriptions" ON public.subscriptions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));


-- =====================
-- TIER CLEANUP (idempotent)
-- =====================

-- Migrate any remaining 'pro' tenants to 'premium'
UPDATE public.tenants SET subscription_tier = 'premium' WHERE subscription_tier = 'pro';
