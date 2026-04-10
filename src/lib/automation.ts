import { supabase } from '@/lib/supabase';

/**
 * Fire-and-forget trigger for the automation engine.
 *
 * Call this after any significant business event (invoice created, payment
 * received, stock low, etc.) to evaluate and execute matching automation rules.
 *
 * Never throws — automation failures are non-blocking side effects.
 *
 * @param event    - trigger_event value matching automation_rules.trigger_event
 * @param payload  - context data for template interpolation ({{variable}})
 * @param tenantId - tenant UUID; pass tenant?.id from useAuth()
 */
export async function triggerAutomation(
  event: string,
  payload: Record<string, any>,
  tenantId: string,
): Promise<void> {
  if (!tenantId) return;
  try {
    await supabase.functions.invoke('automation-engine', {
      body: { event, tenantId, payload },
    });
  } catch {
    // Non-blocking: automation failures must never crash the UI
  }
}
