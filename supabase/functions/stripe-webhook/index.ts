import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Maps Stripe price IDs to subscription tiers.
// Set these as Supabase secrets alongside the Stripe keys.
const PRICE_TIER_MAP: Record<string, string> = {
  [Deno.env.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID') ?? '']: 'premium',
  [Deno.env.get('STRIPE_PREMIUM_YEARLY_PRICE_ID') ?? '']: 'premium',
  [Deno.env.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID') ?? '']: 'enterprise',
  [Deno.env.get('STRIPE_ENTERPRISE_YEARLY_PRICE_ID') ?? '']: 'enterprise',
};

function tierFromPriceId(priceId: string): string | null {
  return PRICE_TIER_MAP[priceId] ?? null;
}

function intervalFromPriceId(priceId: string): string {
  const yearlyIds = [
    Deno.env.get('STRIPE_PREMIUM_YEARLY_PRICE_ID'),
    Deno.env.get('STRIPE_ENTERPRISE_YEARLY_PRICE_ID'),
  ];
  return yearlyIds.includes(priceId) ? 'year' : 'month';
}

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  if (!timestamp || !v1) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === v1;
}

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  if (!(await verifyStripeSignature(body, signature, webhookSecret))) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id ?? session.subscription_data?.metadata?.tenant_id;
        const subscriptionId = session.subscription;
        if (!tenantId || !subscriptionId) break;

        // Fetch subscription to get price details
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { 'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
        });
        const sub = await subRes.json();
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId) ?? 'premium';
        const interval = intervalFromPriceId(priceId);

        await supabase.from('tenants').update({
          subscription_tier: tier,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          billing_interval: interval,
          trial_ends_at: null,
          subscription_ends_at: null,
        }).eq('id', tenantId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenant_id;
        if (!tenantId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId) ?? 'premium';
        const interval = intervalFromPriceId(priceId);
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        await supabase.from('tenants').update({
          subscription_tier: tier,
          stripe_price_id: priceId,
          billing_interval: interval,
          subscription_ends_at: sub.cancel_at_period_end ? periodEnd : null,
        }).eq('id', tenantId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenant_id;
        if (!tenantId) break;

        await supabase.from('tenants').update({
          subscription_tier: 'starter',
          stripe_subscription_id: null,
          stripe_price_id: null,
          subscription_ends_at: null,
        }).eq('id', tenantId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Look up tenant by stripe_customer_id
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (tenant) {
          // Grace period: keep current tier, but set subscription_ends_at to now+3 days
          const graceEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('tenants').update({ subscription_ends_at: graceEnd }).eq('id', tenant.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
