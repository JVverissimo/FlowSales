import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Phone, User, Plus, MoreVertical, ChevronDown, Eye, Copy, Archive, Trash2, Pencil } from "lucide-react";
import { PriorityArrow, FocusBadge } from "@/components/Badges";
import { useCadences } from "@/lib/cadences-store";
import { CreateCadenceDialog } from "@/components/CreateCadenceDialog";
import { toast } from "sonner";

export default function Cadencias() {
  const [tab, setTab] = useState("standard");
  const [query, setQuery] = useState("");
  const { cadences, remove, duplicate, update } = useCadences();
  const list = cadences.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de cadências</h1>
          <p className="text-sm text-muted-foreground">Crie, edite e monitore suas cadências de prospecção.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Phone className="h-4 w-4" />Ligar</Button>
          <Button variant="outline" size="sm" className="gap-2"><User className="h-4 w-4" />Usuário</Button>
        </div>
      </div>

      <Card className="p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="all"><SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Status: Todos</SelectItem><SelectItem value="active">Ativa</SelectItem><SelectItem value="archived">Arquivada</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Prioridade</SelectItem><SelectItem value="very_high">Muito alta</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Foco</SelectItem><SelectItem value="inbound_active">Inbound ativo</SelectItem><SelectItem value="outbound">Outbound</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Participantes</SelectItem></SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." className="pl-9 h-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{list.length} cadência{list.length !== 1 ? "s" : ""}</span>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="standard">Padrão <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted-foreground/20">{list.length}</span></TabsTrigger>
            <TabsTrigger value="email_auto">E-mail Automático <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted-foreground/20">0</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Visualizar leads</Button>
          <CreateCadenceDialog trigger={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Criar cadência</Button>} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info("Importação em breve. Use 'Criar cadência' por enquanto.")}>Importar cadências</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (list.length === 0) { toast.error("Nenhuma cadência para exportar."); return; }
                const esc = (v: string | number | null | undefined) => {
                  const s = (v ?? "").toString();
                  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                };
                const headers = ["Nome", "Foco", "Prioridade", "Status", "Total", "Esperando", "Em execução", "Finalizados", "Ganhos", "Taxa de ganhos (%)", "Descrição"];
                const lines = [headers.join(",")];
                list.forEach(c => lines.push([
                  c.name, c.focus, c.priority, c.status, c.total, c.waiting, c.inProgress, c.finished, c.won, c.wonRate, c.description ?? "",
                ].map(esc).join(",")));
                const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `cadencias-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`${list.length} cadência(s) exportadas.`);
              }}>Exportar lista</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left w-10"><Checkbox /></th>
                <th className="px-2 py-3 text-left w-10"></th>
                <th className="px-2 py-3 text-left">Nome da Cadência</th>
                <th className="px-2 py-3 text-left">Foco</th>
                <th className="px-2 py-3 text-right">Total</th>
                <th className="px-2 py-3 text-right">Esperando</th>
                <th className="px-2 py-3 text-right">Execução</th>
                <th className="px-2 py-3 text-right">Finalizados</th>
                <th className="px-2 py-3 text-right">Ganhos</th>
                <th className="px-2 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><Checkbox /></td>
                  <td className="px-2 py-3"><PriorityArrow priority={c.priority} /></td>
                  <td className="px-2 py-3">
                    <Link to={`/prospeccao/cadencias/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                    {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                  </td>
                  <td className="px-2 py-3"><FocusBadge focus={c.focus} /></td>
                  <td className="px-2 py-3 text-right tabular-nums">{c.total}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{c.waiting}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{c.inProgress}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{c.finished}</td>
                  <td className="px-2 py-3 text-right tabular-nums">
                    <span className="font-semibold">{c.won}</span>
                    <span className="text-muted-foreground"> / {c.wonRate}%</span>
                  </td>
                  <td className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/prospeccao/cadencias/${c.id}`}><Eye className="h-4 w-4 mr-2" />Visualizar</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to={`/prospeccao/cadencias/${c.id}`}><Pencil className="h-4 w-4 mr-2" />Editar</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { duplicate(c.id); toast.success("Cadência duplicada"); }}><Copy className="h-4 w-4 mr-2" />Duplicar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { update(c.id, { status: c.status === "archived" ? "active" : "archived" }); toast.success(c.status === "archived" ? "Cadência reativada" : "Cadência arquivada"); }}><Archive className="h-4 w-4 mr-2" />{c.status === "archived" ? "Desarquivar" : "Arquivar"}</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm(`Excluir "${c.name}"?`)) { remove(c.id); toast.success("Cadência excluída"); } }}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
