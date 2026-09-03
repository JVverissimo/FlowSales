import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCadences } from "@/lib/cadences-store";
import { CHANNEL_GROUPS } from "@/lib/comissoes";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { ActivityShift, CadenceFocus, Priority } from "@/lib/mock-data";

interface Props {
  trigger: React.ReactNode;
}

export function CreateCadenceDialog({ trigger }: Props) {
  const { add } = useCadences();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [focus, setFocus] = useState<CadenceFocus>("outbound");
  const [inactivityDays, setInactivityDays] = useState<string>("7");
  const [channel, setChannel] = useState<string>("");
  const [defaultShift, setDefaultShift] = useState<ActivityShift | "any">("any");

  const reset = () => {
    setName(""); setDescription(""); setPriority("normal");
    setFocus("outbound"); setInactivityDays("7"); setChannel(""); setDefaultShift("any");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Informe um nome para a cadência.");
      return;
    }
    try {
      const novo = await add({
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        focus,
        inactivityDays: Number(inactivityDays) || undefined,
        channel: channel || null,
        defaultShift: defaultShift === "any" ? null : defaultShift,
      });
      toast.success("Cadência criada com sucesso!");
      setOpen(false);
      reset();
      if (novo) navigate(`/prospeccao/cadencias/${novo.id}`);
    } catch {
      toast.error("Erro ao criar cadência");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar nova cadência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cad-name">Nome da cadência *</Label>
            <Input id="cad-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Outbound — SaaS PMEs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cad-desc">Descrição</Label>
            <Textarea id="cad-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objetivo e público-alvo" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="very_high">Muito alta</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Foco</Label>
              <Select value={focus} onValueChange={(v) => setFocus(v as CadenceFocus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound_active">Inbound ativo</SelectItem>
                  <SelectItem value="inbound_passive">Inbound passivo</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Canal de aquisição (comissão)</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="Selecione o canal vinculado à comissão" /></SelectTrigger>
              <SelectContent>
                {CHANNEL_GROUPS.map((g) => (
                  <SelectGroup key={g.group}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.channels.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">As reuniões agendadas a partir desta cadência receberão automaticamente este canal para cálculo de comissão.</p>
          </div>
          <div className="space-y-2">
            <Label>Turno padrão das atividades</Label>
            <Select value={defaultShift} onValueChange={(v) => setDefaultShift(v as ActivityShift | "any")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer turno</SelectItem>
                <SelectItem value="immediate">⚡ Imediato</SelectItem>
                <SelectItem value="morning">🌅 Manhã</SelectItem>
                <SelectItem value="afternoon">☀️ Tarde</SelectItem>
                <SelectItem value="evening">🌙 Noite</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Atividades adicionadas a esta cadência herdam este turno automaticamente (pode ser ajustado individualmente).</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cad-inact">Dias de inatividade até perda automática</Label>
            <Input id="cad-inact" type="number" min={1} value={inactivityDays} onChange={(e) => setInactivityDays(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar cadência</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
