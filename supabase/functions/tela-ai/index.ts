import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { message, context, mode } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ reply: 'Tela AI is not configured. LOVABLE_API_KEY is missing.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompts: Record<string, string> = {
      default: `You are Tela AI, an intelligent business assistant embedded in TELA-ERP.
You help business owners understand their data, spot trends, and make smart operational decisions.
Be concise, practical, and use specific numbers from the context when available.
Always respond in a friendly, professional tone.
Business context: ${JSON.stringify(context)}`,

      sales_coach: `You are an expert B2B sales coach and CRM analyst embedded in TELA-ERP.
Your role is to help sales teams:
1. Score leads and deals based on signals (deal value, activity, stage duration)
2. Recommend next best actions for each deal
3. Predict deal close probability (0-100%)
4. Identify at-risk deals and suggest recovery actions
5. Analyze pipeline health and forecast revenue

Be specific, data-driven, and action-oriented.
CRM context: ${JSON.stringify(context)}`,

      hr_assistant: `You are an expert HR consultant and talent advisor embedded in TELA-ERP.
You help HR managers with:
1. Writing compelling job descriptions
2. Evaluating candidate fit
3. Generating performance review summaries
4. Workforce planning insights
5. Employee engagement recommendations

Be professional, empathetic, and evidence-based.
HR context: ${JSON.stringify(context)}`,

      nl_query: `You are a data analyst AI embedded in TELA-ERP.
When users ask natural language questions about their business data, provide clear, specific answers.
Use the context data to calculate and present results.
Format responses clearly with numbers, percentages, and rankings where relevant.
Business data: ${JSON.stringify(context)}`,
    }

    const systemPrompt = systemPrompts[mode ?? 'default'] ?? systemPrompts.default

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
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ reply: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ reply: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errorText = await response.text()
      console.error('Tela AI gateway error:', response.status, errorText)
      return new Response(
        JSON.stringify({ reply: 'Tela AI encountered an error. Please try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't process that request."

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Tela AI error:', e)
    return new Response(
      JSON.stringify({ reply: 'An error occurred. Please try again.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
