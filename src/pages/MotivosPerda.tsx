import { useMemo } from "react";
import { useLeads } from "@/lib/leads-store";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown } from "lucide-react";

export default function MotivosPerda() {
  const { leads } = useLeads();

  const { reasons, total } = useMemo(() => {
    const lost = leads.filter(l => l.status === "lost");
    const counts: Record<string, number> = {};
    lost.forEach(l => {
      const r = (l.lossReason && l.lossReason.trim()) || "Sem motivo informado";
      counts[r] = (counts[r] ?? 0) + 1;
    });
    const total = lost.length;
    const reasons = Object.entries(counts)
      .map(([reason, count]) => ({ reason, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
    return { reasons, total };
  }, [leads]);

  return (
    <div className="px-6 py-6 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Motivos de Perda</h1>
        <p className="text-sm text-muted-foreground">Relatório gerado automaticamente a partir dos leads marcados como perdidos na prospecção.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de perdas</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Motivos distintos</p>
          <p className="text-3xl font-bold mt-1">{reasons.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Principal motivo</p>
          <p className="text-lg font-semibold mt-1 truncate">{reasons[0]?.reason ?? "—"}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold">Distribuição dos motivos</h2>
        </div>

        {reasons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum lead marcado como perda ainda.</p>
        ) : (
          <div className="space-y-4">
            {reasons.map(r => (
              <div key={r.reason}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{r.reason}</span>
                  <span className="text-sm text-muted-foreground">{r.count} · {r.pct}%</span>
                </div>
                <Progress value={r.pct} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
