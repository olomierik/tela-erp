import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LOVABLE_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const LOVABLE_MODEL = 'google/gemini-3-flash-preview'

// ─── Template variable interpolation ─────────────────────────────────────────
function interpolate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? `{{${key}}}`))
}

// ─── AI-powered message generation (used when no template is configured) ─────
async function generateAIMessage(rule: any, payload: Record<string, any>): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) return `Automation rule "${rule.name}" was triggered.`

  try {
    const resp = await fetch(LOVABLE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOVABLE_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a business notification writer for a Tanzanian ERP. Write clear, concise (1-2 sentence) business notifications in English. Be specific and actionable.',
          },
          {
            role: 'user',
            content: `Write a notification message for this automation rule:\nRule: "${rule.name}"\nTrigger: ${rule.trigger_event}\nData: ${JSON.stringify(payload)}\n\nReturn only the notification message text — no quotes, no formatting.`,
          },
        ],
        max_tokens: 100,
      }),
    })
    if (!resp.ok) return `Automation rule "${rule.name}" was triggered.`
    const data = await resp.json()
    return data.choices?.[0]?.message?.content?.trim() ?? `Automation rule "${rule.name}" was triggered.`
  } catch {
    return `Automation rule "${rule.name}" was triggered.`
  }
}

// ─── Action executors ─────────────────────────────────────────────────────────

async function execSendNotification(
  supabase: any,
  action: any,
  rule: any,
  tenantId: string,
  payload: Record<string, any>,
) {
  // Use configured template, or fall back to AI-generated message
  const rawTemplate = action.config?.message ?? ''
  const message = rawTemplate.trim()
    ? interpolate(rawTemplate, payload)
    : await generateAIMessage(rule, payload)

  // Broadcast to all tenant users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)

  const notifications = (profiles ?? []).map((p: any) => ({
    tenant_id: tenantId,
    user_id: p.id,
    type: 'automation',
    title: rule.name,
    message,
    link: '/automation-log',
  }))

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }

  return { sent_to: notifications.length, message }
}

async function execSendEmail(action: any, rule: any, payload: Record<string, any>) {
  const recipient = action.config?.to ?? action.config?.email ?? ''
  if (!recipient) return { skipped: true, reason: 'No recipient configured' }

  const subject = interpolate(action.config?.subject ?? rule.name, payload)
  const body = interpolate(
    action.config?.message ?? `Automation rule "${rule.name}" was triggered.`,
    payload,
  )

  const resp = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: recipient, subject, html: `<p>${body}</p>` }),
    },
  )

  return { email_sent: resp.ok, recipient, status: resp.status }
}

async function execWebhook(action: any, rule: any, payload: Record<string, any>) {
  const url = action.config?.url ?? ''
  if (!url) return { skipped: true, reason: 'No webhook URL configured' }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tela-Event': rule.trigger_event },
    body: JSON.stringify({ event: rule.trigger_event, rule: rule.name, payload }),
    signal: AbortSignal.timeout(8000),
  })

  return { webhook_status: resp.status, ok: resp.ok }
}

async function execCreateTask(
  supabase: any,
  action: any,
  rule: any,
  tenantId: string,
  payload: Record<string, any>,
) {
  const title = interpolate(action.config?.title ?? `Task: ${rule.name}`, payload)

  const { error } = await supabase.from('projects_tasks').insert({
    tenant_id: tenantId,
    title,
    description: `Auto-created by automation rule: ${rule.name}`,
    status: 'todo',
    priority: action.config?.priority ?? 'medium',
  })

  return { task_created: !error, error: error?.message }
}

// ─── Execute a single automation rule ────────────────────────────────────────

async function executeRule(
  supabase: any,
  rule: any,
  tenantId: string,
  event: string,
  payload: Record<string, any>,
) {
  const actionsExecuted: any[] = []
  let overallStatus: 'success' | 'failed' | 'skipped' = 'success'

  for (const action of rule.actions ?? []) {
    try {
      let result: any

      switch (action.type) {
        case 'send_notification':
          result = await execSendNotification(supabase, action, rule, tenantId, payload)
          break
        case 'send_email':
          result = await execSendEmail(action, rule, payload)
          break
        case 'webhook':
          result = await execWebhook(action, rule, payload)
          break
        case 'create_task':
          result = await execCreateTask(supabase, action, rule, tenantId, payload)
          break
        default:
          result = { skipped: true, reason: `Unknown action type: ${action.type}` }
      }

      actionsExecuted.push({ type: action.type, ...result })
    } catch (err: any) {
      actionsExecuted.push({ type: action.type, error: err?.message ?? 'Unknown error' })
      overallStatus = 'failed'
    }
  }

  // Write execution log
  await supabase.from('automation_execution_log').insert({
    rule_id: rule.id,
    tenant_id: tenantId,
    trigger_type: event,
    status: overallStatus,
    output: { actions_executed: actionsExecuted, trigger_payload: payload },
  })

  // Increment run_count and update last_run_at
  await supabase
    .from('automation_rules')
    .update({
      run_count: (rule.run_count ?? 0) + 1,
      last_run_at: new Date().toISOString(),
    })
    .eq('id', rule.id)
    .eq('tenant_id', tenantId)

  return { status: overallStatus, actions: actionsExecuted.length }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { event, tenantId, payload = {} } = await req.json()

    if (!event || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'event and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch all matching active rules for this tenant + event
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('trigger_event', event)
      .eq('is_active', true)

    if (rulesError) throw rulesError

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ fired: 0, message: 'No matching active rules' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Execute all matching rules concurrently
    const results = await Promise.allSettled(
      rules.map((rule: any) => executeRule(supabase, rule, tenantId, event, payload)),
    )

    const fired = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - fired

    return new Response(
      JSON.stringify({ fired, failed, total: rules.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('automation-engine error:', err)
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
