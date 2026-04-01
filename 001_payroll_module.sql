-- ============================================================
-- Tela ERP — Supabase Migration
-- Payroll Module + Multi-Company Foundation
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Enable UUID extension ───────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── COMPANIES ───────────────────────────────────────────────
create table if not exists companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  trading_name    text,
  tin_number      text,
  nssf_number     text,
  wcf_number      text,
  sdl_number      text,
  currency        text not null default 'TZS',
  country         text not null default 'TZ',
  logo_url        text,
  address         text,
  phone           text,
  email           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── USER–COMPANY ROLES ──────────────────────────────────────
create type user_role as enum (
  'super_admin', 'company_admin', 'hr_manager',
  'accountant', 'staff', 'read_only'
);

create table if not exists user_companies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  role        user_role not null default 'staff',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(user_id, company_id)
);

-- ─── PAYROLL CONFIG (per company) ────────────────────────────
create table if not exists payroll_configs (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null unique references companies(id) on delete cascade,
  payroll_cycle_day   int not null default 28,
  default_industry    text not null default 'services',
  sdl_exempt          boolean not null default false,
  -- Rate overrides (null = use system defaults)
  nssf_ceiling        numeric,
  sdl_rate            numeric,
  wcf_rate_override   numeric,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── EMPLOYEES ───────────────────────────────────────────────
create type employment_type as enum ('permanent', 'contract', 'casual', 'intern');

create table if not exists employees (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references companies(id) on delete cascade,
  employee_number   text not null,
  first_name        text not null,
  last_name         text not null,
  email             text,
  phone             text,
  national_id       text,
  nssf_number       text,
  tin_number        text,
  date_of_birth     date,
  hire_date         date not null,
  termination_date  date,
  employment_type   employment_type not null default 'permanent',
  department        text,
  job_title         text,
  basic_salary      numeric not null check (basic_salary >= 0),
  bank_name         text,
  bank_branch       text,
  account_number    text,
  wcf_industry_code text not null default 'services',
  nssf_exempt       boolean not null default false,
  sdl_exempt        boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(company_id, employee_number)
);

-- ─── EMPLOYEE ALLOWANCES ─────────────────────────────────────
create table if not exists employee_allowances (
  id            uuid primary key default uuid_generate_v4(),
  employee_id   uuid not null references employees(id) on delete cascade,
  name          text not null,
  amount        numeric not null check (amount >= 0),
  taxable       boolean not null default true,
  is_recurring  boolean not null default true,
  valid_from    date not null default current_date,
  valid_to      date,
  created_at    timestamptz not null default now()
);

-- ─── PAYROLL RUNS ────────────────────────────────────────────
create type payroll_status as enum ('draft', 'approved', 'paid', 'cancelled');

create table if not exists payroll_runs (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references companies(id) on delete cascade,
  period              text not null,    -- "YYYY-MM"
  status              payroll_status not null default 'draft',
  run_date            timestamptz not null default now(),
  approved_at         timestamptz,
  approved_by         uuid references auth.users(id),
  paid_at             timestamptz,
  notes               text,
  total_gross         numeric not null default 0,
  total_net           numeric not null default 0,
  total_paye          numeric not null default 0,
  total_nssf_employee numeric not null default 0,
  total_nssf_employer numeric not null default 0,
  total_sdl           numeric not null default 0,
  total_wcf           numeric not null default 0,
  total_employer_cost numeric not null default 0,
  employee_count      int not null default 0,
  created_at          timestamptz not null default now(),
  unique(company_id, period)
);

-- ─── PAYROLL RUN ITEMS (one row per employee per run) ────────
create table if not exists payroll_run_items (
  id                    uuid primary key default uuid_generate_v4(),
  payroll_run_id        uuid not null references payroll_runs(id) on delete cascade,
  employee_id           uuid not null references employees(id),
  period                text not null,
  basic_salary          numeric not null,
  taxable_allowances    numeric not null default 0,
  non_taxable_allowances numeric not null default 0,
  gross_earnings        numeric not null,
  taxable_income        numeric not null,
  paye                  numeric not null,
  nssf_employee         numeric not null,
  total_deductions      numeric not null,
  net_pay               numeric not null,
  nssf_employer         numeric not null,
  sdl                   numeric not null,
  wcf                   numeric not null,
  total_employer_cost   numeric not null,
  calculation_snapshot  jsonb not null default '{}',  -- full breakdown stored for audit
  created_at            timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table companies          enable row level security;
alter table user_companies     enable row level security;
alter table payroll_configs    enable row level security;
alter table employees          enable row level security;
alter table employee_allowances enable row level security;
alter table payroll_runs       enable row level security;
alter table payroll_run_items  enable row level security;

-- Users can only see companies they belong to
create policy "users see own companies" on companies
  for select using (
    id in (select company_id from user_companies where user_id = auth.uid())
  );

create policy "users see own memberships" on user_companies
  for select using (user_id = auth.uid());

-- Employees: visible within company
create policy "company members see employees" on employees
  for select using (
    company_id in (select company_id from user_companies where user_id = auth.uid())
  );

create policy "hr can insert employees" on employees
  for insert with check (
    company_id in (
      select company_id from user_companies
      where user_id = auth.uid()
      and role in ('company_admin', 'hr_manager', 'super_admin')
    )
  );

create policy "hr can update employees" on employees
  for update using (
    company_id in (
      select company_id from user_companies
      where user_id = auth.uid()
      and role in ('company_admin', 'hr_manager', 'super_admin')
    )
  );

-- Payroll runs: company members can read, hr+ can write
create policy "company members see payroll runs" on payroll_runs
  for select using (
    company_id in (select company_id from user_companies where user_id = auth.uid())
  );

create policy "hr can manage payroll runs" on payroll_runs
  for all using (
    company_id in (
      select company_id from user_companies
      where user_id = auth.uid()
      and role in ('company_admin', 'hr_manager', 'accountant', 'super_admin')
    )
  );

create policy "company members see payroll items" on payroll_run_items
  for select using (
    payroll_run_id in (
      select id from payroll_runs
      where company_id in (select company_id from user_companies where user_id = auth.uid())
    )
  );

create policy "hr can manage payroll items" on payroll_run_items
  for all using (
    payroll_run_id in (
      select id from payroll_runs
      where company_id in (
        select company_id from user_companies
        where user_id = auth.uid()
        and role in ('company_admin', 'hr_manager', 'accountant', 'super_admin')
      )
    )
  );

create policy "company members see allowances" on employee_allowances
  for select using (
    employee_id in (
      select id from employees
      where company_id in (select company_id from user_companies where user_id = auth.uid())
    )
  );

-- ─── INDEXES ─────────────────────────────────────────────────
create index if not exists idx_employees_company     on employees(company_id);
create index if not exists idx_employees_active      on employees(company_id, is_active);
create index if not exists idx_payroll_runs_company  on payroll_runs(company_id);
create index if not exists idx_payroll_runs_period   on payroll_runs(company_id, period);
create index if not exists idx_payroll_items_run     on payroll_run_items(payroll_run_id);
create index if not exists idx_payroll_items_emp     on payroll_run_items(employee_id);
create index if not exists idx_allowances_employee   on employee_allowances(employee_id);
create index if not exists idx_user_companies_user   on user_companies(user_id);

-- ─── SEED: demo company ──────────────────────────────────────
insert into companies (name, trading_name, currency, country, tin_number)
values ('Tela Demo Ltd', 'Tela Demo', 'TZS', 'TZ', '100-000-000')
on conflict do nothing;
