import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimizerFinding {
  finding: string
  potential_saving_tzs: number
  regulation: string
}

// Generic findings for tenants with no data yet
const GENERIC_FINDINGS: OptimizerFinding[] = [
  {
    finding: 'SDL exemption may apply — companies with 10 or fewer employees are exempt from the 3.5% Skills and Development Levy. Verify your headcount to confirm eligibility.',
    potential_saving_tzs: 0,
    regulation: 'SDL Act S.5(1)',
  },
  {
    finding: 'Input VAT credits on business purchases may be unclaimed. All VAT-registered suppliers\' invoices should be tracked and submitted for quarterly input credit claims.',
    potential_saving_tzs: 0,
    regulation: 'VAT Act Cap 148 S.11',
  },
  {
    finding: 'Capital allowances on fixed assets (machinery, vehicles, equipment) can be claimed at prescribed rates under ITA. Ensure all depreciable assets are registered and claimed against taxable income.',
    potential_saving_tzs: 0,
    regulation: 'ITA Cap 332 S.27',
  },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const { tenantId } = await req.json()

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
    // 1. Gather financial data for last 3 months
    // ---------------------------------------------------------------
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const threeMonthsAgoISO = threeMonthsAgo.toISOString().split('T')[0]

    let financialSummary = {
      transactions: null as unknown,
      expenseClaims: null as unknown,
      fixedAssets: null as unknown,
      employeeCount: 0,
    }

    let hasData = false

    try {
      // Transactions last 3 months — grouped summary
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, category, amount, date')
        .eq('tenant_id', tenantId)
        .gte('date', threeMonthsAgoISO)
        .order('date', { ascending: false })

      // Expense claims last 3 months
      const { data: expenseClaims } = await supabase
        .from('expense_claims')
        .select('total_amount, status, submitted_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', threeMonthsAgo.toISOString())

      // All fixed assets
      const { data: fixedAssets } = await supabase
        .from('fixed_assets')
        .select('name, category, purchase_cost, current_value, accumulated_depreciation, useful_life_years, depreciation_method, status')
        .eq('tenant_id', tenantId)

      // Employee count
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      if (
        (transactions && transactions.length > 0) ||
        (expenseClaims && expenseClaims.length > 0) ||
        (fixedAssets && fixedAssets.length > 0)
      ) {
        hasData = true
      }

      // Aggregate transaction totals by category
      const txByCategory: Record<string, { total: number; count: number }> = {}
      for (const tx of transactions ?? []) {
        const key = `${tx.type}:${tx.category}`
        if (!txByCategory[key]) txByCategory[key] = { total: 0, count: 0 }
        txByCategory[key].total += Number(tx.amount)
        txByCategory[key].count += 1
      }

      const expenseSummary = {
        total_claims: expenseClaims?.length ?? 0,
        total_amount: expenseClaims?.reduce((s, c) => s + Number(c.total_amount), 0) ?? 0,
        approved: expenseClaims?.filter(c => c.status === 'approved').length ?? 0,
      }

      financialSummary = {
        transactions: txByCategory,
        expenseClaims: expenseSummary,
        fixedAssets: fixedAssets ?? [],
        employeeCount: employeeCount ?? 0,
      }
    } catch (dbErr) {
      console.error('DB fetch error in tax-optimizer:', dbErr)
      // Return generic findings if DB fails
      return new Response(
        JSON.stringify({ findings: GENERIC_FINDINGS, count: GENERIC_FINDINGS.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // 2. Return generic findings for new/empty tenants
    // ---------------------------------------------------------------
    if (!hasData) {
      return new Response(
        JSON.stringify({ findings: GENERIC_FINDINGS, count: GENERIC_FINDINGS.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // 3. Call AI for analysis
    // ---------------------------------------------------------------
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ findings: GENERIC_FINDINGS, count: GENERIC_FINDINGS.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userPrompt = `Analyze this company's financial data and identify potential tax deductions or savings opportunities under Tanzanian tax law. Return a JSON array only (no other text):
[{ "finding": string, "potential_saving_tzs": number, "regulation": string }]

Financial data:
${JSON.stringify(financialSummary, null, 2)}

Focus on:
1. Incorrectly classified deductible expenses (ITA Cap 332 S.17)
2. Capital allowances (ITA Cap 332 S.27)
3. SDL exemptions (companies with ≤10 employees)
4. Missing input VAT credits (VAT Act Cap 148 S.11)
5. NSSF contribution deductibility
Return ONLY the JSON array.`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a Tanzanian tax optimisation specialist embedded in Tela ERP.',
          },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('Tax optimizer AI error:', aiResponse.status, errText)
      return new Response(
        JSON.stringify({ findings: GENERIC_FINDINGS, count: GENERIC_FINDINGS.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()
    const rawContent = aiData.choices?.[0]?.message?.content ?? '[]'

    // ---------------------------------------------------------------
    // 4. Parse the JSON array (handle extra text from AI)
    // ---------------------------------------------------------------
    let findings: OptimizerFinding[] = []
    try {
      // Extract JSON array even if surrounded by markdown code fences or extra text
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) {
          findings = parsed.map((item: Partial<OptimizerFinding>) => ({
            finding: String(item.finding ?? ''),
            potential_saving_tzs: Number(item.potential_saving_tzs ?? 0),
            regulation: String(item.regulation ?? ''),
          })).filter(f => f.finding.length > 0)
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse AI findings JSON:', parseErr, rawContent)
      findings = GENERIC_FINDINGS
    }

    if (findings.length === 0) {
      findings = GENERIC_FINDINGS
    }

    // ---------------------------------------------------------------
    // 5. Persist findings to DB
    // ---------------------------------------------------------------
    try {
      const rows = findings.map(f => ({
        tenant_id: tenantId,
        finding: f.finding,
        potential_saving_tzs: f.potential_saving_tzs,
        regulation: f.regulation,
      }))
      const { error: insertErr } = await supabase
        .from('tax_optimization_findings')
        .insert(rows)
      if (insertErr) {
        console.error('Failed to insert tax optimization findings:', insertErr)
      }
    } catch (insertErr) {
      console.error('DB insert error for tax findings:', insertErr)
    }

    return new Response(
      JSON.stringify({ findings, count: findings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Tax optimizer error:', e)
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
