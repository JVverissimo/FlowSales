// Admin: create a user without affecting the caller's session.
// Requires the caller to be authenticated AND have role 'gestor'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  nome: string;
  email: string;
  telefone?: string;
  role: "gestor" | "sdr";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization");
    if (!auth) return jsonError("Missing Authorization", 401);

    // Verify caller and role using the user's JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userResp, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResp.user) return jsonError("Unauthorized", 401);

    const { data: isGestor } = await userClient.rpc("has_role", {
      _user_id: userResp.user.id,
      _role: "gestor",
    });
    if (!isGestor) return jsonError("Forbidden: requires gestor", 403);

    const body = (await req.json()) as Body;
    if (!body?.email || !body?.nome || !body?.role) return jsonError("Missing fields", 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const redirectTo = req.headers.get("origin")
      ? `${req.headers.get("origin")}/reset-password`
      : undefined;

    // Invite user by email (no password yet). They'll set it via the link.
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
      redirectTo,
      data: {
        nome: body.nome,
        telefone: body.telefone ?? null,
        role: body.role,
      },
    });
    if (inviteErr) {
      const msg = (inviteErr.message || "").toLowerCase();
      if (
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        (inviteErr as any).code === "email_exists" ||
        (inviteErr as any).status === 422
      ) {
        return jsonError("Este e-mail já está cadastrado na plataforma.", 409);
      }
      return jsonError(inviteErr.message, 400);
    }

    return new Response(JSON.stringify({ ok: true, user_id: invited.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return jsonError((e as Error).message ?? "Unknown error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
