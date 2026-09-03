import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, MoreVertical, Pencil, Copy, Trash2, Bold, Italic, Underline, AlignLeft, List, ListOrdered, Quote, Eraser, Image as ImageIcon, Link2, Smile, Linkedin, Facebook, Twitter, Instagram, MessageCircle, HelpCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActivityType, Activity, SocialNetwork, ActivityShift } from "@/lib/mock-data";
import { useActivityLibrary } from "@/lib/activity-library-store";
import { ActivityIcon, activityLabel } from "@/components/ActivityIcon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RichTextEditor, RichTextEditorHandle } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const types: ActivityType[] = ["research", "social", "email", "call"];
const leadFields = ["PRIMEIRO NOME", "NOME COMPLETO", "EMPRESA", "CARGO", "SITE", "ESTADO", "CIDADE", "EMAIL", "TELEFONE", "CONVERSÃO"];

const networks: { id: SocialNetwork; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "twitter", label: "Twitter", icon: Twitter },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "other", label: "Outro", icon: HelpCircle },
];

export default function Atividades() {
  const [tab, setTab] = useState<ActivityType>("research");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const { library, save, duplicate, remove } = useActivityLibrary();

  const handleSave = async (data: Activity) => {
    try {
      await save(data, editing?.type);
      toast.success(editing ? "Atividade atualizada!" : "Atividade criada!");
      setOpen(false);
      setEditing(null);
      setTab(data.type);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar atividade. Apenas gestores podem editar a biblioteca.");
    }
  };

  const handleDuplicate = async (a: Activity) => {
    try {
      await duplicate(a);
      toast.success("Atividade duplicada!");
    } catch {
      toast.error("Erro ao duplicar atividade.");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting);
      toast.success("Atividade excluída!");
    } catch {
      toast.error("Erro ao excluir atividade.");
    }
    setDeleting(null);
  };

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (a: Activity) => { setEditing(a); setOpen(true); };

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
        <p className="text-sm text-muted-foreground">Gerencie a biblioteca de atividades disponíveis para suas cadências.</p>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-5">
        <Card className="p-2 shadow-card h-fit">
          <div className="space-y-1">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  tab === t ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted"
                )}
              >
                <ActivityIcon type={t} size="sm" />
                {activityLabel(t)}
                <span className="ml-auto text-xs text-muted-foreground">{library[t].length}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="shadow-card">
          <div className="p-5 border-b border-border flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ActivityIcon type={tab} size="lg" />
              <div>
                <h2 className="text-xl font-semibold">{activityLabel(tab)}</h2>
                <p className="text-sm text-muted-foreground">Atividades que poderão ser utilizadas nas cadências.</p>
              </div>
            </div>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nova atividade</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Nome</th>
                  <th className="px-5 py-3 text-left">Instruções</th>
                  <th className="px-5 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {library[tab].length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Nenhuma atividade cadastrada.</td></tr>
                )}
                {library[tab].map(a => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{a.name}</td>
                    <td className="px-5 py-3 text-muted-foreground line-clamp-1">{a.instructions ?? "—"}</td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(a)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(a)}><Copy className="h-4 w-4 mr-2" />Duplicar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(a)}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
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

      <ActivityModal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        initialType={tab}
        editing={editing}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ActivityModalProps {
  open: boolean;
  onClose: () => void;
  initialType: ActivityType;
  editing: Activity | null;
  onSave: (a: Activity) => void;
}

function ActivityModal({ open, onClose, initialType, editing, onSave }: ActivityModalProps) {
  const [type, setType] = useState<ActivityType>(initialType);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [network, setNetwork] = useState<SocialNetwork>("linkedin");
  const [shift, setShift] = useState<ActivityShift | "any">("any");

  // Reset/populate fields whenever the modal opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setInstructions(editing.instructions ?? "");
      setNetwork(editing.preferredNetwork ?? "linkedin");
      setShift(editing.shift ?? "any");
    } else {
      setType(initialType);
      setName("");
      setInstructions("");
      setNetwork("linkedin");
      setShift("any");
    }
  }, [open, editing, initialType]);

  const editorRef = useRef<RichTextEditorHandle>(null);

  const insertField = (f: string) => {
    editorRef.current?.insertText(`{{${f}}}`);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome da atividade.");
      return;
    }
    onSave({
      id: editing?.id ?? `a-${Date.now()}`,
      type,
      name: name.trim(),
      instructions: instructions.trim() || undefined,
      preferredNetwork: type === "social" ? network : undefined,
      shift: shift === "any" ? undefined : shift,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar atividade" : "Adicionar atividade"}</DialogTitle>
          <DialogDescription>Configure as informações que orientam o SDR durante a execução.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h3 className="font-semibold text-sm mb-1">Dados Gerais</h3>
            <p className="text-xs text-muted-foreground mb-3">Estas informações não são exibidas para seu cliente.</p>
            <RadioGroup value={type} onValueChange={(v) => setType(v as ActivityType)} className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {types.map(t => (
                <label key={t} className={cn(
                  "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                  type === t ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
                )}>
                  <RadioGroupItem value={t} className="sr-only" />
                  <ActivityIcon type={t} size="sm" />
                  <span className="text-sm font-medium">{activityLabel(t)}</span>
                </label>
              ))}
            </RadioGroup>

            <div className="mt-4">
              <Label htmlFor="actname">Nome da atividade</Label>
              <Input id="actname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: WhatsApp 01 - pós cadastro" className="mt-1.5" />
            </div>

            <div className="mt-4">
              <Label className="flex items-center gap-1.5">
                Turno padrão
                <span className="text-xs text-muted-foreground font-normal">(usado ao adicionar na cadência)</span>
              </Label>
              <Select value={shift} onValueChange={(v) => setShift(v as ActivityShift | "any")}>
                <SelectTrigger className="mt-1.5 w-full md:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer turno</SelectItem>
                  <SelectItem value="immediate">⚡ Imediato</SelectItem>
                  <SelectItem value="morning">🌅 Manhã</SelectItem>
                  <SelectItem value="afternoon">☀️ Tarde</SelectItem>
                  <SelectItem value="evening">🌙 Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "social" && (
              <div className="mt-4">
                <Label className="flex items-center gap-1.5">
                  Rede preferencial
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {networks.map(n => {
                    const Icon = n.icon;
                    const active = network === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setNetwork(n.id)}
                        className={cn(
                          "flex items-center gap-2 px-3.5 py-2 border rounded-lg text-sm transition-colors",
                          active
                            ? "border-primary bg-primary-soft text-foreground font-medium"
                            : "border-border bg-background hover:border-primary/40"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {n.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Lead:</Label>
              <div className="flex flex-wrap gap-1.5">
                {leadFields.map(f => (
                  <button key={f} type="button" onClick={() => insertField(f)} className="text-[10px] font-mono px-2 py-1 rounded bg-info/10 text-info hover:bg-info/20 transition-colors">
                    {f}
                  </button>
                ))}
              </div>
              <Label className="text-xs text-muted-foreground mt-2 block">Vendedor:</Label>
              <button type="button" onClick={() => insertField("NOME DO VENDEDOR")} className="text-[10px] font-mono px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">
                NOME DO VENDEDOR
              </button>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Instruções</h3>
            <RichTextEditor
              ref={editorRef}
              value={instructions}
              onChange={setInstructions}
              placeholder="Olá {{PRIMEIRO NOME}}, sou {{NOME DO VENDEDOR}} da..."
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
