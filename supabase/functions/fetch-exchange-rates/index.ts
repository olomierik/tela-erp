import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Use free exchangerate-api (no key required for open endpoint)
    const base = 'USD'
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
    if (!res.ok) throw new Error(`Exchange rate API failed: ${res.status}`)

    const data = await res.json()
    if (data.result !== 'success') throw new Error('Exchange rate API error')

    const rates = data.rates as Record<string, number>

    // Upsert all rates
    const rows = Object.entries(rates).map(([currency, rate]) => ({
      base_currency: base,
      target_currency: currency,
      rate,
      fetched_at: new Date().toISOString(),
    }))

    // Delete old rates and insert fresh
    await supabase.from('exchange_rates').delete().eq('base_currency', base)
    const { error } = await supabase.from('exchange_rates').insert(rows)
    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, currencies: Object.keys(rates).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Exchange rate fetch error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
