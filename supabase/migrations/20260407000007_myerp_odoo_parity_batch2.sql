-- Migration: Odoo parity batch 2
-- Adds: Fleet, Maintenance, Email Marketing, Subscriptions, Point of Sale

-- ============================================================
-- 1. FLEET MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  license_plate text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  year int,
  vin text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  fuel_type text NOT NULL DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline','diesel','electric','hybrid','lpg')),
  acquisition_date date,
  acquisition_cost numeric(15,2) NOT NULL DEFAULT 0,
  current_mileage numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_repair','inactive','sold')),
  driver_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_vehicles_owner" ON public.myerp_vehicles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_vehicles
  BEFORE UPDATE ON public.myerp_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_vehicle_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.myerp_vehicles(id) ON DELETE SET NULL,
  vehicle_name text NOT NULL DEFAULT '',
  service_type text NOT NULL DEFAULT 'maintenance' CHECK (service_type IN ('maintenance','repair','inspection','tires','oil_change','other')),
  description text NOT NULL DEFAULT '',
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(15,2) NOT NULL DEFAULT 0,
  vendor text NOT NULL DEFAULT '',
  next_service_date date,
  next_service_mileage numeric(12,2),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_vehicle_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_vehicle_services_owner" ON public.myerp_vehicle_services
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_vehicle_services
  BEFORE UPDATE ON public.myerp_vehicle_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.myerp_vehicles(id) ON DELETE SET NULL,
  vehicle_name text NOT NULL DEFAULT '',
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage numeric(12,2) NOT NULL DEFAULT 0,
  fuel_qty numeric(10,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'liters' CHECK (unit IN ('liters','gallons')),
  price_per_unit numeric(10,4) NOT NULL DEFAULT 0,
  total_cost numeric(15,2) NOT NULL DEFAULT 0,
  station text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_fuel_logs_owner" ON public.myerp_fuel_logs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_fuel_logs
  BEFORE UPDATE ON public.myerp_fuel_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. MAINTENANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  technician text NOT NULL DEFAULT '',
  acquisition_date date,
  acquisition_cost numeric(15,2) NOT NULL DEFAULT 0,
  serial_number text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  warranty_expiry date,
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','needs_repair','under_maintenance','scrapped')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_equipment_owner" ON public.myerp_equipment
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_equipment
  BEFORE UPDATE ON public.myerp_equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_number text NOT NULL DEFAULT '',
  equipment_id uuid REFERENCES public.myerp_equipment(id) ON DELETE SET NULL,
  equipment_name text NOT NULL DEFAULT '',
  maintenance_type text NOT NULL DEFAULT 'corrective' CHECK (maintenance_type IN ('corrective','preventive','electrical','mechanical','other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','very_high')),
  description text NOT NULL DEFAULT '',
  requested_by text NOT NULL DEFAULT '',
  assigned_to text NOT NULL DEFAULT '',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date date,
  completion_date date,
  duration_hours numeric(8,2),
  cost numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done','cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_maintenance_requests_owner" ON public.myerp_maintenance_requests
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_maintenance_requests
  BEFORE UPDATE ON public.myerp_maintenance_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. EMAIL MARKETING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_mailing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_mailing_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_mailing_lists_owner" ON public.myerp_mailing_lists
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_mailing_lists
  BEFORE UPDATE ON public.myerp_mailing_lists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_mailing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.myerp_mailing_lists(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  is_unsubscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_mailing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_mailing_contacts_owner" ON public.myerp_mailing_contacts
  FOR ALL TO authenticated
  USING (list_id IN (SELECT id FROM public.myerp_mailing_lists WHERE user_id = auth.uid()))
  WITH CHECK (list_id IN (SELECT id FROM public.myerp_mailing_lists WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.myerp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  preview_text text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  mailing_list_id uuid REFERENCES public.myerp_mailing_lists(id) ON DELETE SET NULL,
  mailing_list_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_queue','sending','sent','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  total_sent int NOT NULL DEFAULT 0,
  total_opened int NOT NULL DEFAULT 0,
  total_clicked int NOT NULL DEFAULT 0,
  total_bounced int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_campaigns_owner" ON public.myerp_campaigns
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_campaigns
  BEFORE UPDATE ON public.myerp_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('weekly','monthly','quarterly','yearly')),
  trial_days int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  features text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_subscription_plans_owner" ON public.myerp_subscription_plans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_subscription_plans
  BEFORE UPDATE ON public.myerp_subscription_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_number text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES public.myerp_subscription_plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL DEFAULT '',
  price numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  next_billing_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trial','active','paused','cancelled','expired')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_subscriptions_owner" ON public.myerp_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_subscriptions
  BEFORE UPDATE ON public.myerp_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. POINT OF SALE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.myerp_pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_number text NOT NULL DEFAULT '',
  cashier text NOT NULL DEFAULT '',
  opening_cash numeric(15,2) NOT NULL DEFAULT 0,
  closing_cash numeric(15,2),
  total_sales numeric(15,2) NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closing','closed')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_pos_sessions_owner" ON public.myerp_pos_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_pos_sessions
  BEFORE UPDATE ON public.myerp_pos_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL DEFAULT '',
  session_id uuid REFERENCES public.myerp_pos_sessions(id) ON DELETE SET NULL,
  session_number text NOT NULL DEFAULT '',
  cashier text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card','mobile_money','split')),
  amount_tendered numeric(15,2) NOT NULL DEFAULT 0,
  change_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft','paid','refunded','voided')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_pos_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_pos_orders_owner" ON public.myerp_pos_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_updated_at_myerp_pos_orders
  BEFORE UPDATE ON public.myerp_pos_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.myerp_pos_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.myerp_pos_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  product_sku text NOT NULL DEFAULT '',
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myerp_pos_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myerp_pos_order_lines_owner" ON public.myerp_pos_order_lines
  FOR ALL TO authenticated
  USING (order_id IN (SELECT id FROM public.myerp_pos_orders WHERE user_id = auth.uid()))
  WITH CHECK (order_id IN (SELECT id FROM public.myerp_pos_orders WHERE user_id = auth.uid()));
