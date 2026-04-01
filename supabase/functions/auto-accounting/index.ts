import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, tenant_id, user_id } = body;

    if (!tenant_id || !user_id) {
      return new Response(JSON.stringify({ error: "tenant_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: create_voucher — full voucher with entries
    if (action === "create_voucher") {
      const { voucher_type, narration, voucher_date, entries, reference, auto_post } = body;

      if (!voucher_type || !entries?.length) {
        return new Response(JSON.stringify({ error: "voucher_type and entries required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate balance
      const totalDebit = entries.reduce((s: number, e: any) => s + (e.debit || 0), 0);
      const totalCredit = entries.reduce((s: number, e: any) => s + (e.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return new Response(JSON.stringify({ error: "Debits must equal credits" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get voucher number
      const { data: vnData } = await supabase.rpc("next_voucher_number", {
        _tenant_id: tenant_id,
        _type: voucher_type,
      });

      // Auto-create missing accounts
      for (const entry of entries) {
        if (entry.account_name && !entry.account_id) {
          const { data: existing } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("tenant_id", tenant_id)
            .ilike("name", entry.account_name)
            .limit(1)
            .single();

          if (existing) {
            entry.account_id = existing.id;
          } else {
            const code = `AUTO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
            const { data: created } = await supabase
              .from("chart_of_accounts")
              .insert({
                tenant_id,
                name: entry.account_name,
                account_type: entry.account_type || "expense",
                code,
                is_system: false,
              })
              .select("id")
              .single();
            if (created) entry.account_id = created.id;
          }
        }
      }

      // Create voucher
      const { data: voucher, error: vErr } = await supabase
        .from("accounting_vouchers")
        .insert({
          tenant_id,
          voucher_type,
          voucher_number: vnData || `V-${Date.now()}`,
          narration: narration || "",
          voucher_date: voucher_date || new Date().toISOString().split("T")[0],
          reference: reference || null,
          status: auto_post ? "posted" : "draft",
          is_auto: true,
          source_module: body.source_module || null,
          source_id: body.source_id || null,
          created_by: user_id,
        })
        .select("id, voucher_number")
        .single();

      if (vErr) throw vErr;

      // Create entries
      const voucherEntries = entries.map((e: any) => ({
        voucher_id: voucher.id,
        tenant_id,
        account_id: e.account_id,
        description: e.description || "",
        debit: e.debit || 0,
        credit: e.credit || 0,
      }));

      const { error: eErr } = await supabase
        .from("accounting_voucher_entries")
        .insert(voucherEntries);
      if (eErr) throw eErr;

      return new Response(
        JSON.stringify({ success: true, voucher_id: voucher.id, voucher_number: voucher.voucher_number }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: parse_command — AI-assisted command parsing
    if (action === "parse_command") {
      const { command } = body;
      if (!command) {
        return new Response(JSON.stringify({ error: "command required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use Lovable AI to parse the command
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "AI not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an accounting assistant for an ERP system. Parse user input into structured accounting transactions.
              Return JSON only with this schema:
              {
                "voucher_type": "sale|purchase|payment|receipt|journal",
                "narration": "description",
                "entries": [
                  { "account_name": "...", "account_type": "asset|liability|equity|revenue|expense", "debit": number, "credit": number }
                ]
              }
              Always ensure debits equal credits. Use proper double-entry accounting.`,
            },
            { role: "user", content: command },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResponse.ok) {
        return new Response(JSON.stringify({ error: "AI parsing failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      return new Response(JSON.stringify({ success: true, parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
