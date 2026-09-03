// Bootstrap initial users with a fixed password (for testing).
// Idempotent: creates if missing, updates password + role if exists.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "gestor" | "sdr";
interface SeedUser { email: string; nome: string; role: Role; }

const SEED_USERS: SeedUser[] = [
  { email: "rafaelspinelli@neuroanalytics.com.br", nome: "Rafael Spinelli", role: "gestor" },
  { email: "caio@neuroanalytics.com.br", nome: "Caio", role: "sdr" },
  { email: "vinicius@neurochat.com.br", nome: "Vinicius", role: "sdr" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const password: string = body?.password ?? "Flow@2025";

    const results: Array<Record<string, unknown>> = [];
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });

    for (const u of SEED_USERS) {
      const found = existing.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
      let userId: string | undefined;
      let action: string;

      if (found) {
        userId = found.id;
        const { error: updErr } = await admin.auth.admin.updateUserById(found.id, {
          password,
          email_confirm: true,
          user_metadata: { ...found.user_metadata, nome: u.nome, role: u.role },
        });
        action = updErr ? `update_failed: ${updErr.message}` : "password_set";
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: u.email,
          password,
          email_confirm: true,
          user_metadata: { nome: u.nome, role: u.role },
        });
        if (createErr) {
          results.push({ email: u.email, error: createErr.message });
          continue;
        }
        userId = created.user?.id;
        action = "created";
      }

      if (userId) {
        await admin.from("profiles").upsert(
          { id: userId, nome: u.nome, email: u.email },
          { onConflict: "id" }
        );
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("user_roles").insert({ user_id: userId, role: u.role });
      }

      results.push({ email: u.email, role: u.role, action, user_id: userId });
    }

    return new Response(JSON.stringify({ ok: true, password, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
