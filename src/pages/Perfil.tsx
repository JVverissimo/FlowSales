import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/Badges";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useBusinessHours, BusinessHours } from "@/lib/business-hours-store";
import { cn } from "@/lib/utils";

const DIAS = [
  { n: 1, label: "Seg" },
  { n: 2, label: "Ter" },
  { n: 3, label: "Qua" },
  { n: 4, label: "Qui" },
  { n: 5, label: "Sex" },
  { n: 6, label: "Sáb" },
  { n: 0, label: "Dom" },
];

export default function Perfil() {
  const { profile, isGestor } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [cargo, setCargo] = useState(isGestor ? "Gestor" : "SDR");
  const [telefone, setTelefone] = useState(profile?.telefone ?? "");

  useEffect(() => {
    if (profile) {
      setNome(profile.nome);
      setEmail(profile.email);
      setTelefone(profile.telefone ?? "");
    }
  }, [profile]);

  const salvar = () => toast.success("Perfil atualizado com sucesso");

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Informações pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={nome} initials={nome.split(" ").map(s => s[0]).slice(0, 2).join("")} color="hsl(142 71% 45%)" />
            <div>
              <Button variant="outline" size="sm">Trocar foto</Button>
              <p className="text-xs text-muted-foreground mt-1">PNG ou JPG até 2MB</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome completo</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={cargo} onChange={e => setCargo(e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" /></div>
          </div>
          <div className="flex justify-end"><Button onClick={salvar}>Salvar alterações</Button></div>
        </CardContent>
      </Card>

      {isGestor && <HorarioComercialCard />}

      <Card>
        <CardHeader><CardTitle>Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Senha atual</Label><Input type="password" /></div>
            <div className="space-y-2"><Label>Nova senha</Label><Input type="password" /></div>
          </div>
          <div className="flex justify-end"><Button variant="outline" onClick={() => toast.success("Senha alterada")}>Alterar senha</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

function HorarioComercialCard() {
  const { businessHours, save, loading } = useBusinessHours();
  const [startTime, setStartTime] = useState(businessHours.startTime);
  const [endTime, setEndTime] = useState(businessHours.endTime);
  const [workdays, setWorkdays] = useState<number[]>(businessHours.workdays);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartTime(businessHours.startTime);
    setEndTime(businessHours.endTime);
    setWorkdays(businessHours.workdays);
  }, [businessHours]);

  const toggleDay = (n: number) =>
    setWorkdays(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort());

  const submit = async () => {
    if (!startTime || !endTime) { toast.error("Preencha o horário"); return; }
    if (startTime >= endTime) { toast.error("Horário final deve ser maior que o inicial"); return; }
    if (workdays.length === 0) { toast.error("Selecione ao menos um dia útil"); return; }
    setSaving(true);
    try {
      await save({ startTime, endTime, workdays } as BusinessHours);
      toast.success("Horário comercial salvo");
    } catch (e) {
      toast.error("Erro ao salvar horário");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário Comercial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Leads que entram <strong>dentro</strong> do horário comercial começam as tarefas hoje.
          Leads que entram <strong>fora</strong> do horário (ou em dia não útil) começam apenas no
          próximo dia útil. Vale para leads criados manualmente e via integração/API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label>Início</Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={loading} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dias úteis</Label>
          <div className="flex flex-wrap gap-2">
            {DIAS.map(d => {
              const on = workdays.includes(d.n);
              return (
                <button
                  key={d.n}
                  type="button"
                  onClick={() => toggleDay(d.n)}
                  disabled={loading}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
