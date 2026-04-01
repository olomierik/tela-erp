import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getTenantApiConfig(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) return { apiKey: Deno.env.get('ANTHROPIC_API_KEY'), model: 'claude-sonnet-4-6' }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) return { apiKey: Deno.env.get('ANTHROPIC_API_KEY'), model: 'claude-sonnet-4-6' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.tenant_id) return { apiKey: Deno.env.get('ANTHROPIC_API_KEY'), model: 'claude-sonnet-4-6' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('anthropic_api_key, ai_model')
    .eq('id', profile.tenant_id)
    .single()

  return {
    apiKey: tenant?.anthropic_api_key || Deno.env.get('ANTHROPIC_API_KEY'),
    model: tenant?.ai_model || 'claude-sonnet-4-6',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { inventoryItems, salesHistory } = await req.json()
    const { apiKey, model } = await getTenantApiConfig(req)

    if (!apiKey) {
      return new Response(
        JSON.stringify({ forecasts: null, error: 'AI not configured. Add your Anthropic API key in Settings → AI Settings.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are an AI demand forecasting expert for inventory management.
Analyze sales velocity, stock levels, and patterns to predict future demand.
Return practical, actionable forecasts that help businesses avoid stockouts and overstock.`

    const forecastPrompt = `Analyze this inventory and sales data and provide demand forecasts:

Inventory Items: ${JSON.stringify(inventoryItems?.slice(0, 20))}
Sales History: ${JSON.stringify(salesHistory?.slice(0, 50))}

Return a JSON array with forecasts for each product:
[
  {
    "item_id": "string",
    "item_name": "string",
    "current_stock": number,
    "daily_velocity": number (estimated units sold per day),
    "days_until_stockout": number,
    "forecast_30_days": number (predicted demand in 30 days),
    "forecast_60_days": number,
    "forecast_90_days": number,
    "recommended_reorder_qty": number,
    "reorder_priority": "critical|high|medium|low",
    "insight": "string (1-2 sentence insight about this item)"
  }
]

Return ONLY the JSON array, no other text.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: forecastPrompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(
        JSON.stringify({ forecasts: null, error: 'Forecast failed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = data.content?.[0]?.text ?? '[]'
    let forecasts = []
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text]
      forecasts = JSON.parse(jsonMatch[1] ?? text)
    } catch {
      forecasts = []
    }

    return new Response(
      JSON.stringify({ forecasts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Demand forecast error:', e)
    return new Response(
      JSON.stringify({ forecasts: null, error: 'Forecast failed.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
