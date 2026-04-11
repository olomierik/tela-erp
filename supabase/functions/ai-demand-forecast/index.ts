import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { inventoryItems, salesHistory } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ forecasts: null, error: 'AI not configured. LOVABLE_API_KEY is missing.' }),
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: forecastPrompt },
        ],
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ forecasts: null, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ forecasts: null, error: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errText = await response.text()
      console.error('AI demand forecast error:', response.status, errText)
      return new Response(
        JSON.stringify({ forecasts: null, error: 'Forecast failed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? '[]'

    let forecasts = []
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        forecasts = JSON.parse(jsonMatch[0])
      }
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