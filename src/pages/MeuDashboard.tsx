import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Pencil, TrendingUp, TrendingDown, HelpCircle, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { useCadences } from "@/lib/cadences-store";
import { useLeads } from "@/lib/leads-store";
import { useCompletions } from "@/lib/completions-store";
import { useAppointments } from "@/lib/appointments-store";
import { useGoals } from "@/lib/goals";
import { useAuth } from "@/lib/auth-context";

import { EditGoalsDialog } from "@/components/EditGoalsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

function formatRange(range: DateRange | undefined) {
  if (!range?.from) return "Selecionar período";
  if (!range.to) return format(range.from, "dd/MM/yyyy", { locale: ptBR });
  return `${format(range.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`;
}

export default function MeuDashboard() {
  const { user, profile, isGestor } = useAuth();
  const { cadences } = useCadences();
  const { leads } = useLeads();
  const { completions } = useCompletions();
  const { appointments } = useAppointments();
  const { goals } = useGoals();

  const [range, setRange] = useState<DateRange | undefined>({ from: firstOfMonth, to: lastOfMonth });
  const [cadenceFilter, setCadenceFilter] = useState<string[]>([]);
  const cadIn = (id?: string | null) => cadenceFilter.length === 0 || (!!id && cadenceFilter.includes(id));
  const toggleCadence = (id: string) =>
    setCadenceFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const userId = user?.id;
  const fromDate = range?.from ?? firstOfMonth;
  const toDate = range?.to ?? lastOfMonth;

  // Gestor sees all data; SDR only their own
  const myLeads = useMemo(
    () => leads.filter(l => (isGestor || l.ownerId === userId) && cadIn(l.cadenceId)),
    [leads, userId, cadenceFilter, isGestor]
  );


  // completions store already returns only the current user's rows (RLS-scoped)
  const myCompletions = useMemo(() => completions.filter(c => {
    if (c.status !== "done") return false;
    const t = new Date(c.completedAt).getTime();
    if (t < fromDate.getTime() || t > toDate.getTime() + 86400000) return false;
    if (!cadIn(c.cadenceId)) return false;
    return true;
  }), [completions, fromDate, toDate, cadenceFilter]);

  // Opportunities (for this user) = active or won leads in period
  const oppLeads = useMemo(
    () => myLeads.filter(l => l.status === "active" || l.status === "won"),
    [myLeads]
  );
  const opportunitiesNow = oppLeads.length;

  // Aggregate goal (sum of cadence opp goals; or selected cadence)
  const opportunitiesGoal = useMemo(() => {
    if (cadenceFilter.length > 0)
      return cadenceFilter.reduce((acc, id) => acc + (goals.cadences[id]?.opportunities ?? 0), 0);
    return Object.values(goals.cadences).reduce((acc, g) => acc + (g.opportunities || 0), 0);
  }, [goals, cadenceFilter]);

  // Daily progress series for the period
  const series = useMemo(() => {
    const days: { day: string; real: number; meta: number }[] = [];
    const totalDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
    // cumulative count of opps "created" by completion timestamps as proxy
    const dateOf = (l: typeof oppLeads[number]) => new Date(l.dataEntrada ?? Date.now()).getTime();
    const sortedOpps = [...oppLeads].sort((a, b) => dateOf(a) - dateOf(b));
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() + i);
      const upTo = d.getTime() + 86400000;
      const real = sortedOpps.filter(l => dateOf(l) <= upTo).length;
      const meta = Math.round(((i + 1) / totalDays) * opportunitiesGoal);
      days.push({ day: format(d, "dd/MM"), real, meta });
    }
    return days;
  }, [oppLeads, fromDate, toDate, opportunitiesGoal]);

  // % vs expected (linear pacing)
  const daysElapsed = Math.max(1, Math.round((Math.min(today.getTime(), toDate.getTime()) - fromDate.getTime()) / 86400000) + 1);
  const totalRangeDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
  const expectedNow = opportunitiesGoal > 0 ? Math.round((daysElapsed / totalRangeDays) * opportunitiesGoal) : 0;
  const delta = expectedNow > 0 ? Math.round(((opportunitiesNow - expectedNow) / expectedNow) * 100) : 0;
  const aboveExpected = delta >= 0;

  const periodLabel = format(fromDate, "MMMM", { locale: ptBR });
  const displayName = (profile?.nome ?? "Usuário").split(" ")[0];

  // Stats cards
  const totalActivities = myCompletions.length;
  const finishedLeads = myLeads.filter(l => l.status === "won" || l.status === "lost").length;
  const wonLeads = myLeads.filter(l => l.status === "won").length;
  const conversionRate = finishedLeads > 0 ? Math.round((wonLeads / finishedLeads) * 100) : 0;

  // Appointments in period (respect gestor/SDR scope + cadence filter)
  const inPeriod = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= fromDate.getTime() && t <= toDate.getTime() + 86400000;
  };
  const scopedAppts = useMemo(() => appointments.filter(a => {
    if (!isGestor && a.sdrId !== userId) return false;
    if (!cadIn(a.cadenceId)) return false;
    return true;
  }), [appointments, isGestor, userId, cadenceFilter]);
  const reunioesAgendadas = scopedAppts.filter(a => inPeriod(a.scheduledAt)).length;
  const reunioesComparecidas = scopedAppts.filter(a => a.status === "attended" && inPeriod(a.scheduledAt)).length;
  const reunioesRealizadas = scopedAppts.filter(a => a.closed && inPeriod(a.closedAt ?? a.scheduledAt)).length;


  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Olá, {displayName} 👋</h1>
          <p className="text-sm text-muted-foreground">Sua visão geral de performance no período.</p>
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
              <CalendarComponent mode="range" selected={range} onSelect={setRange} numberOfMonths={2} locale={ptBR} initialFocus />
              <div className="flex justify-end gap-2 p-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setRange({ from: firstOfMonth, to: lastOfMonth })}>Este mês</Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  const start = new Date(today); start.setDate(today.getDate() - 6);
                  setRange({ from: start, to: today });
                }}>Últimos 7 dias</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 min-w-[200px] justify-between">
                <span className="truncate">
                  {cadenceFilter.length === 0
                    ? "Todas as cadências"
                    : cadenceFilter.length === 1
                      ? (cadences.find(c => c.id === cadenceFilter[0])?.name ?? "1 cadência")
                      : `${cadenceFilter.length} cadências`}
                </span>
                <BarChart3 className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-2" align="end">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Selecione as cadências</span>
                <Button variant="ghost" size="sm" onClick={() => setCadenceFilter([])}>Limpar</Button>
              </div>
              <div className="max-h-[280px] overflow-y-auto py-1">
                {cadences.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm">
                    <Checkbox checked={cadenceFilter.includes(c.id)} onCheckedChange={() => toggleCadence(c.id)} />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
              <div className="pt-1 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setCadenceFilter(cadences.map(c => c.id))}>
                  Selecionar todas
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {isGestor && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setGoalsOpen(true)}>
              <Pencil className="h-4 w-4" />Editar metas
            </Button>
          )}
        </div>
      </div>

      <EditGoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} />

      {/* Big card — Visão Geral */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Visão geral</h2>
        </div>
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <div>
            <p className="text-sm font-medium text-muted-foreground capitalize inline-flex items-center gap-1">
              Oportunidades em {periodLabel}
              <HelpCircle className="h-3.5 w-3.5 opacity-60" />
            </p>
            <div className="mt-3">
              <span className="text-7xl font-bold tracking-tight leading-none">{opportunitiesNow}</span>
            </div>

            {opportunitiesGoal > 0 ? (
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Meta de oportunidades</p>
                    <p className="font-medium">
                      Oportunidades em <span className="capitalize">{periodLabel}</span>: <span className="font-bold text-primary">{opportunitiesGoal}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm">
                    <p>
                      <span className={`font-bold ${aboveExpected ? "text-primary" : "text-destructive"} inline-flex items-center gap-1`}>
                        {aboveExpected ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {Math.abs(delta)}%
                      </span>{" "}
                      <span className="text-muted-foreground">{aboveExpected ? "acima" : "abaixo"} do previsto até hoje ({expectedNow})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">para alcançar a meta mensal</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                Nenhuma meta definida ainda.
                {isGestor && (
                  <button onClick={() => setGoalsOpen(true)} className="ml-1 text-primary hover:underline font-medium">
                    Definir meta →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="myRealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="transparent" strokeWidth={2} name="Meta" />
                <Area type="monotone" dataKey="real" stroke="hsl(var(--primary))" fill="url(#myRealGrad)" strokeWidth={2.5} name="Oportunidades" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Atividades realizadas</p>
          <p className="text-3xl font-bold mt-2">{totalActivities}</p>
          <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
        </Card>
        <Card className="p-5 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Leads finalizados</p>
          <p className="text-3xl font-bold mt-2">{finishedLeads}</p>
          <p className="text-xs text-muted-foreground mt-1">{wonLeads} ganhos · {finishedLeads - wonLeads} perdidos</p>
        </Card>
        <Card className="p-5 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Taxa de conversão</p>
          <p className="text-3xl font-bold mt-2 text-primary">{conversionRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">ganhos / finalizados</p>
        </Card>
      </div>

      {/* Reuniões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Reuniões agendadas</p>
          <p className="text-3xl font-bold mt-2">{reunioesAgendadas}</p>
          <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
        </Card>
        <Card className="p-5 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Reuniões comparecidas</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{reunioesComparecidas}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {reunioesAgendadas > 0 ? Math.round((reunioesComparecidas / reunioesAgendadas) * 100) : 0}% das agendadas
          </p>
        </Card>
        <Card className="p-5 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Reuniões realizadas</p>
          <p className="text-3xl font-bold mt-2 text-primary">{reunioesRealizadas}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {reunioesComparecidas > 0 ? Math.round((reunioesRealizadas / reunioesComparecidas) * 100) : 0}% das comparecidas
          </p>
        </Card>
      </div>

    </div>
  );
}
