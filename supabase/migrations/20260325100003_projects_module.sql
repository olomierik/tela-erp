CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  customer_id UUID REFERENCES customers(id),
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.project_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  estimated_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_tasks(id),
  hours NUMERIC NOT NULL,
  description TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ti_proj" ON projects FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_task" ON project_tasks FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_tlog" ON time_logs FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
