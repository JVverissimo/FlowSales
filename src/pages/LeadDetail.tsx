import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { COMPANIES, CHANNEL_GROUPS } from "@/lib/comissoes";
import { Phone, ArrowLeft, Mail, Building2, Globe, Pencil, Copy, Check, X, ChevronRight, Move, Trash2, Trophy, ArrowRight } from "lucide-react";
import { sdrs } from "@/lib/mock-data";
import { useLeads } from "@/lib/leads-store";
import { useCadences } from "@/lib/cadences-store";
import { useSdrs } from "@/lib/sdrs-store";
import { useAuth } from "@/lib/auth-context";
import { useAppointments } from "@/lib/appointments-store";
import { EditLeadDialog, MoveCadenceDialog } from "@/components/LeadDialogs";
import { StatusBadge, UserAvatar } from "@/components/Badges";
import { ActivityIcon } from "@/components/ActivityIcon";
import { format } from "date-fns";
import { toast } from "sonner";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { leads, update, remove } = useLeads();
  const { cadences } = useCadences();
  const { users } = useSdrs();
  const { isGestor } = useAuth();
  const { create: createAppointment } = useAppointments();
  const lead = useMemo(() => leads.find(l => l.id === id), [id, leads]);
  const [historyTab, setHistoryTab] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [wonOpen, setWonOpen] = useState(false);
  const [wonDate, setWonDate] = useState("");
  const [wonTime, setWonTime] = useState("10:00");
  const [wonNote, setWonNote] = useState("");
  const [wonCompany, setWonCompany] = useState("");
  const [wonChannel, setWonChannel] = useState("");
  const [lossOpen, setLossOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [lossOther, setLossOther] = useState("");

  const confirmLoss = async () => {
    if (!lead) return;
    const reason = lossReason === "other" ? lossOther.trim() : lossReason;
    if (!reason) { toast.error("Selecione ou informe o motivo da perda."); return; }
    try {
      await update(lead.id, { status: "lost", lossReason: reason });
      toast("Lead marcado como Perdido");
      setLossOpen(false);
    } catch { toast.error("Erro"); }
  };

  const openWon = async () => {
    if (!lead) return;
    const cad = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
    const hasPhases = !!cad?.phases && cad.phases.length > 0;
    const pIdx = lead.phaseIndex ?? 0;
    const isLastPhase = !hasPhases || pIdx + 1 >= cad!.phases.length;
    const phase = hasPhases ? cad!.phases[Math.min(pIdx, cad!.phases.length - 1)] : null;
    const action = phase?.wonAction ?? (isLastPhase ? "schedule" : "advance");

    if (action === "advance") {
      if (isLastPhase) {
        try { await update(lead.id, { status: "won" }); toast.success("Lead marcado como ganho!"); }
        catch { toast.error("Erro ao finalizar"); }
        return;
      }
      try {
        await update(lead.id, { phaseIndex: pIdx + 1 });
        toast.success(`Fase concluída! Lead avançou para a fase ${pIdx + 2}.`);
      } catch { toast.error("Erro ao avançar fase"); }
      return;
    }

    if (action === "finish") {
      try { await update(lead.id, { status: "won" }); toast.success("Lead marcado como ganho!"); }
      catch { toast.error("Erro ao finalizar"); }
      return;
    }

    if (action === "attendance") {
      const compareceu = window.confirm("O lead compareceu na reunião?\n\nOK = Sim (avança/finaliza)\nCancelar = Não (marca como perdido)");
      try {
        if (compareceu) {
          if (isLastPhase) { await update(lead.id, { status: "won" }); toast.success("Compareceu! Lead marcado como ganho."); }
          else { await update(lead.id, { phaseIndex: pIdx + 1 }); toast.success(`Compareceu! Avançou para fase ${pIdx + 2}.`); }
        } else {
          await update(lead.id, { status: "lost" });
          toast("Lead marcado como perdido (não compareceu).");
        }
      } catch { toast.error("Erro ao atualizar"); }
      return;
    }

    // schedule
    const t = new Date();
    t.setDate(t.getDate() + 1);
    setWonDate(t.toISOString().slice(0, 10));
    setWonTime("10:00");
    setWonNote("");
    const cadForChannel = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
    setWonCompany(lead.companyTarget ?? "");
    setWonChannel(lead.channel ?? cadForChannel?.channel ?? "");
    setWonOpen(true);
  };

  const confirmWon = async () => {
    if (!lead) return;
    if (!wonDate || !wonTime) { toast.error("Informe data e hora da reunião."); return; }
    const scheduledAt = new Date(`${wonDate}T${wonTime}:00`);
    if (isNaN(scheduledAt.getTime())) { toast.error("Data/hora inválida."); return; }
    try {
      if (!wonCompany || !wonChannel) { toast.error("Selecione empresa e canal de aquisição."); return; }
      await createAppointment({
        leadId: lead.id,
        cadenceId: lead.cadenceId ?? null,
        scheduledAt: scheduledAt.toISOString(),
        sdrNotes: wonNote.trim() || undefined,
        company: wonCompany,
        channel: wonChannel,
      });
      try { await update(lead.id, { status: "won" }); } catch { /* ignore */ }
      toast.success("Agendamento criado!");
      setWonOpen(false);
    } catch {
      toast.error("Erro ao criar agendamento");
    }
  };

  if (!lead) {
    return (
      <div className="px-6 py-10 max-w-[800px] mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">Lead não encontrado</h1>
        <p className="text-sm text-muted-foreground">Cadastre seu primeiro lead na página de Leads para começar.</p>
        <Button onClick={() => navigate("/prospeccao/leads")}>Ir para Leads</Button>
      </div>
    );
  }

  const cadence = cadences.find(c => c.id === lead.cadenceId);
  const phaseIdx = lead.phaseIndex ?? 0;
  const hasPhases = !!cadence?.phases && cadence.phases.length > 0;
  const currentPhase = hasPhases ? cadence!.phases[Math.min(phaseIdx, cadence!.phases.length - 1)] : null;
  const currentPhaseCadence = currentPhase ? cadences.find(c => c.id === currentPhase.cadenceId) : null;
  const advancePhase = async () => {
    if (!cadence || !hasPhases) return;
    if (phaseIdx + 1 >= cadence.phases.length) { toast.info("Já está na última fase."); return; }
    try { await update(lead.id, { phaseIndex: phaseIdx + 1 }); toast.success(`Lead avançou para a fase ${phaseIdx + 2}`); }
    catch { toast.error("Erro ao avançar fase"); }
  };
  const companyUser = users.find(u => u.id === lead.ownerId);
  const owner = companyUser
    ? { id: companyUser.id, name: companyUser.nome, initials: companyUser.nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(), color: "hsl(142 71% 45%)", online: true }
    : sdrs.find(s => s.id === lead.ownerId);
  const publicUrl = `https://flowsales.app/l/${lead.id}`;


  const steps = cadence ? cadence.days.flatMap(d => d.activities.map((a, i) => ({ ...a, day: d.day, idx: i }))) : [];
  const completedSteps = 3;

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Voltar
      </button>

      <Card className="p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <UserAvatar name={lead.name} initials={lead.name.split(" ").map(n => n[0]).slice(0, 2).join("")} color="hsl(217 91% 60%)" size="lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{lead.company}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { if (lead.phone) { window.location.href = `tel:${lead.phone}`; } else { toast.error("Lead sem telefone cadastrado."); } }}
            ><Phone className="h-4 w-4" />Ligar</Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={openWon}
            ><Trophy className="h-4 w-4" />Ganho</Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => { setLossReason(""); setLossOther(""); setLossOpen(true); }}
            ><X className="h-4 w-4" />Perdido</Button>
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Editar</Button>
            <Button variant="outline" className="gap-2" onClick={() => setMoveOpen(true)}><Move className="h-4 w-4" />Mover</Button>
            {isGestor && (
              <Button
                variant="outline"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={async () => { if (confirm(`Excluir "${lead.name}"?`)) { try { await remove(lead.id); toast.success("Lead excluído"); navigate("/prospeccao/leads"); } catch { toast.error("Erro ao excluir"); } } }}
              ><Trash2 className="h-4 w-4" />Excluir</Button>
            )}
          </div>
        </div>

        {steps.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2">Progresso da cadência</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  <div className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded ${i < completedSteps ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <ActivityIcon type={s.type} size="sm" className="!h-5 !w-5" />
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  </div>
                  {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Completado</p><p className="text-2xl font-bold mt-1">{completedSteps}</p></div>
          <div><p className="text-xs text-muted-foreground">Aberto(s)</p><p className="text-2xl font-bold mt-1">{Math.max(steps.length - completedSteps, 0)}</p></div>
          <div><p className="text-xs text-muted-foreground">Conversa(s)</p><p className="text-2xl font-bold mt-1">2</p></div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Histórico</h2>
          </div>
          <Tabs value={historyTab} onValueChange={setHistoryTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">TUDO</TabsTrigger>
              <TabsTrigger value="research">Pesquisa</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="email">E-mail</TabsTrigger>
              <TabsTrigger value="call">Ligação</TabsTrigger>
              <TabsTrigger value="meeting">Reunião</TabsTrigger>
            </TabsList>
            <TabsContent value={historyTab} className="mt-4">
              <ol className="space-y-3 relative before:absolute before:left-[18px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {[
                  { type: "research" as const, title: "Pesquisa LinkedIn realizada", when: "há 3 dias", note: "Cargo confirmado: Diretor de Marketing." },
                  { type: "email" as const, title: "E-mail enviado: Apresentação inicial", when: "há 2 dias", note: "Lead abriu 2x e clicou no link." },
                  { type: "call" as const, title: "Ligação realizada", when: "ontem", note: "Conectou. Agendou continuação." },
                ].map((h, i) => (
                  <li key={i} className="flex gap-3 relative">
                    <ActivityIcon type={h.type} size="md" />
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between"><p className="font-medium text-sm">{h.title}</p><span className="text-xs text-muted-foreground">{h.when}</span></div>
                      <p className="text-sm text-muted-foreground mt-0.5">{h.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 shadow-card">
            <h3 className="font-semibold mb-3">Geral</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={lead.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cadência atual</span><span>{cadence?.name ?? "—"}</span></div>
              {hasPhases && currentPhase && (
                <div className="space-y-2 p-3 rounded bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Fase atual</span>
                    <span className="text-xs font-semibold text-primary">Fase {phaseIdx + 1} de {cadence!.phases.length}</span>
                  </div>
                  <p className="font-medium">{currentPhase.name}</p>
                  {currentPhaseCadence && <p className="text-xs text-muted-foreground">→ {currentPhaseCadence.name}</p>}
                  {phaseIdx + 1 < cadence!.phases.length && (
                    <Button size="sm" variant="outline" className="w-full gap-2 mt-1 border-primary/40 text-primary hover:bg-primary/10" onClick={advancePhase}>
                      <ArrowRight className="h-3.5 w-3.5" />Avançar para próxima fase
                    </Button>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Responsável</span>
                {owner ? (
                  <div className="inline-flex items-center gap-2"><UserAvatar {...owner} size="sm" /><span>{owner.name}</span></div>
                ) : <span className="text-muted-foreground">—</span>}
              </div>
              <div className="p-3 rounded bg-warning/10 border border-warning/20 text-xs text-warning-foreground/90">
                ⚠ Atividade pendente há 24h. Considere reagendar.
              </div>
            </div>
          </Card>

          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Dados</h3>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{lead.email}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{lead.phone}</div>
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{lead.company}</div>
              <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />www.{lead.company.toLowerCase().replace(/\s/g, "")}.com</div>
              {(lead.cargo || lead.fonte || lead.segmento || lead.faturamento || lead.dataEntrada || lead.origemImportacao) && (
                <div className="pt-2 mt-2 border-t border-border space-y-2">
                  {lead.cargo && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Cargo</span><span className="text-right">{lead.cargo}</span></div>}
                  {lead.fonte && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Fonte de tráfego</span><span className="text-right">{lead.fonte}</span></div>}
                  {lead.segmento && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Segmento</span><span className="text-right">{lead.segmento}</span></div>}
                  {lead.faturamento && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Faturamento</span><span className="text-right">{lead.faturamento}</span></div>}
                  {lead.dataEntrada && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Data de entrada</span><span className="text-right">{lead.dataEntrada}</span></div>}
                  {lead.origemImportacao && <div className="flex justify-between gap-2"><span className="text-muted-foreground">Origem da importação</span><span className="text-right">{lead.origemImportacao}</span></div>}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 shadow-card">
            <h3 className="font-semibold mb-2 text-sm">URL pública do lead</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded truncate">{publicUrl}</code>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("URL copiada!"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <EditLeadDialog lead={lead} open={editOpen} onOpenChange={setEditOpen} />
      <MoveCadenceDialog lead={lead} open={moveOpen} onOpenChange={setMoveOpen} />

      <Dialog open={lossOpen} onOpenChange={setLossOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><X className="h-5 w-5" />Marcar como Perda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione o motivo da perda de <strong className="text-foreground">{lead.name}</strong>:</p>
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
                <Textarea rows={3} className="mt-1.5" value={lossOther} onChange={(e) => setLossOther(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossOpen(false)}>Cancelar</Button>
            <Button onClick={confirmLoss} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wonOpen} onOpenChange={setWonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-green-600" />Marcar como Ganho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O lead <strong className="text-foreground">{lead.name}</strong> será agendado.
              Informe a data e hora da reunião — aparecerá na aba <strong>Agendamentos</strong>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data da reunião *</Label>
                <Input type="date" value={wonDate} onChange={(e) => setWonDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Hora *</Label>
                <Input type="time" value={wonTime} onChange={(e) => setWonTime(e.target.value)} className="mt-1.5" />
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
              <Textarea rows={3} className="mt-1.5" value={wonNote} onChange={(e) => setWonNote(e.target.value)} placeholder="Contexto, dor identificada, próximos passos..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonOpen(false)}>Cancelar</Button>
            <Button onClick={confirmWon} className="bg-green-600 hover:bg-green-700 text-white">Confirmar agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
