/**
 * Module Integration Layer
 * 
 * This module provides a unified event-driven architecture for cross-module communication.
 * It enables seamless data flow between Sales, Inventory, Production, and Accounting modules.
 */

import { supabase } from '@/integrations/supabase/client';

type EventType = 'sales_order_created' | 'sales_order_shipped' | 'inventory_low' | 'production_completed' | 'payment_received';

interface ModuleEvent {
  type: EventType;
  timestamp: Date;
  data: Record<string, unknown>;
  source: string;
}

class ModuleIntegrationManager {
  private listeners: Map<EventType, ((event: ModuleEvent) => Promise<void>)[]> = new Map();

  /**
   * Register a listener for a specific event type
   */
  on(eventType: EventType, handler: (event: ModuleEvent) => Promise<void>) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(handler);
  }

  /**
   * Emit an event to all registered listeners
   */
  async emit(event: ModuleEvent) {
    const handlers = this.listeners.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
      }
    }
  }

  /**
   * When a sales order is created, automatically create an inventory reservation
   */
  registerSalesOrderCreatedHandler() {
    this.on('sales_order_created', async (event) => {
      const { order_id, items } = event.data as { order_id: string; items: Array<{ product_id: string; quantity: number }> };

      // Create inventory reservations for each item
      for (const item of items) {
        await (supabase as any).from('inventory_reservations').insert({
          order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          status: 'pending',
        });
      }

      console.log(`Inventory reservations created for sales order ${order_id}`);
    });
  }

  /**
   * When a sales order is shipped, automatically update inventory
   */
  registerSalesOrderShippedHandler() {
    this.on('sales_order_shipped', async (event) => {
      const { order_id, items } = event.data as { order_id: string; items: Array<{ product_id: string; quantity: number }> };

      // Deduct from inventory
      for (const item of items) {
        const { data: stock } = await (supabase as any)
          .from('inventory_stock')
          .select('quantity')
          .eq('product_id', item.product_id)
          .single();

        if (stock) {
          await (supabase as any)
            .from('inventory_stock')
            .update({ quantity: stock.quantity - item.quantity })
            .eq('product_id', item.product_id);
        }
      }

      console.log(`Inventory updated for shipped order ${order_id}`);
    });
  }

  /**
   * When inventory is low, trigger an alert
   */
  registerInventoryLowHandler() {
    this.on('inventory_low', async (event) => {
      const { product_id, current_quantity, reorder_point } = event.data as { product_id: string; current_quantity: number; reorder_point: number };

      // Create a notification
      await (supabase as any).from('notifications').insert({
        title: 'Low Stock Alert',
        message: `Product ${product_id} is below reorder point (${current_quantity}/${reorder_point})`,
        type: 'warning',
        read: false,
      });

      console.log(`Low stock notification created for product ${product_id}`);
    });
  }

  /**
   * When production is completed, automatically update inventory
   */
  registerProductionCompletedHandler() {
    this.on('production_completed', async (event) => {
      const { production_order_id, product_id, quantity } = event.data as { production_order_id: string; product_id: string; quantity: number };

      // Add to inventory
      const { data: stock } = await (supabase as any)
        .from('inventory_stock')
        .select('quantity')
        .eq('product_id', product_id)
        .single();

      if (stock) {
        await (supabase as any)
          .from('inventory_stock')
          .update({ quantity: stock.quantity + quantity })
          .eq('product_id', product_id);
      } else {
        await (supabase as any).from('inventory_stock').insert({
          product_id,
          quantity,
          warehouse_id: 'default',
        });
      }

      console.log(`Inventory updated for completed production order ${production_order_id}`);
    });
  }

  /**
   * When a payment is received, automatically create an accounting entry
   */
  registerPaymentReceivedHandler() {
    this.on('payment_received', async (event) => {
      const { payment_id, amount, customer_id, invoice_id } = event.data as { payment_id: string; amount: number; customer_id: string; invoice_id: string };

      // Create accounting journal entry
      const { data: journalEntry } = await supabase
        .from('myerp_journal_entries')
        .insert({
          reference: `PAY-${payment_id}`,
          date: new Date().toISOString().split('T')[0],
          description: `Payment received from customer ${customer_id}`,
          status: 'posted',
        })
        .select()
        .single();

      if (journalEntry) {
        // Add debit to bank account
        await supabase.from('myerp_journal_lines').insert({
          entry_id: journalEntry.id,
          account_code: '1010', // Bank account
          account_name: 'Bank',
          debit: amount,
          credit: 0,
        });

        // Add credit to accounts receivable
        await supabase.from('myerp_journal_lines').insert({
          entry_id: journalEntry.id,
          account_code: '1200', // Accounts receivable
          account_name: 'Accounts Receivable',
          debit: 0,
          credit: amount,
        });
      }

      console.log(`Accounting entry created for payment ${payment_id}`);
    });
  }

  /**
   * Initialize all module integration handlers
   */
  initializeAllHandlers() {
    this.registerSalesOrderCreatedHandler();
    this.registerSalesOrderShippedHandler();
    this.registerInventoryLowHandler();
    this.registerProductionCompletedHandler();
    this.registerPaymentReceivedHandler();
  }
}

// Export singleton instance
export const moduleIntegration = new ModuleIntegrationManager();

// Initialize on import
moduleIntegration.initializeAllHandlers();
