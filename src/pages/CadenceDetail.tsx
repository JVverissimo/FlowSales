import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Search, Plus, X, ArrowLeft, Trash2, GripVertical, Users } from "lucide-react";
import { ActivityType, Activity, ActivityShift, CadencePhase } from "@/lib/mock-data";
import { useCadences } from "@/lib/cadences-store";
import { useActivityLibrary } from "@/lib/activity-library-store";
import { CHANNEL_GROUPS, channelGroupOf } from "@/lib/comissoes";
import { useSdrs } from "@/lib/sdrs-store";
import { ActivityIcon, activityLabel, activityBar } from "@/components/ActivityIcon";
import { UserAvatar } from "@/components/Badges";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const groups: { type: ActivityType }[] = [{ type: "call" }, { type: "email" }, { type: "social" }, { type: "research" }];

export default function CadenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cadences, loading, update, remove } = useCadences();
  const original = useMemo(() => cadences.find(c => c.id === id), [id, cadences]);

  const { users } = useSdrs();
  const { library } = useActivityLibrary();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(original?.name ?? "");
  const [description, setDescription] = useState(original?.description ?? "");
  const [focus, setFocus] = useState(original?.focus ?? "inbound_active");
  const [priority, setPriority] = useState(original?.priority ?? "normal");
  const [inactivity, setInactivity] = useState(original?.inactivityDays ?? 5);
  const [days, setDays] = useState(original?.days ?? [{ day: 1, activities: [] }]);
  const [participants, setParticipants] = useState<string[]>(original?.participants ?? []);
  const [phases, setPhases] = useState<CadencePhase[]>(original?.phases ?? []);
  const [linkedToCrm, setLinkedToCrm] = useState<boolean>(original?.linkedToCrm ?? true);
  const [channel, setChannel] = useState<string>(original?.channel ?? "");
  const [defaultShift, setDefaultShift] = useState<ActivityShift | "any">((original?.defaultShift as ActivityShift) ?? "any");
  const [selectedDay, setSelectedDay] = useState(1);
  const [openGroup, setOpenGroup] = useState<ActivityType | null>("call");
  const [librarySearch, setLibrarySearch] = useState("");

  // Sync local state when the cadence loads (or changes) from the store.
  // Avoids the form rendering empty before `cadences` finishes fetching.
  useEffect(() => {
    if (!original) return;
    setName(original.name ?? "");
    setDescription(original.description ?? "");
    setFocus(original.focus ?? "inbound_active");
    setPriority(original.priority ?? "normal");
    setInactivity(original.inactivityDays ?? 5);
    setDays(original.days?.length ? original.days : [{ day: 1, activities: [] }]);
    setParticipants(original.participants ?? []);
    setPhases(original.phases ?? []);
    setChannel(original.channel ?? "");
    setDefaultShift((original.defaultShift as ActivityShift) ?? "any");
    setLinkedToCrm(original.linkedToCrm ?? true);
  }, [original?.id, original?.name, original?.description, original?.focus, original?.priority, original?.inactivityDays, original?.days, original?.participants, original?.phases, original?.channel, original?.defaultShift, original?.linkedToCrm]);

  const userToAvatar = (u: { id: string; nome: string }) => ({
    id: u.id,
    name: u.nome,
    initials: u.nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(),
    color: "hsl(142 71% 45%)",
    online: true,
  });
  const selectedUsers = users.filter(u => participants.includes(u.id));

  if (!original) {
    if (loading) {
      return (
        <div className="px-6 py-10 max-w-[800px] mx-auto text-center text-sm text-muted-foreground">
          Carregando cadência...
        </div>
      );
    }
    return (
      <div className="px-6 py-10 max-w-[800px] mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">Cadência não encontrada</h1>
        <p className="text-sm text-muted-foreground">Crie sua primeira cadência para começar.</p>
        <Button onClick={() => navigate("/prospeccao/cadencias")}>Ir para Cadências</Button>
      </div>
    );
  }

  const currentDay = days.find(d => d.day === selectedDay) ?? { day: selectedDay, activities: [] };


  const handleAdd = (a: Activity) => {
    setDays(prev => {
      const exists = prev.find(d => d.day === selectedDay);
      const inheritedShift = a.shift ?? (defaultShift === "any" ? undefined : defaultShift);
      const newAct = { ...a, id: `${a.id}-${Date.now()}`, shift: inheritedShift };
      if (exists) return prev.map(d => d.day === selectedDay ? { ...d, activities: [...d.activities, newAct] } : d);
      return [...prev, { day: selectedDay, activities: [newAct] }];
    });
  };

  const handleRemove = (idx: number) => {
    setDays(prev => prev.map(d => d.day === selectedDay ? { ...d, activities: d.activities.filter((_, i) => i !== idx) } : d));
  };

  const handleClear = () => {
    setDays(prev => prev.map(d => d.day === selectedDay ? { ...d, activities: [] } : d));
  };

  const onDragStart = (e: React.DragEvent, a: Activity) => {
    e.dataTransfer.setData("activity", JSON.stringify(a));
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("activity");
    if (data) handleAdd(JSON.parse(data));
  };

  const dayOptions = Array.from({ length: Math.max(...days.map(d => d.day), 7) }, (_, i) => i + 1);

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto pb-32">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" />Voltar para cadências
      </button>

      {/* Geral */}
      <Collapsible defaultOpen className="mb-4">
        <Card className="shadow-card">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Geral</h2>
            </div>
            <span className="text-xs text-muted-foreground">{editing ? "Editando" : "Visualizando"}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 grid md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editing} className="mt-1.5" />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)} disabled={!editing}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_high">↑ Muito alta</SelectItem>
                    <SelectItem value="high">↑ Alta</SelectItem>
                    <SelectItem value="normal">↑ Normal</SelectItem>
                    <SelectItem value="low">↓ Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editing} className="mt-1.5" rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Foco</Label>
                <RadioGroup value={focus} onValueChange={(v) => setFocus(v as typeof focus)} disabled={!editing} className="flex flex-wrap gap-4 mt-2">
                  {[
                    { v: "inbound_active",  l: "Inbound ativo" },
                    { v: "inbound_passive", l: "Inbound passivo" },
                    { v: "outbound",        l: "Outbound" },
                    { v: "other",           l: "Outro" },
                  ].map(o => (
                    <label key={o.v} className="inline-flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={o.v} />
                      <span className="text-sm">{o.l}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label>Participantes</Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 p-2 border border-input rounded-md bg-background min-h-10">
                  {selectedUsers.length === 0 && (
                    <span className="text-xs text-muted-foreground px-1">Nenhum participante selecionado</span>
                  )}
                  {selectedUsers.map(u => {
                    const av = userToAvatar(u);
                    return (
                      <span key={u.id} className="inline-flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5">
                        <UserAvatar {...av} size="sm" />
                        <span className="text-xs">{u.nome.split(" ")[0]}</span>
                        {editing && (
                          <button onClick={() => setParticipants(p => p.filter(id => id !== u.id))} className="ml-0.5 text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {editing && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1"><Plus className="h-3 w-3" />Adicionar</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        {users.length === 0 ? (
                          <div className="text-xs text-muted-foreground p-3 text-center">
                            <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
                            Nenhum SDR cadastrado. Convide SDRs no Painel de Controle.
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto space-y-0.5">
                            {users.map(u => {
                              const checked = participants.includes(u.id);
                              return (
                                <label key={u.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      setParticipants(p => v ? [...p, u.id] : p.filter(id => id !== u.id));
                                    }}
                                  />
                                  <UserAvatar {...userToAvatar(u)} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{u.nome}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{u.papel}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="md:col-span-2 p-4 rounded-md bg-muted/40 border border-dashed border-border">
                <p className="text-sm font-semibold mb-2">Perda automática por inatividade</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted-foreground">Marcar como perdido:</span>
                  <Input type="number" value={inactivity} onChange={(e) => setInactivity(Number(e.target.value))} disabled={!editing} className="w-20" />
                  <span className="text-sm text-muted-foreground">dias úteis após a finalização de todas atividades.</span>
                  <Select defaultValue="no_contact" disabled={!editing}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_contact">Não houve contato</SelectItem>
                      <SelectItem value="no_budget">Não tem orçamento</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Turno padrão das atividades</Label>
                <Select value={defaultShift} onValueChange={(v) => setDefaultShift(v as ActivityShift | "any")} disabled={!editing}>
                  <SelectTrigger className="mt-1.5 w-full md:w-[280px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer turno</SelectItem>
                    <SelectItem value="immediate">⚡ Imediato</SelectItem>
                    <SelectItem value="morning">🌅 Manhã</SelectItem>
                    <SelectItem value="afternoon">☀️ Tarde</SelectItem>
                    <SelectItem value="evening">🌙 Noite</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Novas atividades adicionadas aos dias abaixo herdam este turno automaticamente.</p>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fases */}
      <Collapsible defaultOpen className="mb-4">
        <Card className="shadow-card">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Fases (opcional)</h2>
            </div>
            <span className="text-xs text-muted-foreground">{phases.length === 0 ? "Cadência simples" : `${phases.length} fase(s)`}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30">
                <Checkbox
                  checked={linkedToCrm}
                  disabled={!editing}
                  onCheckedChange={(v) => setLinkedToCrm(!!v)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Vincular esta cadência ao CRM Kanban</div>
                  <div className="text-xs text-muted-foreground">Quando ativado, esta cadência gera automaticamente um board no menu CRM com colunas por fase.</div>
                </div>
              </label>
              <p className="text-xs text-muted-foreground">
                Quando uma cadência tem fases, ela vira um trilho: cada fase aponta para outra cadência. O lead percorre fase por fase — ao avançar, só aparecem as atividades da fase atual.
                Se nenhuma fase for adicionada, esta cadência funciona normalmente usando os dias abaixo.
              </p>

              {phases.length === 0 ? (
                <div className="p-4 rounded-md border-2 border-dashed border-border text-center text-sm text-muted-foreground">
                  Nenhuma fase configurada. Esta cadência usará apenas as atividades dos dias abaixo.
                </div>
              ) : (
                <ol className="space-y-2">
                  {phases.map((ph, i) => (
                    <li key={ph.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-bold">{i + 1}</span>
                      <div className="flex-1 grid md:grid-cols-3 gap-2">
                        <Input
                          placeholder="Nome da fase (ex: Qualificação)"
                          value={ph.name}
                          disabled={!editing}
                          onChange={(e) => setPhases(prev => prev.map(p => p.id === ph.id ? { ...p, name: e.target.value } : p))}
                        />
                        <Select
                          value={ph.cadenceId}
                          disabled={!editing}
                          onValueChange={(v) => setPhases(prev => prev.map(p => p.id === ph.id ? { ...p, cadenceId: v } : p))}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione uma cadência" /></SelectTrigger>
                          <SelectContent>
                            {cadences
                              .filter(c => c.id !== original.id && (!c.phases || c.phases.length === 0))
                              .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select
                          value={ph.wonAction ?? "advance"}
                          disabled={!editing}
                          onValueChange={(v) => setPhases(prev => prev.map(p => p.id === ph.id ? { ...p, wonAction: v as "advance"|"schedule"|"attendance"|"finish" } : p))}
                        >
                          <SelectTrigger><SelectValue placeholder="Ação do botão Ganho" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advance">Avançar para próxima fase</SelectItem>
                            <SelectItem value="schedule">Agendar reunião</SelectItem>
                            <SelectItem value="attendance">Marcar comparecimento</SelectItem>
                            <SelectItem value="finish">Finalizar como ganho</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editing && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0}
                            onClick={() => setPhases(prev => { const a=[...prev]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; })}>↑</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === phases.length - 1}
                            onClick={() => setPhases(prev => { const a=[...prev]; [a[i+1],a[i]]=[a[i],a[i+1]]; return a; })}>↓</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => setPhases(prev => prev.filter(p => p.id !== ph.id))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {editing && (
                <Button variant="outline" size="sm" className="gap-2"
                  onClick={() => setPhases(prev => [...prev, { id: `ph-${Date.now()}`, name: `Fase ${prev.length + 1}`, cadenceId: "", wonAction: "advance" }])}>
                  <Plus className="h-4 w-4" />Adicionar fase
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Atividades */}
      <Collapsible defaultOpen>
        <Card className="shadow-card">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Atividades</h2>
            </div>
            <span className="text-xs text-muted-foreground">{days.reduce((s, d) => s + d.activities.length, 0)} atividade(s)</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 grid md:grid-cols-[320px_1fr] gap-5">
              {/* Library */}
              <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
                <div className="p-3 border-b border-border space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar por atividade" className="pl-9 h-9 bg-background" value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} />
                  </div>
                  {editing && <Button size="sm" variant="outline" className="w-full gap-2"><Plus className="h-4 w-4" />Criar atividade</Button>}
                </div>
                <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
                  {groups.map(({ type }) => {
                    const items = library[type].filter(a => a.name.toLowerCase().includes(librarySearch.toLowerCase()));
                    if (!items.length) return null;
                    const open = openGroup === type;
                    return (
                      <div key={type} className="border-b border-border last:border-0">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                          onClick={() => setOpenGroup(open ? null : type)}
                        >
                          <ActivityIcon type={type} size="sm" />
                          <span className="text-sm font-medium flex-1 text-left">{activityLabel(type)}</span>
                          <span className="text-xs text-muted-foreground">{items.length}</span>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        {open && (
                          <div className="pb-2">
                            {items.map(a => (
                              <div
                                key={a.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, a)}
                                className="group flex items-center gap-2 mx-2 my-1 pl-2 pr-1 py-1.5 rounded hover:bg-background cursor-grab active:cursor-grabbing relative"
                              >
                                <span className={cn("absolute left-0 top-1 bottom-1 w-1 rounded", activityBar(type))} />
                                <span className="text-xs flex-1 truncate pl-2">{a.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleAdd(a)}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="border border-border rounded-lg p-4 bg-background min-h-[480px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{dayOptions.map(d => <SelectItem key={d} value={String(d)}>Dia: {d}</SelectItem>)}</SelectContent>
                  </Select>
                  {currentDay.activities.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Limpar todas as atividades deste dia?")) {
                          const nextDays = days.map(d => d.day === selectedDay ? { ...d, activities: [] } : d);
                          setDays(nextDays);
                          if (!editing) update(original.id, { days: nextDays });
                          toast.success("Atividades removidas");
                        }
                      }}
                      className="text-destructive gap-2"
                    >
                      <Trash2 className="h-4 w-4" />Limpar atividades
                    </Button>
                  )}
                </div>
                {currentDay.activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">{editing ? "Arraste atividades da biblioteca para começar" : "Nenhuma atividade para este dia"}</p>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {currentDay.activities.map((a, idx) => (
                      <li key={`${a.id}-${idx}`} className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                        <span className="text-xs font-bold text-muted-foreground w-6 tabular-nums">{idx + 1}</span>
                        {editing && <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />}
                        <ActivityIcon type={a.type} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{activityLabel(a.type)}</p>
                        </div>
                        <Select
                          value={a.shift ?? "any"}
                          onValueChange={(v) => {
                            const shift = v === "any" ? undefined : (v as "immediate" | "morning" | "afternoon" | "evening");
                            const nextDays = days.map(d => d.day === selectedDay
                              ? { ...d, activities: d.activities.map((x, i) => i === idx ? { ...x, shift } : x) }
                              : d);
                            setDays(nextDays);
                            if (!editing) update(original.id, { days: nextDays });
                          }}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Turno" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Qualquer turno</SelectItem>
                            <SelectItem value="immediate">⚡ Imediato</SelectItem>
                            <SelectItem value="morning">🌅 Manhã</SelectItem>
                            <SelectItem value="afternoon">☀️ Tarde</SelectItem>
                            <SelectItem value="evening">🌙 Noite</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100"
                          onClick={() => {
                            const nextDays = days.map(d => d.day === selectedDay ? { ...d, activities: d.activities.filter((_, i) => i !== idx) } : d);
                            setDays(nextDays);
                            if (!editing) update(original.id, { days: nextDays });
                            toast.success("Atividade removida");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ol>

                )}
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Footer fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 z-30">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{name}</p>
            <p className="text-xs text-muted-foreground">Origem dos leads: {focus.replace("_", " ")}</p>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => { setEditing(false); toast("Edição cancelada"); }}>Cancelar</Button>
                <Button onClick={() => {
                  update(original.id, { name, description, focus, priority, inactivityDays: inactivity, days, participants, phases, channel: channel || null, defaultShift: defaultShift === "any" ? null : defaultShift, linkedToCrm });
                  setEditing(false);
                  toast.success("Cadência salva!");
                }}>Salvar Cadência</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-2"
                  onClick={() => {
                    if (confirm(`Excluir a cadência "${original.name}"? Esta ação não pode ser desfeita.`)) {
                      remove(original.id);
                      toast.success("Cadência excluída");
                      navigate("/prospeccao/cadencias");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />Excluir Cadência
                </Button>
                <Button onClick={() => setEditing(true)}>Editar Cadência</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
