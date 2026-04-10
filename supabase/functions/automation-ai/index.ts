import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const LOVABLE_MODEL = 'google/gemini-3-flash-preview'

const SYSTEM_PROMPT = `You are an intelligent business automation advisor embedded in Tela ERP — a SaaS ERP for Tanzanian businesses.

Your job is to analyze a company's business context and suggest practical, high-value automation rules.

Each rule must follow this JSON schema exactly:
{
  "name": string,           // Short, action-oriented name (e.g. "Overdue Invoice Alert")
  "description": string,    // One sentence explaining the business value
  "trigger_event": string,  // One of: invoice_created, invoice_overdue, payment_received, stock_low, stock_out, sales_order_created, deal_won, deal_stage_changed, expense_submitted, new_customer, po_created
  "actions": [
    {
      "type": string,       // One of: send_notification, send_email, webhook, create_task
      "config": {
        "message"?: string,  // For send_notification: message template with {{variables}}
        "subject"?: string,  // For send_email
        "to"?: string,       // For send_email: recipient placeholder
        "title"?: string,    // For create_task
        "url"?: string       // For webhook
      }
    }
  ]
}

Available template variables by trigger:
- invoice_created / invoice_overdue: {{invoice_number}}, {{customer_name}}, {{total}}, {{due_date}}
- payment_received: {{amount}}, {{customer_name}}
- stock_low / stock_out: {{name}}, {{sku}}, {{quantity}}, {{reorder_level}}
- sales_order_created: {{customer}}, {{total}}, {{reference}}
- deal_won / deal_stage_changed: {{deal_id}}, {{stage}}, {{name}}
- expense_submitted: {{amount}}, {{description}}
- new_customer: {{name}}, {{email}}
- po_created: {{vendor}}, {{total}}, {{reference}}

Rules:
- Return ONLY a valid JSON array of 4-6 rules (no markdown, no preamble)
- Make rules specific to the company's industry and data
- Include a mix of notification, email, and task creation actions
- Prioritise rules that save money or prevent revenue loss`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI is not configured. LOVABLE_API_KEY is missing.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { tenantId } = await req.json()
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Gather business context ───────────────────────────────────────
    const context: Record<string, any> = {}

    try {
      // Existing automation rules (to avoid duplicates)
      const { data: existingRules } = await supabase
        .from('automation_rules')
        .select('trigger_event, name')
        .eq('tenant_id', tenantId)
      context.existing_rules = existingRules?.map(r => r.trigger_event) ?? []

      // Invoice summary (past 30 days)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total')
        .eq('tenant_id', tenantId)
        .limit(50)
      const overdueCount = invoices?.filter(i => i.status === 'overdue').length ?? 0
      context.invoices = { total: invoices?.length ?? 0, overdue: overdueCount }

      // Low-stock items
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('quantity, reorder_level')
        .eq('tenant_id', tenantId)
      const lowStock = (inventory ?? []).filter(i => Number(i.quantity) <= Number(i.reorder_level))
      context.inventory = { total: inventory?.length ?? 0, low_stock: lowStock.length }

      // Employee count (SDL / payroll context)
      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      context.employee_count = empCount ?? 0

      // Pending expense claims
      const { count: pendingExpenses } = await supabase
        .from('expense_claims')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'submitted')
      context.pending_expenses = pendingExpenses ?? 0

      // Open deals
      const { data: deals } = await supabase
        .from('crm_deals')
        .select('stage, value')
        .eq('tenant_id', tenantId)
      context.crm = {
        open_deals: deals?.length ?? 0,
        pipeline_value: deals?.reduce((s, d) => s + Number(d.value ?? 0), 0) ?? 0,
      }
    } catch (dbErr) {
      console.warn('Context fetch partial failure (continuing):', dbErr)
    }

    // ── Call Lovable AI ───────────────────────────────────────────────
    const userPrompt = `Business context for a Tanzanian company:
${JSON.stringify(context, null, 2)}

Suggest 4-6 automation rules that would genuinely benefit this business.
Do NOT suggest rules for triggers already in: ${JSON.stringify(context.existing_rules)}.
Return ONLY the JSON array.`

    const aiResp = await fetch(LOVABLE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOVABLE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please top up in Settings → Workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const errText = await aiResp.text()
      console.error('automation-ai Lovable error:', aiResp.status, errText)
      return new Response(
        JSON.stringify({ error: 'AI service unavailable. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const aiData = await aiResp.json()
    const rawContent = aiData.choices?.[0]?.message?.content ?? '[]'

    // ── Parse suggestions ─────────────────────────────────────────────
    let suggestions: any[] = []
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) suggestions = parsed
      }
    } catch (parseErr) {
      console.error('Failed to parse AI suggestions:', parseErr, rawContent)
    }

    return new Response(
      JSON.stringify({ suggestions, count: suggestions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('automation-ai error:', err)
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
