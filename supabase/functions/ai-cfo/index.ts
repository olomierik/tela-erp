import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { financialData, question, mode } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ insights: null, error: 'AI not configured. Add ANTHROPIC_API_KEY in Settings.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are the AI CFO Assistant for TELA-ERP. You are an expert CFO and financial analyst providing actionable business intelligence.

Your role is to:
1. Analyze financial data and identify anomalies, trends, and risks
2. Provide cash flow forecasts and predictions
3. Suggest cost optimization opportunities
4. Flag unusual transactions or patterns
5. Give budget recommendations
6. Rate business health and provide clear action items

Always be specific with numbers from the data provided.
Format your responses with clear sections using markdown.
Be concise, direct, and actionable — like a real CFO would be.

Financial Context: ${JSON.stringify(financialData)}`

    const userMessage = mode === 'insights'
      ? `Analyze this financial data and provide:
1. **Executive Summary** (2-3 sentences on overall health)
2. **Key Alerts** (critical issues requiring immediate attention)
3. **Cash Flow Forecast** (30/60/90 day prediction based on trends)
4. **Top 3 Cost Optimization Opportunities**
5. **Anomalies Detected** (unusual transactions or patterns)
6. **Recommended Actions** (ranked by impact)

Be specific with numbers and percentages.`
      : question ?? 'Give me a comprehensive financial health assessment.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ insights: null, error: 'AI analysis failed. Check your API key.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const insights = data.content?.[0]?.text ?? 'Unable to generate insights.'

    return new Response(
      JSON.stringify({ insights, model: 'claude-sonnet-4-6' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('AI CFO error:', e)
    return new Response(
      JSON.stringify({ insights: null, error: 'An error occurred. Please try again.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
