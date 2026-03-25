import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { message, context } = await req.json()
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ reply: "Tela AI is not configured yet. Go to Settings → AI Settings to add your OpenAI API key." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const systemPrompt = `You are Tela AI, an intelligent business assistant embedded in TELA-ERP. Help business owners understand their data and make smart decisions. Be concise and practical. Business context: ${JSON.stringify(context)}`
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], max_tokens: 600 })
    })
    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that request."
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ reply: "An error occurred. Please try again." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
