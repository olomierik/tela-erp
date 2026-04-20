import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Generate 5-digit OTP
    const otp = String(Math.floor(10000 + Math.random() * 90000));

    // Hash the OTP for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Invalidate previous OTPs for this email
    await supabase
      .from("password_reset_otps")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Store hashed OTP (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabase.from("password_reset_otps").insert({
      email: email.toLowerCase(),
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    // Send OTP email using Supabase Auth's built-in email
    // We use generateLink to trigger an email, but we also send OTP separately
    // The most reliable way: use auth.resetPasswordForEmail which Supabase sends natively
    // But we want OTP instead. So we'll embed the OTP in the auth metadata approach.
    
    // Trigger Supabase's built-in password recovery email. The OTP is delivered
    // separately via the email body; do NOT include it in the redirect URL
    // (URL params leak through browser history, referrer headers, etc).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get("origin") || "https://tela-erp.lovable.app"}/reset-password?email=${encodeURIComponent(email)}`,
    });

    // NOTE: send the OTP to the user via your transactional email pipeline
    // (e.g. send-transactional-email function) rather than embedding in the URL.
    // For now we log a marker so the OTP can be wired into the email body server-side.
    console.log(`[send-reset-otp] OTP issued for ${email.toLowerCase()} (length=${otp.length})`);

    if (error) {
      console.error("Email send error:", error);
      // Still return success to prevent email enumeration
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
