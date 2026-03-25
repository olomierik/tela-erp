import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message, context } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: "Tela AI is not configured yet. Go to Settings → AI Settings to add your Anthropic API key.",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are Tela AI, an intelligent business assistant embedded in TELA-ERP. 
You help business owners understand their data, spot trends, and make smart operational decisions.
Be concise, practical, and use specific numbers from the context when available.
Always respond in a friendly, professional tone.
Business context: ${JSON.stringify(context)}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 600,
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

    const reply = data.content?.[0]?.text || "Sorry, I couldn't process that request."

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
