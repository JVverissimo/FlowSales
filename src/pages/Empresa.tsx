import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/Badges";
import {
  Building2, Users, UsersRound, Mail, Phone, CreditCard, Plus, Search, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCompanyUsers, AccessProfile, Module, CompanyUser } from "@/lib/empresa-store";

const tabs = [
  { id: "dados", label: "Dados Gerais", icon: Building2 },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "times", label: "Times", icon: UsersRound },
  { id: "email", label: "Config. de E-mail", icon: Mail },
  { id: "telefones", label: "Números de Telefone", icon: Phone },
  { id: "financeiro", label: "Financeiro", icon: CreditCard },
] as const;

const COLORS = ["hsl(142 71% 45%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)", "hsl(25 95% 53%)", "hsl(340 75% 55%)"];
const colorFor = (s: string) => COLORS[s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initialsOf = (n: string) => n.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();

export default function Empresa() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const active = (tab as typeof tabs[number]["id"]) ?? "dados";

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="text-sm text-muted-foreground mb-4">
        Empresa <span className="mx-1">/</span>
        <span className="text-foreground capitalize">{tabs.find(t => t.id === active)?.label}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside>
          <Card className="overflow-hidden">
            <nav className="flex flex-col">
              {tabs.map(t => {
                const Icon = t.icon;
                const is = active === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/empresa/${t.id}`)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm text-left border-l-2 transition-colors",
                      is
                        ? "border-primary bg-primary-soft text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </aside>

        <section>
          {active === "dados" && <DadosGerais />}
          {active === "usuarios" && <UsuariosTab />}
          {active === "times" && <SimpleEmpty title="Times" desc="Crie times para organizar seus SDRs." />}
          {active === "email" && <SimpleEmpty title="Configurações de E-mail" desc="Conecte servidores SMTP e domínios." />}
          {active === "telefones" && <SimpleEmpty title="Números de Telefone" desc="Gerencie os números usados nas ligações." />}
          {active === "financeiro" && <SimpleEmpty title="Financeiro" desc="Plano, faturas e métodos de pagamento." />}
        </section>
      </div>
    </div>
  );
}

function DadosGerais() {
  const [nome, setNome] = useState("FlowSales");
  const [cnpj, setCnpj] = useState("");
  const [site, setSite] = useState("");
  const [setor, setSetor] = useState("");
  const [descricao, setDescricao] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle>Dados gerais</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Razão social</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div className="space-y-2"><Label>CNPJ</Label><Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></div>
          <div className="space-y-2"><Label>Site</Label><Input value={site} onChange={e => setSite(e.target.value)} placeholder="https://" /></div>
          <div className="space-y-2"><Label>Setor</Label><Input value={setor} onChange={e => setSetor(e.target.value)} placeholder="SaaS, Indústria, etc." /></div>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea rows={4} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conte um pouco sobre sua empresa..." />
        </div>
        <div className="flex justify-end"><Button onClick={() => toast.success("Dados da empresa salvos")}>Salvar</Button></div>
      </CardContent>
    </Card>
  );
}

function SimpleEmpty({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        <p className="text-xs text-muted-foreground mt-6">Em breve.</p>
      </CardContent>
    </Card>
  );
}

/* ============ USUÁRIOS ============ */

function UsuariosTab() {
  const { users, add, update, remove } = useCompanyUsers();
  const [q, setQ] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyUser | null>(null);

  const filtered = users.filter(u =>
    !q || u.nome.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
  );

  const handleSave = async (data: Omit<CompanyUser, "id" | "criadoEm">) => {
    if (editing) {
      update(editing.id, data);
      toast.success("Usuário atualizado");
      setOpenModal(false);
      setEditing(null);
      return;
    }
    // Create real auth user via edge function (sends invite email to set password)
    const { supabase } = await import("@/integrations/supabase/client");
    const role = data.papel === "Gestor" ? "gestor" : "sdr";
    const { data: res, error } = await supabase.functions.invoke("admin-create-user", {
      body: { nome: data.nome, email: data.email, role },
    });
    if (error || (res as any)?.error) {
      toast.error((res as any)?.error ?? error?.message ?? "Falha ao criar usuário");
      return;
    }
    add(data);
    toast.success(`Convite enviado para ${data.email}. O usuário define a senha pelo link recebido.`);
    setOpenModal(false);
    setEditing(null);
  };

  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 rounded-full border-2 border-primary text-primary flex items-center justify-center mb-3">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold">Usuários</h2>
          <p className="text-sm text-muted-foreground">Gerenciar usuários e permissões de acesso</p>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome ou email" className="pl-9" />
          </div>
          <Button onClick={() => { setEditing(null); setOpenModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_180px_180px_40px] gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground border-b bg-muted/40">
            <div>Nome</div><div>Papel</div><div>Módulos</div><div></div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              {users.length === 0 ? "Nenhum usuário cadastrado. Clique em Adicionar." : "Nenhum usuário encontrado."}
            </div>
          ) : (
            filtered.map(u => (
              <div key={u.id} className="grid grid-cols-[1fr_180px_180px_40px] gap-4 px-4 py-3 items-center border-b last:border-0 hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={u.nome} initials={initialsOf(u.nome)} color={colorFor(u.nome)} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>
                <div className="text-sm">{u.papel}</div>
                <div className="flex gap-1 flex-wrap">
                  {u.modulos.map(m => (
                    <Badge key={m} variant="secondary" className={cn("text-[10px] font-bold", m === "FLOW" ? "bg-primary/15 text-primary" : "bg-info/15 text-info")}>
                      {m}
                    </Badge>
                  ))}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditing(u); setOpenModal(true); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(u)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <UserModal
        open={openModal}
        onOpenChange={(o) => { setOpenModal(o); if (!o) setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.nome} perderá o acesso à plataforma. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) { remove(confirmDelete.id); toast.success("Usuário excluído"); }
                setConfirmDelete(null);
              }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function UserModal({
  open, onOpenChange, onSave, initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (u: Omit<CompanyUser, "id" | "criadoEm">) => void;
  initial: CompanyUser | null;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<AccessProfile>("SDR");
  const [modulos, setModulos] = useState<Module[]>(["FLOW"]);

  useEffect(() => {
    if (open) {
      setNome(initial?.nome ?? "");
      setEmail(initial?.email ?? "");
      setPapel(initial?.papel ?? "SDR");
      setModulos(initial?.modulos ?? ["FLOW"]);
    }
  }, [open, initial]);

  const toggleModulo = (m: Module) =>
    setModulos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const submit = () => {
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e email");
      return;
    }
    if (modulos.length === 0) {
      toast.error("Selecione pelo menos um módulo");
      return;
    }
    onSave({ nome: nome.trim(), email: email.trim(), papel, modulos });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            Defina o perfil de acesso e os módulos disponíveis para o usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select value={papel} onValueChange={(v) => setPapel(v as AccessProfile)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gestor">Gestor (acesso total)</SelectItem>
                <SelectItem value="SDR">SDR (execução e seus leads)</SelectItem>
                <SelectItem value="Usuário Meetime">Usuário Meetime (básico)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Módulos</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={modulos.includes("FLOW")} onCheckedChange={() => toggleModulo("FLOW")} />
                FLOW (cadências)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={modulos.includes("DIALER")} onCheckedChange={() => toggleModulo("DIALER")} />
                DIALER (ligações)
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial ? "Salvar" : "Adicionar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
