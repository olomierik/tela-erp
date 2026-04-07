/**
 * Role-Based Access Control (RBAC) System
 * 
 * This module provides a comprehensive RBAC system for production-ready access control.
 */

export type Role = 'admin' | 'manager' | 'accountant' | 'sales' | 'warehouse' | 'hr' | 'viewer';

export interface Permission {
  resource: string; // e.g., 'sales_orders', 'invoices', 'inventory'
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve';
}

export interface RoleDefinition {
  name: Role;
  description: string;
  permissions: Permission[];
}

// Define role-based permissions
const rolePermissions: Record<Role, RoleDefinition> = {
  admin: {
    name: 'admin',
    description: 'Full system access',
    permissions: [
      { resource: '*', action: 'create' },
      { resource: '*', action: 'read' },
      { resource: '*', action: 'update' },
      { resource: '*', action: 'delete' },
      { resource: '*', action: 'export' },
      { resource: '*', action: 'approve' },
    ],
  },
  manager: {
    name: 'manager',
    description: 'Business operations management',
    permissions: [
      { resource: 'sales_orders', action: 'create' },
      { resource: 'sales_orders', action: 'read' },
      { resource: 'sales_orders', action: 'update' },
      { resource: 'sales_orders', action: 'approve' },
      { resource: 'invoices', action: 'create' },
      { resource: 'invoices', action: 'read' },
      { resource: 'invoices', action: 'update' },
      { resource: 'inventory', action: 'read' },
      { resource: 'inventory', action: 'update' },
      { resource: 'reports', action: 'read' },
      { resource: 'reports', action: 'export' },
    ],
  },
  accountant: {
    name: 'accountant',
    description: 'Financial management and reporting',
    permissions: [
      { resource: 'accounting', action: 'create' },
      { resource: 'accounting', action: 'read' },
      { resource: 'accounting', action: 'update' },
      { resource: 'invoices', action: 'read' },
      { resource: 'invoices', action: 'approve' },
      { resource: 'expenses', action: 'create' },
      { resource: 'expenses', action: 'read' },
      { resource: 'expenses', action: 'update' },
      { resource: 'reports', action: 'read' },
      { resource: 'reports', action: 'export' },
    ],
  },
  sales: {
    name: 'sales',
    description: 'Sales operations',
    permissions: [
      { resource: 'sales_orders', action: 'create' },
      { resource: 'sales_orders', action: 'read' },
      { resource: 'sales_orders', action: 'update' },
      { resource: 'invoices', action: 'read' },
      { resource: 'customers', action: 'create' },
      { resource: 'customers', action: 'read' },
      { resource: 'customers', action: 'update' },
      { resource: 'crm', action: 'create' },
      { resource: 'crm', action: 'read' },
      { resource: 'crm', action: 'update' },
    ],
  },
  warehouse: {
    name: 'warehouse',
    description: 'Inventory and warehouse management',
    permissions: [
      { resource: 'inventory', action: 'create' },
      { resource: 'inventory', action: 'read' },
      { resource: 'inventory', action: 'update' },
      { resource: 'stock_transfers', action: 'create' },
      { resource: 'stock_transfers', action: 'read' },
      { resource: 'stock_transfers', action: 'update' },
      { resource: 'production', action: 'read' },
    ],
  },
  hr: {
    name: 'hr',
    description: 'Human resources management',
    permissions: [
      { resource: 'hr', action: 'create' },
      { resource: 'hr', action: 'read' },
      { resource: 'hr', action: 'update' },
      { resource: 'payroll', action: 'create' },
      { resource: 'payroll', action: 'read' },
      { resource: 'payroll', action: 'update' },
    ],
  },
  viewer: {
    name: 'viewer',
    description: 'Read-only access to reports and dashboards',
    permissions: [
      { resource: 'reports', action: 'read' },
      { resource: 'dashboard', action: 'read' },
    ],
  },
};

/**
 * Check if a user with a given role can perform an action on a resource
 */
export function canUserAccess(userRole: Role, resource: string, action: Permission['action']): boolean {
  const role = rolePermissions[userRole];
  if (!role) return false;

  return role.permissions.some(
    (perm) =>
      (perm.resource === '*' || perm.resource === resource) &&
      perm.action === action
  );
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role]?.permissions || [];
}

/**
 * Get all available roles
 */
export function getAllRoles(): RoleDefinition[] {
  return Object.values(rolePermissions);
}

/**
 * Create a custom role (for future extensibility)
 */
export function createCustomRole(
  name: string,
  description: string,
  permissions: Permission[]
): RoleDefinition {
  return { name: name as Role, description, permissions };
}

/**
 * Audit log entry for access control
 */
export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  status: 'allowed' | 'denied';
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Log access attempts for audit trail
 */
export async function logAccessAttempt(
  userId: string,
  action: string,
  resource: string,
  status: 'allowed' | 'denied',
  details?: Record<string, unknown>
): Promise<void> {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}`,
    user_id: userId,
    action,
    resource,
    status,
    timestamp: new Date(),
    details,
  };

  // Log to console in development
  console.log('[AUDIT]', entry);

  // In production, this would be sent to the backend for persistent storage
  // await supabase.from('audit_logs').insert(entry);
}
