import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useCadences } from "@/lib/cadences-store";
import { useLeads } from "@/lib/leads-store";
import { useSdrs } from "@/lib/sdrs-store";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/Badges";
import { toast } from "sonner";
import { KanbanSquare, Filter, Clock, AlertTriangle, ArrowRight, Search } from "lucide-react";
import type { Lead, Cadence, CadencePhase } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface PhaseHistoryRow {
  id: string;
  lead_id: string;
  cadence_id: string;
  phase_index: number;
  phase_id: string | null;
  phase_name: string | null;
  entered_at: string;
  exited_at: string | null;
}

function daysBetween(a: string | Date, b: string | Date = new Date()) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/* -------------------- Card -------------------- */
function LeadCard({
  lead,
  ownerName,
  enteredAt,
  onOpen,
  dragging,
}: {
  lead: Lead;
  ownerName: string;
  enteredAt?: string;
  onOpen: () => void;
  dragging?: boolean;
}) {
  const days = enteredAt ? daysBetween(enteredAt) : null;
  const initials = ownerName.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <Card
      onClick={onOpen}
      className={cn(
        "p-3 cursor-pointer hover:border-primary/40 transition-colors bg-card shadow-sm",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{lead.name}</div>
          <div className="text-xs text-muted-foreground truncate">{lead.company || "—"}</div>
        </div>
        <UserAvatar name={ownerName} initials={initials} color="hsl(142 71% 45%)" size="sm" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {days !== null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {days === 0 ? "Hoje" : `${days}d na fase`}
          </span>
        )}
        {lead.channel && <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">{lead.channel}</Badge>}
      </div>
    </Card>
  );
}

/* -------------------- Draggable wrapper -------------------- */
function DraggableCard(props: React.ComponentProps<typeof LeadCard> & { id: string }) {
  const { id, ...rest } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <LeadCard {...rest} dragging={isDragging} />
    </div>
  );
}

/* -------------------- Droppable column -------------------- */
function PhaseColumn({
  phase,
  index,
  leads,
  ownerNameFor,
  historyByLead,
  onOpenLead,
}: {
  phase: CadencePhase;
  index: number;
  leads: Lead[];
  ownerNameFor: (id: string) => string;
  historyByLead: Map<string, string>;
  onOpenLead: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `phase-${index}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="p-3 border-b flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Fase {index + 1}</div>
          <div className="font-semibold text-sm truncate">{phase.name}</div>
        </div>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {leads.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">Sem leads nesta fase</div>
        ) : (
          leads.map(l => (
            <DraggableCard
              key={l.id}
              id={l.id}
              lead={l}
              ownerName={ownerNameFor(l.ownerId)}
              enteredAt={historyByLead.get(l.id)}
              onOpen={() => onOpenLead(l)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function Crm() {
  const { cadences, loading: loadingCad } = useCadences();
  const { leads, update: updateLead } = useLeads();
  const { users } = useSdrs(true);
  const { profile } = useAuth();

  const boards = useMemo(
    () => cadences.filter(c => (c.linkedToCrm ?? true) && (c.phases?.length ?? 0) > 0),
    [cadences],
  );

  const [selectedCadenceId, setSelectedCadenceId] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [history, setHistory] = useState<PhaseHistoryRow[]>([]);

  useEffect(() => {
    if (!selectedCadenceId && boards.length) setSelectedCadenceId(boards[0].id);
  }, [boards, selectedCadenceId]);

  const cadence: Cadence | undefined = boards.find(c => c.id === selectedCadenceId);

  // Fetch phase history for current cadence
  useEffect(() => {
    if (!selectedCadenceId) { setHistory([]); return; }
    let ignore = false;
    (async () => {
      const { data, error } = await supabase
        .from("lead_phase_history")
        .select("*")
        .eq("cadence_id", selectedCadenceId)
        .order("entered_at", { ascending: false });
      if (!ignore && !error && data) setHistory(data as PhaseHistoryRow[]);
    })();
    const ch = supabase
      .channel(`lph-${selectedCadenceId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_phase_history" }, async () => {
        const { data } = await supabase
          .from("lead_phase_history")
          .select("*")
          .eq("cadence_id", selectedCadenceId)
          .order("entered_at", { ascending: false });
        if (data) setHistory(data as PhaseHistoryRow[]);
      })
      .subscribe();
    return () => { ignore = true; supabase.removeChannel(ch); };
  }, [selectedCadenceId]);

  const ownerNameFor = (id: string) => users.find(u => u.id === id)?.nome ?? "—";

  const cadenceLeads = useMemo(() => {
    if (!cadence) return [] as Lead[];
    return leads.filter(l =>
      l.cadenceId === cadence.id &&
      l.status === "active" &&
      (ownerFilter === "all" || l.ownerId === ownerFilter) &&
      (search === "" ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.company.toLowerCase().includes(search.toLowerCase())),
    );
  }, [leads, cadence, ownerFilter, search]);

  // Map lead -> entered_at date for its current phase (open history entry)
  const historyByLead = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of cadenceLeads) {
      const open = history.find(h => h.lead_id === l.id && h.exited_at === null);
      if (open) m.set(l.id, open.entered_at);
    }
    return m;
  }, [history, cadenceLeads]);

  const leadsByPhase = useMemo(() => {
    const map = new Map<number, Lead[]>();
    if (!cadence) return map;
    cadence.phases.forEach((_p, idx) => map.set(idx, []));
    for (const l of cadenceLeads) {
      const idx = Math.min(cadence.phases.length - 1, Math.max(0, l.phaseIndex ?? 0));
      map.get(idx)?.push(l);
    }
    return map;
  }, [cadence, cadenceLeads]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function moveLead(leadId: string, targetIndex: number) {
    if (!cadence) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const current = lead.phaseIndex ?? 0;
    if (current === targetIndex) return;
    const phase = cadence.phases[targetIndex];
    try {
      await updateLead(leadId, { phaseIndex: targetIndex });
      // close previous open history entries
      await supabase
        .from("lead_phase_history")
        .update({ exited_at: new Date().toISOString() })
        .eq("lead_id", leadId)
        .eq("cadence_id", cadence.id)
        .is("exited_at", null);
      // insert new
      await supabase.from("lead_phase_history").insert({
        lead_id: leadId,
        cadence_id: cadence.id,
        phase_index: targetIndex,
        phase_id: phase?.id ?? null,
        phase_name: phase?.name ?? null,
        moved_by: profile?.id ?? null,
      });
      toast.success(`${lead.name} → ${phase?.name ?? `Fase ${targetIndex + 1}`}`);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível mover o lead");
    }
  }

  function onDragStart(ev: DragStartEvent) { setDraggingId(String(ev.active.id)); }
  function onDragEnd(ev: DragEndEvent) {
    setDraggingId(null);
    if (!ev.over) return;
    const overId = String(ev.over.id);
    if (!overId.startsWith("phase-")) return;
    const targetIndex = Number(overId.replace("phase-", ""));
    moveLead(String(ev.active.id), targetIndex);
  }

  if (loadingCad) {
    return <div className="px-6 py-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (boards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center space-y-3">
        <KanbanSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Nenhum board disponível</h1>
        <p className="text-sm text-muted-foreground">
          Para gerar um board no CRM Kanban, edite uma cadência que tenha fases configuradas e ative
          <em> "Vincular esta cadência ao CRM Kanban"</em>.
        </p>
      </div>
    );
  }

  const draggingLead = draggingId ? leads.find(l => l.id === draggingId) : null;

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">CRM Kanban</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={selectedCadenceId} onValueChange={setSelectedCadenceId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Escolha uma cadência" /></SelectTrigger>
            <SelectContent>
              {boards.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.status === "archived" ? " (arquivada)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar lead/empresa"
              className="pl-8 w-[220px]"
            />
          </div>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[180px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos SDRs</SelectItem>
              {users.filter(u => u.papel === "SDR").map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cadence && cadence.status === "archived" && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Cadência pausada/arquivada — sem novas atividades sendo geradas.
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {cadence?.phases.map((ph, idx) => (
            <PhaseColumn
              key={ph.id}
              phase={ph}
              index={idx}
              leads={leadsByPhase.get(idx) ?? []}
              ownerNameFor={ownerNameFor}
              historyByLead={historyByLead}
              onOpenLead={setOpenLead}
            />
          ))}
        </div>
        <DragOverlay>
          {draggingLead && (
            <LeadCard
              lead={draggingLead}
              ownerName={ownerNameFor(draggingLead.ownerId)}
              enteredAt={historyByLead.get(draggingLead.id)}
              onOpen={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Lead detail modal */}
      <Dialog open={!!openLead} onOpenChange={(o) => { if (!o) setOpenLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{openLead?.name}</DialogTitle></DialogHeader>
          {openLead && cadence && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">Empresa</div><div>{openLead.company || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">SDR</div><div>{ownerNameFor(openLead.ownerId)}</div></div>
                <div><div className="text-xs text-muted-foreground">E-mail</div><div className="truncate">{openLead.email || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Telefone</div><div>{openLead.phone || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Canal</div><div>{openLead.channel || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Fase atual</div><div>Fase {(openLead.phaseIndex ?? 0) + 1} — {cadence.phases[openLead.phaseIndex ?? 0]?.name}</div></div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Histórico de fases</div>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {history.filter(h => h.lead_id === openLead.id).map(h => (
                    <li key={h.id} className="flex items-center justify-between rounded border px-2 py-1">
                      <span>{h.phase_name ?? `Fase ${h.phase_index + 1}`}</span>
                      <span className="text-xs text-muted-foreground">
                        {daysBetween(h.entered_at, h.exited_at ?? new Date())}d
                      </span>
                    </li>
                  ))}
                  {history.filter(h => h.lead_id === openLead.id).length === 0 && (
                    <li className="text-xs text-muted-foreground">Sem histórico registrado ainda.</li>
                  )}
                </ul>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Mover para fase</div>
                <div className="flex flex-wrap gap-2">
                  {cadence.phases.map((p, i) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={i === (openLead.phaseIndex ?? 0) ? "default" : "outline"}
                      onClick={() => { moveLead(openLead.id, i); setOpenLead(null); }}
                    >
                      {i + 1}. {p.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/prospeccao/leads/${openLead.id}`}>Abrir lead <ArrowRight className="h-3 w-3 ml-1" /></a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
