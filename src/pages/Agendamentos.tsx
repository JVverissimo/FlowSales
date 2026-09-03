import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, XCircle, Clock, Building2, Phone, Mail, User as UserIcon, Search, Trash2, Tag, DollarSign, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAppointments, type Appointment, type AppointmentStatus } from "@/lib/appointments-store";
import { useLeads } from "@/lib/leads-store";
import { useSdrs } from "@/lib/sdrs-store";
import { channelLabel, companyLabel, companyColor, type ChannelCommissionConfig, COMPANIES, CHANNEL_GROUPS } from "@/lib/comissoes";

const statusConfig: Record<AppointmentStatus, { label: string; className: string; icon: typeof Clock }> = {
  scheduled: { label: "Agendado", className: "bg-primary/10 text-primary border-primary/20", icon: Clock },
  attended:  { label: "Compareceu", className: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  no_show:   { label: "No-show", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

export default function Agendamentos() {
  const { isGestor, user } = useAuth();
  const { appointments, loading, setOutcome, reportOutcome, markClosed, markNotSold, reopenSale, remove, updateMeta } = useAppointments();
  const { leads } = useLeads();
  const { users: sdrUsers } = useSdrs(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [sdrFilter, setSdrFilter] = useState<string>("all");
  const [periodMode, setPeriodMode] = useState<"all" | "month" | "day">("month");
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [dayFilter, setDayFilter] = useState<Date | undefined>(new Date());

  const [outcomeModal, setOutcomeModal] = useState<{ appt: Appointment; status: AppointmentStatus } | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [deleteModal, setDeleteModal] = useState<Appointment | null>(null);
  const [editModal, setEditModal] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({ scheduledAt: "", company: "", channel: "", sdrNotes: "" });
  const [notSoldModal, setNotSoldModal] = useState<Appointment | null>(null);
  const [notSoldReason, setNotSoldReason] = useState<string>("");
  const [configs, setConfigs] = useState<ChannelCommissionConfig[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("channel_commission_configs").select("*");
      setConfigs((data ?? []) as ChannelCommissionConfig[]);
    })();
  }, []);

  const cfgOf = (channel: string | null, company: string | null) =>
    channel && company ? configs.find(c => c.channel === channel && c.company === company) : undefined;

  const canActOn = (appt: Appointment) => isGestor || user?.id === appt.sdrId;

  const handleMarkSold = async (appt: Appointment) => {
    const raw = window.prompt("Valor do contrato fechado (R$):", "");
    if (raw === null) return;
    const val = Number(raw.replace(",", "."));
    if (isNaN(val) || val < 0) { toast.error("Valor inválido"); return; }
    try {
      await markClosed(appt.id, true, val);
      const cfg = cfgOf(appt.channel, appt.company);
      const com = Number(cfg?.closing_value || 0);
      toast.success(
        com > 3
          ? `Vendido! Comissão de fechamento: ${com.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
          : "Marcado como vendido!"
      );
    }
    catch { toast.error("Erro ao registrar venda"); }
  };

  const NOT_SOLD_REASONS = ["Não tem orçamento", "Contratou outro sistema", "Sem resposta", "Outro"];

  const openNotSold = (appt: Appointment) => {
    setNotSoldReason(appt.notSoldReason ?? "");
    setNotSoldModal(appt);
  };

  const confirmNotSold = async () => {
    if (!notSoldModal || !notSoldReason) { toast.error("Selecione um motivo"); return; }
    try {
      await markNotSold(notSoldModal.id, notSoldReason);
      toast.success("Marcado como não vendido.");
      setNotSoldModal(null);
      setNotSoldReason("");
    } catch { toast.error("Erro ao atualizar"); }
  };

  const sdrById = useMemo(() => new Map(sdrUsers.map(u => [u.id, u])), [sdrUsers]);
  const leadById = useMemo(() => new Map(leads.map(l => [l.id, l])), [leads]);

  const periodRange = useMemo(() => {
    if (periodMode === "all") return null;
    if (periodMode === "day") {
      if (!dayFilter) return null;
      const s = new Date(dayFilter); s.setHours(0, 0, 0, 0);
      const e = new Date(dayFilter); e.setHours(23, 59, 59, 999);
      return { from: s.getTime(), to: e.getTime() };
    }
    return { from: startOfMonth(monthCursor).getTime(), to: endOfMonth(monthCursor).getTime() };
  }, [periodMode, dayFilter, monthCursor]);

  const inPeriod = (a: Appointment) => {
    if (!periodRange) return true;
    const t = new Date(a.scheduledAt).getTime();
    return t >= periodRange.from && t <= periodRange.to;
  };

  const scoped = useMemo(() => appointments.filter(inPeriod), [appointments, periodRange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (isGestor && sdrFilter !== "all" && a.sdrId !== sdrFilter) return false;
      if (q) {
        const lead = leadById.get(a.leadId);
        const sdr = sdrById.get(a.sdrId);
        const hay = `${lead?.name ?? ""} ${lead?.company ?? ""} ${sdr?.nome ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scoped, statusFilter, sdrFilter, search, isGestor, leadById, sdrById]);

  const counts = useMemo(() => ({
    total: scoped.length,
    scheduled: scoped.filter(a => a.status === "scheduled").length,
    attended: scoped.filter(a => a.status === "attended").length,
    no_show: scoped.filter(a => a.status === "no_show").length,
  }), [scoped]);


  const openOutcome = (appt: Appointment, status: AppointmentStatus) => {
    setOutcomeNotes(appt.outcomeNotes ?? "");
    setOutcomeModal({ appt, status });
  };

  const confirmOutcome = async () => {
    if (!outcomeModal) return;
    try {
      if (isGestor) {
        await setOutcome(outcomeModal.appt.id, outcomeModal.status, outcomeNotes.trim() || undefined);
      } else {
        await reportOutcome(outcomeModal.appt.id, outcomeModal.status, outcomeNotes.trim() || undefined);
      }
      if (outcomeModal.status === "attended") {
        const cfg = cfgOf(outcomeModal.appt.channel, outcomeModal.appt.company);
        const val = Number(cfg?.meeting_value || 0);
        toast.success(
          val > 0
            ? `Compareceu! Comissão liberada: ${val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
            : `Marcado como Compareceu (sem valor de comissão configurado para este canal/empresa)`
        );
      } else {
        toast.success(`Marcado como ${statusConfig[outcomeModal.status].label}`);
      }
      setOutcomeModal(null);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await remove(deleteModal.id);
      toast.success("Agendamento excluído");
      setDeleteModal(null);
    } catch {
      toast.error("Erro ao excluir agendamento");
    }
  };

  const openEdit = (appt: Appointment) => {
    // datetime-local format: yyyy-MM-ddTHH:mm
    const dt = new Date(appt.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setEditForm({
      scheduledAt: local,
      company: appt.company ?? "",
      channel: appt.channel ?? "",
      sdrNotes: appt.sdrNotes ?? "",
    });
    setEditModal(appt);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    try {
      await updateMeta(editModal.id, {
        scheduledAt: new Date(editForm.scheduledAt).toISOString(),
        company: editForm.company || null,
        channel: editForm.channel || null,
        sdrNotes: editForm.sdrNotes || null,
      });
      toast.success("Agendamento atualizado");
      setEditModal(null);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Agendamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            {isGestor
              ? "Acompanhe todas as reuniões agendadas pelos SDRs e marque o resultado."
              : "Acompanhe os leads que você agendou."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 shadow-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Agendados</p>
          <p className="text-2xl font-bold mt-1 text-primary">{counts.scheduled}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Compareceram</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{counts.attended}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">No-show</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{counts.no_show}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 shadow-card">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, empresa ou SDR..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="w-44">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="attended">Compareceu</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isGestor && (
            <div className="w-56">
              <Label className="text-xs">SDR</Label>
              <Select value={sdrFilter} onValueChange={setSdrFilter}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os SDRs</SelectItem>
                  {sdrUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="w-40">
            <Label className="text-xs">Período</Label>
            <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as typeof periodMode)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Por mês</SelectItem>
                <SelectItem value="day">Por dia</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodMode === "month" && (
            <div className="flex items-center gap-1 rounded-md border bg-card p-1">
              <Button variant="ghost" size="icon" onClick={() => setMonthCursor(addMonths(monthCursor, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 text-sm font-medium capitalize min-w-[130px] text-center">
                {format(monthCursor, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMonthCursor(startOfMonth(new Date()))}>Hoje</Button>
            </div>
          )}
          {periodMode === "day" && (
            <div className="w-44">
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={dayFilter ? format(dayFilter, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split("-").map(Number);
                  setDayFilter(y ? new Date(y, m - 1, d) : undefined);
                }}
              />
            </div>
          )}
        </div>

      </Card>

      {/* List */}
      {loading ? (
        <Card className="p-10 text-center text-muted-foreground text-sm shadow-card">Carregando agendamentos...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center shadow-card">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {appointments.length === 0
              ? "Nenhum agendamento ainda. Marque uma atividade como 'Ganho' na Execução."
              : "Nenhum agendamento corresponde aos filtros."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(appt => {
            const lead = leadById.get(appt.leadId);
            const sdr = sdrById.get(appt.sdrId);
            const cfg = statusConfig[appt.status];
            const StatusIcon = cfg.icon;
            const when = new Date(appt.scheduledAt);
            const isPast = when.getTime() < Date.now();
            return (
              <Card key={appt.id} className="p-4 shadow-card hover:shadow-elevated transition-shadow">
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{lead?.name ?? "Lead removido"}</h3>
                      <Badge variant="outline" className={cfg.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      {appt.status === "scheduled" && isPast && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Aguardando resultado
                        </Badge>
                      )}
                      {appt.company && (
                        <Badge variant="outline" className={companyColor(appt.company)}>
                          <Building2 className="h-3 w-3 mr-1" />
                          {companyLabel(appt.company)}
                        </Badge>
                      )}
                      {appt.channel && (
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                          <Tag className="h-3 w-3 mr-1" />
                          {channelLabel(appt.channel)}
                        </Badge>
                      )}
                      {appt.confirmed && appt.status === "attended" && (() => {
                        const v = Number(cfgOf(appt.channel, appt.company)?.meeting_value || 0);
                        return v > 0 ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Comissão: {v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </Badge>
                        ) : null;
                      })()}
                      {appt.closed && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          Vendido{appt.contractValue != null ? ` · ${appt.contractValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                        </Badge>
                      )}
                      {appt.closed && (() => {
                        const v = Number(cfgOf(appt.channel, appt.company)?.closing_value || 0);
                        return v > 0 ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Comissão fechamento: {v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {lead?.company && (
                        <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{lead.company}</span>
                      )}
                      {lead?.phone && (
                        <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>
                      )}
                      {lead?.email && (
                        <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5" />SDR: <span className="font-medium text-foreground">{sdr?.nome ?? "—"}</span>
                      </span>
                    </div>
                    {appt.sdrNotes && (
                      <div className="mt-2 p-2.5 rounded-md bg-muted/40 border border-border text-sm">
                        <span className="text-xs font-semibold text-muted-foreground">Nota do SDR: </span>
                        {appt.sdrNotes}
                      </div>
                    )}
                    {appt.outcomeNotes && (
                      <div className="mt-2 p-2.5 rounded-md bg-muted/40 border border-border text-sm">
                        <span className="text-xs font-semibold text-muted-foreground">Resultado: </span>
                        {appt.outcomeNotes}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 min-w-[180px]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Reunião</p>
                    <p className="font-semibold text-base mt-0.5">
                      {format(when, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(when, "HH:mm", { locale: ptBR })}h
                    </p>

                    <div className="flex flex-col gap-1.5 mt-3">
                      {canActOn(appt) && (
                        <>
                          {appt.status === "scheduled" && (() => {
                            const msUntil = when.getTime() - Date.now();
                            const canReport = isGestor || msUntil <= 24 * 60 * 60 * 1000;
                            if (!canReport) {
                              return (
                                <p className="text-xs text-muted-foreground italic">
                                  Disponível 1 dia antes da reunião
                                </p>
                              );
                            }
                            return (
                              <>
                                <Button size="sm" className="gap-1.5" onClick={() => openOutcome(appt, "attended")}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />Compareceu
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openOutcome(appt, "no_show")}>
                                  <XCircle className="h-3.5 w-3.5" />Não compareceu
                                </Button>
                              </>
                            );
                          })()}
                          {appt.status === "attended" && (
                            <>
                              {appt.closed ? (
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => reopenSale(appt.id).then(() => toast.success("Venda reaberta.")).catch(() => toast.error("Erro"))}>
                                  Reabrir venda
                                </Button>
                              ) : appt.notSold ? (
                                <>
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 justify-center">
                                    Não vendido{appt.notSoldReason ? ` · ${appt.notSoldReason}` : ""}
                                  </Badge>
                                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => reopenSale(appt.id).then(() => toast.success("Reaberto.")).catch(() => toast.error("Erro"))}>
                                    Reabrir
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" className="gap-1.5" onClick={() => handleMarkSold(appt)}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />Foi vendido
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openNotSold(appt)}>
                                    <XCircle className="h-3.5 w-3.5" />Não vendido
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          {appt.status !== "scheduled" && (
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => openOutcome(appt, "scheduled")}>
                              Reabrir
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => openEdit(appt)}>
                            <Pencil className="h-3.5 w-3.5" />Editar
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteModal(appt)}>
                            <Trash2 className="h-3.5 w-3.5" />Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Outcome modal */}
      <Dialog open={!!outcomeModal} onOpenChange={(o) => !o && setOutcomeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Marcar como {outcomeModal && statusConfig[outcomeModal.status].label}
            </DialogTitle>
            <DialogDescription>
              {outcomeModal && (
                <>Lead <strong>{leadById.get(outcomeModal.appt.leadId)?.name ?? ""}</strong> · SDR{" "}
                <strong>{sdrById.get(outcomeModal.appt.sdrId)?.nome ?? "—"}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Observações (opcional)</Label>
            <Textarea
              rows={4}
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Como foi a reunião? O que foi acordado?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeModal(null)}>Cancelar</Button>
            <Button onClick={confirmOutcome}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteModal} onOpenChange={(o) => !o && setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir agendamento</DialogTitle>
            <DialogDescription>
              {deleteModal && (
                <>Tem certeza que deseja excluir o agendamento de <strong>{leadById.get(deleteModal.leadId)?.name ?? ""}</strong>?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit appointment modal */}
      <Dialog open={!!editModal} onOpenChange={(o) => !o && setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
            <DialogDescription>
              {editModal && <>Lead <strong>{leadById.get(editModal.leadId)?.name ?? ""}</strong></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Data e hora</Label>
              <Input
                type="datetime-local"
                value={editForm.scheduledAt}
                onChange={(e) => setEditForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Empresa</Label>
              <Select value={editForm.company} onValueChange={(v) => setEditForm(f => ({ ...f, company: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {COMPANIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={editForm.channel} onValueChange={(v) => setEditForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_GROUPS.flatMap(g => g.channels).map(ch => (
                    <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                rows={3}
                value={editForm.sdrNotes}
                onChange={(e) => setEditForm(f => ({ ...f, sdrNotes: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notSoldModal} onOpenChange={(o) => { if (!o) { setNotSoldModal(null); setNotSoldReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da perda</DialogTitle>
            <DialogDescription>
              {notSoldModal && <>Reunião de <strong>{leadById.get(notSoldModal.leadId)?.name ?? ""}</strong></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Selecione o motivo</Label>
            <Select value={notSoldReason} onValueChange={setNotSoldReason}>
              <SelectTrigger><SelectValue placeholder="Escolha um motivo" /></SelectTrigger>
              <SelectContent>
                {NOT_SOLD_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNotSoldModal(null); setNotSoldReason(""); }}>Cancelar</Button>
            <Button onClick={confirmNotSold}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
