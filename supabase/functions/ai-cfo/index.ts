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
    const { financialData, question, mode } = await req.json()
    const { apiKey, model } = await getTenantApiConfig(req)

    if (!apiKey) {
      return new Response(
        JSON.stringify({ insights: null, error: 'AI not configured. Add your Anthropic API key in Settings → AI Settings.' }),
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
        model,
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
      JSON.stringify({ insights, model }),
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
