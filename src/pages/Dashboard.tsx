import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  opportunitiesProgress,
  conversionByOrigin, responseTime,
} from "@/lib/mock-data";
import { useCadences } from "@/lib/cadences-store";
import { useSdrs } from "@/lib/sdrs-store";
import { useLeads } from "@/lib/leads-store";
import { useCompletions } from "@/lib/completions-store";
import { UserAvatar } from "@/components/Badges";
import { EditGoalsDialog } from "@/components/EditGoalsDialog";
import { useGoals } from "@/lib/goals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

function Delta({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (!isFinite(value) || isNaN(value)) return null;
  const positive = inverted ? value < 0 : value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-primary" : "text-destructive"}`}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? `+${value}` : value}% {positive ? "acima" : "abaixo"} do previsto
    </span>
  );
}

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

function formatRange(range: DateRange | undefined) {
  if (!range?.from) return "Selecionar período";
  if (!range.to) return format(range.from, "dd MMM yyyy", { locale: ptBR });
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const fromFmt = sameYear ? format(range.from, "dd MMM", { locale: ptBR }) : format(range.from, "dd MMM yyyy", { locale: ptBR });
  return `${fromFmt} — ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`;
}

export default function Dashboard() {
  const { goals } = useGoals();
  const { cadences } = useCadences();
  const { users: dbUsers } = useSdrs(true);
  const { leads } = useLeads();
  const { completions } = useCompletions();
  const [range, setRange] = useState<DateRange | undefined>({ from: firstOfMonth, to: lastOfMonth });
  const [cadenceFilter, setCadenceFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [goalsOpen, setGoalsOpen] = useState(false);

  // Aggregate goals based on cadence filter
  const aggregatedGoals = useMemo(() => {
    const list = cadenceFilter === "all"
      ? Object.values(goals.cadences)
      : goals.cadences[cadenceFilter] ? [goals.cadences[cadenceFilter]] : [];
    return list.reduce(
      (acc, g) => ({
        opportunities: acc.opportunities + (g.opportunities || 0),
        finishedLeads: acc.finishedLeads + (g.finishedLeads || 0),
        activities: acc.activities + (g.activities || 0),
      }),
      { opportunities: 0, finishedLeads: 0, activities: 0 }
    );
  }, [goals, cadenceFilter]);

  const opportunitiesGoal = aggregatedGoals.opportunities;
  const finishedGoal = aggregatedGoals.finishedLeads;
  const activitiesGoal = aggregatedGoals.activities;
  const conversionGoal = goals.globalConversionRate;

  // ---- Real data per SDR ----
  const fromDate = range?.from ?? firstOfMonth;
  const toDate = range?.to ?? lastOfMonth;
  const inRange = (iso: string) => {
    const d = new Date(iso).getTime();
    return d >= fromDate.getTime() && d <= toDate.getTime() + 24 * 60 * 60 * 1000;
  };

  const visibleUsers = useMemo(
    () => userFilter === "all" ? dbUsers : dbUsers.filter(u => u.id === userFilter),
    [dbUsers, userFilter]
  );

  const filteredLeads = useMemo(() => leads.filter(l =>
    (cadenceFilter === "all" || l.cadenceId === cadenceFilter)
  ), [leads, cadenceFilter]);

  const filteredCompletions = useMemo(() => completions.filter(c => {
    if (!inRange(c.completedAt)) return false;
    if (cadenceFilter !== "all" && c.cadenceId !== cadenceFilter) return false;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [completions, cadenceFilter, fromDate, toDate]);

  const sdrStats = useMemo(() => {
    return visibleUsers.map(u => {
      const userLeads = filteredLeads.filter(l => l.ownerId === u.id);
      const prospecting = userLeads.filter(l => l.status === "active").length;
      const finished = userLeads.filter(l => l.status === "won" || l.status === "lost").length;
      const won = userLeads.filter(l => l.status === "won").length;
      const userCompletions = filteredCompletions.filter(c => {
        const lead = leads.find(l => l.id === c.leadId);
        return lead && lead.ownerId === u.id && c.status === "done";
      });
      const total = userCompletions.length;
      // daily avg over the selected range (days count)
      const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
      const dailyAvg = Math.round(total / days);
      const opps = userLeads.filter(l => l.status === "active" || l.status === "won").length;
      const rate = finished > 0 ? Math.round((won / finished) * 100) : 0;
      const initials = u.nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
      return { id: u.id, name: u.nome, initials, prospecting, finished, total, dailyAvg, opps, rate };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleUsers, filteredLeads, filteredCompletions, leads, fromDate, toDate]);

  const totalFinished = sdrStats.reduce((a, s) => a + s.finished, 0);
  const totalActivities = sdrStats.reduce((a, s) => a + s.total, 0);
  const totalOpps = sdrStats.reduce((a, s) => a + s.opps, 0);
  const totalWon = sdrStats.reduce((a, s) => a + (s.opps > 0 && s.rate > 0 ? Math.round(s.opps * s.rate / 100) : 0), 0);
  const globalRate = totalOpps > 0 ? Math.round((totalWon / totalOpps) * 100) : 0;
  const avgFinished = sdrStats.length > 0 ? Math.round(totalFinished / sdrStats.length) : 0;
  const avgActivities = sdrStats.length > 0 ? Math.round(totalActivities / sdrStats.length) : 0;
  const avgOpps = sdrStats.length > 0 ? Math.round(totalOpps / sdrStats.length) : 0;

  // Motivos de perda calculados a partir dos leads perdidos (filtrados por cadência/usuário).
  const lossReasons = useMemo(() => {
    const visibleIds = new Set(visibleUsers.map(u => u.id));
    const lostLeads = filteredLeads.filter(l => l.status === "lost" && (userFilter === "all" || visibleIds.has(l.ownerId)));
    const total = lostLeads.length;
    if (total === 0) return [] as { reason: string; pct: number; count: number }[];
    const counts: Record<string, number> = {};
    lostLeads.forEach(l => {
      const r = (l.lossReason && l.lossReason.trim()) || "Sem motivo informado";
      counts[r] = (counts[r] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads, visibleUsers, userFilter]);

  const opportunitiesNow = totalOpps;
  const pct = opportunitiesGoal > 0 ? Math.round((opportunitiesNow / opportunitiesGoal) * 100) : 0;
  const expected = opportunitiesGoal > 0 ? Math.round(opportunitiesGoal * 0.72) : 0;
  const delta = expected > 0 ? Math.round(((opportunitiesNow - expected) / expected) * 100) : 0;

  const periodLabel = range?.from ? format(range.from, "MMMM", { locale: ptBR }) : "período";

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a performance do time em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {formatRange(range)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                locale={ptBR}
                initialFocus
              />
              <div className="flex justify-end gap-2 p-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setRange({ from: firstOfMonth, to: lastOfMonth })}>Este mês</Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  const start = new Date(today); start.setDate(today.getDate() - 6);
                  setRange({ from: start, to: today });
                }}>Últimos 7 dias</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={cadenceFilter} onValueChange={setCadenceFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cadências</SelectItem>
              {cadences.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos usuários</SelectItem>
              {dbUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-2" onClick={() => setGoalsOpen(true)}>
            <Pencil className="h-4 w-4" />Editar metas
          </Button>
        </div>
      </div>

      <EditGoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} />

      {/* Big oportunidades card */}
      <Card className="p-6 shadow-card">
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <div>
            <p className="text-sm font-medium text-muted-foreground capitalize">Oportunidades em {periodLabel}</p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-6xl font-bold tracking-tight">{opportunitiesNow}</span>
              <span className="text-lg text-muted-foreground">/ {opportunitiesGoal}</span>
            </div>
            <div className="mt-2">
              {opportunitiesGoal > 0 ? <Delta value={delta} /> : (
                <button onClick={() => setGoalsOpen(true)} className="text-xs text-primary hover:underline font-medium">
                  Defina uma meta para acompanhar →
                </button>
              )}
            </div>
            <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{pct}% da meta {cadenceFilter === "all" ? "agregada" : "da cadência"}</p>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={opportunitiesProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Area type="monotone" dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="transparent" strokeWidth={2} name="Meta" />
                <Area type="monotone" dataKey="real" stroke="hsl(var(--primary))" fill="url(#realGrad)" strokeWidth={2.5} name="Real" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Ranking */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Ranking</h2>
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Leads Finalizados */}
          <Card className="p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Leads Finalizados</h3>
              <span className="text-xs text-muted-foreground">Meta mês: {finishedGoal || "—"}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{totalFinished}</span>
              {finishedGoal > 0 && <Delta value={Math.round(((totalFinished - finishedGoal) / finishedGoal) * 100)} />}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_auto] text-[10px] uppercase tracking-wide text-muted-foreground gap-x-3 px-1">
              <span></span><span className="text-right">prospectando</span><span className="text-right">finalizados</span>
            </div>
            <div className="mt-1 space-y-2.5">
              {sdrStats.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
              {sdrStats.map(s => (
                <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                  <UserAvatar name={s.name} initials={s.initials} color="hsl(142 71% 45%)" size="sm" />
                  <span className="text-sm truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">{s.prospecting}</span>
                  <span className="text-sm font-semibold tabular-nums w-10 text-right">{s.finished}</span>
                </div>
              ))}
            </div>
            {sdrStats.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">média finalizados/vendedor</span>
                <span className="font-semibold text-primary tabular-nums">{avgFinished}</span>
              </div>
            )}
          </Card>

          {/* Atividades Realizadas */}
          <Card className="p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Atividades Realizadas</h3>
              <span className="text-xs text-muted-foreground">Meta mês: {activitiesGoal || "—"}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{totalActivities}</span>
              {activitiesGoal > 0 && <Delta value={Math.round(((totalActivities - activitiesGoal) / activitiesGoal) * 100)} />}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] text-[10px] uppercase tracking-wide text-muted-foreground gap-x-3 px-1">
              <span></span><span className="text-right">média diária</span>
            </div>
            <div className="mt-1 space-y-2.5">
              {sdrStats.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
              {sdrStats.map(s => (
                <div key={s.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <UserAvatar name={s.name} initials={s.initials} color="hsl(142 71% 45%)" size="sm" />
                  <span className="text-sm truncate">{s.name}</span>
                  <span className="text-sm font-semibold tabular-nums w-10 text-right">{s.total}</span>
                </div>
              ))}
            </div>
            {sdrStats.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">média atv. diárias/vendedor</span>
                <span className="font-semibold text-primary tabular-nums">{avgActivities}</span>
              </div>
            )}
          </Card>

          {/* Taxa de Conversão */}
          <Card className="p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Taxa de Conversão</h3>
              <span className="text-xs text-muted-foreground">Meta mês: {conversionGoal}%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{globalRate}%</span>
              {conversionGoal > 0 && <Delta value={globalRate - conversionGoal} />}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_auto] text-[10px] uppercase tracking-wide text-muted-foreground gap-x-3 px-1">
              <span></span><span className="text-right">opps</span><span className="text-right">taxa</span>
            </div>
            <div className="mt-1 space-y-2.5">
              {sdrStats.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
              {sdrStats.map(s => (
                <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                  <UserAvatar name={s.name} initials={s.initials} color="hsl(142 71% 45%)" size="sm" />
                  <span className="text-sm truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{s.opps}</span>
                  <span className="text-sm font-semibold text-primary tabular-nums w-12 text-right">{s.rate}%</span>
                </div>
              ))}
            </div>
            {sdrStats.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">média oportunidades/vendedor</span>
                <span className="font-semibold text-primary tabular-nums">{avgOpps}</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Insights */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Insights</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Motivos de Perda</h3>
            {lossReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem motivos de perda registrados.</p>
            ) : (
              <div className="space-y-3">
                {lossReasons.map((r) => (
                  <div key={r.reason} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">{r.reason}</span>
                      <span className="font-semibold tabular-nums">{r.count} · {r.pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Conversão por Origem</h3>
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Canais</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="organic">Orgânicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {conversionByOrigin.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de conversão por origem ainda.</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionByOrigin} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="origin" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="won" fill="hsl(var(--primary))" name="Ganhos" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="lost" fill="hsl(340 75% 55%)" name="Perdidos" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Tempo de Resposta */}
      <Card className="p-5 shadow-card">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Tempo de Resposta</h3>
          <div>
            <span className="text-2xl font-bold">{responseTime.length === 0 ? "—" : "0%"}</span>
            <span className="text-sm text-muted-foreground ml-2">de leads abordados em até 1 hora</span>
          </div>
        </div>
        {responseTime.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum lead abordado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">SDR</th>
                <th className="text-right font-medium py-2">Leads abordados</th>
                <th className="text-right font-medium py-2">Em até 1 hora</th>
                <th className="text-right font-medium py-2">% no SLA</th>
              </tr></thead>
              <tbody>
                {responseTime.map(r => (
                  <tr key={r.sdr.id} className="border-b border-border last:border-0">
                    <td className="py-2.5"><div className="flex items-center gap-2"><UserAvatar {...r.sdr} size="sm" />{r.sdr.name}</div></td>
                    <td className="py-2.5 text-right tabular-nums">{r.approached}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.withinHour}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-primary">{Math.round((r.withinHour / r.approached) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
