import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TAX_SYSTEM_PROMPT = `You are an expert Tanzanian tax consultant embedded inside Tela ERP.

You have deep knowledge of:
- Tanzania Income Tax Act (Cap 332) — corporate tax 30%, PAYE bands
- VAT Act (Cap 148) — standard rate 18%, quarterly filing, input credits
- Skills and Development Levy (SDL) Act — 3.5% of gross wages, companies with >10 employees only
- NSSF Act — 10% employer + 10% employee contributions
- TRA filing procedures: PAYE & SDL due 7th of following month, VAT due 20th after quarter end
- Tanzanian business compliance requirements

Tanzania PAYE monthly bands (2025/2026):
- TZS 0 – 270,000: 0%
- TZS 270,001 – 520,000: 8% of (income - 270,000)
- TZS 520,001 – 760,000: 20% of (income - 520,000) + TZS 20,000
- TZS 760,001 – 1,000,000: 25% of (income - 760,000) + TZS 68,000
- Above TZS 1,000,000: 30% of (income - 1,000,000) + TZS 128,000

Rules:
- Respond in English (or Swahili if user writes in Swahili)
- Never invent tax rates — only use TRA-published rates above
- Cite relevant Acts and sections in your response
- For overdue obligations, direct user to contact TRA on +255 800 780 078
- Use bullet points for multi-part answers
- Always be specific — use exact TZS amounts when the data is available`

function extractSources(text: string): string[] {
  const sources: string[] = []
  const seen = new Set<string>()

  // Patterns to match Tanzanian tax law references
  const patterns = [
    /ITA\s+(?:Cap\.?\s*\d+|S(?:ection|ec)?\.?\s*\d+(?:\.\d+)*)/gi,
    /Income Tax Act(?:\s+Cap\.?\s*\d+)?/gi,
    /VAT\s+Act(?:\s+Cap\.?\s*\d+)?/gi,
    /SDL\s+Act/gi,
    /NSSF\s+Act/gi,
    /Cap\.?\s*\d+/gi,
    /S(?:ection|ect?)?\.?\s*\d+(?:\.\d+)*/gi,
    /TRA(?:\s+[A-Z][a-z]+)?/g,
    /Skills\s+and\s+Development\s+Levy/gi,
    /National\s+Social\s+Security\s+Fund/gi,
    /Finance\s+Act\s+\d{4}/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const source = match[0].trim()
      if (source.length > 2 && !seen.has(source.toLowerCase())) {
        seen.add(source.toLowerCase())
        sources.push(source)
      }
    }
  }

  // Also extract any lines that contain "Source:" prefix
  const sourceLines = text.split('\n').filter(line =>
    /^\s*[Ss]ource[s]?:/i.test(line) || /^\s*-\s*Source[s]?:/i.test(line)
  )
  for (const line of sourceLines) {
    const content = line.replace(/^\s*-?\s*[Ss]ource[s]?:\s*/i, '').trim()
    if (content && !seen.has(content.toLowerCase())) {
      seen.add(content.toLowerCase())
      sources.push(content)
    }
  }

  return sources
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          reply: 'AI tax consultant is not configured. Please contact your administrator.',
          sources: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, message, messages, scenario, tenantId } = await req.json()

    // ---------------------------------------------------------------
    // ACTION: scenario
    // ---------------------------------------------------------------
    if (action === 'scenario') {
      const scenarioPrompt = `Analyze the following tax scenario for a Tanzanian business and provide 2-3 sentences of expert commentary. Cite applicable Acts and TZS amounts where possible.\n\nScenario: ${JSON.stringify(scenario)}`

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: TAX_SYSTEM_PROMPT },
            { role: 'user', content: scenarioPrompt },
          ],
        }),
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('Tax consultant AI error (scenario):', aiResponse.status, errText)
        return new Response(
          JSON.stringify({ commentary: 'Unable to analyse scenario at this time. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const aiData = await aiResponse.json()
      const commentary = aiData.choices?.[0]?.message?.content ?? 'No commentary available.'

      return new Response(
        JSON.stringify({ commentary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // ACTION: chat (default)
    // ---------------------------------------------------------------

    // Build DB context for the system prompt
    let taxContext = ''
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Last 3 computed tax liabilities
      const { data: liabilities } = await supabase
        .from('computed_tax_liabilities')
        .select('type, period, amount, employee_count, computed_at')
        .eq('tenant_id', tenantId)
        .order('computed_at', { ascending: false })
        .limit(3)

      // Count of unfiled obligations
      const { count: unfiledCount } = await supabase
        .from('tra_filing_records')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'unfiled')

      if (liabilities && liabilities.length > 0) {
        taxContext += `\n\nTenant tax context (use this to give specific answers):`
        taxContext += `\nRecent computed liabilities: ${JSON.stringify(liabilities)}`
      }
      if (unfiledCount !== null) {
        taxContext += `\nUnfiled obligations count: ${unfiledCount}`
      }
    } catch (dbErr) {
      console.warn('DB context fetch failed (continuing without context):', dbErr)
    }

    const systemPromptWithContext = TAX_SYSTEM_PROMPT + taxContext

    // Build messages array
    const historyMessages = Array.isArray(messages) ? messages : []
    const chatMessages = [
      { role: 'system', content: systemPromptWithContext },
      ...historyMessages,
      { role: 'user', content: message ?? '' },
    ]

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: chatMessages,
      }),
    })

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ reply: 'Rate limit exceeded. Please try again in a moment.', sources: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ reply: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.', sources: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errText = await aiResponse.text()
      console.error('Tax consultant AI error (chat):', aiResponse.status, errText)
      return new Response(
        JSON.stringify({ reply: 'Tax consultant encountered an error. Please try again.', sources: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()
    const reply = aiData.choices?.[0]?.message?.content ?? "Sorry, I couldn't process that request."
    const sources = extractSources(reply)

    return new Response(
      JSON.stringify({ reply, sources, session_updated: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Tax consultant error:', e)
    return new Response(
      JSON.stringify({ reply: 'An error occurred. Please try again.', sources: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
