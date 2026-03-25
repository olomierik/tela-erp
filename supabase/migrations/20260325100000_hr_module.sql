CREATE TABLE public.departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department_id UUID REFERENCES departments(id),
  start_date DATE,
  salary NUMERIC DEFAULT 0,
  employment_type TEXT DEFAULT 'full_time',
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present','absent','half_day','leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.payroll_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'draft',
  total_gross NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.payroll_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  gross_salary NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  additions NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  notes TEXT
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ti_dept" ON departments FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_emp" ON employees FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_att" ON attendance_logs FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_leave" ON leave_requests FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_pr" ON payroll_runs FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ti_pl" ON payroll_lines FOR ALL TO authenticated USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE tenant_id = get_user_tenant_id(auth.uid())));
