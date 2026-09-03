import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Phone, Settings, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Trophy, Mail, Search, Check, SkipForward, Filter } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "@/lib/auth-context";
import { useLeads } from "@/lib/leads-store";
import { useCadences } from "@/lib/cadences-store";
import { useGoals } from "@/lib/goals";
import { useCompletions, activityKey } from "@/lib/completions-store";
import { useAutoLossOnPhaseComplete } from "@/lib/auto-loss";
import { ActivityIcon, activityLabel } from "@/components/ActivityIcon";
import { UserAvatar } from "@/components/Badges";
import type { Activity, ActivityType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Interpreta datas "YYYY-MM-DD" (ou ISO com hora) sempre no fuso local, à meia-noite.
function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

type Row = {
  key: string;
  ageLabel: string;
  ageTone: "danger" | "warning" | "muted";
  activity: Activity;
  cadenceName: string;
  cadenceId: string | null;
  phaseIndex: number;
  phaseLabel: string;
  step: number;
  stepInDay: number;
  dayNumber: number;
  activityIndex: number;
  shift: "immediate" | "morning" | "afternoon" | "evening" | "any";
  leadId: string;
  leadName: string;
  leadCompany: string;
};

const SHIFT_META: Record<"immediate" | "morning" | "afternoon" | "evening" | "any", { label: string; emoji: string; classes: string }> = {
  immediate: { label: "Imediato", emoji: "⚡", classes: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30" },
  morning:   { label: "Manhã",  emoji: "🌅", classes: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30" },
  afternoon: { label: "Tarde",  emoji: "☀️", classes: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30" },
  evening:   { label: "Noite",  emoji: "🌙", classes: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30" },
  any:       { label: "Qualquer", emoji: "🕒", classes: "bg-muted text-muted-foreground border-border" },
};


const iconForActivity = (t: ActivityType) => {
  switch (t) {
    case "call": return Phone;
    case "email": return Mail;
    case "social": return FaWhatsapp;
    case "research": return Search;
    default: return Phone;
  }
};

type FilterCol = "data" | "cadencia" | "fase" | "passo" | "atividade" | "lead";

function ColumnFilter({ label, col, options, selected, onToggle, onClear }: {
  label: string; col: FilterCol; options: string[]; selected: string[];
  onToggle: (c: FilterCol, v: string) => void; onClear: (c: FilterCol) => void;
}) {
  const [search, setSearch] = useState("");
  const active = selected.length > 0;
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-primary")}>
          {label}
          <Filter className={cn("h-3 w-3", active ? "fill-primary" : "opacity-60")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar valores..."
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background mb-2"
        />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">Sem valores</p>}
          {filtered.map(o => (
            <label key={o} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(col, o)} />
              <span className="truncate flex-1">{o || "—"}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
          <button onClick={() => onClear(col)} className="text-xs text-muted-foreground hover:text-foreground">Limpar</button>
          <span className="text-[10px] text-muted-foreground">{selected.length > 0 ? `${selected.length} selecionado(s)` : "Mostrar tudo"}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function SdrAtividades() {
  const { user, profile } = useAuth();
  const { leads, update: updateLead } = useLeads();
  const { cadences } = useCadences();
  const { goals } = useGoals();
  const { completions, add: addCompletion } = useCompletions();

  const quickComplete = async (r: Row, status: "done" | "skipped") => {
    try {
      await addCompletion({
        leadId: r.leadId,
        cadenceId: r.cadenceId,
        phaseIndex: r.phaseIndex,
        dayNumber: r.dayNumber,
        activityIndex: r.activityIndex,
        activityType: r.activity.type,
        activityName: r.activity.name,
        status,
      });
      toast.success(status === "done" ? "Atividade concluída" : "Atividade ignorada");
    } catch {
      toast.error("Erro ao registrar atividade");
    }
  };

  const [fastMode, setFastMode] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ pending: true });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dayOffset, setDayOffset] = useState(0);
  const [shiftFilter, setShiftFilter] = useState<"all" | "immediate" | "morning" | "afternoon" | "evening">("all");
  const [filters, setFilters] = useState<{ data: string[]; cadencia: string[]; fase: string[]; passo: string[]; atividade: string[]; lead: string[] }>({ data: [], cadencia: [], fase: [], passo: [], atividade: [], lead: [] });



  const myLeads = useMemo(
    () => leads.filter(l => l.ownerId === user?.id && l.status === "active"),
    [leads, user?.id]
  );

  const completedKeys = useMemo(
    () => new Set(completions.map(c => activityKey(c))),
    [completions]
  );

  // Concluiu todos os passos da fase -> lead vira perda (não avança de fase)
  useAutoLossOnPhaseComplete(myLeads, cadences, completedKeys, updateLead);



  // Build all pending activities (filtered out completed)
  const rows = useMemo<Row[]>(() => {
    const weekdayNames = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
    // Add `offset` business days (Mon–Fri) to today, skipping weekends.
    const businessDateFor = (offset: number) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      // If today is Sat/Sun, anchor to next Monday for offset 0
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      let remaining = offset;
      while (remaining > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
      }
      return d;
    };
    const labelForDay = (offset: number) => {
      if (offset <= 0) return "HOJE";
      const d = businessDateFor(offset);
      const name = weekdayNames[d.getDay()];
      return offset === 1 ? `AMANHÃ (${name})` : offset < 5 ? name : `${name} (${offset}D)`;
    };
    // Business days between two dates (Mon-Fri), inclusive of start day counted as 1.
    const businessDaysBetween = (fromISO: string | null | undefined, target: Date): number => {
      if (!fromISO) return 1;
      const from = parseLocalDate(fromISO);
      if (!from) return 0;

      const t = new Date(target);
      t.setHours(0, 0, 0, 0);
      if (from > t) return 0; // lead not started yet by target date
      let count = 0;
      const d = new Date(from);
      while (d <= t) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return Math.max(count, 1);
    };

    const targetDate = businessDateFor(dayOffset);
    const todayDate = businessDateFor(0);
    const isTodayView = dayOffset === 0;

    const out: Row[] = [];
    myLeads.forEach(lead => {
      const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
      // Resolve effective cadence by lead phase
      let cad = base;
      let phaseLabel = "—";
      let phaseIndex = lead.phaseIndex ?? 0;
      if (base && base.phases && base.phases.length > 0) {
        const pIdx = Math.min(lead.phaseIndex ?? 0, base.phases.length - 1);
        phaseIndex = pIdx;
        const phase = base.phases[pIdx];
        const phaseCad = cadences.find(c => c.id === phase.cadenceId) ?? null;
        // Fase sem cadência vinculada -> usa os dias da própria cadência mãe
        cad = phaseCad ?? base;
        phaseLabel = `Fase ${pIdx + 1}/${base.phases.length}${phase.name ? ` · ${phase.name}` : ""}`;
      }
      const hasSteps = cad && cad.days.some(d => d.activities.length > 0);
      const currentDay = businessDaysBetween(lead.dataEntrada, targetDate);
      if (currentDay <= 0) return; // lead entered after target date
      if (cad && hasSteps) {
        const sortedDays = [...cad.days].sort((a, b) => a.day - b.day);
        let stepCounter = 0;
        const completionCadenceId = base?.id ?? cad.id;
        sortedDays.forEach(day => {
          day.activities.forEach((a, idx) => {
            stepCounter++;
            const k = activityKey({ leadId: lead.id, cadenceId: completionCadenceId, phaseIndex, dayNumber: day.day, activityIndex: idx });
            if (completedKeys.has(k)) return;
            const overdue = isTodayView && day.day < currentDay;
            if (day.day !== currentDay && !overdue) return;
            const label = overdue
              ? `ATRASADO (${currentDay - day.day}d)`
              : isTodayView
                ? "HOJE"
                : (dayOffset === 1 ? "AMANHÃ" : labelForDay(dayOffset));
            out.push({
              key: `${lead.id}-${cad.id}-${day.day}-${idx}`,
              ageLabel: label,
              ageTone: overdue ? "danger" : isTodayView ? "warning" : "muted",


              activity: a,
              cadenceName: base?.name ?? cad.name,
              cadenceId: completionCadenceId,
              phaseIndex,
              phaseLabel,
              step: stepCounter,
              stepInDay: idx + 1,
              dayNumber: day.day,
              activityIndex: idx,
              shift: a.shift ?? "any",
              leadId: lead.id,
              leadName: lead.name,
              leadCompany: lead.company,
            });
          });
        });
      } else if (isTodayView) {
        const defaultCadenceId = base?.id ?? null;
        const k = activityKey({ leadId: lead.id, cadenceId: defaultCadenceId, phaseIndex, dayNumber: 1, activityIndex: 0 });
        if (completedKeys.has(k)) return;
        out.push({
          key: `${lead.id}-default`,
          ageLabel: "HOJE",
          ageTone: "warning",
          activity: { id: `${lead.id}-default-act`, type: "call", name: "Primeira ligação" },
          cadenceName: base?.name ?? "Sem cadência",
          cadenceId: defaultCadenceId,
          phaseIndex,
          phaseLabel,
          step: 1,
          stepInDay: 1,
          dayNumber: 1,
          activityIndex: 0,
          shift: "any",
          leadId: lead.id,
          leadName: lead.name,
          leadCompany: lead.company,
        });
      }
    });
    return out;
  }, [myLeads, cadences, completedKeys, dayOffset]);


  const rowValues = (r: Row) => ({
    data: r.ageLabel,
    cadencia: r.cadenceName,
    fase: r.phaseLabel,
    passo: `Passo ${r.step}`,
    atividade: r.activity.name,
    lead: r.leadName,
  });

  const uniqueValues = useMemo(() => {
    const sets = { data: new Set<string>(), cadencia: new Set<string>(), fase: new Set<string>(), passo: new Set<string>(), atividade: new Set<string>(), lead: new Set<string>() };
    rows.forEach(r => {
      const v = rowValues(r);
      sets.data.add(v.data); sets.cadencia.add(v.cadencia); sets.fase.add(v.fase);
      sets.passo.add(v.passo); sets.atividade.add(v.atividade); sets.lead.add(v.lead);
    });
    return {
      data: [...sets.data].sort(), cadencia: [...sets.cadencia].sort(),
      fase: [...sets.fase].sort(),
      passo: [...sets.passo].sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, ""))),
      atividade: [...sets.atividade].sort(), lead: [...sets.lead].sort(),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const m = (v: string, sel: string[]) => sel.length === 0 || sel.includes(v);
    return rows.filter(r => {
      if (shiftFilter !== "all" && r.shift !== shiftFilter) return false;
      const v = rowValues(r);
      return m(v.data, filters.data) && m(v.cadencia, filters.cadencia) &&
        m(v.fase, filters.fase) && m(v.passo, filters.passo) &&
        m(v.atividade, filters.atividade) && m(v.lead, filters.lead);
    });
  }, [rows, filters, shiftFilter]);


  const toggleFilter = (col: keyof typeof filters, val: string) => {
    setFilters(f => {
      const cur = f[col];
      return { ...f, [col]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };
  const clearFilter = (col: keyof typeof filters) => setFilters(f => ({ ...f, [col]: [] }));

  const totalLeads = myLeads.length;

  // Progresso do dia = somente atividades programadas para o dia atual,
  // somando pendentes e as mesmas atividades concluídas hoje.
  const { plannedToday, doneToday } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const anchor = new Date(today);
    while (anchor.getDay() === 0 || anchor.getDay() === 6) anchor.setDate(anchor.getDate() + 1);

    const businessDaysBetween = (fromISO: string | null | undefined, target: Date) => {
      if (!fromISO) return 1;
      const from = parseLocalDate(fromISO);
      if (!from) return 0;
      if (from > target) return 0;

      let count = 0;
      const d = new Date(from);
      while (d <= target) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return Math.max(count, 1);
    };

    const todayCompletedKeys = new Set(
      completions
        .filter(c => {
          if (c.status !== "done") return false;
          const d = new Date(c.completedAt);
          return d >= today && d < tomorrow;
        })
        .map(c => activityKey(c))
    );

    const pendingWorkKeys = new Set<string>();
    myLeads.forEach(lead => {
      const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
      let cad = base;
      let phaseIndex = lead.phaseIndex ?? 0;
      if (base && base.phases && base.phases.length > 0) {
        const pIdx = Math.min(lead.phaseIndex ?? 0, base.phases.length - 1);
        phaseIndex = pIdx;
        cad = cadences.find(c => c.id === base.phases[pIdx].cadenceId) ?? base;
      }

      const currentDay = businessDaysBetween(lead.dataEntrada, anchor);
      if (currentDay <= 0) return;

      const hasSteps = cad && cad.days.some(d => d.activities.length > 0);
      const completionCadenceId = base?.id ?? cad?.id ?? null;

      if (!cad || !hasSteps) {
        const k = activityKey({ leadId: lead.id, cadenceId: completionCadenceId, phaseIndex, dayNumber: 1, activityIndex: 0 });
        if (!completedKeys.has(k)) pendingWorkKeys.add(k);
        return;
      }

      cad.days
        .filter(day => day.day === currentDay)
        .forEach(day => {
          day.activities.forEach((_, idx) => {
            const k = activityKey({ leadId: lead.id, cadenceId: completionCadenceId, phaseIndex, dayNumber: day.day, activityIndex: idx });
            if (!completedKeys.has(k)) pendingWorkKeys.add(k);
          });
        });
    });

    const todayDoneFromWorklist = new Set<string>();
    todayCompletedKeys.forEach(k => {
      const [leadId, cadenceId, phaseIdx, dayNumber, activityIndex] = k.split("|");
      const lead = myLeads.find(l => l.id === leadId);
      if (!lead) return;

      const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
      const normalizedCadenceId = cadenceId === "none" ? null : cadenceId;
      const expectedCadenceId = base?.id ?? null;
      const currentDay = businessDaysBetween(lead.dataEntrada, anchor);

      if (normalizedCadenceId !== expectedCadenceId) return;
      if (Number(phaseIdx) !== (lead.phaseIndex ?? 0)) return;
      if (Number(dayNumber) !== currentDay) return;

      todayDoneFromWorklist.add(activityKey({
        leadId,
        cadenceId: normalizedCadenceId,
        phaseIndex: Number(phaseIdx),
        dayNumber: Number(dayNumber),
        activityIndex: Number(activityIndex),
      }));
    });

    return {
      plannedToday: pendingWorkKeys.size + todayDoneFromWorklist.size,
      doneToday: todayDoneFromWorklist.size,
    };
  }, [myLeads, cadences, completions, completedKeys]);


  const dailyGoal = Math.max(plannedToday - doneToday, 0);
  const completed = doneToday;
  const pct = plannedToday > 0 ? Math.round((completed / plannedToday) * 100) : 0;


  const groups = [
    { id: "pending", label: "ATIVIDADES DAS CADÊNCIAS", count: rows.length },
  ];

  const toggleGroup = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }));
  const toggleAll = () => {
    const allSelected = rows.every(r => selected[r.key]);
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(rows.map(r => [r.key, true])));
  };

  const displayName = profile?.nome ?? "Você";

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-5">

      {/* Progress + goal */}
      <Card className="p-5 shadow-card grid md:grid-cols-[1fr_320px] gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold">Meu progresso hoje</h3>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-primary">{completed}</span>
            <span className="text-sm text-muted-foreground">/ {completed + dailyGoal} atividades de hoje</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Finalizado</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/50" />Pendente</span>
          </div>
        </div>

        <div className="md:border-l md:border-border md:pl-5 flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-primary-soft inline-flex items-center justify-center text-primary shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Atividades de hoje ({completed + dailyGoal})</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dailyGoal > 0
                ? `Você ainda tem ${dailyGoal} atividade${dailyGoal > 1 ? "s" : ""} pendente${dailyGoal > 1 ? "s" : ""} para hoje.`
                : completed > 0
                  ? "Você concluiu todas as atividades de hoje. Bom trabalho!"
                  : "Nenhuma atividade programada para hoje."}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs + execution mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex">
          <button className="px-4 py-2.5 text-sm font-semibold border-b-2 border-primary text-foreground">Execução</button>
        </div>
        <div className="flex items-center gap-3 pb-2">
          <span className="text-xs text-muted-foreground">Modo Execução rápida</span>
          <Switch checked={fastMode} onCheckedChange={setFastMode} />
          <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Day selector */}
      {(() => {
        const weekdayShort = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
        const businessDateFor = (offset: number) => {
          const d = new Date(); d.setHours(0, 0, 0, 0);
          while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
          let r = offset;
          while (r > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) r--; }
          return d;
        };
        const opts = [0, 1, 2, 3, 4, 5, 6, 7];
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Ver atividades de:</span>
            {opts.map(o => {
              const d = businessDateFor(o);
              const label = o === 0 ? "Hoje" : o === 1 ? "Amanhã" : `${weekdayShort[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
              const active = dayOffset === o;
              return (
                <button
                  key={o}
                  onClick={() => setDayOffset(o)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Shift filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Turno:</span>
        {([
          { v: "all",       l: "Todos",    e: "🕒" },
          { v: "immediate", l: "Imediato", e: "⚡" },
          { v: "morning",   l: "Manhã",    e: "🌅" },
          { v: "afternoon", l: "Tarde",    e: "☀️" },
          { v: "evening",   l: "Noite",    e: "🌙" },
        ] as const).map(o => {
          const active = shiftFilter === o.v;
          const count = o.v === "all" ? rows.length : rows.filter(r => r.shift === o.v).length;
          return (
            <button
              key={o.v}
              onClick={() => setShiftFilter(o.v)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              <span>{o.e}</span>{o.l}
              <span className={cn("text-[10px] px-1.5 rounded-full", active ? "bg-primary-foreground/20" : "bg-muted")}>{count}</span>
            </button>
          );
        })}
      </div>



      {/* Activity groups */}
      <div className="space-y-3">

        {groups.map(g => {
          const open = expanded[g.id] ?? false;
          if (g.id !== "pending") {
            // Placeholder group (waiting for first call) — shows up if totalLeads > 0
            if (totalLeads === 0) return null;
            return (
              <Card key={g.id} className="shadow-card">
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <span className="h-7 w-7 rounded bg-warning/20 text-warning-foreground inline-flex items-center justify-center text-xs font-bold">
                    📋
                  </span>
                  <span className="text-xs font-bold tracking-wider flex-1 text-left">{g.label} ({g.count})</span>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <div className="px-4 pb-4 grid md:grid-cols-4 gap-2">
                    {myLeads.slice(0, 5).map((l, i) => (
                      <Link
                        key={l.id}
                        to={`/prospeccao/leads/${l.id}`}
                        className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/40"
                      >
                        <Checkbox onClick={(e) => e.stopPropagation()} />
                        <UserAvatar
                          name={l.name}
                          initials={l.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          color="hsl(217 91% 60%)"
                          size="sm"
                        />
                        <span className="text-sm truncate flex-1">{l.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning-foreground">
                          {(i + 1) * 10}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            );
          }

          // Pending activities table
          return (
            <Card key={g.id} className="shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs font-bold tracking-wider">
                {g.label} ({g.count})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left w-10">
                        <Checkbox
                          checked={rows.length > 0 && rows.every(r => selected[r.key])}
                          onCheckedChange={toggleAll}
                        />
                      </th>
                      <th className="px-3 py-2 text-left w-24"><ColumnFilter label="Data" col="data" options={uniqueValues.data} selected={filters.data} onToggle={toggleFilter} onClear={clearFilter} /></th>
                      <th className="px-3 py-2 text-left"><ColumnFilter label="Cadência" col="cadencia" options={uniqueValues.cadencia} selected={filters.cadencia} onToggle={toggleFilter} onClear={clearFilter} /></th>
                      <th className="px-3 py-2 text-left"><ColumnFilter label="Fase" col="fase" options={uniqueValues.fase} selected={filters.fase} onToggle={toggleFilter} onClear={clearFilter} /></th>
                      <th className="px-3 py-2 text-left w-24"><ColumnFilter label="Passo" col="passo" options={uniqueValues.passo} selected={filters.passo} onToggle={toggleFilter} onClear={clearFilter} /></th>
                      <th className="px-3 py-2 text-left"><ColumnFilter label="Atividade" col="atividade" options={uniqueValues.atividade} selected={filters.atividade} onToggle={toggleFilter} onClear={clearFilter} /></th>
                      <th className="px-3 py-2 text-left w-28">Turno</th>
                      <th className="px-3 py-2 text-left"><ColumnFilter label="Lead" col="lead" options={uniqueValues.lead} selected={filters.lead} onToggle={toggleFilter} onClear={clearFilter} /></th>
                      <th className="px-3 py-2 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                          Nenhuma atividade encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map(r => {
                        const Icon = iconForActivity(r.activity.type);
                        return (
                          <tr key={r.key} className="border-t border-border hover:bg-muted/30">
                            <td className="px-3 py-3">
                              <Checkbox
                                checked={!!selected[r.key]}
                                onCheckedChange={(v) => setSelected(s => ({ ...s, [r.key]: !!v }))}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn(
                                "text-[10px] font-bold tracking-wider",
                                r.ageTone === "danger" && "text-destructive",
                                r.ageTone === "warning" && "text-warning",
                                r.ageTone === "muted" && "text-muted-foreground",
                              )}>
                                {r.ageLabel}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-sm">{r.cadenceName}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {r.phaseLabel}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs font-semibold text-muted-foreground">Passo {r.step}</span>
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-medium">{r.activity.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{activityLabel(r.activity.type)}</p>
                            </td>
                            <td className="px-3 py-3">
                              {(() => {
                                const meta = SHIFT_META[r.shift];
                                return (
                                  <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border", meta.classes)}>
                                    <span>{meta.emoji}</span>{meta.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-3">
                              <Link to={`/prospeccao/leads/${r.leadId}`} className="flex items-center gap-2 hover:text-primary">
                                <UserAvatar
                                  name={r.leadName}
                                  initials={r.leadName.split(" ").map(n => n[0]).slice(0, 2).join("")}
                                  color="hsl(217 91% 60%)"
                                  size="sm"
                                />
                                <div>
                                  <p className="text-sm">{r.leadName}</p>
                                  <p className="text-xs text-muted-foreground">{r.leadCompany}</p>
                                </div>
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
                                {fastMode ? (
                                  <button
                                    type="button"
                                    onClick={() => quickComplete(r, "done")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-muted/40"
                                  >
                                    <Check className="h-4 w-4" />Concluir
                                  </button>
                                ) : (
                                  <Link
                                    to={`/prospeccao/execucao?leadId=${r.leadId}&day=${r.dayNumber}&idx=${r.activityIndex}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-muted/40"
                                  >
                                    <Icon className="h-4 w-4" />Executar
                                  </Link>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-1.5 border-l border-border hover:bg-muted/40">
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => quickComplete(r, "done")}>
                                      <Check className="h-4 w-4 mr-2" />Marcar como concluída
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => quickComplete(r, "skipped")}>
                                      <SkipForward className="h-4 w-4 mr-2" />Ignorar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {rows.length > 4 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
                  <span>Selecionar: <button className="text-primary hover:underline">Todos</button></span>
                  <div className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronLeft className="h-4 w-4" /></Button>
                    <span>1 de 1</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
