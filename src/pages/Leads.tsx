import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Download, MoreVertical, Filter, ChevronDown, Eye, Pencil, Move, X, Trash2, Sheet as SheetIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sdrs } from "@/lib/mock-data";
import { useCadences } from "@/lib/cadences-store";
import { useLeads } from "@/lib/leads-store";
import { useSdrs } from "@/lib/sdrs-store";
import { useAuth } from "@/lib/auth-context";
import { useCompletions, activityKey } from "@/lib/completions-store";
import { useAutoLossOnPhaseComplete } from "@/lib/auto-loss";
import { CreateLeadDialog } from "@/components/CreateLeadDialog";
import { EditLeadDialog, MoveCadenceDialog } from "@/components/LeadDialogs";
import { StatusBadge, UserAvatar } from "@/components/Badges";
import { Link } from "react-router-dom";
import type { Lead } from "@/lib/mock-data";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Parse "YYYY-MM-DD" como data local (evita shift de fuso que joga para o dia anterior) */
function parseLocalDate(v: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(v);
}

export default function Leads() {
  const { cadences } = useCadences();
  const { leads, remove, update } = useLeads();
  const { users } = useSdrs(true);
  const { isGestor } = useAuth();
  const { completions } = useCompletions();
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cadenceFilter, setCadenceFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [moving, setMoving] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkCadenceId, setBulkCadenceId] = useState<string>("none");
  const [bulkBusy, setBulkBusy] = useState(false);

  const completedKeys = useMemo(
    () => new Set(completions.filter(c => c.status === "done").map(c => activityKey(c))),
    [completions],
  );
  useAutoLossOnPhaseComplete(leads, cadences, completedKeys, update);


  // RLS already filters: SDR sees only assigned leads, Gestor sees all
  const list = useMemo(() => leads.filter(l => {
    const matchesText = l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.company.toLowerCase().includes(query.toLowerCase());
    const matchesOwner = ownerFilter === "all" || l.ownerId === ownerFilter;
    const origem = l.origemImportacao ?? "Manual";
    const matchesOrigin = originFilter === "all" || origem === originFilter;
    const matchesStatus = statusFilter === "all" ? true : l.status === statusFilter;
    const matchesCadence = cadenceFilter === "all"
      || (cadenceFilter === "none" ? !l.cadenceId : l.cadenceId === cadenceFilter);
    return matchesText && matchesOwner && matchesOrigin && matchesStatus && matchesCadence;
  }), [leads, query, ownerFilter, originFilter, statusFilter, cadenceFilter]);

  const extraFiltersCount = (statusFilter !== "all" ? 1 : 0) + (cadenceFilter !== "all" ? 1 : 0);
  const clearExtraFilters = () => { setStatusFilter("all"); setCadenceFilter("all"); };

  const selectedIds = useMemo(() => Object.keys(selected).filter(id => selected[id]), [selected]);
  const visibleSelectedCount = list.filter(l => selected[l.id]).length;
  const allVisibleSelected = list.length > 0 && visibleSelectedCount === list.length;

  const toggleAll = () => {
    if (allVisibleSelected) {
      const next = { ...selected };
      list.forEach(l => { delete next[l.id]; });
      setSelected(next);
    } else {
      const next = { ...selected };
      list.forEach(l => { next[l.id] = true; });
      setSelected(next);
    }
  };

  const clearSelection = () => setSelected({});

  const csvEscape = (v: string | null | undefined) => {
    const s = (v ?? "").toString();
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExport = () => {
    const rows = (selectedIds.length > 0 ? list.filter(l => selected[l.id]) : list);
    if (rows.length === 0) { toast.error("Nenhum lead para exportar."); return; }
    const headers = ["Nome", "Empresa", "Email", "Telefone", "Cargo", "Status", "Cadência", "Responsável", "Fonte", "Segmento", "Faturamento", "Data de entrada", "Origem"];
    const lines = [headers.join(",")];
    rows.forEach(l => {
      const cad = cadences.find(c => c.id === l.cadenceId)?.name ?? "";
      const owner = users.find(u => u.id === l.ownerId)?.nome ?? "";
      lines.push([
        l.name, l.company, l.email ?? "", l.phone ?? "", l.cargo ?? "", l.status,
        cad, owner, l.fonte ?? "", l.segmento ?? "", l.faturamento ?? "", l.dataEntrada ?? "", l.origemImportacao ?? "Manual",
      ].map(csvEscape).join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} lead(s) exportados.`);
  };

  const confirmBulkDelete = async () => {
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try { await remove(id); ok++; } catch { fail++; }
    }
    setBulkBusy(false);
    setBulkDeleteOpen(false);
    clearSelection();
    if (fail === 0) toast.success(`${ok} lead(s) excluídos.`);
    else toast.error(`${ok} excluídos, ${fail} falharam.`);
  };

  const confirmBulkMove = async () => {
    setBulkBusy(true);
    let ok = 0, fail = 0;
    const target = bulkCadenceId === "none" ? null : bulkCadenceId;
    for (const id of selectedIds) {
      try { await update(id, { cadenceId: target, phaseIndex: 0 }); ok++; } catch { fail++; }
    }
    setBulkBusy(false);
    setBulkMoveOpen(false);
    clearSelection();
    if (fail === 0) toast.success(`${ok} lead(s) movidos.`);
    else toast.error(`${ok} movidos, ${fail} falharam.`);
  };

  const resolveOwner = (id: string) => {
    const u = users.find(x => x.id === id);
    if (u) return { id: u.id, name: u.nome, initials: u.nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(), color: "hsl(142 71% 45%)", online: true };
    return sdrs.find(s => s.id === id) ?? sdrs[0];
  };

  const computeStage = (lead: Lead) => {
    const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
    if (!base) return { label: "—", done: 0, total: 0, phaseLabel: "" };
    let cad = base;
    let phaseLabel = "";
    const phaseIdx = lead.phaseIndex ?? 0;
    if (base.phases && base.phases.length > 0) {
      const pIdx = Math.min(phaseIdx, base.phases.length - 1);
      const phase = base.phases[pIdx];
      const phaseCad = cadences.find(c => c.id === phase.cadenceId);
      if (phaseCad) cad = phaseCad;
      phaseLabel = `Fase ${pIdx + 1}/${base.phases.length}${phase.name ? ` · ${phase.name}` : ""}`;
    }
    const total = (cad.days ?? []).reduce((acc, d) => acc + (d.activities?.length ?? 0), 0);
    // Completions are stored with the PARENT cadence id (base.id), not the phase's inner cadence id.
    const completionCadenceId = base.id;
    const mine = completions.filter(c =>
      c.leadId === lead.id &&
      c.cadenceId === completionCadenceId &&
      (c.phaseIndex ?? 0) === phaseIdx &&
      c.status === "done"
    );
    // Evita contar duplicidades do mesmo passo
    const uniq = new Set(mine.map(c => `${c.dayNumber}|${c.activityIndex}`));
    let done = uniq.size;
    // Se os passos do último dia da cadência já foram feitos, a fase está concluída
    const days = (cad.days ?? []).filter(d => (d.activities?.length ?? 0) > 0);
    const lastDay = days.length ? Math.max(...days.map(d => d.day)) : 0;
    const lastDayActs = days.find(d => d.day === lastDay);
    if (lastDayActs && lastDayActs.activities.every((_a, idx) => uniq.has(`${lastDay}|${idx}`))) {
      done = total;
    }
    const finished = total > 0 && done >= total;
    return { label: `Passo ${finished ? total : Math.min(done + 1, Math.max(total, 1))}/${total || "—"}`, done, total, phaseLabel };
  };


  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">{isGestor ? "Gerencie todos os leads da sua operação." : "Veja seus leads em prospecção."}</p>
        </div>
        <div className="flex items-center gap-2">
          {isGestor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2">Listas de importação <ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Importar CSV</DropdownMenuItem>
                <DropdownMenuItem>Histórico de importações</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <CreateLeadDialog trigger={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>} />
        </div>
      </div>

      <Card className="p-4 shadow-card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar lead" className="pl-9 h-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {isGestor && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={originFilter} onValueChange={setOriginFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Google Sheets">Google Sheets</SelectItem>
              <SelectItem value="API">API</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />Adicionar Filtro
                {extraFiltersCount > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{extraFiltersCount}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3" align="end">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Em prospecção</SelectItem>
                    <SelectItem value="won">Ganhos</SelectItem>
                    <SelectItem value="lost">Perdidos</SelectItem>
                    <SelectItem value="finished">Finalizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cadência</Label>
                <Select value={cadenceFilter} onValueChange={setCadenceFilter}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="none">Sem cadência</SelectItem>
                    {cadences.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {extraFiltersCount > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={clearExtraFilters}>
                  <X className="h-4 w-4 mr-1" />Limpar filtros
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {list.length} lead(s) encontrado(s)
            {selectedIds.length > 0 && <> · <strong className="text-foreground">{selectedIds.length} selecionado(s)</strong></>}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />Exportar{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} className="gap-1">
                  Ações em massa <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setBulkCadenceId("none"); setBulkMoveOpen(true); }}>
                  <Move className="h-4 w-4 mr-2" />Mover de cadência
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />Excluir selecionados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearSelection}>
                  <X className="h-4 w-4 mr-2" />Limpar seleção
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select defaultValue="50">
              <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="25">25 / pág</SelectItem><SelectItem value="50">50 / pág</SelectItem><SelectItem value="100">100 / pág</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
                </th>
                <th className="px-4 py-3 text-left">Lead</th>
                <th className="px-2 py-3 text-left">Data de entrada</th>
                <th className="px-2 py-3 text-left">Status</th>
                <th className="px-2 py-3 text-left">Cadência atual</th>
                <th className="px-2 py-3 text-left">Etapa</th>
                <th className="px-2 py-3 text-left">Responsável</th>
                <th className="px-2 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Nenhum lead cadastrado. Clique em "Adicionar" para começar.</td></tr>
              )}
              {list.map(lead => {
                const cad = cadences.find(c => c.id === lead.cadenceId);
                const owner = resolveOwner(lead.ownerId);
                const stage = computeStage(lead);
                return (
                  <tr key={lead.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={!!selected[lead.id]}
                        onCheckedChange={(v) => setSelected(s => ({ ...s, [lead.id]: !!v }))}
                        aria-label={`Selecionar ${lead.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/prospeccao/leads/${lead.id}`} className="flex items-center gap-3">
                        <UserAvatar name={lead.name} initials={lead.name.split(" ").map(n => n[0]).slice(0, 2).join("")} color="hsl(217 91% 60%)" size="sm" />
                        <div>
                          <p className="font-medium hover:text-primary inline-flex items-center gap-1.5">
                            {lead.name}
                            {lead.origemImportacao === "Google Sheets" && (
                              <TooltipProvider><Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-success/15 text-success">
                                    <SheetIcon className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Importado via Google Sheets</TooltipContent>
                              </Tooltip></TooltipProvider>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{lead.company}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                      {lead.dataEntrada ? format(parseLocalDate(lead.dataEntrada), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </td>
                    <td className="px-2 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-2 py-3 text-muted-foreground">{cad?.name ?? "—"}</td>
                    <td className="px-2 py-3">
                      {stage.total > 0 ? (
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-foreground">{stage.label}</span>
                            <span className="text-muted-foreground">{stage.total > 0 ? `${Math.round((stage.done / stage.total) * 100)}%` : ""}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${stage.total > 0 ? Math.min(100, (stage.done / stage.total) * 100) : 0}%` }} />
                          </div>
                          {stage.phaseLabel && <span className="text-[10px] text-muted-foreground">{stage.phaseLabel}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2"><UserAvatar {...owner} size="sm" /><span className="text-sm">{owner.name}</span></div>
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link to={`/prospeccao/leads/${lead.id}`}><Eye className="h-4 w-4 mr-2" />Ver detalhes</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(lead)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMoving(lead)}><Move className="h-4 w-4 mr-2" />Mover de cadência</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={async () => { if (confirm(`Excluir o lead "${lead.name}"?`)) { try { await remove(lead.id); toast.success("Lead excluído"); } catch { toast.error("Erro ao excluir"); } } }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <EditLeadDialog lead={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />
      <MoveCadenceDialog lead={moving} open={!!moving} onOpenChange={(o) => !o && setMoving(null)} />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os leads selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover {selectedIds.length} lead(s) de cadência</DialogTitle>
            <DialogDescription>
              Escolha a nova cadência para os leads selecionados ou remova-os de qualquer cadência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Cadência</Label>
            <Select value={bulkCadenceId} onValueChange={setBulkCadenceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cadência</SelectItem>
                {cadences.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMoveOpen(false)} disabled={bulkBusy}>Cancelar</Button>
            <Button onClick={confirmBulkMove} disabled={bulkBusy}>
              {bulkBusy ? "Movendo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
