CREATE TABLE public.crm_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead','qualified','proposal','negotiation','won','lost')),
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  deal_id UUID REFERENCES crm_deals(id),
  type TEXT NOT NULL CHECK (type IN ('call','email','meeting','note','task')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ti_deals" ON crm_deals FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_acts" ON crm_activities FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
