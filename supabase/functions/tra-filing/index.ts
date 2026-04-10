import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface Obligation {
  return_type: 'paye' | 'sdl' | 'vat' | 'corporate_tax'
  period_start: string   // ISO date
  period_end: string     // ISO date
  period_label: string   // e.g. "Jul 2025" or "Q3-2025"
  due_date: string       // ISO date
  amount: number
  classification: 'A' | 'B' | 'C'
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Format YYYY-MM-DD */
function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Add months to a date */
function addMonths(d: Date, n: number): Date {
  const result = new Date(d)
  result.setMonth(result.getMonth() + n)
  return result
}

/** Last day of a given month */
function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

/** PAYE/SDL due: 7th of the month after the pay period */
function payeDueDate(periodEnd: Date): Date {
  const d = new Date(periodEnd)
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  d.setDate(7)
  return d
}

/** VAT due: 20th after end of quarter */
function vatDueDate(quarterEnd: Date): Date {
  const d = new Date(quarterEnd)
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  d.setDate(20)
  return d
}

/** Generate a fake TRA reference number */
function fakeTRARef(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `TZ-${year}-${rand}`
}

/** Extract user ID from JWT in Authorization header */
function extractUserId(req: Request): string | null {
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '')
    if (!token) return null
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.sub ?? null
  } catch {
    return null
  }
}

/**
 * Compute obligations for the window [6 months ago .. 2 months ahead].
 * PAYE and SDL are monthly; VAT is quarterly.
 */
function computeObligationWindow(): Omit<Obligation, 'classification'>[] {
  const obligations: Omit<Obligation, 'classification'>[] = []
  const today = new Date()

  // PAYE / SDL — monthly, last 6 months + next 2 months = 8 periods
  for (let offset = -6; offset <= 2; offset++) {
    const periodDate = addMonths(today, offset)
    const year = periodDate.getFullYear()
    const month = periodDate.getMonth()
    const periodStart = new Date(year, month, 1)
    const periodEnd = lastDayOfMonth(year, month)
    const dueDate = payeDueDate(periodEnd)
    const label = periodStart.toLocaleString('en-US', { month: 'short', year: 'numeric' })

    obligations.push({
      return_type: 'paye',
      period_start: toISODate(periodStart),
      period_end: toISODate(periodEnd),
      period_label: label,
      due_date: toISODate(dueDate),
      amount: 0,
    })
    obligations.push({
      return_type: 'sdl',
      period_start: toISODate(periodStart),
      period_end: toISODate(periodEnd),
      period_label: label,
      due_date: toISODate(dueDate),
      amount: 0,
    })
  }

  // VAT — quarterly (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
  // Cover last 2 quarters + next 1 quarter
  const currentQuarter = Math.floor(today.getMonth() / 3)
  const currentYear = today.getFullYear()

  for (let qOffset = -2; qOffset <= 1; qOffset++) {
    let qIdx = currentQuarter + qOffset
    let qYear = currentYear
    while (qIdx < 0) { qIdx += 4; qYear -= 1 }
    while (qIdx > 3) { qIdx -= 4; qYear += 1 }

    const qStartMonth = qIdx * 3
    const periodStart = new Date(qYear, qStartMonth, 1)
    const periodEnd = lastDayOfMonth(qYear, qStartMonth + 2)
    const dueDate = vatDueDate(periodEnd)
    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4']
    const label = `${quarterNames[qIdx]}-${qYear}`

    obligations.push({
      return_type: 'vat',
      period_start: toISODate(periodStart),
      period_end: toISODate(periodEnd),
      period_label: label,
      due_date: toISODate(dueDate),
      amount: 0,
    })
  }

  return obligations
}

// ---------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // ---------------------------------------------------------------
  // Auth check — require Authorization header
  // ---------------------------------------------------------------
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized — missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const performedByUserId = extractUserId(req)

  try {
    const body = await req.json()
    const { action, tenantId, tin, username, obligations } = body

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ---------------------------------------------------------------
    // ACTION: authenticate
    // ---------------------------------------------------------------
    if (action === 'authenticate') {
      if (!tin || !username) {
        return new Response(
          JSON.stringify({ error: 'tin and username are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // NEVER store or log the password — it is intentionally not used beyond this check
      // In real integration: call TRA login API here using tin/username/password

      // Sandbox: generate a fake session token
      const expiryMs = Date.now() + 30 * 60 * 1000
      const sessionToken = btoa(JSON.stringify({ tin, username, exp: expiryMs }))
      const sessionExpiry = new Date(expiryMs).toISOString()

      const { data: sessionData, error: sessionErr } = await supabase
        .from('tra_sessions')
        .insert({
          tenant_id: tenantId,
          tin_number: tin,
          tra_username: username,
          session_token: sessionToken,
          session_expiry: sessionExpiry,
        })
        .select('id')
        .single()

      if (sessionErr) {
        console.error('Failed to create TRA session:', sessionErr)
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Audit log: login
      await supabase.from('tra_filing_audit_log').insert({
        tenant_id: tenantId,
        action_type: 'login',
        performed_by_user_id: performedByUserId,
        metadata: { tin, username, sandbox: true },
      })

      return new Response(
        JSON.stringify({
          connected: true,
          sessionId: sessionData.id,
          expiresAt: sessionExpiry,
          sandbox: true,
          message: 'Connected (sandbox mode)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // ACTION: scan
    // ---------------------------------------------------------------
    if (action === 'scan') {
      // Verify active session
      const { data: session } = await supabase
        .from('tra_sessions')
        .select('id, session_expiry')
        .eq('tenant_id', tenantId)
        .is('disconnected_at', null)
        .gt('session_expiry', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!session) {
        return new Response(
          JSON.stringify({ error: 'No active TRA session. Please authenticate first.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const today = toISODate(new Date())

      // Compute all obligations in the window
      const rawObligations = computeObligationWindow()

      // Fetch existing filing records for this tenant to cross-reference
      const { data: filedRecords } = await supabase
        .from('tra_filing_records')
        .select('return_type, period_start, period_end, status')
        .eq('tenant_id', tenantId)

      // Build a lookup key: "return_type|period_start|period_end"
      const filedSet = new Set<string>()
      for (const rec of filedRecords ?? []) {
        if (rec.status === 'filed') {
          filedSet.add(`${rec.return_type}|${rec.period_start}|${rec.period_end}`)
        }
      }

      // Classify each obligation
      const classifiedObligations: Obligation[] = rawObligations.map(ob => {
        const key = `${ob.return_type}|${ob.period_start}|${ob.period_end}`
        let classification: 'A' | 'B' | 'C'

        if (filedSet.has(key)) {
          classification = 'A' // filed
        } else if (ob.due_date >= today) {
          classification = 'B' // unfiled but current (due in future or today)
        } else {
          classification = 'C' // unfiled and overdue
        }

        return { ...ob, classification }
      })

      const summary = {
        class_a: classifiedObligations.filter(o => o.classification === 'A').length,
        class_b: classifiedObligations.filter(o => o.classification === 'B').length,
        class_c: classifiedObligations.filter(o => o.classification === 'C').length,
      }

      // Audit: scan
      await supabase.from('tra_filing_audit_log').insert({
        tenant_id: tenantId,
        action_type: 'scan',
        performed_by_user_id: performedByUserId,
        metadata: { total_obligations: classifiedObligations.length, summary },
      })

      // Audit: classify
      await supabase.from('tra_filing_audit_log').insert({
        tenant_id: tenantId,
        action_type: 'classify',
        performed_by_user_id: performedByUserId,
        metadata: { summary },
      })

      return new Response(
        JSON.stringify({ obligations: classifiedObligations, summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // ACTION: file
    // ---------------------------------------------------------------
    if (action === 'file') {
      const incomingObligations: Obligation[] = Array.isArray(obligations) ? obligations : []

      // CRITICAL: Reject immediately if any class C obligations are in the request
      const classC = incomingObligations.filter(o => o.classification === 'C')
      if (classC.length > 0) {
        // Log overdue_blocked for each
        for (const ob of classC) {
          await supabase.from('tra_filing_audit_log').insert({
            tenant_id: tenantId,
            action_type: 'overdue_blocked',
            return_type: ob.return_type,
            period: ob.period_label,
            performed_by_user_id: performedByUserId,
            metadata: { due_date: ob.due_date, reason: 'Overdue obligations cannot be filed via this system. Contact TRA directly.' },
          })
        }

        return new Response(
          JSON.stringify({
            error: 'Cannot file overdue (Class C) obligations through this system. Please contact TRA directly on +255 800 780 078.',
            overdue_count: classC.length,
            overdue_obligations: classC.map(o => ({ return_type: o.return_type, period_label: o.period_label, due_date: o.due_date })),
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Only process class B
      const classBObligations = incomingObligations.filter(o => o.classification === 'B')

      const results: Array<{ obligation: Obligation; tra_reference: string; success: boolean }> = []

      for (const ob of classBObligations) {
        // Audit: file_attempt
        await supabase.from('tra_filing_audit_log').insert({
          tenant_id: tenantId,
          action_type: 'file_attempt',
          return_type: ob.return_type,
          period: ob.period_label,
          performed_by_user_id: performedByUserId,
          metadata: { period_start: ob.period_start, period_end: ob.period_end, amount: ob.amount },
        })

        // Sandbox: generate fake TRA reference
        const traReference = fakeTRARef()

        // Insert filing record
        const { error: fileErr } = await supabase.from('tra_filing_records').insert({
          tenant_id: tenantId,
          return_type: ob.return_type,
          period_start: ob.period_start,
          period_end: ob.period_end,
          amount: ob.amount,
          tra_reference: traReference,
          filed_at: new Date().toISOString(),
          filed_by_user_id: performedByUserId,
          status: 'filed',
        })

        if (fileErr) {
          console.error('Failed to insert filing record:', fileErr)
          results.push({ obligation: ob, tra_reference: '', success: false })
          continue
        }

        // Audit: file_success
        await supabase.from('tra_filing_audit_log').insert({
          tenant_id: tenantId,
          action_type: 'file_success',
          return_type: ob.return_type,
          period: ob.period_label,
          tra_reference: traReference,
          performed_by_user_id: performedByUserId,
          metadata: { amount: ob.amount, sandbox: true },
        })

        results.push({ obligation: ob, tra_reference: traReference, success: true })

        // Simulate real API delay between filings
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return new Response(
        JSON.stringify({
          filed: results.filter(r => r.success).length,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // ACTION: disconnect
    // ---------------------------------------------------------------
    if (action === 'disconnect') {
      const { error: updateErr } = await supabase
        .from('tra_sessions')
        .update({ disconnected_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .is('disconnected_at', null)

      if (updateErr) {
        console.error('Failed to disconnect TRA session:', updateErr)
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Audit: logout
      await supabase.from('tra_filing_audit_log').insert({
        tenant_id: tenantId,
        action_type: 'logout',
        performed_by_user_id: performedByUserId,
        metadata: {},
      })

      return new Response(
        JSON.stringify({ disconnected: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // Unknown action
    // ---------------------------------------------------------------
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('TRA filing error:', e)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
