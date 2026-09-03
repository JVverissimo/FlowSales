import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads } from "@/lib/leads-store";
import { useCadences } from "@/lib/cadences-store";
import { useSdrs } from "@/lib/sdrs-store";
import type { Lead, LeadStatus } from "@/lib/mock-data";
import { toast } from "sonner";

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditLeadDialog({ lead, open, onOpenChange }: Props) {
  const { update } = useLeads();
  const { cadences } = useCadences();
  const { users } = useSdrs();
  const [form, setForm] = useState<Lead | null>(lead);

  useEffect(() => { setForm(lead); }, [lead, open]);

  if (!form) return null;
  const f = form;

  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setForm({ ...f, [k]: v });

  const handleSubmit = async () => {
    if (!f.name.trim() || !f.company.trim()) { toast.error("Nome e empresa são obrigatórios."); return; }
    try {
      await update(f.id, f);
      toast.success("Lead atualizado!");
      onOpenChange(false);
    } catch { toast.error("Erro ao atualizar lead"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>Atualize as informações do lead.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label>Nome *</Label>
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Empresa *</Label>
            <Input value={f.company} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Input value={f.state ?? ""} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Website</Label>
            <Input value={f.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => set("status", v as LeadStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cadência</Label>
            <Select value={f.cadenceId ?? "none"} onValueChange={(v) => set("cadenceId", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cadência</SelectItem>
                {cadences.map(c => <SelectItem key={c.id} value={c.id}>{c.name?.trim() || "(sem nome)"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Responsável</Label>
            <Select value={f.ownerId} onValueChange={(v) => set("ownerId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {users.length === 0 && <SelectItem value="u1">Você</SelectItem>}
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Anotações</Label>
            <Textarea
              rows={4}
              placeholder="Observações sobre o lead (também recebidas via API)"
              value={f.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MoveProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function MoveCadenceDialog({ lead, open, onOpenChange }: MoveProps) {
  const { update } = useLeads();
  const { cadences } = useCadences();
  const [target, setTarget] = useState<string>("none");

  useEffect(() => { if (lead) setTarget(lead.cadenceId ?? "none"); }, [lead, open]);

  const handleSubmit = async () => {
    if (!lead) return;
    try {
      const newCadenceId = target === "none" ? null : target;
      await update(lead.id, { cadenceId: newCadenceId, phaseIndex: 0 });
      toast.success("Lead movido de cadência!");
      onOpenChange(false);
    } catch { toast.error("Erro ao mover lead"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover de cadência</DialogTitle>
          <DialogDescription>Selecione a cadência de destino para <strong>{lead?.name}</strong>.</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-1.5">
          <Label>Cadência</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem cadência</SelectItem>
              {cadences.map(c => <SelectItem key={c.id} value={c.id}>{c.name?.trim() || "(sem nome)"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Mover</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
