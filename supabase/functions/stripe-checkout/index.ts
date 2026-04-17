import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { priceId, tenantId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !tenantId) {
      return new Response(JSON.stringify({ error: 'priceId and tenantId are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create Stripe customer for this tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, name')
      .eq('id', tenantId)
      .single();

    let customerId = tenant?.stripe_customer_id;

    if (!customerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ 'name': tenant?.name ?? 'TELA-ERP Customer', 'metadata[tenant_id]': tenantId }),
      });
      const customer = await customerRes.json();
      customerId = customer.id;

      await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId);
    }

    const appUrl = successUrl ?? 'https://app.tela-erp.com';
    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      customer: customerId,
      success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&upgraded=1`,
      cancel_url: `${cancelUrl ?? appUrl + '/pricing'}`,
      'subscription_data[metadata][tenant_id]': tenantId,
      'allow_promotion_codes': 'true',
    });

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await sessionRes.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
