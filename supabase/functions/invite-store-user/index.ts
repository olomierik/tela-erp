import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // email is required; store_id and store_role are optional
    const { email, store_id, role = "user", store_role = "user", full_name = "" } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller's tenant
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Caller profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = callerProfile.tenant_id;

    // Verify store belongs to tenant (if provided)
    if (store_id) {
      const { data: store } = await adminClient
        .from("stores")
        .select("id")
        .eq("id", store_id)
        .eq("tenant_id", tenantId)
        .single();
      if (!store) {
        return new Response(JSON.stringify({ error: "Store not found in your tenant" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      // Ensure profile exists for this tenant
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("user_id", existingUser.id)
        .eq("tenant_id", tenantId)
        .single();

      if (!existingProfile) {
        await adminClient.from("profiles").insert({
          user_id: existingUser.id,
          tenant_id: tenantId,
          email: email,
          full_name: full_name || existingUser.user_metadata?.full_name || email.split("@")[0],
          is_active: true,
        });
      }

      // Upsert app-level role
      await adminClient.from("user_roles").upsert(
        { user_id: existingUser.id, role },
        { onConflict: "user_id" }
      );

      // Assign to store if provided
      if (store_id) {
        await adminClient.from("user_store_assignments").upsert({
          user_id: existingUser.id,
          store_id,
          tenant_id: tenantId,
          role: store_role,
        }, { onConflict: "user_id,store_id" });
      }

      return new Response(JSON.stringify({ message: "User added to tenant", existed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // New user — send Supabase invite with metadata so the DB trigger can set up their profile
    const origin = req.headers.get("origin") || "https://tela-erp.lovable.app";

    const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: tenantId,
        app_role: role,
        store_id: store_id ?? null,
        store_role: store_id ? store_role : null,
        full_name: full_name || email.split("@")[0],
        invited_by: caller.id,
      },
      redirectTo: `${origin}/dashboard`,
    });

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: `Invitation sent to ${email}`, existed: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
