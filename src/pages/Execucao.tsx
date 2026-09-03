import { useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { COMPANIES, CHANNEL_GROUPS } from "@/lib/comissoes";
import { ActivityIcon, activityLabel } from "@/components/ActivityIcon";
import { Phone, Mail, ExternalLink, Check, SkipForward, Clock, Building2, Play, Trophy, ArrowRight, X, Pencil } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useActivityLibrary } from "@/lib/activity-library-store";
import { UserAvatar } from "@/components/Badges";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { useLeads } from "@/lib/leads-store";
import { useCadences } from "@/lib/cadences-store";
import { useCompletions, activityKey } from "@/lib/completions-store";
import { useAutoLossOnPhaseComplete } from "@/lib/auto-loss";
import { useSdrs } from "@/lib/sdrs-store";
import { useAppointments } from "@/lib/appointments-store";
import type { Activity, Lead } from "@/lib/mock-data";

interface QueueItem {
  id: string;
  activity: Activity;
  lead: Lead;
  cadenceName: string;
  day: number;
  step: number;
  activityIndex: number;
}

export default function Execucao() {
  const { user, isGestor } = useAuth();
  const [searchParams] = useSearchParams();
  const focusLeadId = searchParams.get("leadId");
  const focusDay = searchParams.get("day");
  const focusIdx = searchParams.get("idx");
  const { leads, update: updateLead } = useLeads();
  const { cadences } = useCadences();
  const { completions, add: addCompletion } = useCompletions();
  const { users: sdrUsers } = useSdrs(false);
  const { create: createAppointment, appointments } = useAppointments();
  const { library, save: saveActivity } = useActivityLibrary();
  const [editingInstructions, setEditingInstructions] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<QueueItem | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<QueueItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleNote, setRescheduleNote] = useState<string>("");
  const [wonModal, setWonModal] = useState<QueueItem | null>(null);
  const [wonDate, setWonDate] = useState<string>("");
  const [wonTime, setWonTime] = useState<string>("");
  const [wonNote, setWonNote] = useState<string>("");
  const [wonCompany, setWonCompany] = useState<string>("");
  const [wonChannel, setWonChannel] = useState<string>("");
  const [lossModal, setLossModal] = useState<QueueItem | null>(null);
  const [lossReason, setLossReason] = useState<string>("");
  const [lossOther, setLossOther] = useState<string>("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [activityNotes, setActivityNotes] = useState<string>("");

  // Lead is "in attendance phase" if its current phase wonAction === "attendance"
  const isAttendancePhase = (lead: Lead) => {
    const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
    if (!base?.phases || base.phases.length === 0) return false;
    const pIdx = Math.min(lead.phaseIndex ?? 0, base.phases.length - 1);
    return base.phases[pIdx]?.wonAction === "attendance";
  };

  // Latest scheduled appointment per lead
  const apptByLead = useMemo(() => {
    const map = new Map<string, typeof appointments[number]>();
    appointments.forEach(a => {
      const prev = map.get(a.leadId);
      if (!prev || new Date(a.scheduledAt).getTime() > new Date(prev.scheduledAt).getTime()) {
        map.set(a.leadId, a);
      }
    });
    return map;
  }, [appointments]);

  // Hide leads with appointments UNLESS they are in attendance phase (then we still show follow-up steps)
  const wonLeadIds = useMemo(
    () => new Set(appointments.map(a => a.leadId)),
    [appointments]
  );

  const myLeads = useMemo(
    () => leads.filter(l => l.ownerId === user?.id && l.status === "active" && (!wonLeadIds.has(l.id) || isAttendancePhase(l))),
    [leads, user?.id, wonLeadIds, cadences]
  );


  const completedKeys = useMemo(
    () => new Set(completions.map(c => activityKey(c))),
    [completions]
  );

  // Resolve effective cadence (phases-aware): if a cadence has phases, use the cadence referenced by the lead's current phase.
  const resolveEffective = (lead: Lead) => {
    const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
    if (!base) return { cad: null as ReturnType<typeof cadences.find> | null, phaseIndex: 0, phaseName: "", totalPhases: 0 };
    if (!base.phases || base.phases.length === 0) return { cad: base, phaseIndex: 0, phaseName: "", totalPhases: 0 };
    const pIdx = Math.min(lead.phaseIndex ?? 0, base.phases.length - 1);
    const phase = base.phases[pIdx];
    const phaseCad = cadences.find(c => c.id === phase.cadenceId) ?? base;
    return { cad: phaseCad, phaseIndex: pIdx, phaseName: phase.name, totalPhases: base.phases.length };
  };

  const queue = useMemo<QueueItem[]>(() => {
    const out: QueueItem[] = [];
    const parseLocalDate = (iso: string | null | undefined) => {
      if (!iso) return null;
      const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    };
    // Business days (Mon-Fri) elapsed since lead entry, entry day = 1
    const businessDayFor = (fromISO: string | null | undefined) => {
      const from = parseLocalDate(fromISO);
      if (!from) return 1;
      const t = new Date(); t.setHours(0, 0, 0, 0);
      if (from > t) return 0;
      let count = 0;
      const d = new Date(from);
      while (d <= t) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return Math.max(count, 1);
    };

    myLeads.forEach(lead => {
      const { cad, phaseIndex } = resolveEffective(lead);
      const hasSteps = cad && cad.days.some(d => d.activities.length > 0);
      const attendance = isAttendancePhase(lead);
      // For attendance phase: effective day counter starts 1 day BEFORE the scheduled meeting.
      let attendanceDay = 0;
      if (attendance) {
        const appt = apptByLead.get(lead.id);
        if (appt) {
          const startMs = new Date(appt.scheduledAt).getTime() - 24 * 60 * 60 * 1000;
          const diffDays = Math.floor((Date.now() - startMs) / (24 * 60 * 60 * 1000));
          attendanceDay = diffDays + 1;
          if (attendanceDay < 1) attendanceDay = 0;
        }
      }
      // Atividades do dia atual + atrasadas (dias anteriores não concluídos), igual "Minhas Atividades"
      const currentDay = attendance ? attendanceDay : businessDayFor(lead.dataEntrada);
      if (currentDay <= 0) return;
      if (cad && hasSteps) {
        let stepCounter = 0;
        [...cad.days].sort((a, b) => a.day - b.day).forEach(day => {
          day.activities.forEach((a, idx) => {
            stepCounter++;
            if (day.day > currentDay) return;
            out.push({
              id: `${lead.id}-${cad.id}-${phaseIndex}-${day.day}-${idx}`,
              activity: a,
              lead,
              cadenceName: cad.name,
              day: day.day,
              step: stepCounter,
              activityIndex: idx,
            });
          });
        });
      } else if (!attendance) {
        out.push({
          id: `${lead.id}-default`,
          activity: { id: `${lead.id}-default-act`, type: "call", name: "Primeira ligação" },
          lead,
          cadenceName: cad?.name ?? "Sem cadência",
          day: 1,
          step: 1,
          activityIndex: 0,
        });
      }
    });


    return out.filter(i => {
      const cadId = i.lead.cadenceId ?? null;
      const dayNum = i.day;
      const idx = i.activityIndex;
      const phaseIdx = i.lead.phaseIndex ?? 0;
      const k = activityKey({ leadId: i.lead.id, cadenceId: cadId, phaseIndex: phaseIdx, dayNumber: dayNum, activityIndex: idx });
      return !completedKeys.has(k);
    });
  }, [myLeads, cadences, completedKeys]);

  const orderedQueue = useMemo(() => {
    if (!focusLeadId) return queue;
    const focus = queue
      .filter(q => q.lead.id === focusLeadId)
      .sort((a, b) => a.day - b.day || a.activityIndex - b.activityIndex);
    const rest = queue.filter(q => q.lead.id !== focusLeadId);
    if (focus.length === 0) return [...focus, ...rest];
    const dayN = focusDay ? parseInt(focusDay, 10) : NaN;
    const idxN = focusIdx ? parseInt(focusIdx, 10) : NaN;
    let startAt = 0;
    if (!isNaN(dayN) && !isNaN(idxN)) {
      const found = focus.findIndex(q => q.day === dayN && q.activityIndex === idxN);
      if (found >= 0) startAt = found;
    }
    const rotated = [...focus.slice(startAt), ...focus.slice(0, startAt)];
    return [...rotated, ...rest];
  }, [queue, focusLeadId, focusDay, focusIdx]);

  const current = orderedQueue[0];

  // Instruções vêm sempre da biblioteca (o snapshot salvo na cadência pode estar desatualizado)
  const currentInstructions = useMemo(() => {
    const a = current?.activity;
    if (!a) return "";
    const list = library[a.type] ?? [];
    const byId = list.find(x => x.id === a.id);
    const byName = list.find(x => x.name.trim().toLowerCase() === a.name.trim().toLowerCase());
    return (byId?.instructions ?? byName?.instructions ?? a.instructions ?? "").trim();
  }, [current, library]);
  const next = orderedQueue.slice(1, 4);

  useEffect(() => { setActivityNotes(""); }, [current?.id]);

  const currentPhase = useMemo(() => {
    if (!current) return null;
    const eff = resolveEffective(current.lead);
    if (eff.totalPhases === 0) return null;
    return { index: eff.phaseIndex, total: eff.totalPhases, name: eff.phaseName };
  }, [current, cadences]);

  const advancePhase = async () => {
    if (!current || !currentPhase) return;
    if (currentPhase.index + 1 >= currentPhase.total) { toast.info("Já está na última fase."); return; }
    try {
      await updateLead(current.lead.id, { phaseIndex: currentPhase.index + 1 });
      toast.success(`Lead avançou para a fase ${currentPhase.index + 2}`);
    } catch { toast.error("Erro ao avançar fase"); }
  };

  // Ao concluir todas as atividades da fase atual: NUNCA avançar automaticamente de fase.
  // O lead é marcado como perdido (avanço de fase só manual ou via "Ganho").
  useAutoLossOnPhaseComplete(myLeads, cadences, completedKeys, updateLead);


  const finish = async (action: "done" | "skip") => {
    if (!current) return;
    try {
      const idx = current.activityIndex;
      await addCompletion({
        leadId: current.lead.id,
        cadenceId: current.lead.cadenceId ?? null,
        phaseIndex: current.lead.phaseIndex ?? 0,
        dayNumber: current.day,
        activityIndex: idx,
        activityType: current.activity.type,
        activityName: current.activity.name,
        status: action === "done" ? "done" : "skipped",
        notes: activityNotes.trim() || undefined,
      });
      setActivityNotes("");
      toast.success(action === "done" ? "Atividade concluída" : "Atividade ignorada");
    } catch {
      toast.error("Erro ao registrar atividade");
    }
  };

  const openReschedule = () => {
    if (!current) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow.toISOString().slice(0, 10));
    setRescheduleNote("");
    setRescheduleModal(current);
  };

  const confirmReschedule = async () => {
    if (!rescheduleModal) return;
    if (!rescheduleDate) { toast.error("Selecione uma data."); return; }
    try {
      const idx = rescheduleModal.activityIndex;
      const noteParts = [`Reagendado para ${format(new Date(rescheduleDate + "T00:00:00"), "dd/MM/yyyy")}`];
      if (rescheduleNote.trim()) noteParts.push(rescheduleNote.trim());
      if (activityNotes.trim()) noteParts.push("Notas: " + activityNotes.trim());
      await addCompletion({
        leadId: rescheduleModal.lead.id,
        cadenceId: rescheduleModal.lead.cadenceId ?? null,
        phaseIndex: rescheduleModal.lead.phaseIndex ?? 0,
        dayNumber: rescheduleModal.day,
        activityIndex: idx,
        activityType: rescheduleModal.activity.type,
        activityName: rescheduleModal.activity.name,
        status: "skipped",
        notes: noteParts.join(" — "),
      });
      toast.success("Atividade reagendada");
      setActivityNotes("");
      setRescheduleModal(null);
    } catch {
      toast.error("Erro ao reagendar atividade");
    }
  };

  const openWon = async () => {
    if (!current) return;
    const base = current.lead.cadenceId ? cadences.find(c => c.id === current.lead.cadenceId) : null;
    const hasPhases = !!base?.phases && base.phases.length > 0;
    const pIdx = current.lead.phaseIndex ?? 0;
    const isLastPhase = !hasPhases || pIdx + 1 >= base!.phases.length;
    const phase = hasPhases ? base!.phases[Math.min(pIdx, base!.phases.length - 1)] : null;
    const action = phase?.wonAction ?? (isLastPhase ? "schedule" : "advance");

    if (action === "advance") {
      if (isLastPhase) {
        try { await updateLead(current.lead.id, { status: "won" }); toast.success("Lead marcado como ganho!"); }
        catch { toast.error("Erro ao finalizar"); }
        return;
      }
      try {
        await updateLead(current.lead.id, { phaseIndex: pIdx + 1 });
        toast.success(`Fase concluída! Lead avançou para a fase ${pIdx + 2}.`);
      } catch { toast.error("Erro ao avançar fase"); }
      return;
    }

    if (action === "finish") {
      try { await updateLead(current.lead.id, { status: "won" }); toast.success("Lead marcado como ganho!"); }
      catch { toast.error("Erro ao finalizar"); }
      return;
    }

    if (action === "attendance") {
      const compareceu = window.confirm("O lead compareceu na reunião?\n\nOK = Sim (avança/finaliza)\nCancelar = Não (marca como perdido)");
      try {
        if (compareceu) {
          if (isLastPhase) { await updateLead(current.lead.id, { status: "won" }); toast.success("Compareceu! Lead marcado como ganho."); }
          else { await updateLead(current.lead.id, { phaseIndex: pIdx + 1 }); toast.success(`Compareceu! Avançou para fase ${pIdx + 2}.`); }
        } else {
          await updateLead(current.lead.id, { status: "lost" });
          toast("Lead marcado como perdido (não compareceu).");
        }
      } catch { toast.error("Erro ao atualizar"); }
      return;
    }

    // schedule
    const now = new Date();
    now.setDate(now.getDate() + 1);
    setWonDate(now.toISOString().slice(0, 10));
    setWonTime("10:00");
    setWonNote("");
    setWonCompany(current.lead.companyTarget ?? "");
    const cad = current.lead.cadenceId ? cadences.find(c => c.id === current.lead.cadenceId) : null;
    setWonChannel(current.lead.channel ?? cad?.channel ?? "");
    setWonModal(current);
  };

  const confirmWon = async () => {
    if (!wonModal) return;
    if (!wonDate || !wonTime) { toast.error("Informe data e hora da reunião."); return; }
    const scheduledAt = new Date(`${wonDate}T${wonTime}:00`);
    if (isNaN(scheduledAt.getTime())) { toast.error("Data/hora inválida."); return; }
    try {
      if (!wonCompany || !wonChannel) { toast.error("Selecione empresa e canal de aquisição."); return; }
      await createAppointment({
        leadId: wonModal.lead.id,
        cadenceId: wonModal.lead.cadenceId ?? null,
        scheduledAt: scheduledAt.toISOString(),
        sdrNotes: wonNote.trim() || undefined,
        company: wonCompany,
        channel: wonChannel,
      });
      const idx = wonModal.activityIndex;
      await addCompletion({
        leadId: wonModal.lead.id,
        cadenceId: wonModal.lead.cadenceId ?? null,
        phaseIndex: wonModal.lead.phaseIndex ?? 0,
        dayNumber: wonModal.day,
        activityIndex: idx,
        activityType: wonModal.activity.type,
        activityName: wonModal.activity.name,
        status: "done",
        notes: `Ganho — Reunião agendada para ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm")}${wonNote.trim() ? " — " + wonNote.trim() : ""}${activityNotes.trim() ? " — Notas: " + activityNotes.trim() : ""}`,
      });
      try { await updateLead(wonModal.lead.id, { status: "won" }); } catch { /* gestor-only update; ignore for SDR */ }
      toast.success("Agendamento criado!");
      setActivityNotes("");
      setWonModal(null);
    } catch {
      toast.error("Erro ao criar agendamento");
    }
  };

  const openLoss = () => {
    if (!current) return;
    setLossReason("");
    setLossOther("");
    setLossModal(current);
  };

  const confirmLoss = async () => {
    if (!lossModal) return;
    const reason = lossReason === "other" ? lossOther.trim() : lossReason;
    if (!reason) { toast.error("Selecione ou informe o motivo da perda."); return; }
    try {
      await updateLead(lossModal.lead.id, { status: "lost", lossReason: reason });
      toast.success("Lead marcado como perdido");
      setLossModal(null);
    } catch { toast.error("Erro ao marcar perda"); }
  };

  // ===== GESTOR VIEW: monitora todos os SDRs =====
  if (isGestor) {
    const bySdr = sdrUsers.map(u => {
      const sdrLeads = leads.filter(l => l.ownerId === u.id && l.status === "active");
      let pending = 0;
      let total = 0;
      sdrLeads.forEach(lead => {
        const cad = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
        const hasSteps = cad && cad.days.some(d => d.activities.length > 0);
        if (cad && hasSteps) {
          cad.days.forEach(day => {
            day.activities.forEach((_a, idx) => {
              total += 1;
              const k = activityKey({ leadId: lead.id, cadenceId: cad.id, dayNumber: day.day, activityIndex: idx });
              if (!completedKeys.has(k)) pending += 1;
            });
          });
        } else {
          total += 1;
          const k = activityKey({ leadId: lead.id, cadenceId: null, dayNumber: 1, activityIndex: 0 });
          if (!completedKeys.has(k)) pending += 1;
        }
      });
      const done = total - pending;
      const todayDone = completions.filter(c => {
        if (c.status !== "done") return false;
        const lead = leads.find(l => l.id === c.leadId);
        if (!lead || lead.ownerId !== u.id) return false;
        const d = new Date(c.completedAt);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      }).length;
      return { user: u, leads: sdrLeads.length, total, done, pending, todayDone };
    });

    return (
      <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execução do time</h1>
          <p className="text-sm text-muted-foreground">Monitore as atividades de cada SDR em tempo real.</p>
        </div>

        {bySdr.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground text-sm shadow-card">
            Nenhum SDR cadastrado ainda.
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bySdr.map(s => {
              const initials = s.user.nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
              const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
              return (
                <Card key={s.user.id} className="p-5 shadow-card space-y-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={s.user.nome} initials={initials} color="hsl(142 71% 45%)" size="lg" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.user.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="text-lg font-bold">{s.leads}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                      <p className="text-lg font-bold">{s.pending}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Hoje</p>
                      <p className="text-lg font-bold text-primary">{s.todayDone}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progresso da cadência</span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.done} de {s.total} atividades concluídas</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===== SDR VIEW =====
  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execução</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} · <span className="text-foreground font-semibold">{queue.length} atividade(s) pendente(s)</span>
          </p>
        </div>
        {!sessionStarted ? (
          <Button onClick={() => setSessionStarted(true)} className="gap-2"><Play className="h-4 w-4" />Iniciar sessão de trabalho</Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />Sessão ativa
          </span>
        )}
      </div>

      {!current ? (
        <Card className="p-12 text-center shadow-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary-soft flex items-center justify-center text-primary mb-4">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Tudo concluído!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {myLeads.length === 0
              ? "Você ainda não tem leads atribuídos. Aguarde seu gestor adicionar leads para você."
              : "Você finalizou todas as atividades do dia. Bom trabalho!"}
          </p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          <Card className="shadow-elevated overflow-hidden">
            <div className="p-6 bg-gradient-success border-b border-border">
              <div className="flex items-start gap-4">
                <ActivityIcon type={current.activity.type} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{current.cadenceName}</span>·<span>Dia {current.day}</span>·<span>Passo {current.step}</span>{currentPhase && (<><span>·</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">Fase {currentPhase.index + 1}/{currentPhase.total}{currentPhase.name ? " — " + currentPhase.name : ""}</span></>)}
                  </div>
                  <h2 className="text-xl font-bold mt-1">{current.activity.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{activityLabel(current.activity.type)}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                <UserAvatar name={current.lead.name} initials={current.lead.name.split(" ").map(n => n[0]).slice(0, 2).join("")} color="hsl(217 91% 60%)" size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{current.lead.name}</h3>
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{current.lead.company}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {current.lead.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" />{current.lead.phone}</span>}
                  {current.lead.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-muted-foreground" />{current.lead.email}</span>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Instruções</h4>
                  {isGestor && editingInstructions === null && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setEditingInstructions(currentInstructions)}>
                      <Pencil className="h-3.5 w-3.5" />Editar
                    </Button>
                  )}
                </div>
                {editingInstructions !== null ? (
                  <div className="space-y-2">
                    <RichTextEditor value={editingInstructions} onChange={setEditingInstructions} minHeight={260} />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingInstructions(null)}>Cancelar</Button>
                      <Button size="sm" onClick={async () => {
                        try {
                          const list = library[current.activity.type] ?? [];
                          const libAct = list.find(x => x.id === current.activity.id)
                            ?? list.find(x => x.name.trim().toLowerCase() === current.activity.name.trim().toLowerCase());
                          await saveActivity(
                            { ...(libAct ?? current.activity), instructions: editingInstructions },
                            libAct ? libAct.type : undefined
                          );
                          toast.success("Instruções atualizadas!");
                          setEditingInstructions(null);
                        } catch {
                          toast.error("Erro ao salvar. Apenas gestores podem editar.");
                        }
                      }}>Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 rounded-lg border border-border bg-card text-sm leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-1"
                    dangerouslySetInnerHTML={{
                      __html: (currentInstructions || "Execute esta atividade conforme o playbook do time. Seja consultivo e foque em entender o contexto do lead.")
                        .replace(/\{\{PRIMEIRO NOME\}\}/g, current.lead.name.split(" ")[0])
                        .replace(/\{\{EMPRESA\}\}/g, current.lead.company)
                        .replace(/\{\{TELEFONE\}\}/g, current.lead.phone ?? ""),
                    }}
                  />
                )}
              </div>

              {current.activity.type === "research" && (
                <Textarea placeholder="Anote suas descobertas sobre o lead..." rows={4} />
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                {current.activity.type === "call" && (
                  <Button size="lg" className="gap-2" onClick={() => setCallModal(current)}>
                    <Phone className="h-4 w-4" />Ligar agora
                  </Button>
                )}
                {current.activity.type === "social" && (
                  <Button size="lg" variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" />Abrir WhatsApp</Button>
                )}
                {current.activity.type === "email" && (
                  <Button size="lg" variant="outline" className="gap-2"><Mail className="h-4 w-4" />Abrir template</Button>
                )}
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <Button variant="outline" onClick={openReschedule} className="gap-2"><Clock className="h-4 w-4" />Reagendar</Button>
                  <Button variant="outline" onClick={() => finish("skip")} className="gap-2"><SkipForward className="h-4 w-4" />Ignorar</Button>
                  <Button variant="outline" onClick={() => finish("done")} className="gap-2"><Check className="h-4 w-4" />Concluir</Button>
                  {currentPhase && currentPhase.index + 1 < currentPhase.total && (<Button variant="outline" onClick={advancePhase} className="gap-2 border-primary/40 text-primary hover:bg-primary/10"><ArrowRight className="h-4 w-4" />Avançar fase</Button>)}
                  <Button onClick={openWon} className="gap-2 bg-green-600 hover:bg-green-700 text-white"><Trophy className="h-4 w-4" />Marcar como Ganho</Button>
                  <Button onClick={openLoss} variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"><X className="h-4 w-4" />Marcar como Perda</Button>
                </div>
              </div>
            </div>
          </Card>

          <aside className="space-y-4">
            <Card className="p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quadro de anotações</h3>
                {activityNotes && (
                  <span className="text-[10px] text-muted-foreground">{activityNotes.length} chars</span>
                )}
              </div>
              <Textarea
                rows={8}
                placeholder="Anote aqui o que descobriu durante a execução desta atividade. Será salvo junto com a conclusão."
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                className="resize-none text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-2">As anotações são salvas ao concluir, ignorar ou reagendar a atividade.</p>
            </Card>

            <Card className="p-4 shadow-card">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Próximas atividades</h3>
              <div className="space-y-2">
                {next.map(n => (
                  <div key={n.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40">
                    <ActivityIcon type={n.activity.type} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{n.lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.cadenceName}</p>
                    </div>
                  </div>
                ))}
                {next.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma após esta.</p>}
              </div>
            </Card>
          </aside>
        </div>
      )}

      <Dialog open={!!callModal} onOpenChange={(o) => !o && setCallModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resultado da ligação</DialogTitle></DialogHeader>
          <RadioGroup defaultValue="connected" className="space-y-2">
            <label className="flex items-center gap-2 p-3 border border-border rounded cursor-pointer">
              <RadioGroupItem value="connected" /><span className="text-sm">Conectou</span>
            </label>
            <label className="flex items-center gap-2 p-3 border border-border rounded cursor-pointer">
              <RadioGroupItem value="not_connected" /><span className="text-sm">Não conectou</span>
            </label>
          </RadioGroup>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea rows={3} className="mt-1.5" placeholder="O que você descobriu nessa ligação?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallModal(null)}>Cancelar</Button>
            <Button onClick={() => { setCallModal(null); finish("done"); }}>Salvar resultado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleModal} onOpenChange={(o) => !o && setRescheduleModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reagendar atividade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nova data</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Textarea
                rows={3}
                className="mt-1.5"
                placeholder="Ex: Lead pediu para retornar contato amanhã."
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModal(null)}>Cancelar</Button>
            <Button onClick={confirmReschedule}>Confirmar reagendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!wonModal} onOpenChange={(o) => !o && setWonModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-green-600" />Marcar como Ganho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O lead <strong className="text-foreground">{wonModal?.lead.name}</strong> foi agendado.
              Informe a data e hora da reunião — o agendamento aparecerá na aba <strong>Agendamentos</strong>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data da reunião *</Label>
                <Input
                  type="date"
                  value={wonDate}
                  onChange={(e) => setWonDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Hora *</Label>
                <Input
                  type="time"
                  value={wonTime}
                  onChange={(e) => setWonTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Empresa / Produto *</Label>
                <Select value={wonCompany} onValueChange={setWonCompany}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {COMPANIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Canal de Aquisição *</Label>
                <Select value={wonChannel} onValueChange={setWonChannel}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_GROUPS.map(g => (
                      <SelectGroup key={g.group}>
                        <SelectLabel>{g.label}</SelectLabel>
                        {g.channels.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações (opcional)</Label>
              <Textarea
                rows={3}
                className="mt-1.5"
                placeholder="Contexto da reunião, dor identificada, próximos passos..."
                value={wonNote}
                onChange={(e) => setWonNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonModal(null)}>Cancelar</Button>
            <Button onClick={confirmWon} className="bg-green-600 hover:bg-green-700 text-white">
              Confirmar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lossModal} onOpenChange={(o) => !o && setLossModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><X className="h-5 w-5" />Marcar como Perda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O lead <strong className="text-foreground">{lossModal?.lead.name}</strong> será marcado como perdido. Selecione o motivo:
            </p>
            <RadioGroup value={lossReason} onValueChange={setLossReason} className="space-y-2">
              {["Não tem orçamento","Não é o decisor","Sem fit","Não respondeu","Escolheu concorrente","Timing ruim","other"].map(r => (
                <label key={r} className="flex items-center gap-2 p-2.5 border border-border rounded cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value={r} />
                  <span className="text-sm">{r === "other" ? "Outro motivo" : r}</span>
                </label>
              ))}
            </RadioGroup>
            {lossReason === "other" && (
              <div>
                <Label className="text-xs">Descreva o motivo *</Label>
                <Textarea rows={3} className="mt-1.5" value={lossOther} onChange={(e) => setLossOther(e.target.value)} placeholder="Ex: Lead reorganizou prioridades e adiou o projeto." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossModal(null)}>Cancelar</Button>
            <Button onClick={confirmLoss} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
