export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          module: string
          reference_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          module: string
          reference_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          module?: string
          reference_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          tenant_id: string
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          tenant_id: string
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          tenant_id?: string
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_lines: {
        Row: {
          bom_id: string
          id: string
          notes: string | null
          quantity: number
          raw_material_id: string
          wastage_percent: number | null
        }
        Insert: {
          bom_id: string
          id?: string
          notes?: string | null
          quantity?: number
          raw_material_id: string
          wastage_percent?: number | null
        }
        Update: {
          bom_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          raw_material_id?: string
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bom_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_templates: {
        Row: {
          created_at: string | null
          finished_item_id: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          output_quantity: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          finished_item_id: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          output_quantity?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          finished_item_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          output_quantity?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_templates_finished_item_id_fkey"
            columns: ["finished_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          actual_amount: number | null
          budget_id: string | null
          budgeted_amount: number | null
          category: string
          created_at: string | null
          id: string
          notes: string | null
          period_month: number | null
          period_year: number | null
          tenant_id: string
        }
        Insert: {
          actual_amount?: number | null
          budget_id?: string | null
          budgeted_amount?: number | null
          category: string
          created_at?: string | null
          id?: string
          notes?: string | null
          period_month?: number | null
          period_year?: number | null
          tenant_id: string
        }
        Update: {
          actual_amount?: number | null
          budget_id?: string | null
          budgeted_amount?: number | null
          category?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          period_month?: number | null
          period_year?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string | null
          department: string | null
          fiscal_year: number | null
          id: string
          name: string
          period: string | null
          status: string | null
          store_id: string | null
          tenant_id: string
          total_budget: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          fiscal_year?: number | null
          id?: string
          name: string
          period?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id: string
          total_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          fiscal_year?: number | null
          id?: string
          name?: string
          period?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id?: string
          total_budget?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number
          channel: string
          created_at: string
          custom_fields: Json | null
          end_date: string | null
          id: string
          leads_generated: number
          name: string
          spent: number
          start_date: string | null
          status: string
          store_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          budget?: number
          channel?: string
          created_at?: string
          custom_fields?: Json | null
          end_date?: string | null
          id?: string
          leads_generated?: number
          name: string
          spent?: number
          start_date?: string | null
          status?: string
          store_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          budget?: number
          channel?: string
          created_at?: string
          custom_fields?: Json | null
          end_date?: string | null
          id?: string
          leads_generated?: number
          name?: string
          spent?: number
          start_date?: string | null
          status?: string
          store_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          balance: number | null
          code: string
          created_at: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          account_type?: string
          balance?: number | null
          code: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          account_type?: string
          balance?: number | null
          code?: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          deal_id: string | null
          description: string | null
          id: string
          scheduled_at: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          scheduled_at?: string | null
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          scheduled_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          created_at: string | null
          customer_id: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          probability: number | null
          stage: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          outstanding_balance: number | null
          phone: string | null
          store_id: string | null
          tax_id: string | null
          tenant_id: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          outstanding_balance?: number | null
          phone?: string | null
          store_id?: string | null
          tax_id?: string | null
          tenant_id: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          outstanding_balance?: number | null
          phone?: string | null
          store_id?: string | null
          tax_id?: string | null
          tenant_id?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          allowances: number | null
          avatar_url: string | null
          created_at: string | null
          department: string | null
          department_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: string | null
          full_name: string
          id: string
          phone: string | null
          position: string | null
          salary: number | null
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowances?: number | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowances?: number | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      expense_claims: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          claim_number: string
          created_at: string | null
          employee_id: string | null
          employee_name: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string | null
          store_id: string | null
          submitted_at: string | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          claim_number: string
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string | null
          store_id?: string | null
          submitted_at?: string | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          claim_number?: string
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string | null
          store_id?: string | null
          submitted_at?: string | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_items: {
        Row: {
          amount: number | null
          category: string
          claim_id: string | null
          created_at: string | null
          description: string | null
          expense_date: string | null
          id: string
          merchant: string | null
          receipt_url: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          category?: string
          claim_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          merchant?: string | null
          receipt_url?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number | null
          category?: string
          claim_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          merchant?: string | null
          receipt_url?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_number: string
          category: string
          created_at: string | null
          current_value: number | null
          depreciation_method: string | null
          description: string | null
          gl_account: string | null
          id: string
          location: string | null
          name: string
          purchase_cost: number | null
          purchase_date: string | null
          salvage_value: number | null
          serial_number: string | null
          status: string | null
          store_id: string | null
          tenant_id: string
          updated_at: string | null
          useful_life_years: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_number: string
          category?: string
          created_at?: string | null
          current_value?: number | null
          depreciation_method?: string | null
          description?: string | null
          gl_account?: string | null
          id?: string
          location?: string | null
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id: string
          updated_at?: string | null
          useful_life_years?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_number?: string
          category?: string
          created_at?: string | null
          current_value?: number | null
          depreciation_method?: string | null
          description?: string | null
          gl_account?: string | null
          id?: string
          location?: string | null
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjusted_by_user_id: string | null
          created_at: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reason: string
          tenant_id: string
          type: string
        }
        Insert: {
          adjusted_by_user_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reason?: string
          tenant_id: string
          type?: string
        }
        Update: {
          adjusted_by_user_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reason?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          category_id: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          quantity: number
          reorder_level: number
          sku: string
          status: Database["public"]["Enums"]["inventory_status"]
          store_id: string | null
          tenant_id: string
          unit_cost: number
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          category?: string
          category_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          quantity?: number
          reorder_level?: number
          sku: string
          status?: Database["public"]["Enums"]["inventory_status"]
          store_id?: string | null
          tenant_id: string
          unit_cost?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          category?: string
          category_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          quantity?: number
          reorder_level?: number
          sku?: string
          status?: Database["public"]["Enums"]["inventory_status"]
          store_id?: string | null
          tenant_id?: string
          unit_cost?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          sales_order_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          sales_order_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          sales_order_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          batch: string | null
          created_at: string
          id: string
          item_id: string | null
          notes: string | null
          quantity: number
          reference_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          batch?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          tenant_id: string
          type?: string
        }
        Update: {
          batch?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          description: string
          discount_percent: number | null
          id: string
          invoice_id: string
          item_id: string | null
          line_total: number
          quantity: number
          unit_price: number
        }
        Insert: {
          description: string
          discount_percent?: number | null
          id?: string
          invoice_id: string
          item_id?: string | null
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          amount: number
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string
          entry_date: string
          id: string
          is_auto: boolean | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string
          entry_date?: string
          id?: string
          is_auto?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string
          entry_date?: string
          id?: string
          is_auto?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          days: number
          employee_id: string
          employee_name: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          days?: number
          employee_id: string
          employee_name?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          days?: number
          employee_id?: string
          employee_name?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      myerp_accounts: {
        Row: {
          balance: number
          code: string
          created_at: string
          currency: string
          description: string
          id: string
          is_header: boolean
          name: string
          parent_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          is_header?: boolean
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          is_header?: boolean
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myerp_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "myerp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      myerp_assets: {
        Row: {
          asset_number: string
          category: string
          condition: string
          created_at: string
          current_value: number
          id: string
          location: string
          name: string
          purchase_cost: number
          purchase_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_number: string
          category?: string
          condition?: string
          created_at?: string
          current_value?: number
          id?: string
          location?: string
          name: string
          purchase_cost?: number
          purchase_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_number?: string
          category?: string
          condition?: string
          created_at?: string
          current_value?: number
          id?: string
          location?: string
          name?: string
          purchase_cost?: number
          purchase_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_bills: {
        Row: {
          amount: number
          bill_date: string
          category: string
          created_at: string
          due_date: string
          id: string
          notes: string
          number: string
          status: string
          updated_at: string
          user_id: string
          vendor: string
        }
        Insert: {
          amount?: number
          bill_date?: string
          category?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string
          number: string
          status?: string
          updated_at?: string
          user_id: string
          vendor?: string
        }
        Update: {
          amount?: number
          bill_date?: string
          category?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string
          number?: string
          status?: string
          updated_at?: string
          user_id?: string
          vendor?: string
        }
        Relationships: []
      }
      myerp_boms: {
        Row: {
          created_at: string
          id: string
          notes: string
          product_name: string
          status: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          product_name: string
          status?: string
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          product_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      myerp_customers: {
        Row: {
          company: string
          country: string
          created_at: string
          email: string
          id: string
          industry: string
          name: string
          phone: string
          status: string
          total_orders: number
          total_revenue: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string
          name: string
          phone?: string
          status?: string
          total_orders?: number
          total_revenue?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string
          name?: string
          phone?: string
          status?: string
          total_orders?: number
          total_revenue?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_depreciation: {
        Row: {
          amount: number
          asset_id: string
          asset_name: string
          book_value: number
          created_at: string
          date: string
          id: string
          period: string
          user_id: string
        }
        Insert: {
          amount?: number
          asset_id: string
          asset_name?: string
          book_value?: number
          created_at?: string
          date?: string
          id?: string
          period?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          asset_name?: string
          book_value?: number
          created_at?: string
          date?: string
          id?: string
          period?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myerp_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "myerp_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      myerp_employees: {
        Row: {
          created_at: string
          department: string
          email: string
          employee_id: string
          full_name: string
          hire_date: string | null
          id: string
          phone: string
          position: string
          salary: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string
          email?: string
          employee_id: string
          full_name: string
          hire_date?: string | null
          id?: string
          phone?: string
          position?: string
          salary?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          employee_id?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string
          position?: string
          salary?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_goods_receipts: {
        Row: {
          created_at: string
          id: string
          notes: string
          po_number: string
          product_name: string
          quantity_received: number
          receipt_number: string
          received_date: string
          status: string
          updated_at: string
          user_id: string
          vendor: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          po_number?: string
          product_name?: string
          quantity_received?: number
          receipt_number: string
          received_date?: string
          status?: string
          updated_at?: string
          user_id: string
          vendor?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          po_number?: string
          product_name?: string
          quantity_received?: number
          receipt_number?: string
          received_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          vendor?: string
        }
        Relationships: []
      }
      myerp_invoices: {
        Row: {
          amount: number
          created_at: string
          customer: string
          due_date: string
          id: string
          issue_date: string
          items_count: number
          notes: string
          number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer?: string
          due_date?: string
          id?: string
          issue_date?: string
          items_count?: number
          notes?: string
          number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer?: string
          due_date?: string
          id?: string
          issue_date?: string
          items_count?: number
          notes?: string
          number?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_job_postings: {
        Row: {
          applicants_count: number
          closing_date: string | null
          created_at: string
          department: string
          id: string
          location: string
          posted_date: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applicants_count?: number
          closing_date?: string | null
          created_at?: string
          department?: string
          id?: string
          location?: string
          posted_date?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applicants_count?: number
          closing_date?: string | null
          created_at?: string
          department?: string
          id?: string
          location?: string
          posted_date?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_journal_entries: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_journal_lines: {
        Row: {
          account_code: string
          account_id: string | null
          account_name: string
          created_at: string
          credit: number
          debit: number
          department: string
          description: string
          entry_id: string
          id: string
        }
        Insert: {
          account_code?: string
          account_id?: string | null
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          department?: string
          description?: string
          entry_id: string
          id?: string
        }
        Update: {
          account_code?: string
          account_id?: string | null
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          department?: string
          description?: string
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myerp_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "myerp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myerp_journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "myerp_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      myerp_leads: {
        Row: {
          assigned_to: string
          company: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          source: string
          stage: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          assigned_to?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
          source?: string
          stage?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          assigned_to?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          source?: string
          stage?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      myerp_leave_requests: {
        Row: {
          created_at: string
          days: number
          employee: string
          from_date: string
          id: string
          note: string
          status: string
          to_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: number
          employee?: string
          from_date?: string
          id?: string
          note?: string
          status?: string
          to_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number
          employee?: string
          from_date?: string
          id?: string
          note?: string
          status?: string
          to_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_mfg_products: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          sku: string
          status: string
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          sku?: string
          status?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          sku?: string
          status?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          method: string
          party: string
          reference: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          method?: string
          party?: string
          reference: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          method?: string
          party?: string
          reference?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_payroll_runs: {
        Row: {
          allowances: number
          basic: number
          created_at: string
          deductions: number
          employee: string
          gross: number
          id: string
          net: number
          period: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowances?: number
          basic?: number
          created_at?: string
          deductions?: number
          employee?: string
          gross?: number
          id?: string
          net?: number
          period?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowances?: number
          basic?: number
          created_at?: string
          deductions?: number
          employee?: string
          gross?: number
          id?: string
          net?: number
          period?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_production_orders: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          notes: string
          order_number: string
          product: string
          quantity: number
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string
          order_number: string
          product?: string
          quantity?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string
          order_number?: string
          product?: string
          quantity?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_products: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          reorder_level: number
          selling_price: number
          sku: string
          status: string
          stock_qty: number
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          reorder_level?: number
          selling_price?: number
          sku: string
          status?: string
          stock_qty?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          reorder_level?: number
          selling_price?: number
          sku?: string
          status?: string
          stock_qty?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_projects: {
        Row: {
          budget: number
          client: string
          created_at: string
          end_date: string | null
          id: string
          manager: string
          name: string
          notes: string
          spent: number
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number
          client?: string
          created_at?: string
          end_date?: string | null
          id?: string
          manager?: string
          name: string
          notes?: string
          spent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number
          client?: string
          created_at?: string
          end_date?: string | null
          id?: string
          manager?: string
          name?: string
          notes?: string
          spent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_purchase_orders: {
        Row: {
          created_at: string
          expected_date: string | null
          id: string
          items_count: number
          order_date: string
          po_number: string
          status: string
          total: number
          updated_at: string
          user_id: string
          vendor: string
        }
        Insert: {
          created_at?: string
          expected_date?: string | null
          id?: string
          items_count?: number
          order_date?: string
          po_number: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
          vendor?: string
        }
        Update: {
          created_at?: string
          expected_date?: string | null
          id?: string
          items_count?: number
          order_date?: string
          po_number?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
          vendor?: string
        }
        Relationships: []
      }
      myerp_quotes: {
        Row: {
          amount: number
          created_at: string
          customer: string
          date: string
          expiry_date: string | null
          id: string
          notes: string
          quote_number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer?: string
          date?: string
          expiry_date?: string | null
          id?: string
          notes?: string
          quote_number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer?: string
          date?: string
          expiry_date?: string | null
          id?: string
          notes?: string
          quote_number?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_sales_orders: {
        Row: {
          created_at: string
          customer: string
          date: string
          id: string
          items_count: number
          notes: string
          order_number: string
          payment_status: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer?: string
          date?: string
          id?: string
          items_count?: number
          notes?: string
          order_number: string
          payment_status?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer?: string
          date?: string
          id?: string
          items_count?: number
          notes?: string
          order_number?: string
          payment_status?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_stock_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          date: string
          id: string
          product_id: string | null
          quantity: number
          reason: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          date?: string
          id?: string
          product_id?: string | null
          quantity: number
          reason?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          date?: string
          id?: string
          product_id?: string | null
          quantity?: number
          reason?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "myerp_stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "myerp_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myerp_stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "myerp_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      myerp_stock_levels: {
        Row: {
          created_at: string
          id: string
          on_hand: number
          product_id: string
          reserved: number
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          on_hand?: number
          product_id: string
          reserved?: number
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          on_hand?: number
          product_id?: string
          reserved?: number
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myerp_stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "myerp_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myerp_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "myerp_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      myerp_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          due_date: string | null
          id: string
          priority: string
          project: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string
          created_at?: string
          due_date?: string | null
          id?: string
          priority?: string
          project?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          due_date?: string | null
          id?: string
          priority?: string
          project?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_timesheets: {
        Row: {
          created_at: string
          date: string
          employee: string
          hours: number
          id: string
          notes: string
          project: string
          status: string
          task: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          employee?: string
          hours?: number
          id?: string
          notes?: string
          project?: string
          status?: string
          task?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          employee?: string
          hours?: number
          id?: string
          notes?: string
          project?: string
          status?: string
          task?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_vendors: {
        Row: {
          category: string
          contact_person: string
          country: string
          created_at: string
          email: string
          id: string
          name: string
          payment_terms: string
          phone: string
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          contact_person?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          payment_terms?: string
          phone?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          contact_person?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          payment_terms?: string
          phone?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myerp_warehouses: {
        Row: {
          created_at: string
          id: string
          location: string
          manager: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          manager?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          manager?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      online_stores: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          store_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          store_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          store_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_hash: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string
          purchase_order_id: string | null
          reference: string | null
          sales_order_id: string | null
          store_id: string | null
          supplier_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          purchase_order_id?: string | null
          reference?: string | null
          sales_order_id?: string | null
          store_id?: string | null
          supplier_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          purchase_order_id?: string | null
          reference?: string | null
          sales_order_id?: string | null
          store_id?: string | null
          supplier_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_lines: {
        Row: {
          allowances: number | null
          employee_id: string
          gross_salary: number | null
          id: string
          net_salary: number | null
          notes: string | null
          nssf_employee: number | null
          nssf_employer: number | null
          paye: number | null
          payroll_run_id: string
          sdl: number | null
        }
        Insert: {
          allowances?: number | null
          employee_id: string
          gross_salary?: number | null
          id?: string
          net_salary?: number | null
          notes?: string | null
          nssf_employee?: number | null
          nssf_employer?: number | null
          paye?: number | null
          payroll_run_id: string
          sdl?: number | null
        }
        Update: {
          allowances?: number | null
          employee_id?: string
          gross_salary?: number | null
          id?: string
          net_salary?: number | null
          notes?: string | null
          nssf_employee?: number | null
          nssf_employer?: number | null
          paye?: number | null
          payroll_run_id?: string
          sdl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string | null
          id: string
          month: number
          status: string | null
          tenant_id: string
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          status?: string | null
          tenant_id: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          status?: string | null
          tenant_id?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          created_at: string
          custom_fields: Json | null
          end_date: string | null
          id: string
          item_id: string | null
          order_number: string
          product_name: string
          quantity: number
          start_date: string | null
          status: string
          store_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          end_date?: string | null
          id?: string
          item_id?: string | null
          order_number: string
          product_name: string
          quantity?: number
          start_date?: string | null
          status?: string
          store_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          end_date?: string | null
          id?: string
          item_id?: string | null
          order_number?: string
          product_name?: string
          quantity?: number
          start_date?: string | null
          status?: string
          store_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string | null
          project_id: string
          status: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          project_id: string
          status?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          project_id?: string
          status?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          custom_fields: Json | null
          expected_delivery: string | null
          id: string
          order_date: string | null
          po_number: string
          status: string
          store_id: string | null
          supplier_id: string | null
          supplier_name: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          expected_delivery?: string | null
          id?: string
          order_date?: string | null
          po_number: string
          status?: string
          store_id?: string | null
          supplier_id?: string | null
          supplier_name: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          expected_delivery?: string | null
          id?: string
          order_date?: string | null
          po_number?: string
          status?: string
          store_id?: string | null
          supplier_id?: string | null
          supplier_name?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          custom_fields: Json | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          id: string
          item_id: string | null
          order_number: string
          quantity: number | null
          status: string
          store_id: string | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          customer_email?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          item_id?: string | null
          order_number: string
          quantity?: number | null
          status?: string
          store_id?: string | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          item_id?: string | null
          order_number?: string
          quantity?: number | null
          status?: string
          store_id?: string | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scanned_documents: {
        Row: {
          created_at: string | null
          document_type: string | null
          extracted_data: Json | null
          file_name: string | null
          file_url: string | null
          id: string
          linked_record_id: string | null
          linked_record_type: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanned_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          destination_store_id: string
          id: string
          initiated_by: string | null
          item_id: string
          notes: string | null
          quantity: number
          source_store_id: string
          status: string
          tenant_id: string
          transfer_number: string
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_store_id: string
          id?: string
          initiated_by?: string | null
          item_id: string
          notes?: string | null
          quantity?: number
          source_store_id: string
          status?: string
          tenant_id: string
          transfer_number: string
        }
        Update: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_store_id?: string
          id?: string
          initiated_by?: string | null
          item_id?: string
          notes?: string | null
          quantity?: number
          source_store_id?: string
          status?: string
          tenant_id?: string
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_destination_store_id_fkey"
            columns: ["destination_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_source_store_id_fkey"
            columns: ["source_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          online_store_id: string
          payment_method: string | null
          sales_order_id: string | null
          shipping_address: string | null
          status: string
          subtotal: number
          tenant_id: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_email?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          online_store_id: string
          payment_method?: string | null
          sales_order_id?: string | null
          shipping_address?: string | null
          status?: string
          subtotal?: number
          tenant_id: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          online_store_id?: string
          payment_method?: string | null
          sales_order_id?: string | null
          shipping_address?: string | null
          status?: string
          subtotal?: number
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "storefront_orders_online_store_id_fkey"
            columns: ["online_store_id"]
            isOneToOne: false
            referencedRelation: "online_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          store_id: string | null
          tax_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          store_id?: string | null
          tax_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          store_id?: string | null
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          applies_to: string | null
          created_at: string | null
          gl_account: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          rate: number
          tax_type: string | null
          tenant_id: string
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          gl_account?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          rate?: number
          tax_type?: string | null
          tenant_id: string
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          gl_account?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          rate?: number
          tax_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string
          status: string
          store_id: string | null
          store_role: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          store_id?: string | null
          store_role?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          store_id?: string | null
          store_role?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          ai_model: string | null
          anthropic_api_key: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          custom_domain: string | null
          default_currency: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          parent_tenant_id: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_model?: string | null
          anthropic_api_key?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          custom_domain?: string | null
          default_currency?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          parent_tenant_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_model?: string | null
          anthropic_api_key?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          custom_domain?: string | null
          default_currency?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          parent_tenant_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string | null
          description: string | null
          hours: number
          id: string
          log_date: string
          task_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hours: number
          id?: string
          log_date?: string
          task_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hours?: number
          id?: string
          log_date?: string
          task_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          custom_fields: Json | null
          date: string
          description: string
          id: string
          reference_number: string | null
          store_id: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          custom_fields?: Json | null
          date?: string
          description?: string
          id?: string
          reference_number?: string | null
          store_id?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          custom_fields?: Json | null
          date?: string
          description?: string
          id?: string
          reference_number?: string | null
          store_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_store_assignments: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_store_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_store_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "reseller" | "admin" | "user"
      inventory_status: "good" | "damaged" | "expired" | "not_sellable"
      store_role: "store_admin" | "user" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["reseller", "admin", "user"],
      inventory_status: ["good", "damaged", "expired", "not_sellable"],
      store_role: ["store_admin", "user", "viewer"],
    },
  },
} as const
