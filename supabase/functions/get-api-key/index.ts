// Edge Function: get-api-key — Returns masked FLOWSALES_API_KEY for display in UI.
// Only authenticated gestores can fetch the full key (for copying).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}${"•".repeat(12)}${key.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "Unauthorized" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json(401, { error: "Unauthorized" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const isGestor = (roles ?? []).some(r => r.role === "gestor");
  if (!isGestor) return json(403, { error: "Forbidden" });

  const url = new URL(req.url);
  const reveal = url.searchParams.get("reveal") === "1";

  let key = Deno.env.get("FLOWSALES_API_KEY") ?? "";
  let generated = false;

  // Auto-generate the key on first access if missing
  if (!key) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    key = `fls_${hex}`;
    generated = true;
    // Persist to vault via Supabase Management API (best-effort) — otherwise user must add manually.
    // We just return it once so the UI can show it.
  }

  return json(200, {
    active: !!key,
    masked: maskKey(key),
    key: reveal ? key : null,
    generated,
    endpoint: `${Deno.env.get("SUPABASE_URL")}/functions/v1/leads`,
  });
});
