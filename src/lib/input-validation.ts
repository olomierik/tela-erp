import { z } from 'zod';

// Reusable validation schemas for all ERP modules

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');

export const tenantBrandingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  primary_color: hexColorSchema.optional(),
  secondary_color: hexColorSchema.optional(),
  custom_domain: z.string().trim().max(255).optional().or(z.literal('')),
});

export const productionOrderSchema = z.object({
  order_number: z.string().trim().min(1).max(50),
  product_name: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive(),
  status: z.enum(['draft', 'in_progress', 'completed', 'cancelled']).default('draft'),
});

export const inventoryItemSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100),
  quantity: z.number().int().min(0),
  unit_cost: z.number().min(0),
  reorder_level: z.number().int().min(0).default(10),
});

export const salesOrderSchema = z.object({
  order_number: z.string().trim().min(1).max(50),
  customer_name: z.string().trim().min(1).max(200),
  customer_email: z.string().email().max(255).or(z.literal('')),
  total_amount: z.number().min(0),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).default('pending'),
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(1).max(100),
  amount: z.number().positive(),
  description: z.string().trim().max(500),
  date: z.string(),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  channel: z.enum(['email', 'social', 'ppc', 'content']),
  budget: z.number().min(0),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
});

export const purchaseOrderSchema = z.object({
  po_number: z.string().trim().min(1).max(50),
  supplier_name: z.string().trim().min(1).max(200),
  total_amount: z.number().min(0),
  status: z.enum(['draft', 'submitted', 'approved', 'received', 'cancelled']).default('draft'),
});

// Rate limiting utility
const requestTimestamps = new Map<string, number[]>();

export function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = requestTimestamps.get(key) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  requestTimestamps.set(key, recent);
  return true;
}
