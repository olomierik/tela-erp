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

    // Verify the calling user
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

    const { email, store_id, role, full_name } = await req.json();
    if (!email || !store_id) {
      return new Response(JSON.stringify({ error: "email and store_id required" }), {
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

    // Verify store belongs to caller's tenant
    const { data: store } = await adminClient
      .from("stores")
      .select("id, tenant_id, name")
      .eq("id", store_id)
      .eq("tenant_id", callerProfile.tenant_id)
      .single();

    if (!store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      // User exists — check if already in this tenant
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("user_id", existingUser.id)
        .eq("tenant_id", callerProfile.tenant_id)
        .single();

      if (existingProfile) {
        // Just assign to store
        const { error: assignErr } = await adminClient
          .from("user_store_assignments")
          .upsert({
            user_id: existingUser.id,
            store_id,
            tenant_id: callerProfile.tenant_id,
            role: role || "user",
          }, { onConflict: "user_id,store_id" });

        if (assignErr) {
          return new Response(JSON.stringify({ error: assignErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "User assigned to store", existed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Send magic link — user will be created on first sign-in via the trigger
    // We pass tenant_id so the trigger associates them with the right tenant
    const redirectUrl = req.headers.get("origin") || "https://tela-erp.lovable.app";
    
    const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: callerProfile.tenant_id,
        role: role || "user",
        full_name: full_name || "",
        store_id: store_id,
        invited_by: caller.id,
      },
      redirectTo: redirectUrl + "/dashboard",
    });

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If user was just invited, assign them to the store after they confirm
    // We'll store a pending assignment that the trigger picks up
    // For now, we create the assignment — it'll work once the user confirms
    // We need to wait for the user to actually exist first, so we'll handle this
    // in an updated trigger

    return new Response(
      JSON.stringify({ message: "Invitation sent to " + email, existed: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
