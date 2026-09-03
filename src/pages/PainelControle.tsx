import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sdrs, leads } from "@/lib/mock-data";
import { UserAvatar } from "@/components/Badges";
import { Clock } from "lucide-react";
import { format } from "date-fns";

export default function PainelControle() {
  const rows = sdrs.map(s => {
    const sLeads = leads.filter(l => l.ownerId === s.id);
    return {
      sdr: s,
      currentActivity: s.online ? ["Ligação — TechFlow", "Pesquisa — DataCorp", "WhatsApp — InovaTech"][Math.floor(Math.random() * 3)] : "Última atividade — há 2h",
      duration: s.online ? `${Math.floor(Math.random() * 30)}min` : "—",
      prospecting: sLeads.filter(l => l.status === "active").length,
      available: Math.max(sLeads.length - 2, 0),
      won: sLeads.filter(l => l.status === "won").length,
    };
  });

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-sm text-muted-foreground">Monitore as atividades da sua equipe e mantenha o controle do desempenho diário.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select defaultValue="all">
          <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos usuários</SelectItem>{sdrs.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Última atualização às {format(new Date(), "HH:mm")}</span>
      </div>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th colSpan={3} className="px-4 py-2 text-left text-xs font-bold tracking-wider bg-muted/60 border-b border-border">TIME</th>
                <th colSpan={3} className="px-4 py-2 text-left text-xs font-bold tracking-wider bg-primary-soft border-b border-border text-primary">LEADS</th>
              </tr>
              <tr className="text-xs text-muted-foreground bg-muted/30">
                <th className="px-4 py-2 text-left">Usuário</th>
                <th className="px-4 py-2 text-left">Atividade Atual</th>
                <th className="px-4 py-2 text-left">Duração</th>
                <th className="px-4 py-2 text-right">Prospectando</th>
                <th className="px-4 py-2 text-right">Disponíveis</th>
                <th className="px-4 py-2 text-right">Ganhos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sdr.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar {...r.sdr} size="sm" />
                      <div>
                        <p className="font-medium">{r.sdr.name}</p>
                        <p className="text-xs inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${r.sdr.online ? "bg-primary" : "bg-muted-foreground/50"}`} />
                          <span className="text-muted-foreground">{r.sdr.online ? "Online" : "Offline"}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.currentActivity}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{r.duration}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.prospecting}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.available}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">{r.won}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
