import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads } from "@/lib/leads-store";
import { useCadences } from "@/lib/cadences-store";
import { useSdrs } from "@/lib/sdrs-store";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Props { trigger: React.ReactNode; }

export function CreateLeadDialog({ trigger }: Props) {
  const { add } = useLeads();
  const { cadences } = useCadences();
  const { users } = useSdrs();
  const { user, isGestor } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [cadenceId, setCadenceId] = useState<string>("none");
  const [ownerId, setOwnerId] = useState<string>("");

  const reset = () => {
    setName(""); setCompany(""); setEmail(""); setPhone("");
    setCity(""); setState(""); setWebsite(""); setCadenceId("none"); setOwnerId("");
  };

  const effectiveOwnerId = isGestor ? ownerId : (user?.id ?? "");

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Informe o nome do lead."); return; }
    if (!company.trim()) { toast.error("Informe a empresa."); return; }
    if (!effectiveOwnerId) { toast.error("Selecione um responsável."); return; }
    try {
      await add({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        website: website.trim() || undefined,
        cadenceId: cadenceId === "none" ? null : cadenceId,
        ownerId: effectiveOwnerId,
      });
      toast.success("Lead adicionado!");
      setOpen(false);
      reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao adicionar lead";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar novo lead</DialogTitle>
          <DialogDescription>Preencha os dados do lead. Você pode atribuí-lo a uma cadência depois.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João Silva" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="lead-company">Empresa *</Label>
            <Input id="lead-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex.: Acme S.A." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-email">E-mail</Label>
            <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@acme.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">Telefone</Label>
            <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-city">Cidade</Label>
            <Input id="lead-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-state">Estado</Label>
            <Input id="lead-state" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="lead-site">Website</Label>
            <Input id="lead-site" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>Cadência</Label>
            <Select value={cadenceId} onValueChange={setCadenceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cadência</SelectItem>
                {cadences.map(c => <SelectItem key={c.id} value={c.id}>{c.name?.trim() || "(sem nome)"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            {isGestor ? (
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {users.length === 0 && <SelectItem value="u1">Você</SelectItem>}
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value="Você" disabled />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Adicionar lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
