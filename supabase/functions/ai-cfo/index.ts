import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { financialData, question, mode } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ insights: null, error: 'AI is not configured. LOVABLE_API_KEY is missing.' }),
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
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ insights: null, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ insights: null, error: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errorText = await response.text()
      console.error('AI gateway error:', response.status, errorText)
      return new Response(
        JSON.stringify({ insights: null, error: 'AI analysis failed. Please try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const insights = data.choices?.[0]?.message?.content ?? 'Unable to generate insights.'

    return new Response(
      JSON.stringify({ insights, model: 'google/gemini-3-flash-preview' }),
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
