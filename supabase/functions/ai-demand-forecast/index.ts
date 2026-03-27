import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { inventoryItems, salesHistory } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ forecasts: null, error: 'AI not configured.' }),
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
        model: 'claude-sonnet-4-6',
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
