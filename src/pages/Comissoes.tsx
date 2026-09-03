import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAppointments } from "@/lib/appointments-store";
import { useLeads } from "@/lib/leads-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";


import { ChevronLeft, ChevronRight, DollarSign, Trophy } from "lucide-react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  BONUS_THRESHOLD, channelGroupOf, groupLabel,
  type ChannelCommissionConfig, type ChannelGroup,
} from "@/lib/comissoes";



import ComissoesGestor from "./ComissoesGestor";

export default function Comissoes() {
  const { user, isGestor } = useAuth();
  const { appointments } = useAppointments();
  const { leads } = useLeads();
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [configs, setConfigs] = useState<ChannelCommissionConfig[]>([]);

  if (isGestor) return <ComissoesGestor />;


  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("channel_commission_configs").select("*");
      setConfigs((data ?? []) as ChannelCommissionConfig[]);
    })();
  }, []);


  const monthStart = monthCursor;
  const monthEnd = useMemo(() => endOfMonth(monthCursor), [monthCursor]);

  // Apenas reuniões do SDR logado no mês
  const mine = useMemo(() => {
    const from = monthStart.getTime();
    const to = monthEnd.getTime();
    return appointments.filter(a => {
      if (a.sdrId !== user?.id) return false;
      const t = new Date(a.scheduledAt).getTime();
      return t >= from && t <= to;
    });
  }, [appointments, user?.id, monthStart, monthEnd]);

  const cfgOf = (channel: string | null, company: string | null) =>
    channel && company ? configs.find(c => c.channel === channel && c.company === company) : undefined;

  const stats = useMemo(() => {
    let meetingTotal = 0, closingTotal = 0, bonusTotal = 0;
    const counts: Record<ChannelGroup, number> = { inbound: 0, prospeccao_ativa: 0, networking: 0, outbound: 0 };
    const bonusVal: Record<ChannelGroup, number> = { inbound: 0, prospeccao_ativa: 0, networking: 0, outbound: 0 };
    for (const a of mine) {
      const cfg = cfgOf(a.channel, a.company);
      if (!cfg) continue;
      // Comissão de reunião só conta quando GESTOR confirma como compareceu
      if (a.confirmed && a.status === "attended") meetingTotal += Number(cfg.meeting_value || 0);
      if (a.closed) {
        closingTotal += Number(cfg.closing_value || 0);
        const g = a.channel ? channelGroupOf(a.channel) : null;
        if (g) { counts[g] += 1; bonusVal[g] = Math.max(bonusVal[g], Number(cfg.bonus_value || 0)); }
      }
    }
    const groupProgress = (Object.keys(counts) as ChannelGroup[]).map(g => {
      const count = counts[g];
      const earned = Math.floor(count / BONUS_THRESHOLD);
      const progress = count % BONUS_THRESHOLD;
      const value = earned * bonusVal[g];
      bonusTotal += value;
      return { group: g, count, earned, progress, value };
    });
    return { meetingTotal, closingTotal, bonusTotal, total: meetingTotal + closingTotal + bonusTotal, groupProgress };
  }, [mine, configs]);

  const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
          <p className="text-sm text-muted-foreground">As reuniões agendadas nas fases dos seus leads aparecem aqui automaticamente.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => setMonthCursor(addMonths(monthCursor, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 text-sm font-medium capitalize min-w-[140px] text-center">
            {format(monthCursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMonthCursor(startOfMonth(new Date()))}>Hoje</Button>
        </div>
      </div>

      {/* Comissões */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Suas Comissões</h2>
        </div>
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Total no mês</p>
            <p className="text-5xl font-bold tracking-tight mt-2">{fmtMoney(stats.total)}</p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Reuniões realizadas</span><span className="font-medium">{fmtMoney(stats.meetingTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fechamentos</span><span className="font-medium">{fmtMoney(stats.closingTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bônus</span><span className="font-medium text-primary">{fmtMoney(stats.bonusTotal)}</span></div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">A comissão é liberada automaticamente quando você marca a reunião como "Compareceu". Após o fechamento, informe o valor do contrato.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Progresso de bônus por canal</h3>
              <span className="text-xs text-muted-foreground">(a cada {BONUS_THRESHOLD} fechamentos)</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {stats.groupProgress.map(gp => (
                <div key={gp.group} className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{groupLabel(gp.group)}</span>
                    <span className="text-xs text-muted-foreground">{gp.progress}/{BONUS_THRESHOLD}</span>
                  </div>
                  <Progress value={(gp.progress / BONUS_THRESHOLD) * 100} className="h-2" />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{gp.earned} bônus</span>
                    <span>{fmtMoney(gp.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Detalhe das reuniões que geraram comissão */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Reuniões que geraram comissão</h2>
        </div>
        {(() => {
          const rows = mine
            .filter(a => a.confirmed && a.status === "attended")
            .map(a => {
              const cfg = cfgOf(a.channel, a.company);
              const lead = leads.find(l => l.id === a.leadId);
              return {
                a, lead,
                meeting: Number(cfg?.meeting_value || 0),
                closing: a.closed ? Number(cfg?.closing_value || 0) : 0,
              };
            })
            .sort((x, y) => new Date(y.a.scheduledAt).getTime() - new Date(x.a.scheduledAt).getTime());
          if (rows.length === 0) {
            return <p className="text-sm text-muted-foreground">Nenhuma reunião com comissão liberada neste mês.</p>;
          }
          return (
            <div className="divide-y">
              {rows.map(({ a, lead, meeting, closing }) => (
                <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="min-w-[220px]">
                    <div className="font-medium">{lead?.name ?? "Lead removido"}{lead?.company ? ` · ${lead.company}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {a.channel ? ` · ${a.channel}` : ""}{a.company ? ` · ${a.company}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Reunião</div>
                      <div className="font-semibold text-emerald-600">{fmtMoney(meeting)}</div>
                    </div>
                    {a.closed && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Fechamento</div>
                        <div className="font-semibold text-emerald-600">{fmtMoney(closing)}</div>
                      </div>
                    )}
                    <div className="text-right min-w-[90px]">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-bold">{fmtMoney(meeting + closing)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>

    </div>
  );
}
