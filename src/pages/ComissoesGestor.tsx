import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppointments, type Appointment } from "@/lib/appointments-store";
import { useLeads } from "@/lib/leads-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, DollarSign, TrendingUp,
  HandshakeIcon, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { addMonths, endOfMonth, format, isSameDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  BONUS_THRESHOLD, channelGroupOf, channelLabel, companyColor, companyLabel,
  type ChannelCommissionConfig, type ChannelGroup, COMPANIES, CHANNEL_GROUPS,
} from "@/lib/comissoes";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = { scheduled: "Pendente", attended: "Compareceu", no_show: "Não compareceu" };
const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  attended: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  no_show: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

type SdrInfo = { id: string; nome: string; companies: string[] };

const fmtMoney = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ComissoesGestor() {
  const { appointments, loading, confirmOutcome, markClosed } = useAppointments();
  const { leads } = useLeads();
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [configs, setConfigs] = useState<ChannelCommissionConfig[]>([]);
  const [sdrs, setSdrs] = useState<SdrInfo[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [overrideValues, setOverrideValues] = useState<Record<string, { meeting?: string; closing?: string }>>({});

  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { data: roles }, { data: profs }, { data: comps }] = await Promise.all([
        supabase.from("channel_commission_configs").select("*"),
        supabase.from("user_roles").select("user_id, role").eq("role", "sdr"),
        supabase.from("profiles").select("id, nome"),
        supabase.from("sdr_companies").select("sdr_id, company"),
      ]);
      setConfigs((cfg ?? []) as ChannelCommissionConfig[]);
      const sdrIds = new Set((roles ?? []).map((r: any) => r.user_id));
      const compMap = new Map<string, string[]>();
      for (const c of comps ?? []) {
        const arr = compMap.get((c as any).sdr_id) ?? [];
        arr.push((c as any).company);
        compMap.set((c as any).sdr_id, arr);
      }
      const list: SdrInfo[] = (profs ?? [])
        .filter((p: any) => sdrIds.has(p.id))
        
        .map((p: any) => ({ id: p.id, nome: p.nome, companies: compMap.get(p.id) ?? [] }));
      setSdrs(list);
    })();
  }, []);

  const leadById = useMemo(() => new Map(leads.map(l => [l.id, l])), [leads]);
  const monthStart = monthCursor;
  const monthEnd = useMemo(() => endOfMonth(monthCursor), [monthCursor]);

  const monthAppts = useMemo(() => {
    const from = monthStart.getTime();
    const to = monthEnd.getTime();
    return appointments.filter(a => {
      const t = new Date(a.scheduledAt).getTime();
      return t >= from && t <= to;
    });
  }, [appointments, monthStart, monthEnd]);

  const cfgOf = (channel: string | null, company: string | null) =>
    channel && company ? configs.find(c => c.channel === channel && c.company === company) : undefined;

  const computeFor = (list: Appointment[]) => {
    let meetingTotal = 0, closingTotal = 0, bonusTotal = 0;
    let meetingCount = 0, closingCount = 0, attendedCount = 0;
    const counts: Record<ChannelGroup, number> = { inbound: 0, prospeccao_ativa: 0, networking: 0, outbound: 0 };
    const bonusVal: Record<ChannelGroup, number> = { inbound: 0, prospeccao_ativa: 0, networking: 0, outbound: 0 };
    for (const a of list) {
      meetingCount++;
      const cfg = cfgOf(a.channel, a.company);
      if (a.confirmed && a.status === "attended") {
        attendedCount++;
        meetingTotal += Number(cfg?.meeting_value || 0);
      }
      if (a.closed) {
        closingCount++;
        closingTotal += Number(cfg?.closing_value || 0);
        const g = a.channel ? channelGroupOf(a.channel) : null;
        if (g) { counts[g] += 1; bonusVal[g] = Math.max(bonusVal[g], Number(cfg?.bonus_value || 0)); }
      }
    }
    for (const g of Object.keys(counts) as ChannelGroup[]) {
      bonusTotal += Math.floor(counts[g] / BONUS_THRESHOLD) * bonusVal[g];
    }
    return { meetingTotal, closingTotal, bonusTotal, meetingCount, attendedCount, closingCount,
      total: meetingTotal + closingTotal + bonusTotal };
  };

  const totals = useMemo(() => computeFor(monthAppts), [monthAppts, configs]);

  const perSdr = useMemo(() => {
    return sdrs.map(s => {
      const list = monthAppts.filter(a => a.sdrId === s.id);
      return { sdr: s, stats: computeFor(list) };
    });
  }, [sdrs, monthAppts, configs]);

  const daysWithMeetings = useMemo(() => monthAppts.map(m => new Date(m.scheduledAt)), [monthAppts]);
  const meetingsOfDay = useMemo(
    () => monthAppts.filter(m => isSameDay(new Date(m.scheduledAt), selectedDay)),
    [monthAppts, selectedDay]
  );

  const pending = useMemo(
    () => monthAppts.filter(a => !a.confirmed).sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [monthAppts]
  );

  const sdrNameOf = (id: string) => sdrs.find(s => s.id === id)?.nome ?? "—";

  const confirmAs = async (a: Appointment, status: "attended" | "no_show") => {
    try {
      const ov = overrideValues[a.id];
      // Save commission overrides if provided (updates config for channel/company)
      if (status === "attended" && ov?.meeting && a.channel && a.company) {
        const val = Number(ov.meeting.replace(",", "."));
        if (!isNaN(val)) {
          const existing = configs.find(c => c.channel === a.channel && c.company === a.company);
          if (existing) {
            await supabase.from("channel_commission_configs").update({ meeting_value: val }).eq("id", existing.id);
          } else {
            await supabase.from("channel_commission_configs").insert({
              channel: a.channel, company: a.company, meeting_value: val,
            });
          }
          const { data: cfg } = await supabase.from("channel_commission_configs").select("*");
          setConfigs((cfg ?? []) as ChannelCommissionConfig[]);
        }
      }

      await confirmOutcome(a.id, status);
      toast.success(status === "attended" ? "Confirmado: compareceu" : "Confirmado: não compareceu");
    } catch (e) { toast.error("Erro ao confirmar"); console.error(e); }
  };

  const setOverride = (id: string, key: "meeting" | "closing", v: string) =>
    setOverrideValues(prev => ({ ...prev, [id]: { ...prev[id], [key]: v } }));

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => setMonthCursor(addMonths(monthCursor, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMonthCursor(startOfMonth(new Date()))}>Mês Atual</Button>
          <div className="px-3 text-sm font-medium capitalize min-w-[140px] text-center">
            {format(monthCursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total de Reuniões</span><CalIcon className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold mt-1">{totals.meetingCount}</div>
          <div className="text-xs text-muted-foreground mt-1">{totals.attendedCount} realizadas</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total de Fechamentos</span><HandshakeIcon className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold mt-1">{totals.closingCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Contratos fechados</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Comissões Reuniões</span><TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold mt-1">{fmtMoney(totals.meetingTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">Por reuniões realizadas</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Comissões Fechamentos</span><DollarSign className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold mt-1">{fmtMoney(totals.closingTotal + totals.bonusTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">Por contratos fechados</div>
        </Card>
      </div>

      {/* Per-SDR cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {perSdr.length === 0 && (
          <Card className="p-6 col-span-full text-sm text-muted-foreground text-center">Nenhum SDR cadastrado ainda.</Card>
        )}
        {perSdr.map(({ sdr, stats }) => (
          <Card key={sdr.id} className="p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="font-semibold flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-xs font-bold">
                  {sdr.nome.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                {sdr.nome}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {sdr.companies.length === 0 ? "—" : sdr.companies.map(companyLabel).join(", ")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Reuniões</div>
                <div className="font-semibold">{stats.attendedCount}/{stats.meetingCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fechamentos</div>
                <div className="font-semibold">{stats.closingCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Comissão Reunião</div>
                <div className="font-semibold text-emerald-600">{fmtMoney(stats.meetingTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Comissão Fechamento</div>
                <div className="font-semibold text-emerald-600">{fmtMoney(stats.closingTotal + stats.bonusTotal)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t mt-4 pt-3">
              <span className="text-sm font-medium">Total a Pagar</span>
              <span className="text-lg font-bold text-orange-500">{fmtMoney(stats.total)}</span>
            </div>
          </Card>
        ))}
      </div>

      <ValoresPorCanal configs={configs} onSaved={async () => {
        const { data } = await supabase.from("channel_commission_configs").select("*");
        setConfigs((data ?? []) as ChannelCommissionConfig[]);
      }} />
    </div>
  );
}

type EditKey = string; // `${company}::${channel}`
type EditVal = { meeting: string; closing: string; threshold: string; bonus: string };

function ValoresPorCanal({ configs, onSaved }: { configs: ChannelCommissionConfig[]; onSaved: () => Promise<void> | void }) {
  const keyOf = (company: string, channel: string): EditKey => `${company}::${channel}`;
  const [edits, setEdits] = useState<Record<EditKey, EditVal>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<EditKey, EditVal> = {};
    for (const co of COMPANIES) {
      for (const g of CHANNEL_GROUPS) {
        for (const ch of g.channels) {
          const cfg = configs.find(c => c.company === co.value && c.channel === ch.value);
          next[keyOf(co.value, ch.value)] = {
            meeting: cfg ? String(cfg.meeting_value) : "",
            closing: cfg ? String(cfg.closing_value) : "",
            threshold: cfg ? String(cfg.bonus_threshold) : "7",
            bonus: cfg ? String(cfg.bonus_value) : "",
          };
        }
      }
    }
    setEdits(next);
  }, [configs]);

  const setField = (k: EditKey, field: keyof EditVal, v: string) =>
    setEdits(prev => ({ ...prev, [k]: { ...prev[k], [field]: v } }));

  const saveCompany = async (company: string) => {
    setSaving(company);
    try {
      const rows = CHANNEL_GROUPS.flatMap(g => g.channels).map(ch => {
        const k = keyOf(company, ch.value);
        const e = edits[k];
        const meeting = Number((e?.meeting || "0").replace(",", "."));
        const closing = Number((e?.closing || "0").replace(",", "."));
        const threshold = parseInt(e?.threshold || "7", 10) || 7;
        const bonus = Number((e?.bonus || "0").replace(",", "."));
        return { company, channel: ch.value, meeting_value: meeting, closing_value: closing, bonus_threshold: threshold, bonus_value: bonus };
      });
      for (const r of rows) {
        const existing = configs.find(c => c.company === r.company && c.channel === r.channel);
        if (existing) {
          await supabase.from("channel_commission_configs").update(r).eq("id", existing.id);
        } else {
          await supabase.from("channel_commission_configs").insert(r);
        }
      }
      await onSaved();
      toast.success(`Valores salvos para ${companyLabel(company)}`);
    } catch (e) { console.error(e); toast.error("Erro ao salvar"); }
    finally { setSaving(null); }
  };

  return (
    <>
      {COMPANIES.map(co => (
        <Card key={co.value} className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold inline-flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Valores por Canal - {co.label}</h3>
              <p className="text-xs text-muted-foreground">Defina os valores de comissão para cada canal de aquisição</p>
            </div>
            <Button size="sm" onClick={() => saveCompany(co.value)} disabled={saving === co.value}>
              {saving === co.value ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
          <div className="space-y-3">
            {CHANNEL_GROUPS.flatMap(g => g.channels).map(ch => {
              const k = keyOf(co.value, ch.value);
              const e = edits[k] ?? { meeting: "", closing: "", threshold: "7", bonus: "" };
              return (
                <div key={ch.value} className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr_1fr_1fr] gap-3 items-center rounded-lg border bg-muted/30 px-3 py-2">
                  <Badge variant="outline" className="justify-center py-1">{ch.label}</Badge>
                  <Field label="Reunião" prefix="R$" value={e.meeting} onChange={v => setField(k, "meeting", v)} />
                  <Field label="Fechamento" prefix="R$" value={e.closing} onChange={v => setField(k, "closing", v)} />
                  <Field label="Bônus a cada" value={e.threshold} onChange={v => setField(k, "threshold", v)} />
                  <Field label="Valor Bônus" prefix="R$" value={e.bonus} onChange={v => setField(k, "bonus", v)} />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </>
  );
}

function Field({ label, prefix, value, onChange }: { label: string; prefix?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="text"
          inputMode="decimal"
          className={cn("h-9", prefix && "pl-8")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
