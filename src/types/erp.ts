export type UserRole = 'reseller' | 'admin' | 'user';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  custom_domain?: string;
  subscription_tier?: 'starter' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  parent_tenant_id?: string;
  business_type?: string;
  tin?: string;
  vrn?: string;
  default_currency?: string;
  financial_year_start?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface ERPModule {
  id: string;
  key: 'production' | 'inventory' | 'sales' | 'marketing' | 'accounting' | 'procurement';
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

// Production
export interface ProductionOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  created_at: string;
}

// Inventory
export interface InventoryItem {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit_cost: number;
  reorder_level: number;
  warehouse_location?: string;
  created_at: string;
}

// Sales
export interface SalesOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
}

// Marketing
export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  channel: 'email' | 'social' | 'ppc' | 'content';
  budget: number;
  spent: number;
  leads_generated: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
}

// Accounting
export interface Transaction {
  id: string;
  tenant_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  reference_number?: string;
  created_at: string;
}

// Procurement
export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  supplier_name: string;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
  expected_delivery?: string;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  inventoryValue: number;
  inventoryChange: number;
  activeCampaigns: number;
  campaignsChange: number;
}
