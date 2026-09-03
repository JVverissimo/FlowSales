// Edge Function: leads — Receives external leads via POST and inserts them into the leads table.
// Auth: Authorization: Bearer <FLOWSALES_API_KEY>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  nome?: string;
  empresa?: string;
  atendente?: string;
  segmento?: string;
  cargo?: string;
  telefone?: string;
  faturamento?: string;
  fonte?: string;
  data_entrada?: string;
  cadencia?: string;
  status?: string;
  origem_importacao?: string;
  anotacoes?: string;
  observacoes?: string;
  notes?: string;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // --- Auth ---
  const apiKey = Deno.env.get("FLOWSALES_API_KEY");
  if (!apiKey) return json(500, { error: "FLOWSALES_API_KEY not configured" });
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7).trim() !== apiKey) {
    return json(401, { error: "Unauthorized" });
  }

  // --- Parse payload ---
  let body: Payload;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const nome = (body.nome ?? "").trim();
  if (!nome) return json(400, { error: "Campo 'nome' é obrigatório" });

  const empresa = (body.empresa ?? "").trim();
  const phoneClean = body.telefone ? String(body.telefone).replace(/\D/g, "") : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Duplicate check removido — sempre permite novo cadastro

  // --- Resolve atendente -> owner_id ---
  let ownerId: string | null = null;
  if (body.atendente && body.atendente.trim()) {
    const { data } = await supabase
      .from("profiles").select("id").ilike("nome", body.atendente.trim()).limit(1).maybeSingle();
    if (data) ownerId = data.id;
  }

  // --- Resolve cadência -> cadence_id ---
  let cadenceId: string | null = null;
  if (body.cadencia && body.cadencia.trim()) {
    const { data } = await supabase
      .from("cadences").select("id").ilike("name", body.cadencia.trim()).limit(1).maybeSingle();
    if (data) cadenceId = data.id;
  }

  // --- Resolve data_entrada usando horário comercial (sempre aplica a regra) ---
  const dataEntrada = await resolveEntryDateFromBusinessHours(supabase);


  const insertRow = {
    name: nome,
    company: empresa,
    phone: phoneClean,
    role: body.cargo ?? null,
    fonte: body.fonte ?? null,
    segmento: body.segmento ?? null,
    faturamento: body.faturamento ?? null,
    data_entrada: dataEntrada,
    origem_importacao: body.origem_importacao ?? "API",
    notes: (body.anotacoes ?? body.observacoes ?? body.notes ?? null) || null,
    status: (body.status ?? "active").toLowerCase() === "ativo" ? "active" : (body.status ?? "active"),
    owner_id: ownerId,
    cadence_id: cadenceId,
  };

  const { data, error } = await supabase.from("leads").insert(insertRow).select("id").single();
  if (error) {
    console.error("insert lead", error);
    return json(500, { error: error.message });
  }

  return json(201, { sucesso: true, lead_id: data.id });
});

// deno-lint-ignore no-explicit-any
async function resolveEntryDateFromBusinessHours(supabase: any): Promise<string> {
  const DEFAULT = { start: "09:00", end: "18:00", workdays: [1, 2, 3, 4, 5] };
  let start = DEFAULT.start, end = DEFAULT.end, workdays: number[] = DEFAULT.workdays;
  try {
    const { data } = await supabase
      .from("business_hours")
      .select("start_time,end_time,workdays")
      .limit(1)
      .maybeSingle();
    if (data) {
      start = String(data.start_time).slice(0, 5);
      end = String(data.end_time).slice(0, 5);
      workdays = (data.workdays as number[]) ?? DEFAULT.workdays;
    }
  } catch (_) { /* fallback to default */ }

  // Use America/Sao_Paulo timezone
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  });
  const parts = fmt.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value; return acc;
  }, {});
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let dow = dowMap[parts.weekday] ?? now.getDay();
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const cur = hour * 60 + minute;
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;

  let y = Number(parts.year), mo = Number(parts.month), da = Number(parts.day);

  const isWorkday = workdays.includes(dow);
  if (isWorkday && (cur < endM)) {
    // within hours or before start → today
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  // advance to next workday
  do {
    const d = new Date(Date.UTC(y, mo - 1, da));
    d.setUTCDate(d.getUTCDate() + 1);
    y = d.getUTCFullYear(); mo = d.getUTCMonth() + 1; da = d.getUTCDate();
    dow = (dow + 1) % 7;
  } while (!workdays.includes(dow));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(da)}`;
}
