import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message, context, mode } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: "Tela AI is not configured yet. Go to Settings → AI Settings to add your Anthropic API key.",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mode-specific system prompts
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', data)
      return new Response(
        JSON.stringify({ reply: "Tela AI encountered an error. Please check your API key in Settings." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reply = data.content?.[0]?.text ?? "Sorry, I couldn't process that request."

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Tela AI error:', e)
    return new Response(
      JSON.stringify({ reply: "An error occurred. Please try again." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
